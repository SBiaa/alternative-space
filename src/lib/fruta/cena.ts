// Cena do Phaser. Só é importada no navegador (import dinâmico no componente).
import * as Phaser from "phaser";
import {
  AGUA_Y,
  BUFFER_PULO,
  COYOTE,
  COYOTE_QUIQUE,
  AVISO_SOLUCO,
  JANELA_SOLUCO,
  FASE_TESTE,
  H,
  PODERES,
  TEMPO_FRAGIL,
  VELOCIDADE_GANCHO,
  W,
  afundou,
  aproxima,
  estrelas,
  formataTempo,
  moedasDoPoder,
  proximoSoluco,
  quique,
  velocidadeX,
  ventoLigado,
  type Fase,
  type Poder,
  type PoderId,
  type Ponto,
  type Resultado,
} from "./regras";

/** Estado dos botões de toque, escrito pelo React e lido a cada quadro. */
export type Controles = { esq: boolean; dir: boolean; pular: boolean; poder: boolean };

export type Chegada = Resultado & { estrelas: number; mortes: number; poder: PoderId };

export type Ganchos = {
  aoChegar: (r: Chegada) => void;
};

type Dados = { mortes?: number; poder?: PoderId };
type Rect = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
type Estatico = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };

const COR = {
  ceu: 0xdfe4e8,
  ilha: 0x8c8c8c,
  ilhaTopo: 0x6e6e6e,
  plataforma: 0xb0b0b0,
  fragil: 0xc9bfa8,
  quebravel: 0x7d7064,
  grade: 0x4a4a4a,
  gancho: 0x3a3a3a,
  braco: 0xc8463c,
  olho: 0xffffff,
  moeda: 0xf2c94c,
  bau: 0x9b6b3d,
  agua: 0x3d7fb8,
  aguaTopo: 0x9cc8ea,
  vento: 0x5d6d7e,
};

type Teclas = Record<
  "esq" | "dir" | "a" | "d" | "cima" | "w" | "espaco" | "z" | "x" | "k" | "shift",
  Phaser.Input.Keyboard.Key
>;

class CenaFase extends Phaser.Scene {
  private fase: Fase = FASE_TESTE;
  private poder: Poder = PODERES.borracha;

  private corpo!: Rect;
  private visual!: Phaser.GameObjects.Container;
  private olho!: Phaser.GameObjects.Rectangle;
  private onda!: Phaser.GameObjects.Graphics;
  private efeitos!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private teclas!: Teclas;

  private estado: "jogando" | "afundando" | "chegou" = "jogando";
  private tempo = 0;
  private moedas = 0;
  private mortes = 0;
  private coyote = 0;
  private buffer = 0;
  private pulandoAntes = false;
  private poderAntes = false;
  private cortouPulo = false;
  private estavaNoChao = false;
  private vyAntes = 0;
  private olhar = 1;
  /** Empurrão do vento somado à velocidade que o jogador controla. */
  private deriva = 0;
  private puxando: Ponto | null = null;
  private usouDuplo = false;
  private pisando = false;
  private soluco = 0;
  /** Velocidade do último quique, que um pulo na hora certa aproveita. */
  private embalo = 0;

  constructor(
    private controles: Controles,
    private ganchos: Ganchos,
  ) {
    super("fase");
  }

  init(dados: Dados) {
    if (dados.poder) this.poder = PODERES[dados.poder];
    this.mortes = dados.mortes ?? 0;
    this.estado = "jogando";
    this.tempo = 0;
    this.moedas = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.pulandoAntes = false;
    this.poderAntes = false;
    this.cortouPulo = false;
    this.estavaNoChao = false;
    this.vyAntes = 0;
    this.olhar = 1;
    this.deriva = 0;
    this.puxando = null;
    this.usouDuplo = false;
    this.pisando = false;
    this.embalo = 0;
    this.soluco = proximoSoluco(Math.random());
  }

  create() {
    const { fase, poder } = this;
    this.cameras.main.setBackgroundColor(COR.ceu);
    this.physics.world.gravity.y = poder.gravidade;
    // Sem chão nem teto no mundo: quem cai, cai na água.
    this.physics.world.setBounds(0, -600, fase.largura, H + 1200, true, true, false, false);

    // Chão firme: ilhas e pedras (sólidas por todos os lados) e plataformas finas (dá pra subir por baixo).
    const ilhas = this.physics.add.staticGroup();
    const finas = this.physics.add.staticGroup();
    for (const s of fase.solidos) {
      const fina = s.h < 30;
      const r = this.add.rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h, fina ? COR.plataforma : COR.ilha);
      if (!fina) this.add.rectangle(s.x + s.w / 2, s.y + 4, s.w, 8, COR.ilhaTopo);
      (fina ? finas : ilhas).add(r);
    }

    const frageis = this.physics.add.staticGroup();
    for (const s of fase.frageis) {
      const r = this.add.rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h, COR.fragil).setStrokeStyle(2, 0x8c7f62);
      frageis.add(r);
    }

    const quebraveis = this.physics.add.staticGroup();
    for (const s of fase.quebraveis) {
      const r = this.add.rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h, COR.quebravel).setStrokeStyle(3, 0x4e443b);
      quebraveis.add(r);
      // Rachaduras pra avisar que dá pra quebrar.
      const g = this.add.graphics().lineStyle(2, 0x3b332c, 0.9);
      g.lineBetween(s.x + 14, s.y + 8, s.x + s.w / 2, s.y + s.h / 2);
      g.lineBetween(s.x + s.w / 2, s.y + s.h / 2, s.x + s.w - 12, s.y + 22);
      g.lineBetween(s.x + s.w / 2, s.y + s.h / 2, s.x + s.w / 2 - 6, s.y + s.h - 8);
      r.setData("rachas", g);
    }

    const grades = this.physics.add.staticGroup();
    for (const s of fase.grades) {
      const r = this.add.rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h).setStrokeStyle(4, COR.grade);
      grades.add(r);
      const g = this.add.graphics().lineStyle(3, COR.grade, 1);
      for (let x = s.x + 12; x < s.x + s.w; x += 14) g.lineBetween(x, s.y, x, s.y + s.h);
    }

    for (const p of fase.ganchos) this.add.circle(p.x, p.y, 8).setStrokeStyle(4, COR.gancho);

    // Jogador: um corpo invisível pra física e um visual que estica e amassa à vontade.
    const p = fase.inicio;
    this.corpo = this.add.rectangle(p.x, p.y - poder.altura / 2 - 1, poder.largura, poder.altura) as Rect;
    this.physics.add.existing(this.corpo);
    this.corpo.body.setCollideWorldBounds(true);
    this.corpo.body.setMaxVelocity(2000, poder.quedaMax);

    const tronco = this.add.rectangle(0, 0, poder.largura, poder.altura, poder.cor, poder.opacidade).setOrigin(0.5, 1);
    const tamOlho = Math.max(3, Math.round(poder.largura / 4));
    this.olho = this.add.rectangle(0, -poder.altura * 0.7, tamOlho, tamOlho + 2, COR.olho);
    this.visual = this.add.container(p.x, p.y, [tronco, this.olho]);

    const deCima = (plat: unknown) => {
      // Só segura quem vem de cima e está descendo.
      const b = this.corpo.body;
      const topo = (plat as Estatico).body.top;
      return b.velocity.y >= 0 && b.prev.y + b.height <= topo + 6;
    };

    this.physics.add.collider(this.corpo, ilhas);
    this.physics.add.collider(this.corpo, finas, undefined, (_j, plat) => deCima(plat));
    this.physics.add.collider(
      this.corpo,
      frageis,
      (_j, plat) => this.pisouFragil(plat as Estatico),
      (_j, plat) => deCima(plat),
    );
    this.physics.add.collider(this.corpo, quebraveis, undefined, (_j, pedra) => {
      if (!this.poder.quebraParede) return true;
      this.quebra(pedra as Estatico);
      return false;
    });
    this.physics.add.collider(this.corpo, grades, undefined, () => !this.poder.atravessaGrade);

    // Moedas: as do atalho de outra fruta aparecem apagadas, pra dar vontade de voltar.
    const minhas = moedasDoPoder(fase, poder.id);
    const grupoMoedas = this.physics.add.staticGroup();
    for (const m of fase.moedas) {
      const c = this.add.circle(m.x, m.y, 9, COR.moeda).setStrokeStyle(2, 0x9a7a1c);
      if (minhas.includes(m)) grupoMoedas.add(c);
      else c.setAlpha(0.28);
    }
    this.physics.add.overlap(this.corpo, grupoMoedas, (_j, moeda) => {
      const c = moeda as Phaser.GameObjects.Arc;
      (c.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      this.moedas++;
      this.tweens.add({ targets: c, y: c.y - 24, alpha: 0, scale: 1.6, duration: 220, onComplete: () => c.destroy() });
    });

    // Baú
    this.add.rectangle(fase.bau.x, fase.bau.y - 18, 44, 36, COR.bau).setStrokeStyle(3, 0x5a3c1e);
    this.add.rectangle(fase.bau.x, fase.bau.y - 24, 44, 4, 0x5a3c1e);
    // A área de chegada é uma coluna alta: quem passa quicando por cima do baú também chegou.
    const chegada = this.add.zone(fase.bau.x, fase.bau.y - 260, 44, 520);
    this.physics.add.existing(chegada, true);
    this.physics.add.overlap(this.corpo, chegada, () => this.chegar());

    this.efeitos = this.add.graphics();

    // Água por cima de tudo, com uma ondinha na superfície.
    this.add.rectangle(fase.largura / 2, AGUA_Y + (H - AGUA_Y) / 2 + 20, fase.largura, H - AGUA_Y + 40, COR.agua, 0.92);
    this.onda = this.add.graphics();

    this.hud = this.add
      .text(16, 12, "", { fontFamily: "monospace", fontSize: "20px", color: "#01121e", lineSpacing: 6 })
      .setScrollFactor(0);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, fase.largura, H);
    cam.startFollow(this.corpo, true, 0.14, 0.14);
    cam.setDeadzone(60, 160);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.teclas = kb.addKeys({
      esq: K.LEFT,
      dir: K.RIGHT,
      a: K.A,
      d: K.D,
      cima: K.UP,
      w: K.W,
      espaco: K.SPACE,
      z: K.Z,
      x: K.X,
      k: K.K,
      shift: K.SHIFT,
    }) as Teclas;
  }

  update(_t: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const b = this.corpo.body;

    if (this.estado === "jogando") {
      this.tempo += dt;
      this.movimenta(dt);
      if (afundou(b.bottom)) this.afundar();
    }

    // Visual segue o corpo (pés no chão).
    this.visual.setPosition(this.corpo.x, b.bottom);
    this.desenhaOnda();
    this.desenhaEfeitos();
    const total = moedasDoPoder(this.fase, this.poder.id).length;
    this.hud.setText(
      `${formataTempo(this.tempo)}   moedas ${this.moedas}/${total}` +
        (this.mortes ? `   afundou ${this.mortes}x` : "") +
        `\n${this.poder.nome}`,
    );
  }

  private movimenta(dt: number) {
    const t = this.teclas;
    const c = this.controles;
    const p = this.poder;
    const esq = t.esq.isDown || t.a.isDown || c.esq;
    const dir = t.dir.isDown || t.d.isDown || c.dir;
    const pulando = t.cima.isDown || t.w.isDown || t.espaco.isDown || t.z.isDown || c.pular;
    const usandoPoder = t.x.isDown || t.k.isDown || t.shift.isDown || c.poder;
    const apertouPulo = pulando && !this.pulandoAntes;
    const apertouPoder = usandoPoder && !this.poderAntes;
    this.pulandoAntes = pulando;
    this.poderAntes = usandoPoder;

    const b = this.corpo.body;
    const noChao = b.blocked.down || b.touching.down;
    const direcao = (dir ? 1 : 0) - (esq ? 1 : 0);
    if (direcao !== 0) this.olhar = direcao;
    this.olho.x = this.olhar * this.poder.largura * 0.22;

    // Borracha: o braço puxa até o gancho e ignora o resto do controle.
    if (p.gancho > 0 && apertouPoder) {
      const alvo = this.ganchoAlcancavel();
      if (alvo) {
        this.puxando = alvo;
        b.setAllowGravity(false);
        this.estica(1.25, 0.8);
      }
    }
    if (this.puxando) {
      const dx = this.puxando.x - this.corpo.x;
      const dy = this.puxando.y - this.corpo.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 28 || apertouPulo || noChao) {
        this.puxando = null;
        b.setAllowGravity(true);
        b.setVelocity(b.velocity.x * 0.8, Math.min(b.velocity.y * 0.5, -260));
        this.cortouPulo = true;
      } else {
        b.setVelocity((dx / dist) * VELOCIDADE_GANCHO, (dy / dist) * VELOCIDADE_GANCHO);
        this.deriva = 0;
        this.fimDoQuadro(noChao, b.velocity.y);
        return;
      }
    }

    // Vento: soma uma deriva por cima do que o jogador controla.
    let alvoDeriva = 0;
    if (p.vento > 0) {
      for (const v of this.fase.ventos) {
        const dentro = this.corpo.x > v.x && this.corpo.x < v.x + v.w && this.corpo.y > v.y && this.corpo.y < v.y + v.h;
        if (dentro && ventoLigado(v, this.tempo)) alvoDeriva += v.forca * p.vento * (noChao ? 0.5 : 1);
      }
    }
    const controle = b.velocity.x - this.deriva;
    this.deriva = aproxima(this.deriva, alvoDeriva, 500 * dt);
    b.setVelocityX(velocidadeX(controle, direcao, noChao, dt, p) + this.deriva);

    this.coyote = noChao ? COYOTE : this.coyote - dt;
    this.buffer = apertouPulo ? BUFFER_PULO : this.buffer - dt;

    // Quique da Borracha: cai forte, volta pra cima. Pular durante o quique aproveita o embalo.
    const vyQueda = this.vyAntes;
    if (noChao && !this.estavaNoChao) {
      const quicou = quique(vyQueda, p);
      if (quicou > 0) {
        b.setVelocityY(-quicou);
        this.cortouPulo = true;
        this.embalo = quicou;
        this.coyote = COYOTE_QUIQUE;
      }
    }
    if (noChao && b.velocity.y >= 0) this.embalo = 0;

    if (noChao) {
      this.usouDuplo = false;
      if (this.pisando) {
        this.pisando = false;
        this.cameras.main.shake(160, 0.008);
      }
    }

    // Soluço: pula sozinho quando quer, mas avisa antes e dá pra emendar um pulo de verdade.
    if (p.soluco) {
      const antes = this.soluco;
      this.soluco -= dt;
      if (antes > AVISO_SOLUCO && this.soluco <= AVISO_SOLUCO) {
        this.balao("h...");
        this.estica(1.15, 0.85);
      }
      if (this.soluco <= 0 && noChao) {
        this.soluco = proximoSoluco(Math.random());
        // Pulinho, não pulo inteiro: atrapalha sem ser sentença de morte.
        b.setVelocityY(-p.pulo * 0.65);
        this.coyote = JANELA_SOLUCO;
        this.cortouPulo = true;
        this.estica(0.8, 1.25);
        this.balao("hic!");
      }
    }

    if (this.buffer > 0 && this.coyote > 0) {
      b.setVelocityY(-Math.max(p.pulo, this.embalo + 160));
      this.embalo = 0;
      this.buffer = 0;
      this.coyote = 0;
      this.cortouPulo = false;
      this.estica(0.75, 1.3);
    } else if (!noChao && p.puloDuplo && !this.usouDuplo && (apertouPoder || (apertouPulo && this.coyote <= 0))) {
      // Nanica: segundo pulo no ar.
      this.usouDuplo = true;
      this.buffer = 0;
      b.setVelocityY(-p.pulo * 0.85);
      this.cortouPulo = false;
      this.estica(0.7, 1.35);
    } else if (!noChao && p.pisao && apertouPoder && !this.pisando) {
      // Gigante: pisão.
      this.pisando = true;
      b.setVelocity(0, p.quedaMax);
      this.cortouPulo = true;
      this.estica(0.8, 1.3);
    }

    // Soltou cedo: pulo baixinho.
    if (!pulando && b.velocity.y < 0 && !this.cortouPulo) {
      b.setVelocityY(b.velocity.y * p.corteDoPulo);
      this.cortouPulo = true;
    }

    // Fumaça: segurando no ar, cai devagar.
    if (p.plana > 0 && !noChao && (pulando || usandoPoder) && b.velocity.y > p.plana) {
      b.setVelocityY(p.plana);
    }

    if (noChao && !this.estavaNoChao && vyQueda > 250) {
      const forca = Math.min(vyQueda / p.quedaMax, 1);
      this.estica(1 + 0.35 * forca, 1 - 0.3 * forca);
    }
    this.fimDoQuadro(noChao, b.velocity.y);
  }

  private fimDoQuadro(noChao: boolean, vy: number) {
    this.estavaNoChao = noChao;
    this.vyAntes = vy;
  }

  /** Gancho mais perto dentro do alcance, preferindo os que estão na frente. */
  private ganchoAlcancavel(): Ponto | null {
    const { x, y } = this.corpo;
    let melhor: Ponto | null = null;
    let nota = Infinity;
    for (const g of this.fase.ganchos) {
      if (g === this.puxando) continue;
      const dist = Math.hypot(g.x - x, g.y - y);
      if (dist > this.poder.gancho || dist < 30) continue;
      const atras = (g.x - x) * this.olhar < -20;
      const n = dist + (atras ? 1000 : 0);
      if (n < nota) {
        nota = n;
        melhor = g;
      }
    }
    return melhor;
  }

  private pisouFragil(plat: Estatico) {
    if (!this.poder.quebraFragil || plat.getData("caindo") || !this.corpo.body.touching.down) return;
    plat.setData("caindo", true);
    const espera = this.pisando ? 50 : TEMPO_FRAGIL * 1000;
    const x0 = plat.x;
    this.tweens.add({ targets: plat, x: x0 + 3, duration: 40, yoyo: true, repeat: Math.floor(espera / 80) });
    this.time.delayedCall(espera, () => {
      plat.body.enable = false;
      plat.x = x0;
      this.tweens.add({ targets: plat, y: plat.y + 60, alpha: 0, duration: 300 });
    });
  }

  private quebra(pedra: Estatico) {
    pedra.body.enable = false;
    (pedra.getData("rachas") as Phaser.GameObjects.Graphics | undefined)?.destroy();
    this.cameras.main.shake(120, 0.006);
    const { x, y, width, height } = pedra;
    for (let i = 0; i < 8; i++) {
      const caco = this.add.rectangle(x + (Math.random() - 0.5) * width, y + (Math.random() - 0.5) * height, 14, 12, COR.quebravel);
      this.tweens.add({
        targets: caco,
        x: caco.x + (Math.random() - 0.5) * 140,
        y: caco.y + 60 + Math.random() * 60,
        angle: (Math.random() - 0.5) * 360,
        alpha: 0,
        duration: 500,
        onComplete: () => caco.destroy(),
      });
    }
    // Destrói fora do passo da física, que ainda está percorrendo o grupo.
    pedra.setVisible(false);
    this.time.delayedCall(0, () => pedra.destroy());
  }

  private balao(texto: string) {
    const t = this.add
      .text(this.corpo.x, this.corpo.body.top - 10, texto, { fontFamily: "monospace", fontSize: "18px", color: "#8e44ad" })
      .setOrigin(0.5, 1);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  private estica(sx: number, sy: number) {
    this.tweens.killTweensOf(this.visual);
    this.visual.setScale(sx, sy);
    this.tweens.add({ targets: this.visual, scaleX: 1, scaleY: 1, duration: 160, ease: "Back.Out" });
  }

  private afundar() {
    this.estado = "afundando";
    this.puxando = null;
    const b = this.corpo.body;
    b.setAllowGravity(false);
    b.setVelocity(0, 55);
    this.estica(1.3, 0.7);
    this.tweens.add({ targets: this.visual, alpha: 0.15, duration: 650 });
    this.cameras.main.shake(140, 0.004);
    this.time.delayedCall(750, () => this.scene.restart({ mortes: this.mortes + 1, poder: this.poder.id }));
  }

  private chegar() {
    if (this.estado !== "jogando") return;
    this.estado = "chegou";
    this.puxando = null;
    this.corpo.body.setVelocity(0, 0);
    this.corpo.body.setAllowGravity(false);
    this.estica(1.2, 1.2);
    const total = moedasDoPoder(this.fase, this.poder.id).length;
    const r: Resultado = { tempo: this.tempo, moedas: this.moedas, totalMoedas: total };
    this.ganchos.aoChegar({ ...r, estrelas: estrelas(r, this.fase), mortes: this.mortes, poder: this.poder.id as PoderId });
  }

  private desenhaEfeitos() {
    const g = this.efeitos;
    g.clear();
    const cam = this.cameras.main;

    // Rajadas de vento: risquinhos correndo na direção do vento.
    for (const v of this.fase.ventos) {
      if (!ventoLigado(v, this.tempo)) continue;
      g.lineStyle(2, COR.vento, 0.45);
      const sentido = Math.sign(v.forca);
      for (let i = 0; i < 26; i++) {
        const x = v.x + ((((i * 137 + sentido * this.tempo * 420) % v.w) + v.w) % v.w);
        const y = cam.scrollY + 40 + ((i * 53) % (AGUA_Y - 60));
        g.lineBetween(x, y, x - sentido * 26, y);
      }
    }

    // Borracha: gancho ao alcance acende; puxando, desenha o braço.
    if (this.poder.gancho > 0 && this.estado === "jogando") {
      const alvo = this.puxando ?? this.ganchoAlcancavel();
      if (alvo) {
        g.lineStyle(3, COR.braco, 0.9);
        g.strokeCircle(alvo.x, alvo.y, 14);
      }
      if (this.puxando) {
        g.lineStyle(6, COR.braco, 1);
        g.lineBetween(this.corpo.x, this.corpo.y - 4, this.puxando.x, this.puxando.y);
      }
    }
  }

  private desenhaOnda() {
    const g = this.onda;
    const cam = this.cameras.main;
    const t = this.time.now / 1000;
    g.clear();
    g.fillStyle(COR.aguaTopo, 1);
    g.beginPath();
    const x0 = Math.floor(cam.scrollX) - 20;
    g.moveTo(x0, AGUA_Y + 12);
    for (let x = x0; x <= x0 + W + 40; x += 12) {
      g.lineTo(x, AGUA_Y + Math.sin(x * 0.025 + t * 2.4) * 3);
    }
    g.lineTo(x0 + W + 40, AGUA_Y + 12);
    g.closePath();
    g.fillPath();
  }
}

export type Jogo = { reiniciar: (poder: PoderId) => void; destruir: () => void };

export function criarJogo(pai: HTMLElement, controles: Controles, ganchos: Ganchos, poder: PoderId): Jogo {
  const cena = new CenaFase(controles, ganchos);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: pai,
    width: W,
    height: H,
    backgroundColor: "#dfe4e8",
    banner: false,
    disableContextMenu: true,
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: PODERES[poder].gravidade } } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  });
  game.scene.add("fase", cena, true, { poder });
  return {
    reiniciar: (p) => game.scene.getScene("fase")?.scene.restart({ mortes: 0, poder: p }),
    destruir: () => game.destroy(true),
  };
}
