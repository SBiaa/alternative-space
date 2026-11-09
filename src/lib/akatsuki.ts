// Lógica pura da "Fuga da Akatsuki": nada de DOM aqui, só estado e regras.
// O componente FugaDaAkatsuki chama step() a cada frame e desenha o resultado.

export const W = 800;
export const H = 450;

export const NINJA_X = 160; // o ninja fica parado na tela; o mundo é que anda
export const NINJA_L = 28;
export const NINJA_A = 44;
export const VIDAS = 3;

const GRAVIDADE = 2100;
const PULO = 760;
const CORTE_PULO = 0.45; // soltou cedo: o pulo fica baixo
const VEL_INICIAL = 300;
const VEL_MAX = 620;
const ACEL = 7; // px/s a mais por segundo de corrida
const INVULNERAVEL = 1.4;
export const PONTOS_PERGAMINHO = 50;

export type Telhado = { x: number; w: number; y: number };
export type Shuriken = { x: number; y: number; vx: number; giro: number };
export type Pergaminho = { x: number; y: number; pego: boolean };
export type Status = "pronto" | "correndo" | "fim";

export type Estado = {
  status: Status;
  tempo: number;
  vel: number;
  distancia: number; // em px
  pergaminhos: number;
  vidas: number;
  // Posição do ninja: y é o pé.
  y: number;
  vy: number;
  noChao: boolean;
  pulosNoAr: number; // 1 = ainda tem o pulo duplo
  segurando: boolean;
  invulneravel: number;
  telhados: Telhado[];
  shurikens: Shuriken[];
  itens: Pergaminho[];
  proximaShuriken: number;
  acertado: number; // tempo do último golpe (pro desenho piscar)
  rnd: () => number;
};

export function novoEstado(rnd: () => number = Math.random): Estado {
  const e: Estado = {
    status: "pronto",
    tempo: 0,
    vel: VEL_INICIAL,
    distancia: 0,
    pergaminhos: 0,
    vidas: VIDAS,
    y: 330,
    vy: 0,
    noChao: true,
    pulosNoAr: 1,
    segurando: false,
    invulneravel: 0,
    telhados: [{ x: -40, w: 900, y: 330 }],
    shurikens: [],
    itens: [],
    proximaShuriken: 2.5,
    acertado: -99,
    rnd,
  };
  encherTelhados(e);
  return e;
}

export function pontos(e: Estado) {
  return Math.floor(e.distancia / 10) + e.pergaminhos * PONTOS_PERGAMINHO;
}

// Quanto mais rápido, maiores os vãos (mas sempre puláveis).
function encherTelhados(e: Estado) {
  let ultimo = e.telhados[e.telhados.length - 1];
  while (ultimo.x + ultimo.w < W * 2) {
    const dificuldade = Math.min(1, (e.vel - VEL_INICIAL) / (VEL_MAX - VEL_INICIAL));
    const vao = 70 + e.rnd() * (60 + dificuldade * 90);
    const w = 220 + e.rnd() * (320 - dificuldade * 120);
    const sobe = (e.rnd() - 0.5) * 120;
    const y = Math.max(250, Math.min(380, ultimo.y + sobe));
    const t = { x: ultimo.x + ultimo.w + vao, w, y };
    e.telhados.push(t);
    // Pergaminhos: às vezes no telhado, às vezes no ar sobre o vão (prêmio pelo risco)
    if (e.rnd() < 0.6) {
      const noVao = e.rnd() < 0.4;
      e.itens.push(
        noVao
          ? { x: t.x - vao / 2, y: Math.min(y, ultimo.y) - 110, pego: false }
          : { x: t.x + 40 + e.rnd() * (w - 80), y: y - 34, pego: false },
      );
    }
    ultimo = t;
  }
}

function telhadoEm(e: Estado, x: number) {
  return e.telhados.find((t) => x + NINJA_L > t.x && x < t.x + t.w);
}

export function apertar(e: Estado) {
  if (e.status === "fim") return;
  if (e.status === "pronto") e.status = "correndo";
  e.segurando = true;
  if (e.noChao) {
    e.vy = -PULO;
    e.noChao = false;
  } else if (e.pulosNoAr > 0) {
    e.pulosNoAr -= 1;
    e.vy = -PULO * 0.85;
  }
}

export function soltar(e: Estado) {
  e.segurando = false;
  if (e.vy < 0) e.vy *= CORTE_PULO;
}

function bate(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function step(e: Estado, dt: number) {
  if (e.status !== "correndo") return;
  e.tempo += dt;
  e.vel = Math.min(VEL_MAX, e.vel + ACEL * dt);
  const dx = e.vel * dt;
  e.distancia += dx;
  e.invulneravel = Math.max(0, e.invulneravel - dt);

  for (const t of e.telhados) t.x -= dx;
  for (const p of e.itens) p.x -= dx;
  e.telhados = e.telhados.filter((t) => t.x + t.w > -50);
  e.itens = e.itens.filter((p) => p.x > -40 && !p.pego);
  encherTelhados(e);

  // Física do ninja
  const antes = e.y;
  e.vy += GRAVIDADE * dt;
  e.y += e.vy * dt;
  const t = telhadoEm(e, NINJA_X);
  if (t && e.vy >= 0 && antes <= t.y + 2 && e.y >= t.y) {
    e.y = t.y;
    e.vy = 0;
    e.noChao = true;
    e.pulosNoAr = 1;
  } else if (!t || e.y < t.y - 1) {
    e.noChao = false;
  } else if (t && antes > t.y + 2 && e.y > t.y) {
    // Bateu na parede do prédio: escorrega pro vão
    e.noChao = false;
  }
  if (e.y > H + 60) {
    e.vidas = 0;
    e.status = "fim";
    return;
  }

  // Shurikens: vêm da direita, na altura do peito (pula) ou da cabeça no pulo (fica no chão)
  e.proximaShuriken -= dt;
  if (e.proximaShuriken <= 0) {
    const chao = telhadoEm(e, W - 40)?.y ?? e.y;
    const alta = e.rnd() < 0.35;
    e.shurikens.push({ x: W + 20, y: alta ? chao - 95 : chao - 26, vx: e.vel + 160 + e.rnd() * 120, giro: 0 });
    const dificuldade = Math.min(1, e.tempo / 90);
    e.proximaShuriken = 1.8 - dificuldade * 0.9 + e.rnd() * 1.2;
  }
  const topo = e.y - NINJA_A;
  for (const s of e.shurikens) {
    s.x -= s.vx * dt;
    s.giro += dt * 18;
    if (e.invulneravel <= 0 && bate(NINJA_X + 4, topo + 4, NINJA_L - 8, NINJA_A - 8, s.x - 9, s.y - 9, 18, 18)) {
      s.x = -100;
      e.vidas -= 1;
      e.invulneravel = INVULNERAVEL;
      e.acertado = e.tempo;
      if (e.vidas <= 0) {
        e.status = "fim";
        return;
      }
    }
  }
  e.shurikens = e.shurikens.filter((s) => s.x > -40);

  for (const p of e.itens) {
    if (!p.pego && bate(NINJA_X, topo, NINJA_L, NINJA_A, p.x - 12, p.y - 10, 24, 20)) {
      p.pego = true;
      e.pergaminhos += 1;
    }
  }
}

export function rank(n: number) {
  if (n >= 2500) return { titulo: "Sombra da Folha", texto: "A Akatsuki desistiu de te seguir." };
  if (n >= 1200) return { titulo: "Jounin", texto: "Rápido, frio e com a bolsa cheia de pergaminhos." };
  if (n >= 500) return { titulo: "Chunin", texto: "Escapou bem, mas eles ainda estão no seu rastro." };
  return { titulo: "Genin", texto: "Treina o pulo duplo e tenta de novo." };
}
