// Lógica pura do "Duelo Pirata": personagens, golpes, física, acertos, rounds e CPU.
// Nada de DOM aqui. O componente DueloPirata chama passo() a cada frame e desenha o resultado.

export const W = 960;
export const H = 540;
export const CHAO = 470;
export const MARGEM = 46; // ninguém sai da tela
const GRAV = 2700;
export const ROUND_TEMPO = 60;
export const VITORIAS = 2; // melhor de 3
const INTRO = 1.8;
const POS_KO = 3;

export type Botao = "soco" | "chute" | "especial";

export type Entrada = {
  esq: boolean;
  dir: boolean;
  cima: boolean;
  baixo: boolean;
  soco: boolean;
  chute: boolean;
  especial: boolean;
};

export const entradaVazia = (): Entrada => ({ esq: false, dir: false, cima: false, baixo: false, soco: false, chute: false, especial: false });

export type Pose = "soco" | "rajada" | "chute" | "chuteAlto" | "rasteira" | "corte" | "corteBaixo" | "chuteFogo" | "bastao" | "raio";

export type Projetil = {
  dono: 0 | 1;
  tipo: "corte" | "raio";
  x: number; // centro
  alt: number; // altura do centro acima do chão
  vx: number;
  w: number;
  h: number;
  dano: number;
  vida: number;
  atraso: number; // tempo até "nascer" (o raio forma a nuvem antes)
  face: 1 | -1;
};

export type Golpe = {
  nome: string;
  pose: Pose;
  inicio: number; // segundos até começar a acertar
  ativo: number; // janela em que acerta
  fim: number; // recuperação
  // Caixa de acerto relativa: dx = distância à frente do centro, alt = altura do centro acima do pé.
  caixa?: { dx: number; alt: number; w: number; h: number };
  dano: number;
  empurra: number;
  atordoa: number;
  hits?: number;
  derruba?: boolean;
  avanco?: number; // velocidade pra frente enquanto o golpe está ativo
  custo?: number;
  projetil?: Omit<Projetil, "dono" | "x" | "face"> & { dx: number };
};

export type Visual = {
  pele: string;
  cabelo: string;
  estilo: "luffy" | "zoro" | "sanji" | "nami";
  camisa: string;
  calca: string;
  canela: string; // cor da canela: pele (bermuda) ou calça
  sapato: string;
  braco: string; // manga ou pele
  esticar: boolean; // braços/pernas de borracha
};

export type Personagem = {
  id: string;
  nome: string;
  titulo: string;
  cor: string;
  vel: number;
  pulo: number;
  vida: number;
  golpes: Record<Botao, Golpe>;
  visual: Visual;
};

export const PERSONAGENS: Personagem[] = [
  {
    id: "luffy",
    nome: "Luffy",
    titulo: "Chapéu de Palha",
    cor: "#d8322b",
    vel: 290,
    pulo: 1020,
    vida: 1000,
    golpes: {
      soco: { nome: "Gomu Gomu no Pistol", pose: "soco", inicio: 0.14, ativo: 0.12, fim: 0.26, caixa: { dx: 20, alt: 112, w: 200, h: 34 }, dano: 70, empurra: 260, atordoa: 0.32 },
      chute: { nome: "Gomu Gomu no Muchi", pose: "rasteira", inicio: 0.14, ativo: 0.12, fim: 0.28, caixa: { dx: 10, alt: 22, w: 160, h: 44 }, dano: 60, empurra: 180, atordoa: 0.3, derruba: true },
      especial: { nome: "Gomu Gomu no Gatling!", pose: "rajada", custo: 35, inicio: 0.2, ativo: 0.6, fim: 0.3, caixa: { dx: 20, alt: 105, w: 185, h: 80 }, hits: 6, dano: 24, empurra: 140, atordoa: 0.38 },
    },
    visual: { pele: "#f2c38f", cabelo: "#15151a", estilo: "luffy", camisa: "#d8322b", calca: "#3c6fb6", canela: "#f2c38f", sapato: "#a0612d", braco: "#f2c38f", esticar: true },
  },
  {
    id: "zoro",
    nome: "Zoro",
    titulo: "Caçador de Piratas",
    cor: "#2e7d4b",
    vel: 260,
    pulo: 980,
    vida: 1050,
    golpes: {
      soco: { nome: "Oni Giri", pose: "corte", inicio: 0.12, ativo: 0.1, fim: 0.24, caixa: { dx: 10, alt: 100, w: 110, h: 100 }, dano: 80, empurra: 240, atordoa: 0.3 },
      chute: { nome: "Tora Gari", pose: "corteBaixo", inicio: 0.2, ativo: 0.1, fim: 0.32, caixa: { dx: 10, alt: 75, w: 115, h: 130 }, dano: 105, empurra: 300, atordoa: 0.4, derruba: true },
      especial: {
        nome: "Sanbyaku Rokuju Pound Ho!",
        pose: "corte",
        custo: 30,
        inicio: 0.25,
        ativo: 0.05,
        fim: 0.35,
        dano: 0,
        empurra: 0,
        atordoa: 0,
        projetil: { tipo: "corte", dx: 60, alt: 95, vx: 640, w: 56, h: 96, dano: 110, vida: 1.6, atraso: 0 },
      },
    },
    visual: { pele: "#e2b07e", cabelo: "#5fae55", estilo: "zoro", camisa: "#f4f1e8", calca: "#24272e", canela: "#24272e", sapato: "#3b2a1e", braco: "#e2b07e", esticar: false },
  },
  {
    id: "sanji",
    nome: "Sanji",
    titulo: "Perna Negra",
    cor: "#1d2230",
    vel: 330,
    pulo: 1060,
    vida: 950,
    golpes: {
      soco: { nome: "Collier", pose: "chuteAlto", inicio: 0.08, ativo: 0.08, fim: 0.18, caixa: { dx: 15, alt: 125, w: 100, h: 44 }, dano: 55, empurra: 200, atordoa: 0.28 },
      chute: { nome: "Mouton Shot", pose: "chute", inicio: 0.16, ativo: 0.1, fim: 0.28, caixa: { dx: 15, alt: 75, w: 115, h: 52 }, dano: 90, empurra: 420, atordoa: 0.38, derruba: true },
      especial: { nome: "Diable Jambe!", pose: "chuteFogo", custo: 35, inicio: 0.15, ativo: 0.4, fim: 0.3, avanco: 540, caixa: { dx: 0, alt: 85, w: 95, h: 100 }, hits: 3, dano: 48, empurra: 260, atordoa: 0.42, derruba: true },
    },
    visual: { pele: "#f5cfa0", cabelo: "#f2d046", estilo: "sanji", camisa: "#1d2230", calca: "#1d2230", canela: "#1d2230", sapato: "#111", braco: "#1d2230", esticar: false },
  },
  {
    id: "nami",
    nome: "Nami",
    titulo: "Gata Ladra",
    cor: "#f07f2a",
    vel: 300,
    pulo: 1040,
    vida: 900,
    golpes: {
      soco: { nome: "Clima-Tact", pose: "bastao", inicio: 0.1, ativo: 0.1, fim: 0.2, caixa: { dx: 15, alt: 100, w: 130, h: 30 }, dano: 55, empurra: 220, atordoa: 0.28 },
      chute: { nome: "Swing Arm", pose: "corte", inicio: 0.14, ativo: 0.12, fim: 0.26, caixa: { dx: 10, alt: 85, w: 120, h: 100 }, dano: 75, empurra: 300, atordoa: 0.34 },
      especial: {
        nome: "Thunderbolt Tempo!",
        pose: "raio",
        custo: 30,
        inicio: 0.2,
        ativo: 0.05,
        fim: 0.4,
        dano: 0,
        empurra: 0,
        atordoa: 0,
        projetil: { tipo: "raio", dx: 250, alt: 150, vx: 0, w: 84, h: 300, dano: 125, vida: 0.25, atraso: 0.45 },
      },
    },
    visual: { pele: "#f7c9a0", cabelo: "#f07f2a", estilo: "nami", camisa: "#3d7fc4", calca: "#3d5fa8", canela: "#f7c9a0", sapato: "#c0392b", braco: "#f7c9a0", esticar: false },
  },
];

export const personagem = (id: string) => PERSONAGENS.find((p) => p.id === id) ?? PERSONAGENS[0];

export type EstadoLutador = "livre" | "golpe" | "atingido" | "bloqueio" | "caido" | "vitoria";

export type Lutador = {
  p: Personagem;
  x: number;
  y: number; // pé; CHAO = no chão
  vx: number;
  vy: number;
  face: 1 | -1;
  vida: number;
  energia: number;
  estado: EstadoLutador;
  t: number; // tempo no estado atual
  golpe: Botao | null;
  noAr: boolean; // golpe começou no ar
  hitsDados: number;
  lancou: boolean;
  atordoado: number;
  agachado: boolean;
  tras: boolean; // segurando pra trás (defesa)
  andando: number; // -1, 0, 1 (pra animação)
  piscar: number;
  vitorias: number;
  combo: number;
  ant: Entrada;
  buffer: { b: Botao; t: number } | null;
};

export type Evento =
  | { tipo: "hit"; x: number; y: number; forte: boolean; cor: string }
  | { tipo: "bloqueio"; x: number; y: number }
  | { tipo: "especial"; quem: 0 | 1; nome: string }
  | { tipo: "ko"; quem: 0 | 1 };

export type Fase = "intro" | "luta" | "ko" | "fim";

export type Luta = {
  a: Lutador;
  b: Lutador;
  fase: Fase;
  t: number;
  round: number;
  relogio: number;
  projeteis: Projetil[];
  eventos: Evento[];
  pausaHit: number;
  resultado: 0 | 1 | "empate" | null; // quem ganhou o round
  tempoEsgotado: boolean;
};

function novoLutador(p: Personagem, lado: 0 | 1): Lutador {
  return {
    p,
    x: lado === 0 ? 300 : W - 300,
    y: CHAO,
    vx: 0,
    vy: 0,
    face: lado === 0 ? 1 : -1,
    vida: p.vida,
    energia: 20,
    estado: "livre",
    t: 0,
    golpe: null,
    noAr: false,
    hitsDados: 0,
    lancou: false,
    atordoado: 0,
    agachado: false,
    tras: false,
    andando: 0,
    piscar: 0,
    vitorias: 0,
    combo: 0,
    ant: entradaVazia(),
    buffer: null,
  };
}

export function novaLuta(idA: string, idB: string): Luta {
  return {
    a: novoLutador(personagem(idA), 0),
    b: novoLutador(personagem(idB), 1),
    fase: "intro",
    t: 0,
    round: 1,
    relogio: ROUND_TEMPO,
    projeteis: [],
    eventos: [],
    pausaHit: 0,
    resultado: null,
    tempoEsgotado: false,
  };
}

function novoRound(l: Luta) {
  for (const [f, lado] of [[l.a, 0], [l.b, 1]] as const) {
    const vit = f.vitorias;
    const en = f.energia;
    Object.assign(f, novoLutador(f.p, lado));
    f.vitorias = vit;
    f.energia = Math.max(20, en); // energia acumulada passa pro round seguinte
  }
  l.round++;
  l.fase = "intro";
  l.t = 0;
  l.relogio = ROUND_TEMPO;
  l.projeteis = [];
  l.resultado = null;
  l.tempoEsgotado = false;
}

// ---------- geometria ----------

type Ret = { x0: number; x1: number; y0: number; y1: number };

const sobrepoe = (r: Ret, s: Ret) => r.x0 < s.x1 && r.x1 > s.x0 && r.y0 < s.y1 && r.y1 > s.y0;

export function caixaMundo(f: Lutador, c: { dx: number; alt: number; w: number; h: number }): Ret {
  const y0 = f.y - c.alt - c.h / 2;
  const y1 = f.y - c.alt + c.h / 2;
  return f.face === 1 ? { x0: f.x + c.dx, x1: f.x + c.dx + c.w, y0, y1 } : { x0: f.x - c.dx - c.w, x1: f.x - c.dx, y0, y1 };
}

export function corpo(f: Lutador): Ret | null {
  if (f.estado === "caido") return null; // caído não apanha
  const h = f.agachado ? 88 : 145;
  return { x0: f.x - 26, x1: f.x + 26, y0: f.y - h, y1: f.y };
}

const retProjetil = (p: Projetil): Ret => ({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: CHAO - p.alt - p.h / 2, y1: CHAO - p.alt + p.h / 2 });

export const duracao = (g: Golpe) => g.inicio + g.ativo + g.fim;

// ---------- lutador ----------

function comecarGolpe(f: Lutador, b: Botao, l: Luta, lado: 0 | 1) {
  const g = f.p.golpes[b];
  f.estado = "golpe";
  f.golpe = b;
  f.t = 0;
  f.hitsDados = 0;
  f.lancou = false;
  f.agachado = false;
  f.buffer = null;
  f.noAr = f.y < CHAO;
  if (!f.noAr) f.vx = 0;
  if (b === "especial") {
    f.energia -= g.custo ?? 0;
    l.eventos.push({ tipo: "especial", quem: lado, nome: g.nome });
  }
}

function podeUsar(f: Lutador, b: Botao) {
  const g = f.p.golpes[b];
  if (b === "especial") return f.y >= CHAO && f.energia >= (g.custo ?? 0);
  return true;
}

function atualizarLutador(f: Lutador, ent: Entrada, outro: Lutador, dt: number, l: Luta, lado: 0 | 1) {
  // Toques novos entram num buffer curto: apertar um pouquinho antes do golpe anterior acabar ainda vale.
  for (const b of ["especial", "soco", "chute"] as const) if (ent[b] && !f.ant[b]) f.buffer = { b, t: 0.15 };
  if (f.buffer) {
    f.buffer.t -= dt;
    if (f.buffer.t <= 0) f.buffer = null;
  }
  f.ant = { ...ent };
  f.t += dt;
  f.piscar = Math.max(0, f.piscar - dt);
  f.energia = Math.min(100, f.energia + 3 * dt);
  f.tras = outro.x >= f.x ? ent.esq : ent.dir;
  f.andando = 0;
  const noChao = f.y >= CHAO;

  switch (f.estado) {
    case "atingido":
    case "bloqueio":
      f.atordoado -= dt;
      if (noChao) f.vx *= Math.pow(0.0015, dt);
      if (f.atordoado <= 0 && noChao) {
        f.estado = "livre";
        f.t = 0;
      }
      break;
    case "caido":
      if (noChao) f.vx *= Math.pow(0.002, dt);
      if (noChao && f.t > 1.1 && f.vida > 0) {
        f.estado = "livre";
        f.t = 0;
      }
      break;
    case "vitoria":
      if (noChao) f.vx = 0;
      break;
    case "golpe": {
      const g = f.p.golpes[f.golpe!];
      const ativo = f.t >= g.inicio && f.t < g.inicio + g.ativo;
      if (g.avanco) f.vx = ativo ? f.face * g.avanco : noChao ? f.vx * Math.pow(0.001, dt) : f.vx;
      else if (noChao) f.vx = 0;
      if (g.projetil && !f.lancou && f.t >= g.inicio) {
        f.lancou = true;
        const { dx, ...resto } = g.projetil;
        l.projeteis.push({ ...resto, dono: lado, x: f.x + f.face * dx, vx: resto.vx * f.face, face: f.face });
      }
      // Golpe aéreo termina ao pousar.
      if (f.noAr && noChao && f.t > 0.05) {
        f.estado = "livre";
        f.t = 0;
        f.golpe = null;
      } else if (f.t >= duracao(g)) {
        f.estado = "livre";
        f.t = 0;
        f.golpe = null;
      }
      break;
    }
    case "livre": {
      if (noChao) {
        f.face = outro.x >= f.x ? 1 : -1;
        f.agachado = ent.baixo;
        const pedido = f.buffer?.b;
        if (pedido && podeUsar(f, pedido)) comecarGolpe(f, pedido, l, lado);
        else if (ent.cima) {
          const dir = (ent.dir ? 1 : 0) - (ent.esq ? 1 : 0);
          f.vy = -f.p.pulo;
          f.vx = dir * f.p.vel * 0.85;
          f.agachado = false;
        } else if (f.agachado) f.vx = 0;
        else {
          const dir = (ent.dir ? 1 : 0) - (ent.esq ? 1 : 0);
          const praTras = dir !== 0 && dir !== f.face;
          f.vx = dir * f.p.vel * (praTras ? 0.72 : 1);
          f.andando = dir * f.face;
        }
      } else {
        f.agachado = false;
        const pedido = f.buffer?.b;
        if (pedido && pedido !== "especial") comecarGolpe(f, pedido, l, lado);
      }
      break;
    }
  }

  // Física
  f.vy += GRAV * dt;
  f.y += f.vy * dt;
  f.x += f.vx * dt;
  if (f.y >= CHAO) {
    f.y = CHAO;
    f.vy = 0;
    if (f.estado === "livre" && !noChao) f.vx = 0; // pousou
  }
  f.x = Math.max(MARGEM, Math.min(W - MARGEM, f.x));
}

function acertar(l: Luta, atk: Lutador, def: Lutador, defLado: 0 | 1, dano: number, empurra: number, atordoa: number, derruba: boolean, origemX: number, ponto: { x: number; y: number }) {
  const dir = def.x === origemX ? atk.face : def.x > origemX ? 1 : -1;
  const defendeu = (def.estado === "livre" || def.estado === "bloqueio") && def.y >= CHAO && def.tras;
  if (defendeu) {
    def.vida = Math.max(1, def.vida - Math.round(dano * 0.12)); // defesa não mata
    def.estado = "bloqueio";
    def.t = 0;
    def.atordoado = atordoa * 0.6;
    def.vx = dir * empurra * 0.7;
    atk.energia = Math.min(100, atk.energia + 3);
    def.energia = Math.min(100, def.energia + 5);
    l.pausaHit = 0.04;
    l.eventos.push({ tipo: "bloqueio", x: ponto.x, y: ponto.y });
    return;
  }
  const emCombo = def.estado === "atingido";
  atk.combo = emCombo ? atk.combo + 1 : 1;
  def.vida = Math.max(0, def.vida - dano);
  def.t = 0;
  def.atordoado = atordoa;
  def.vx = dir * empurra;
  def.piscar = 0.12;
  def.agachado = false;
  def.golpe = null;
  def.estado = derruba ? "caido" : "atingido";
  if (derruba || def.y < CHAO) def.vy = -480;
  atk.energia = Math.min(100, atk.energia + 8);
  def.energia = Math.min(100, def.energia + 6);
  const forte = dano >= 80 || derruba;
  l.pausaHit = forte ? 0.09 : 0.05;
  l.eventos.push({ tipo: "hit", x: ponto.x, y: ponto.y, forte, cor: atk.p.cor });
  if (def.vida <= 0) {
    def.estado = "caido";
    def.vy = -560;
    def.vx = dir * 320;
    l.fase = "ko";
    l.t = 0;
    l.resultado = defLado === 0 ? 1 : 0;
    atk.vitorias++;
    l.pausaHit = 0.4;
    l.eventos.push({ tipo: "ko", quem: defLado });
  }
}

function checarGolpe(l: Luta, atk: Lutador, def: Lutador, defLado: 0 | 1) {
  if (atk.estado !== "golpe" || !atk.golpe) return;
  const g = atk.p.golpes[atk.golpe];
  if (!g.caixa) return;
  const ta = atk.t - g.inicio;
  if (ta < 0 || ta >= g.ativo) return;
  const hits = g.hits ?? 1;
  const idx = Math.floor((ta / g.ativo) * hits);
  if (idx < atk.hitsDados) return;
  const alvo = corpo(def);
  if (!alvo) return;
  const c = caixaMundo(atk, g.caixa);
  if (!sobrepoe(c, alvo)) return;
  atk.hitsDados = idx + 1;
  const ultimo = atk.hitsDados >= hits;
  const ponto = { x: (Math.max(c.x0, alvo.x0) + Math.min(c.x1, alvo.x1)) / 2, y: (Math.max(c.y0, alvo.y0) + Math.min(c.y1, alvo.y1)) / 2 };
  acertar(l, atk, def, defLado, g.dano, ultimo ? g.empurra * 1.6 : g.empurra, g.atordoa, !!g.derruba && ultimo, atk.x, ponto);
}

function separar(a: Lutador, b: Lutador) {
  if (a.estado === "caido" || b.estado === "caido") return;
  if (Math.abs(a.y - b.y) > 110) return; // um pulando por cima do outro
  const d = b.x - a.x;
  const min = 54;
  if (Math.abs(d) >= min) return;
  const s = d === 0 ? (a.face === 1 ? 1 : -1) : Math.sign(d);
  const falta = (min - Math.abs(d)) / 2;
  a.x -= s * falta;
  b.x += s * falta;
  // Encostado na parede: o outro é que sai.
  for (const [f, g] of [[a, b], [b, a]] as const) {
    if (f.x < MARGEM) {
      g.x += MARGEM - f.x;
      f.x = MARGEM;
    }
    if (f.x > W - MARGEM) {
      g.x -= f.x - (W - MARGEM);
      f.x = W - MARGEM;
    }
  }
}

function atualizarProjeteis(l: Luta, dt: number) {
  const lut = [l.a, l.b] as const;
  for (const p of l.projeteis) {
    if (p.atraso > 0) {
      p.atraso -= dt;
      continue;
    }
    p.vida -= dt;
    p.x += p.vx * dt;
    if (l.fase !== "luta") continue;
    const defLado = p.dono === 0 ? 1 : 0;
    const def = lut[defLado];
    const alvo = corpo(def);
    const r = retProjetil(p);
    if (alvo && sobrepoe(r, alvo)) {
      const ponto = { x: def.x, y: (Math.max(r.y0, alvo.y0) + Math.min(r.y1, alvo.y1)) / 2 };
      acertar(l, lut[p.dono], def, defLado, p.dano, 340, 0.45, true, lut[p.dono].x, ponto);
      p.vida = 0;
    }
  }
  // Cortes voadores se anulam.
  for (const p of l.projeteis)
    for (const q of l.projeteis)
      if (p !== q && p.dono !== q.dono && p.vida > 0 && q.vida > 0 && p.atraso <= 0 && q.atraso <= 0 && p.tipo === "corte" && q.tipo === "corte" && sobrepoe(retProjetil(p), retProjetil(q))) {
        p.vida = 0;
        q.vida = 0;
        l.eventos.push({ tipo: "bloqueio", x: (p.x + q.x) / 2, y: CHAO - p.alt });
      }
  l.projeteis = l.projeteis.filter((p) => p.vida > 0 && p.x > -100 && p.x < W + 100);
}

export const vencedorDaLuta = (l: Luta): 0 | 1 | null => (l.a.vitorias >= VITORIAS ? 0 : l.b.vitorias >= VITORIAS ? 1 : null);

export function passo(l: Luta, dt: number, entA: Entrada, entB: Entrada) {
  if (l.pausaHit > 0) {
    l.pausaHit -= dt; // congelada no impacto: dá peso ao golpe
    return;
  }
  l.t += dt;
  const podeJogar = l.fase === "luta";
  if (l.fase === "intro" && l.t >= INTRO) {
    l.fase = "luta";
    l.t = 0;
  }
  if (l.fase === "luta") {
    l.relogio -= dt;
    if (l.relogio <= 0) {
      l.relogio = 0;
      l.fase = "ko";
      l.t = 0;
      l.tempoEsgotado = true;
      const ra = l.a.vida / l.a.p.vida;
      const rb = l.b.vida / l.b.p.vida;
      l.resultado = ra > rb ? 0 : rb > ra ? 1 : "empate";
      if (l.resultado === 0) l.a.vitorias++;
      if (l.resultado === 1) l.b.vitorias++;
    }
  }
  const vazia = entradaVazia();
  atualizarLutador(l.a, podeJogar ? entA : vazia, l.b, dt, l, 0);
  atualizarLutador(l.b, podeJogar ? entB : vazia, l.a, dt, l, 1);
  if (l.fase === "luta") {
    checarGolpe(l, l.a, l.b, 1);
    if (l.fase === "luta") checarGolpe(l, l.b, l.a, 0);
  }
  atualizarProjeteis(l, dt);
  separar(l.a, l.b);

  if (l.fase === "ko") {
    // Quem ganhou comemora quando estiver livre no chão.
    const venc = l.resultado === 0 ? l.a : l.resultado === 1 ? l.b : null;
    if (venc && venc.estado === "livre" && venc.y >= CHAO && l.t > 0.6) {
      venc.estado = "vitoria";
      venc.t = 0;
    }
    if (l.t >= POS_KO) {
      if (vencedorDaLuta(l) !== null) {
        l.fase = "fim";
        l.t = 0;
      } else novoRound(l);
    }
  }
}

// ---------- CPU ----------

export type Dificuldade = "facil" | "normal" | "dificil";

export type MenteCPU = { proxima: number; plano: Entrada };

export const novaMente = (): MenteCPU => ({ proxima: 0, plano: entradaVazia() });

const PERFIL: Record<Dificuldade, { reacao: [number, number]; defesa: number; agressao: number }> = {
  facil: { reacao: [0.35, 0.6], defesa: 0.15, agressao: 0.45 },
  normal: { reacao: [0.18, 0.35], defesa: 0.45, agressao: 0.65 },
  dificil: { reacao: [0.08, 0.18], defesa: 0.75, agressao: 0.8 },
};

function alcance(g: Golpe) {
  if (g.projetil) return g.projetil.vx === 0 ? g.projetil.dx + g.projetil.w / 2 : 9999;
  return g.caixa ? g.caixa.dx + g.caixa.w + (g.avanco ? g.avanco * g.ativo : 0) : 0;
}

// Decide o que a CPU aperta. Repete o plano até a próxima "reação".
export function cpu(l: Luta, lado: 0 | 1, m: MenteCPU, dif: Dificuldade, rand: () => number, dt: number): Entrada {
  const eu = lado === 0 ? l.a : l.b;
  const op = lado === 0 ? l.b : l.a;
  m.proxima -= dt;
  // Botões de ataque valem um frame só (é o "toque").
  const saida = { ...m.plano };
  m.plano.soco = m.plano.chute = m.plano.especial = false;
  m.plano.cima = false;
  if (m.proxima > 0) return saida;

  const perfil = PERFIL[dif];
  m.proxima = perfil.reacao[0] + rand() * (perfil.reacao[1] - perfil.reacao[0]);
  const dist = Math.abs(op.x - eu.x);
  const frente = op.x >= eu.x ? 1 : -1;
  const p: Entrada = entradaVazia();
  const praFrente = () => (frente === 1 ? (p.dir = true) : (p.esq = true));
  const praTras = () => (frente === 1 ? (p.esq = true) : (p.dir = true));
  const g = eu.p.golpes;
  const alcSoco = alcance(g.soco);
  const alcChute = alcance(g.chute);
  const alcEsp = alcance(g.especial);
  const temEspecial = eu.energia >= (g.especial.custo ?? 0);

  const ameaca =
    (op.estado === "golpe" && op.golpe && dist < alcance(op.p.golpes[op.golpe]) + 40) ||
    l.projeteis.some((q) => q.dono !== lado && Math.abs(q.x - eu.x) < 260 && (q.vx === 0 || Math.sign(eu.x - q.x) === Math.sign(q.vx)));

  if (op.estado === "caido" || op.estado === "vitoria") {
    if (dist > 200) praFrente();
  } else if (ameaca && rand() < perfil.defesa) {
    praTras();
    if (rand() < 0.2) p.baixo = true;
  } else if (temEspecial && dist <= alcEsp && rand() < 0.25 * perfil.agressao + (alcEsp > 1000 && dist > 300 ? 0.2 : 0)) {
    p.especial = true;
  } else if (dist <= alcSoco + 10 && rand() < perfil.agressao) {
    if (dist <= alcChute && rand() < 0.45) p.chute = true;
    else p.soco = true;
  } else if (dist > alcSoco) {
    const r = rand();
    if (r < 0.75) praFrente();
    else if (r < 0.88) {
      p.cima = true;
      praFrente();
    }
  } else {
    if (rand() < 0.5) praTras();
  }
  m.plano = p;
  return { ...p };
}
