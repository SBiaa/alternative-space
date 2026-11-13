import type Phaser from "phaser";
import { FISICA, MANOBRA, PISTA, TEXTOS, type Direcao, type Gesto, type Manobra } from "@/lib/role/config";
import { comboVazio, fecharCombo, multiplicador, perderCombo, placarVazio, somarManobra, valorDoCombo, type Combo, type Placar } from "@/lib/role/combo";
import { classificarGesto, direcaoDaTecla, resolverManobra, type Acao, type Teclas } from "@/lib/role/entradas";
import { formasDaPista, larguraMundo, alturaMundo, marcos } from "@/lib/role/pecas";
import type { Pista } from "@/lib/role/pista";
import { pontuacaoFinal, type Corrida, type Entrada } from "@/lib/role/pontuacao";
import { desenharCenario, desenharPista, desenharSkatista, lerCores, type Cores } from "./desenho";

// Cena de jogo. Física do Matter com passo fixo: a mesma pista se comporta igual em qualquer aparelho,
// porque a simulação só avança em passos de FISICA.passoMs, independente da taxa de quadros.

export type Hud = { pontos: number; tempoMs: number; limiteMs: number; combo: number; valorCombo: number; aviso: string | null; avisoId: number };
export type FimDeCorrida = { corrida: Corrida; tombos: number };

export type DadosJogo = {
  pista: Pista;
  teclas: Teclas;
  reduzido: boolean;
  aoHud: (h: Hud) => void;
  aoFim: (f: FimDeCorrida) => void;
};

type Fila = { acao: Acao | null; segurar?: { d: Direcao; on: boolean }; registro: string };

export function criarCenaJogo(P: typeof Phaser) {
  type MatterLib = { Bodies: MatterJS.BodiesFactory; Body: MatterJS.BodyFactory; Vertices: MatterJS.VerticesFactory };
  const M = (P.Physics.Matter as unknown as { Matter: MatterLib }).Matter;

  return class JogoScene extends P.Scene {
    dados!: DadosJogo;
    cores!: Cores;
    skatista!: MatterJS.BodyType;
    visual!: ReturnType<typeof desenharSkatista>;
    corpos = new Set<MatterJS.BodyType>();
    grindaveis = new Set<MatterJS.BodyType>();
    acumulado = 0;
    passo = 0;
    fila: Fila[] = [];
    entradas: Entrada[] = [];
    segurando: Record<Direcao, boolean> = { up: false, down: false, left: false, right: false };
    estado: "rodando" | "tombo" | "fim" = "rodando";
    noChao = false;
    eraNoChao = false;
    noGrind = false;
    grindando = false;
    manualAte: number | null = null;
    manualSegurado = false;
    truque: { m: Manobra; ini: number; fim: number } | null = null;
    combo: Combo = comboVazio();
    placar: Placar = placarVazio();
    respiroAte: number | null = null;
    grindArmadoAte = 0;
    subindoAte = 0;
    historico: { x: number; y: number }[] = [];
    seguro = { x: 0, y: 0 };
    tomboAte = 0;
    tombos = 0;
    penalidade = 0;
    chegadaX = 0;
    aviso: string | null = null;
    avisoId = 0;
    pedacos: { g: Phaser.GameObjects.Graphics; vx: number; vy: number; vr: number }[] = [];
    traco: { x: number; y: number }[] = [];
    tracoIni = 0;
    hudPasso = -1;

    constructor() {
      super({ key: "jogo" });
    }

    init(d: DadosJogo) {
      this.dados = d;
      Object.assign(this, {
        acumulado: 0, passo: 0, fila: [], entradas: [], estado: "rodando", noChao: false, eraNoChao: false, noGrind: false, grindando: false,
        manualAte: null, manualSegurado: false, truque: null, combo: comboVazio(), placar: placarVazio(), respiroAte: null, grindArmadoAte: 0,
        subindoAte: 0, naParede: 0, historico: [], tomboAte: 0, tombos: 0, penalidade: 0, aviso: null, avisoId: 0, pedacos: [], hudPasso: -1,
      });
      this.segurando = { up: false, down: false, left: false, right: false };
      this.corpos = new Set();
      this.grindaveis = new Set();
    }

    get agora() {
      return this.passo * FISICA.passoMs;
    }

    create() {
      const { pista, reduzido } = this.dados;
      this.cores = lerCores();
      const W = larguraMundo(pista);
      const H = alturaMundo();
      this.matter.world.autoUpdate = false;
      this.matter.world.setGravity(0, FISICA.gravidade);
      this.matter.world.setBounds(-200, -2000, W + 400, H + 2600, 64, false, false, false, false);

      desenharCenario(this, this.cores, W, reduzido);
      desenharPista(this.add.graphics().setDepth(0), pista, this.cores);

      for (const f of formasDaPista(pista)) {
        const corpo = M.Bodies.fromVertices(0, 0, [f.pontos], { isStatic: true, friction: 0, frictionStatic: 0, restitution: 0, label: f.grind ? "grind" : "solido" });
        M.Body.setPosition(corpo, M.Vertices.centre(f.pontos.map((p) => ({ ...p })) as MatterJS.Vector[]));
        this.matter.world.add(corpo);
        this.corpos.add(corpo);
        if (f.grind) this.grindaveis.add(corpo);
      }

      const m = marcos(pista)!;
      this.chegadaX = m.chegadaX;
      this.seguro = { ...m.largada };
      this.skatista = this.matter.add.circle(m.largada.x, m.largada.y, PISTA.celula * FISICA.raioSkatista, {
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
        restitution: 0,
        label: "skatista",
      }) as MatterJS.BodyType;
      // Rotação travada: o skatista desliza pelas rampas sem capotar o corpo físico.
      M.Body.setInertia(this.skatista, Infinity);
      M.Body.setVelocity(this.skatista, { x: FISICA.velocidadeBase, y: 0 });

      this.visual = desenharSkatista(this, this.cores);
      this.visual.container.setDepth(5);

      const cam = this.cameras.main;
      cam.setBounds(0, -H, W, H * 2);
      const ajustar = () => cam.setZoom(Math.max(0.5, Math.min(2, cam.height / (H * 0.85))));
      ajustar();
      this.scale.on("resize", ajustar);
      // O ScaleManager é do jogo inteiro: solta o ouvinte quando a cena para.
      this.events.once("shutdown", () => this.scale.off("resize", ajustar));
      cam.startFollow(this.visual.container, true, reduzido ? 1 : 0.12, reduzido ? 1 : 0.12, -cam.width * 0.18, 0);

      const kb = this.input.keyboard!;
      kb.on("keydown", (e: KeyboardEvent) => {
        const d = direcaoDaTecla(this.dados.teclas, e.key);
        if (!d) return;
        e.preventDefault();
        if (e.repeat) return;
        this.empurrar({ acao: { tipo: "dir", d }, segurar: { d, on: true }, registro: `k:${d}` });
      });
      kb.on("keyup", (e: KeyboardEvent) => {
        const d = direcaoDaTecla(this.dados.teclas, e.key);
        if (d) this.empurrar({ acao: null, segurar: { d, on: false }, registro: `u:${d}` });
      });

      // Toque: deslizar = manobra; segurar parado na metade direita rema, na esquerda freia.
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        this.traco = [{ x: p.x, y: p.y }];
        this.tracoIni = p.downTime;
      });
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        if (!p.isDown || this.traco.length === 0) return;
        this.traco.push({ x: p.x, y: p.y });
        const lado: Direcao = p.x > this.cameras.main.width / 2 ? "right" : "left";
        if (!this.segurando[lado] && classificarGesto(this.traco) === null && p.getDuration() > 180) this.empurrar({ acao: null, segurar: { d: lado, on: true }, registro: `h:${lado}` });
      });
      this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
        this.traco.push({ x: p.x, y: p.y });
        const g = classificarGesto(this.traco);
        this.traco = [];
        for (const d of ["left", "right"] as Direcao[]) if (this.segurando[d]) this.empurrar({ acao: null, segurar: { d, on: false }, registro: `u:${d}` });
        if (g) this.gesto(g);
      });
    }

    // Botões na tela e gestos chegam por aqui também.
    gesto(g: Gesto) {
      this.empurrar({ acao: { tipo: "gesto", g }, registro: `g:${g}` });
    }
    direcao(d: Direcao, on: boolean) {
      this.empurrar({ acao: on ? { tipo: "dir", d } : null, segurar: { d, on }, registro: `${on ? "k" : "u"}:${d}` });
    }

    empurrar(f: Fila) {
      if (this.estado === "fim") return;
      this.fila.push(f);
    }

    update(_t: number, delta: number) {
      this.acumulado += Math.min(delta, 250);
      let n = 0;
      while (this.acumulado >= FISICA.passoMs && n < FISICA.maxPassosPorQuadro && this.estado !== "fim") {
        this.passoFixo();
        this.matter.world.step(FISICA.passoMs);
        this.acumulado -= FISICA.passoMs;
        n++;
      }
      if (n === FISICA.maxPassosPorQuadro) this.acumulado = 0;
      this.renderizar(delta);
    }

    contatos() {
      let chao = false;
      let grind = false;
      let parede = false;
      let plano = false;
      for (const par of this.matter.world.engine.pairs.list) {
        if (!par.isActive) continue;
        const a = par.bodyA.parent;
        const b = par.bodyB.parent;
        if (a !== this.skatista && b !== this.skatista) continue;
        const outro = a === this.skatista ? b : a;
        if (!this.corpos.has(outro)) continue;
        // Normal saindo da superfície em direção ao skatista.
        const s = a === this.skatista ? 1 : -1;
        const nx = par.collision.normal.x * s;
        const ny = par.collision.normal.y * s;
        if (ny < -0.45) {
          chao = true;
          if (ny < -0.97) plano = true;
          if (this.grindaveis.has(outro)) grind = true;
        } else if (Math.abs(nx) > 0.85) parede = true;
      }
      return { chao, grind, parede, plano };
    }

    passoFixo() {
      this.passo++;
      const agora = this.agora;
      const corpo = this.skatista;

      if (this.estado === "tombo") {
        if (agora >= this.tomboAte) this.voltar();
        this.fila = [];
        return;
      }

      // Entradas desse passo.
      for (const f of this.fila) {
        this.entradas.push({ t: this.passo, a: f.registro });
        if (f.segurar) {
          this.segurando[f.segurar.d] = f.segurar.on;
          if (f.segurar.d === "down" && !f.segurar.on && this.manualSegurado) this.fimDoManual();
        }
        if (f.acao) this.agir(f.acao);
      }
      this.fila = [];

      const c = this.contatos();
      const subindo = agora < this.subindoAte;
      this.eraNoChao = this.noChao;
      this.noChao = c.chao && !subindo;
      this.noGrind = c.grind && !subindo;
      const vx = corpo.velocity.x;

      // Bateu num obstáculo (parede, quina de corrimão...): parado sem estar freando por um instante = tombo.
      // Sem isso o skatista poderia ficar preso pra sempre numa quina.
      const travado = (c.parede || c.chao) && !this.grindando && !this.segurando.left && Math.abs(vx) < 0.8;
      this.naParede = travado ? this.naParede + 1 : 0;
      if (this.naParede > FISICA.passosTravado) return this.tombo();

      if (this.noChao) {
        if (!this.eraNoChao) {
          // Aterrissou.
          if (this.truque && agora < this.truque.fim) return this.tombo();
          this.truque = null;
          if (this.noGrind && (agora < this.grindArmadoAte || this.segurando.down)) {
            this.grindando = true;
            this.somar("grind_5050");
          } else if (this.combo.manobras.length > 0) this.respiroAte = agora + FISICA.respiroComboMs;
        } else if (this.grindando && !this.noGrind) {
          this.grindando = false;
          this.respiroAte = agora + FISICA.respiroComboMs;
        }
      } else if (this.eraNoChao) {
        // Saiu do chão (fim do corrimão, borda da rampa).
        if (this.grindando) this.grindando = false;
        if (this.manualAte !== null) this.manualAte = null;
        this.respiroAte = null;
      }

      if (this.manualAte !== null && agora >= this.manualAte) this.fimDoManual();

      // Combo fecha depois do respiro, parado no chão.
      if (this.respiroAte !== null && agora >= this.respiroAte && this.noChao && !this.grindando && this.manualAte === null) {
        const r = fecharCombo(this.placar, this.combo);
        this.placar = r.placar;
        this.combo = r.combo;
        this.respiroAte = null;
      }

      // Velocidade: remar, frear ou rolar na base.
      if (this.noChao) {
        const alvo = this.grindando
          ? Math.max(vx, FISICA.velocidadeBase)
          : this.segurando.right
            ? FISICA.velocidadeRemando
            : this.segurando.left
              ? FISICA.velocidadeFreando
              : FISICA.velocidadeBase;
        M.Body.setVelocity(corpo, { x: vx + (alvo - vx) * FISICA.aceleracao, y: corpo.velocity.y });
      }

      // Ponto seguro: um pouco atrás do último trecho de chão firme.
      // Só conta chão plano (nada de rampa ou corrimão) e volta uns segundos, pra ter espaço de pegar velocidade.
      if (this.noChao && c.plano && !this.noGrind && !this.grindando) {
        this.historico.push({ x: corpo.position.x, y: corpo.position.y });
        if (this.historico.length > FISICA.passosPontoSeguro) this.historico.shift();
        this.seguro = this.historico[0];
      }

      if (corpo.position.y > alturaMundo() + 120) return this.tombo();
      if (corpo.position.x >= this.chegadaX) return this.terminar(true);
      if (this.duracao() >= this.dados.pista.timeLimit * 1000) return this.terminar(false);
    }

    naParede = 0;

    duracao() {
      return Math.round(this.agora + this.penalidade);
    }

    agir(a: Acao) {
      const agora = this.agora;
      const onde = this.noChao || this.grindando ? "chao" : "ar";
      const m = resolverManobra(a, onde);
      if (!m) return;
      const corpo = this.skatista;
      if (m === "ollie") {
        M.Body.setVelocity(corpo, { x: corpo.velocity.x, y: -FISICA.impulsoOllie });
        this.subindoAte = agora + 120;
        this.noChao = false;
        this.grindando = false;
        this.manualAte = null;
        this.manualSegurado = false;
        this.respiroAte = null;
        this.somar("ollie");
      } else if (m === "manual") {
        if (this.manualAte !== null) return;
        this.manualSegurado = a.tipo === "dir";
        this.manualAte = agora + (this.manualSegurado ? FISICA.manualMaxMs : FISICA.manualMaxMs / 2);
        this.respiroAte = null;
        this.somar("manual");
      } else if (m === "grind_5050") {
        this.grindArmadoAte = agora + FISICA.janelaGrindMs;
      } else {
        if (this.truque && agora < this.truque.fim) return;
        this.truque = { m, ini: agora, fim: agora + MANOBRA[m].duracaoMs };
        this.somar(m);
      }
    }

    fimDoManual() {
      this.manualAte = null;
      this.manualSegurado = false;
      if (this.noChao && this.combo.manobras.length > 0) this.respiroAte = this.agora + FISICA.respiroComboMs;
    }

    somar(m: Manobra) {
      this.combo = somarManobra(this.combo, m);
      this.avisar(TEXTOS.jogo.manobra(MANOBRA[m].nome, MANOBRA[m].pontos));
    }

    avisar(t: string) {
      this.aviso = t;
      this.avisoId++;
    }

    tombo() {
      this.estado = "tombo";
      this.tombos++;
      this.tomboAte = this.agora + FISICA.tomboMs;
      this.combo = perderCombo();
      this.truque = null;
      this.grindando = false;
      this.manualAte = null;
      this.respiroAte = null;
      this.avisar(TEXTOS.jogo.tombo);
      const { x, y } = this.skatista.position;
      M.Body.setStatic(this.skatista, true);
      this.visual.container.setVisible(false);
      this.bonecoDePano(x, y);
    }

    voltar() {
      this.penalidade += FISICA.penalidadeTomboMs;
      for (const p of this.pedacos) p.g.destroy();
      this.pedacos = [];
      M.Body.setStatic(this.skatista, false);
      M.Body.setPosition(this.skatista, { x: this.seguro.x, y: this.seguro.y - 4 });
      M.Body.setVelocity(this.skatista, { x: FISICA.velocidadeBase, y: 0 });
      this.historico = [{ ...this.seguro }];
      this.noChao = false;
      this.eraNoChao = false;
      this.visual.container.setVisible(true);
      this.estado = "rodando";
    }

    terminar(chegou: boolean) {
      if (this.estado === "fim") return;
      if (chegou && !(this.truque && this.agora < this.truque.fim)) {
        const r = fecharCombo(this.placar, this.combo);
        this.placar = r.placar;
        this.combo = r.combo;
      }
      this.estado = "fim";
      this.avisar(chegou ? TEXTOS.jogo.chegou : TEXTOS.jogo.tempoAcabou);
      this.emitirHud(true);
      const durationMs = Math.min(this.duracao(), this.dados.pista.timeLimit * 1000);
      const trickPoints = this.placar.pontos;
      this.dados.aoFim({
        tombos: this.tombos,
        corrida: {
          trickPoints,
          durationMs,
          finished: chegou,
          score: pontuacaoFinal(trickPoints, this.dados.pista.timeLimit, durationMs, chegou),
          tricks: this.placar.contagem,
          maxCombo: this.placar.maiorCombo,
          inputs: this.entradas,
        },
      });
    }

    // Boneco de pano de mentirinha: cabeça, tronco e shape voam e giram; umas estrelinhas no lugar.
    bonecoDePano(x: number, y: number) {
      const cor = this.cores;
      const mk = (desenho: (g: Phaser.GameObjects.Graphics) => void, vx: number, vy: number, vr: number) => {
        const g = this.add.graphics({ x, y }).setDepth(6);
        desenho(g);
        this.pedacos.push({ g, vx, vy, vr });
      };
      mk((g) => g.fillStyle(cor.noite, 1).fillRoundedRect(-14, -3, 28, 5, 2), 5, -7, 0.35);
      mk((g) => g.fillStyle(cor.creme, 1).fillRoundedRect(-6, -10, 12, 20, 4), 2, -5, -0.15);
      mk((g) => g.fillStyle(cor.areia, 1).fillCircle(0, 0, 6).fillStyle(cor.laranja, 1).fillRoundedRect(-7, -8, 14, 6, 3), 1, -6, 0.2);
      const n = this.dados.reduzido ? 1 : 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        mk((g) => g.fillStyle(cor.laranjaClaro, 1).fillTriangle(0, -5, 4, 3, -4, 3).fillTriangle(0, 5, 4, -3, -4, -3), Math.cos(a) * 1.5, -2 + Math.sin(a), 0.1);
      }
      if (!this.dados.reduzido) this.cameras.main.shake(160, 0.006);
    }

    renderizar(delta: number) {
      const f = delta / FISICA.passoMs;
      for (const p of this.pedacos) {
        p.vy += 0.4 * f;
        p.g.x += p.vx * f;
        p.g.y += p.vy * f;
        p.g.rotation += p.vr * f;
      }
      const corpo = this.skatista;
      const v = this.visual;
      v.container.setPosition(corpo.position.x, corpo.position.y);
      const inclinacao = this.noChao ? Math.max(-FISICA.inclinacaoMaxima, Math.min(FISICA.inclinacaoMaxima, Math.atan2(corpo.velocity.y, corpo.velocity.x))) : 0;
      v.container.rotation += (inclinacao - v.container.rotation) * 0.35;
      v.shape.scaleX = 1;
      v.shape.scaleY = 1;
      if (this.truque) {
        const t = Math.min(1, (this.agora - this.truque.ini) / Math.max(1, this.truque.fim - this.truque.ini));
        const giro = Math.cos(t * Math.PI * 2);
        if (this.truque.m === "shove_it") v.shape.scaleX = giro;
        else v.shape.scaleY = this.truque.m === "heelflip" ? -giro : giro;
      }
      v.corpo.scaleY = this.grindando || this.manualAte !== null ? 0.85 : 1;
      v.shape.rotation = this.manualAte !== null ? -0.25 : 0;
      this.emitirHud(false);
    }

    emitirHud(forcar: boolean) {
      if (!forcar && this.passo === this.hudPasso) return;
      this.hudPasso = this.passo;
      this.dados.aoHud({
        pontos: this.placar.pontos,
        tempoMs: this.duracao(),
        limiteMs: this.dados.pista.timeLimit * 1000,
        combo: this.combo.manobras.length > 0 ? multiplicador(this.combo) : 0,
        valorCombo: valorDoCombo(this.combo),
        aviso: this.aviso,
        avisoId: this.avisoId,
      });
    }
  };
}
