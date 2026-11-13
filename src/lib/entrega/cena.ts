// Cena do Phaser do Entrega na Chuva. Só é importada no navegador (import dinâmico no componente).
import * as Phaser from "phaser";
import { COR, ENTREGA, NEON, TEXTOS, type Acao } from "./config";
import { caminho, lerBairro, sortearPedido, type Bairro, type Pedido, type Ret, type Tiled } from "./mapa";
import { aderenciaEfetiva, danoDaBatida, intensidadeChuva, multiplicadorSequencia, resumir, statusDoPrazo, type Atributos, type PedidoFeito, type TurnoEnviado } from "./regras";

const C = ENTREGA;
const H_ = TEXTOS.hud;
const URL_MAPA = "/jogos/entrega-na-chuva/bairro.tmj";
const URL_TILES = "/jogos/entrega-na-chuva/bairro-tiles.png";

/** Estado do toque, escrito pelo React e lido a cada quadro. */
export type Toque = { ativo: boolean; ang: number; forca: number; freio: boolean; nitro: boolean };
export type OpcoesTurno = {
  atributos: Atributos;
  teclas: Record<Acao, string[]>;
  chuvaVisivel: boolean;
  piscarMenos: boolean;
  relaxado: boolean;
  reduzido: boolean;
  fonte: string;
};
export type Ganchos = { aoTerminar: (t: TurnoEnviado) => void };
export type Turno = { pausar: (p: boolean) => void; destruir: () => void };

type Carro = { obj: Phaser.GameObjects.Rectangle; rota: { x: number; y: number }[]; i: number; t: number };
type Drone = { obj: Phaser.GameObjects.Arc; area: Ret; segue: boolean; folgaAte: number; fase: number };
type Beco = { area: Ret; barreira: Phaser.GameObjects.Rectangle; aviso: Phaser.GameObjects.Text; fechado: boolean; ate: number };

class CenaTurno extends Phaser.Scene {
  private b!: Bairro;
  private moto!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
  private desenhoMoto!: Phaser.GameObjects.Container;
  private rumo = -Math.PI / 2;
  private vel = 0;
  private teclas: Partial<Record<Acao, Phaser.Input.Keyboard.Key[]>> = {};
  private carros: Carro[] = [];
  private drones: Drone[] = [];
  private becos: Beco[] = [];
  private pocas: Phaser.Geom.Rectangle[] = [];
  private presoAte = 0;
  private batidaAte = 0;
  private nitroAte = 0;
  private nitros = 0;

  private pedido!: Pedido;
  private fase: "coleta" | "entrega" = "coleta";
  private coletadoEm = 0;
  private estado = 100;
  private parado = 0;
  private feitos: PedidoFeito[] = [];
  private sequencia = 0;
  private creditos = 0;
  private decorrido = 0;
  private acabou = false;

  private zona!: Phaser.GameObjects.Graphics;
  private gps!: Phaser.GameObjects.Graphics;
  private gpsEm = 0;
  private gpsPontos: { x: number; y: number }[] = [];
  private placas: Phaser.GameObjects.Text[] = [];

  private ui!: Phaser.Cameras.Scene2D.Camera;
  private hud!: {
    tempo: Phaser.GameObjects.Text;
    pedido: Phaser.GameObjects.Text;
    direita: Phaser.GameObjects.Text;
    pacote: Phaser.GameObjects.Graphics;
    pacoteTxt: Phaser.GameObjects.Text;
    seta: Phaser.GameObjects.Graphics;
    setaTxt: Phaser.GameObjects.Text;
    avisos: Phaser.GameObjects.Graphics;
    msg: Phaser.GameObjects.Text;
  };
  private chuva?: Phaser.GameObjects.Particles.ParticleEmitter;
  private faixaChuva = new Phaser.Geom.Rectangle(-40, -20, 800, 10);
  private fpsBaixo = 0;
  private qualidade = 1;

  constructor(
    private o: OpcoesTurno,
    private toque: Toque,
    private ganchos: Ganchos,
  ) {
    super("turno");
  }

  preload() {
    this.load.tilemapTiledJSON("bairro", URL_MAPA);
    this.load.image("tiles-bairro", URL_TILES);
  }

  create() {
    this.b = lerBairro(this.cache.tilemap.get("bairro").data as Tiled);
    const mapa = this.make.tilemap({ key: "bairro" });
    const ts = mapa.addTilesetImage("bairro", "tiles-bairro")!;
    mapa.createLayer("ruas", ts, 0, 0);
    const predios = mapa.createLayer("predios", ts, 0, 0)!;
    predios.setCollision(2);
    const W = mapa.widthInPixels;
    const H = mapa.heightInPixels;
    this.physics.world.setBounds(0, 0, W, H);

    // Luz dos postes nos cruzamentos.
    const luz = this.add.graphics();
    for (const r of this.b.rotas) for (const p of r) {
      luz.fillStyle(COR.laranjaClaro, 0.08).fillCircle(p.x, p.y, 70);
      luz.fillStyle(COR.laranjaClaro, 0.1).fillCircle(p.x, p.y, 34);
    }

    // Poças refletindo as placas.
    const pg = this.add.graphics();
    for (const p of this.b.pocas) {
      this.pocas.push(new Phaser.Geom.Rectangle(p.x, p.y, p.w, p.h));
      pg.fillStyle(COR.poca, 0.85).fillRoundedRect(p.x + 4, p.y + 6, p.w - 8, p.h - 12, 18);
      pg.fillStyle(NEON.rosa, 0.25).fillRect(p.x + 14, p.y + 18, p.w * 0.35, 3);
      pg.fillStyle(NEON.ciano, 0.25).fillRect(p.x + p.w * 0.45, p.y + p.h - 22, p.w * 0.3, 3);
    }

    // Placas (tema Neon só no cenário).
    for (const p of this.b.placas) {
      const cor = (p as { cor?: string }).cor === "ciano" ? NEON.ciano : NEON.rosa;
      const t = this.add
        .text(p.x, p.y, p.nome, { fontFamily: this.o.fonte, fontSize: "11px", color: `#${cor.toString(16)}` })
        .setOrigin(0.5)
        .setStroke("#01121e", 3);
      this.placas.push(t);
    }
    if (!this.o.reduzido && !this.o.piscarMenos)
      this.time.addEvent({
        delay: 1800,
        loop: true,
        callback: () => {
          const t = Phaser.Utils.Array.GetRandom(this.placas);
          if (t) this.tweens.add({ targets: t, alpha: 0.35, duration: 90, yoyo: true, repeat: 1 });
        },
      });

    // Pontos de coleta e endereços: marquinhas discretas no chão.
    const marcas = this.add.graphics();
    for (const p of this.b.coletas) marcas.lineStyle(2, COR.creme, 0.25).strokeCircle(p.x, p.y, 8);
    for (const p of this.b.enderecos) marcas.fillStyle(COR.creme, 0.18).fillRect(p.x - 4, p.y - 4, 8, 8);

    this.gps = this.add.graphics();
    this.zona = this.add.graphics();

    // Becos.
    for (const a of this.b.becos) {
      const barreira = this.add.rectangle(a.x + a.w / 2, a.y + a.h / 2, a.w, a.h, COR.laranja, 0.28).setStrokeStyle(2, COR.laranjaClaro).setVisible(false);
      this.physics.add.existing(barreira, true);
      (barreira.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      const aviso = this.add
        .text(a.x + a.w / 2, a.y + a.h / 2, "⛔ BECO FECHADO", { fontFamily: this.o.fonte, fontSize: "11px", color: "#ece3be", backgroundColor: "#01121e" })
        .setOrigin(0.5)
        .setPadding(3)
        .setVisible(false);
      this.becos.push({ area: a, barreira, aviso, fechado: false, ate: Number(a.props.abertoS ?? 8) * 1000 });
    }

    // Moto: corpo físico invisível e o desenho por cima.
    const inicio = this.b.coletas[0];
    this.moto = this.add.rectangle(inicio.x, inicio.y, 16, 16, 0, 0) as typeof this.moto;
    this.physics.add.existing(this.moto);
    this.moto.body.setCollideWorldBounds(true).setBounce(0.25);
    const farol = this.add.triangle(0, 0, 0, 0, 70, -22, 70, 22, COR.creme, 0.1);
    farol.setOrigin(0, 0.5);
    this.desenhoMoto = this.add.container(inicio.x, inicio.y, [
      farol,
      this.add.rectangle(0, 0, 22, 9, COR.ceuFundo).setStrokeStyle(2, COR.laranja),
      this.add.rectangle(8, 0, 4, 9, COR.laranja),
      this.add.circle(-2, 0, 4.5, COR.creme),
      this.add.rectangle(-9, 0, 5, 12, COR.laranja), // bag de entrega
    ]);
    this.physics.add.collider(this.moto, predios, () => this.bater());
    for (const be of this.becos) this.physics.add.collider(this.moto, be.barreira, () => this.bater());

    // Carros e drones.
    for (const r of this.b.rotas) {
      const obj = this.add.rectangle(r[0].x, r[0].y, 26, 14, COR.carro).setStrokeStyle(2, COR.ceuFundo);
      this.carros.push({ obj, rota: r, i: 0, t: Math.random() });
    }
    for (const a of this.b.drones) {
      const obj = this.add.circle(a.x + a.w / 2, a.y + a.h / 2, 9, COR.drone, 0.9).setStrokeStyle(2, NEON.ciano);
      this.drones.push({ obj, area: a, segue: false, folgaAte: 0, fase: Math.random() * 6 });
    }

    // Câmeras: a principal segue a moto, a de interface desenha o HUD por cima.
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H).setZoom(this.o.atributos.zoom).startFollow(this.desenhoMoto, true, C.camera.lerp, C.camera.lerp);
    cam.setBackgroundColor(COR.ceu);
    this.ui = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.ui.ignore(this.children.list);

    this.criarHud();
    this.criarChuva();
    this.scale.on("resize", (s: Phaser.Structs.Size) => {
      this.ui.setSize(s.width, s.height);
      this.layoutHud();
    });

    // Teclado (remapeável).
    const kb = this.input.keyboard!;
    for (const [acao, nomes] of Object.entries(this.o.teclas) as [Acao, string[]][]) {
      if (acao === "pausa") continue; // o React cuida da pausa
      this.teclas[acao] = nomes.flatMap((n) => (n in Phaser.Input.Keyboard.KeyCodes ? [kb.addKey(n, true)] : []));
    }

    this.nitros = this.o.atributos.nitroCargas;
    this.novoPedido();
  }

  private naUi<T extends Phaser.GameObjects.GameObject>(g: T): T {
    this.cameras.main.ignore(g);
    return g;
  }

  private criarHud() {
    const estilo = { fontFamily: this.o.fonte, fontSize: "14px", color: "#ece3be" };
    const fundo = "#01121ecc";
    this.hud = {
      tempo: this.naUi(this.add.text(0, 0, "", { ...estilo, backgroundColor: fundo }).setPadding(8, 6)),
      pedido: this.naUi(this.add.text(0, 0, "", { ...estilo, backgroundColor: fundo, align: "center" }).setPadding(10, 6).setOrigin(0.5, 0)),
      direita: this.naUi(this.add.text(0, 0, "", { ...estilo, backgroundColor: fundo, align: "right" }).setPadding(8, 6).setOrigin(1, 0)),
      pacote: this.naUi(this.add.graphics()),
      pacoteTxt: this.naUi(this.add.text(0, 0, "", { ...estilo, fontSize: "12px" })),
      seta: this.naUi(this.add.graphics()),
      setaTxt: this.naUi(this.add.text(0, 0, "", { ...estilo, fontSize: "12px", color: "#01121e" }).setOrigin(0.5)),
      avisos: this.naUi(this.add.graphics()),
      msg: this.naUi(this.add.text(0, 0, "", { ...estilo, fontSize: "22px", fontStyle: "bold", backgroundColor: fundo }).setPadding(12, 8).setOrigin(0.5).setAlpha(0)),
    };
    this.layoutHud();
  }

  private layoutHud() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.hud.tempo.setPosition(10, 10);
    this.hud.pedido.setPosition(w / 2, 10).setWordWrapWidth(Math.min(420, w * 0.5));
    this.hud.direita.setPosition(w - 10, 10);
    this.hud.pacoteTxt.setPosition(10, 52);
    this.hud.msg.setPosition(w / 2, h * 0.36);
    this.faixaChuva.setSize(w + 80, 10);
  }

  private criarChuva() {
    if (!this.o.chuvaVisivel) return;
    const g = this.make.graphics({}, false);
    g.fillStyle(0xd6deec, 0.55).fillRect(0, 0, 2, 12);
    g.generateTexture("gota", 2, 12);
    g.destroy();
    const max = this.o.reduzido ? C.chuva.particulasReduzido : C.chuva.particulasMax;
    this.chuva = this.add.particles(0, 0, "gota", {
      speedY: { min: 560, max: 760 },
      speedX: { min: -90, max: -60 },
      rotate: 8,
      lifespan: 1400,
      quantity: 2,
      frequency: 30,
      maxParticles: max,
      alpha: { start: 0.7, end: 0.3 },
      emitZone: { type: "random", source: this.faixaChuva, quantity: 0 },
    });
    this.cameras.main.ignore(this.chuva);
    this.layoutHud();
  }

  private mensagem(txt: string) {
    const m = this.hud.msg;
    m.setText(txt).setAlpha(1);
    this.tweens.killTweensOf(m);
    this.tweens.add({ targets: m, alpha: 0, delay: 1100, duration: this.o.reduzido ? 1 : 400 });
  }

  private novoPedido() {
    this.pedido = sortearPedido(this.b, Math.random, this.o.relaxado);
    this.fase = "coleta";
    this.estado = 100;
    this.parado = 0;
    this.gpsEm = 0;
  }

  private bater() {
    const agora = this.time.now;
    if (agora < this.batidaAte || Math.abs(this.vel) < 40) return;
    this.batidaAte = agora + C.dano.intervaloMs;
    this.vel *= 0.3;
    if (this.fase === "entrega") this.estado = Math.max(0, this.estado - danoDaBatida(this.pedido.fragil, this.o.atributos.amortecedor));
    if (!this.o.reduzido) this.cameras.main.shake(120, 0.004);
  }

  private alvo() {
    return this.fase === "coleta" ? this.pedido.coleta : this.pedido.entrega;
  }

  private ativo(a: Acao) {
    return (this.teclas[a] ?? []).some((k) => k.isDown);
  }

  update(_: number, deltaMs: number) {
    if (this.acabou) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    this.decorrido += dt * 1000;
    const agora = this.time.now;
    const fracao = this.decorrido / C.turnoMs;
    const chuva = intensidadeChuva(fracao);
    const atr = this.o.atributos;

    // ---- controles ----
    let acel = 0;
    let giro = 0;
    let freio = this.ativo("baixo") || this.toque.freio;
    if (this.ativo("cima")) acel = 1;
    if (this.ativo("esquerda")) giro -= 1;
    if (this.ativo("direita")) giro += 1;
    if (this.toque.ativo && this.toque.forca > 0.15) {
      const dif = Phaser.Math.Angle.Wrap(this.toque.ang - this.rumo);
      giro = Phaser.Math.Clamp(dif * 2.5, -1, 1);
      acel = Math.abs(dif) > 2.4 ? 0 : this.toque.forca;
      if (Math.abs(dif) > 2.4) freio = true;
    }
    if ((this.ativo("nitro") || this.toque.nitro) && this.nitros > 0 && agora > this.nitroAte) {
      this.nitros--;
      this.nitroAte = agora + C.moto.nitroMs;
      this.toque.nitro = false;
    }

    // ---- física arcade ----
    const preso = agora < this.presoAte;
    const nitro = agora < this.nitroAte;
    const topo = atr.velMax * (nitro ? C.moto.nitroVel : 1);
    if (preso) this.vel = 0;
    else if (freio) this.vel = this.vel > 0 ? Math.max(0, this.vel - C.moto.freio * dt) : Math.max(-C.moto.re, this.vel - C.moto.acel * 0.5 * dt);
    else if (acel > 0 || nitro) this.vel = Math.min(topo, this.vel + C.moto.acel * Math.max(acel, nitro ? 1 : 0) * dt);
    else this.vel *= Math.pow(0.35, dt);
    if (this.vel > topo) this.vel = Math.max(topo, this.vel - C.moto.freio * dt);
    const fatorGiro = Math.min(1, Math.abs(this.vel) / 90) * Math.sign(this.vel || 1);
    this.rumo += giro * C.moto.giro * dt * fatorGiro;

    const naPoca = this.pocas.some((p) => p.contains(this.moto.x, this.moto.y));
    const ader = aderenciaEfetiva(atr.aderencia, chuva, naPoca);
    const corpo = this.moto.body;
    const desejo = new Phaser.Math.Vector2(Math.cos(this.rumo), Math.sin(this.rumo)).scale(this.vel);
    const k = 1 - Math.exp(-ader * dt);
    corpo.setVelocity(corpo.velocity.x + (desejo.x - corpo.velocity.x) * k, corpo.velocity.y + (desejo.y - corpo.velocity.y) * k);
    this.desenhoMoto.setPosition(this.moto.x, this.moto.y).setRotation(this.rumo);

    this.atualizarPerigos(dt, agora);
    this.atualizarPedido(dt);
    this.atualizarGps(agora, atr.gps);
    this.desenharZona();
    this.atualizarHud(preso, nitro);
    this.cuidarDaChuva(chuva, deltaMs);

    if (this.decorrido >= C.turnoMs) {
      this.acabou = true;
      this.physics.pause();
      this.ganchos.aoTerminar({ duracaoMs: C.turnoMs, relaxado: this.o.relaxado, pedidos: this.feitos });
    }
  }

  private atualizarPerigos(dt: number, agora: number) {
    const m = this.moto;
    // Carros: andam nas rotas fixas.
    for (const c of this.carros) {
      const a = c.rota[c.i];
      const b = c.rota[(c.i + 1) % c.rota.length];
      const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) || 1;
      c.t += (C.perigos.carroVel * dt) / dist;
      if (c.t >= 1) {
        c.t = 0;
        c.i = (c.i + 1) % c.rota.length;
      }
      c.obj.setPosition(a.x + (b.x - a.x) * c.t, a.y + (b.y - a.y) * c.t).setRotation(Math.atan2(b.y - a.y, b.x - a.x));
      if (Phaser.Math.Distance.Between(c.obj.x, c.obj.y, m.x, m.y) < 18 && agora > this.batidaAte) {
        const ang = Math.atan2(m.y - c.obj.y, m.x - c.obj.x);
        m.body.setVelocity(Math.cos(ang) * 160, Math.sin(ang) * 160);
        this.vel = Math.max(Math.abs(this.vel), 41) * Math.sign(this.vel || 1);
        this.bater();
      }
    }
    // Drones: patrulham a área e seguem a moto se ela passar perto.
    for (const d of this.drones) {
      const cx = d.area.x + d.area.w / 2;
      const cy = d.area.y + d.area.h / 2;
      const perto = Phaser.Math.Distance.Between(cx, cy, m.x, m.y) < C.perigos.droneAlcance;
      d.fase += dt;
      if (perto && agora > d.folgaAte) {
        const ang = Math.atan2(m.y - d.obj.y, m.x - d.obj.x);
        d.obj.x += Math.cos(ang) * C.perigos.droneVel * dt;
        d.obj.y += Math.sin(ang) * C.perigos.droneVel * dt;
      } else {
        const tx = cx + Math.cos(d.fase * 0.9) * d.area.w * 0.4;
        const ty = cy + Math.sin(d.fase * 1.3) * d.area.h * 0.4;
        d.obj.x += (tx - d.obj.x) * Math.min(1, dt * 2);
        d.obj.y += (ty - d.obj.y) * Math.min(1, dt * 2);
      }
      if (Phaser.Math.Distance.Between(d.obj.x, d.obj.y, m.x, m.y) < 16 && agora > d.folgaAte) {
        this.presoAte = agora + C.perigos.droneSeguraMs;
        d.folgaAte = agora + C.perigos.droneSeguraMs + 2500;
        m.body.setVelocity(0, 0);
        this.mensagem(H_.drone);
      }
    }
    // Becos: abrem e fecham.
    for (const be of this.becos) {
      be.ate -= dt * 1000;
      if (be.ate > 0) continue;
      const dentro = Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(be.area.x, be.area.y, be.area.w, be.area.h), m.x, m.y);
      if (!be.fechado && dentro) continue; // espera a moto sair
      be.fechado = !be.fechado;
      be.ate = Number(be.fechado ? be.area.props.fechadoS ?? 4 : be.area.props.abertoS ?? 8) * 1000;
      be.barreira.setVisible(be.fechado);
      be.aviso.setVisible(be.fechado);
      (be.barreira.body as Phaser.Physics.Arcade.StaticBody).enable = be.fechado;
    }
  }

  private atualizarPedido(dt: number) {
    const p = this.pedido;
    if (this.fase === "entrega") {
      const passou = (this.decorrido - this.coletadoEm) / 1000;
      if (statusDoPrazo(passou, p.prazoS) === "cancelado") {
        this.feitos.push({ base: p.base, fragil: p.fragil, status: "cancelado", estado: Math.round(this.estado) });
        this.sequencia = 0;
        this.mensagem(H_.cancelado);
        this.novoPedido();
        return;
      }
    }
    const a = this.alvo();
    const dentro = Phaser.Math.Distance.Between(a.x, a.y, this.moto.x, this.moto.y) < C.pedido.raio;
    const devagar = this.moto.body.speed < C.pedido.velParada;
    this.parado = dentro && devagar ? this.parado + dt * 1000 : 0;
    if (this.parado < C.pedido.paradaMs) return;
    this.parado = 0;
    if (this.fase === "coleta") {
      this.fase = "entrega";
      this.coletadoEm = this.decorrido;
      this.gpsEm = 0;
      this.mensagem(H_.coletado);
      return;
    }
    const passou = (this.decorrido - this.coletadoEm) / 1000;
    const status = statusDoPrazo(passou, p.prazoS);
    const feito: PedidoFeito = { base: p.base, fragil: p.fragil, status, estado: Math.round(this.estado) };
    this.feitos.push(feito);
    // Mesmo cálculo do servidor, refeito a cada entrega pro HUD.
    this.sequencia = status === "no_prazo" ? this.sequencia + 1 : 0;
    const antes = this.creditos;
    this.creditos = this.totalCreditos();
    this.mensagem(status === "no_prazo" ? `${H_.entregue}${this.creditos - antes}` : `${H_.atrasado}  ${H_.entregue}${this.creditos - antes}`);
    this.novoPedido();
  }

  private totalCreditos() {
    return resumir({ duracaoMs: C.turnoMs, relaxado: this.o.relaxado, pedidos: this.feitos }).creditsEarned;
  }

  private atualizarGps(agora: number, nivel: number) {
    if (nivel <= 0) return;
    if (agora > this.gpsEm) {
      const a = this.alvo();
      this.gpsPontos = caminho(this.b, this.moto.x, this.moto.y, a.x, a.y);
      this.gpsEm = agora + 400;
    }
    const g = this.gps.clear();
    if (this.gpsPontos.length < 2) return;
    g.lineStyle(4, COR.laranjaClaro, 0.45).beginPath().moveTo(this.gpsPontos[0].x, this.gpsPontos[0].y);
    for (const p of this.gpsPontos) g.lineTo(p.x, p.y);
    g.strokePath();
  }

  private desenharZona() {
    const a = this.alvo();
    const g = this.zona.clear();
    g.fillStyle(COR.laranjaClaro, 0.16).fillCircle(a.x, a.y, C.pedido.raio);
    g.lineStyle(3, COR.laranjaClaro, 1).strokeCircle(a.x, a.y, C.pedido.raio);
    // Ícone: coleta = caixa, entrega = casinha (forma, não só cor).
    g.fillStyle(COR.laranjaClaro, 1);
    if (this.fase === "coleta") g.fillRect(a.x - 7, a.y - 7, 14, 14);
    else g.fillTriangle(a.x - 9, a.y, a.x + 9, a.y, a.x, a.y - 10).fillRect(a.x - 6, a.y, 12, 8);
    if (this.parado > 0) g.lineStyle(5, COR.creme, 1).beginPath().arc(a.x, a.y, C.pedido.raio + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * this.parado) / C.pedido.paradaMs).strokePath();
  }

  private atualizarHud(preso: boolean, nitro: boolean) {
    const h = this.hud;
    const resta = Math.max(0, C.turnoMs - this.decorrido) / 1000;
    const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    h.tempo.setText(`${H_.tempo} ${mmss(resta)}`);
    const p = this.pedido;
    const fragil = p.fragil ? `  ${H_.fragil}` : "";
    if (this.fase === "coleta") h.pedido.setText(`${H_.coletar}\n${p.coleta.nome}${fragil}`);
    else {
      const passou = (this.decorrido - this.coletadoEm) / 1000;
      const falta = p.prazoS - passou;
      const prazo = falta >= 0 ? `${H_.prazo} ${mmss(falta)}` : `${H_.atrasado} +${mmss(-falta)}`;
      h.pedido.setText(`${H_.entregar}\n${p.entrega.nome}${fragil}\n${prazo}`);
      h.pedido.setColor(falta >= 0 ? "#ece3be" : "#f2a66e");
    }
    const mult = multiplicadorSequencia(this.sequencia + 1);
    const cargas = this.o.atributos.nitroCargas > 0 ? `\n${H_.nitro} ${"●".repeat(this.nitros)}${"○".repeat(Math.max(0, this.o.atributos.nitroCargas - this.nitros))}${nitro ? " »" : ""}` : "";
    h.direita.setText(`${H_.creditos} ${this.creditos}\n${H_.sequencia}${mult} (${this.sequencia})${cargas}`);

    // Estado do pacote: barra + número.
    const g = h.pacote.clear();
    if (this.fase === "entrega") {
      g.fillStyle(0x01121e, 0.8).fillRoundedRect(10, 70, 124, 12, 4);
      g.fillStyle(this.estado > 40 ? COR.creme : COR.laranjaClaro, 1).fillRoundedRect(12, 72, 120 * (this.estado / 100), 8, 3);
      h.pacoteTxt.setText(`${H_.pacote} ${Math.round(this.estado)}%${preso ? `  ${H_.drone}` : ""}`);
    } else h.pacoteTxt.setText(preso ? H_.drone : "");

    this.desenharSeta();
    this.desenharAvisos();
  }

  private desenharSeta() {
    const cam = this.cameras.main;
    const a = this.alvo();
    const g = this.hud.seta.clear();
    const view = cam.worldView;
    const t = this.hud.setaTxt;
    const w = this.scale.width;
    const h = this.scale.height;
    const sx = (a.x - view.x) * cam.zoom;
    const sy = (a.y - view.y) * cam.zoom;
    const icone = this.fase === "coleta" ? "■" : "⌂";
    if (sx > 20 && sx < w - 20 && sy > 20 && sy < h - 20) {
      t.setVisible(false);
      return;
    }
    const cx = w / 2;
    const cy = h / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const m = 34;
    const k = Math.min(Math.abs((w / 2 - m) / Math.cos(ang)), Math.abs((h / 2 - m) / Math.sin(ang)));
    const x = cx + Math.cos(ang) * k;
    const y = cy + Math.sin(ang) * k;
    const pt = (r: number, da: number) => ({ x: x + Math.cos(ang + da) * r, y: y + Math.sin(ang + da) * r });
    const p1 = pt(26, 0);
    const p2 = pt(16, 2.4);
    const p3 = pt(16, -2.4);
    g.fillStyle(COR.laranjaClaro, 1).fillCircle(x, y, 15).fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    g.lineStyle(2, 0x01121e, 1).strokeCircle(x, y, 15);
    t.setVisible(true).setPosition(x, y).setText(icone);
  }

  private desenharAvisos() {
    const g = this.hud.avisos.clear();
    const seg = this.o.atributos.avisoS;
    if (seg <= 0) return;
    const cam = this.cameras.main;
    const v = cam.worldView;
    const alcance = Math.max(v.width, v.height) / 2 + seg * C.perigos.carroVel;
    const w = this.scale.width;
    const h = this.scale.height;
    const objs = [...this.carros.map((c) => c.obj), ...this.drones.map((d) => d.obj)];
    for (const o of objs) {
      if (v.contains(o.x, o.y)) continue;
      if (Phaser.Math.Distance.Between(o.x, o.y, this.moto.x, this.moto.y) > alcance) continue;
      const sx = Phaser.Math.Clamp((o.x - v.x) * cam.zoom, 14, w - 14);
      const sy = Phaser.Math.Clamp((o.y - v.y) * cam.zoom, 14, h - 14);
      // Triângulo de alerta (forma), com contorno.
      g.fillStyle(0xece3be, 0.95).fillTriangle(sx, sy - 10, sx - 10, sy + 8, sx + 10, sy + 8);
      g.fillStyle(0x01121e, 1).fillRect(sx - 1.5, sy - 4, 3, 7).fillRect(sx - 1.5, sy + 4.5, 3, 2);
    }
  }

  private cuidarDaChuva(intensidade: number, deltaMs: number) {
    if (!this.chuva) return;
    // Cai a qualidade se o FPS ficar baixo por alguns segundos.
    if (this.game.loop.actualFps < C.chuva.fpsMinimo) this.fpsBaixo += deltaMs;
    else this.fpsBaixo = 0;
    if (this.fpsBaixo > C.chuva.segundosFpsBaixo * 1000 && this.qualidade > 0) {
      this.qualidade = this.qualidade > 0.5 ? 0.4 : 0;
      this.fpsBaixo = 0;
      if (this.qualidade === 0) {
        this.chuva.stop();
        return;
      }
      this.chuva.maxParticles = Math.floor(this.chuva.maxParticles * this.qualidade);
    }
    this.chuva.frequency = Math.max(12, 70 - 55 * intensidade);
  }

  pausar(p: boolean) {
    if (p) this.scene.pause();
    else this.scene.resume();
  }
}

export function criarTurno(pai: HTMLElement, o: OpcoesTurno, toque: Toque, ganchos: Ganchos): Turno {
  const cena = new CenaTurno(o, toque, ganchos);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: pai,
    backgroundColor: "#0b2340",
    banner: false,
    disableContextMenu: true,
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
    scale: { mode: Phaser.Scale.RESIZE, width: pai.clientWidth || 800, height: pai.clientHeight || 450 },
    input: { keyboard: { target: window } },
    scene: cena,
  });
  return {
    pausar: (p) => cena.pausar(p),
    destruir: () => game.destroy(true),
  };
}
