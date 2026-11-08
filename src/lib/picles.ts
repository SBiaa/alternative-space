// Lógica pura do "Picles no Ralo": nada de DOM aqui, só estado e física.
// O componente PiclesNoRalo chama step() a cada frame e desenha o resultado.

export const W = 800;
export const H = 450;
export const PLAYER_X = 170;
export const PLAYER_R = 17;
export const PX_POR_METRO = 40;

// Física mais "boiada": dá tempo de reagir.
const GRAVIDADE = 1100;
const EMPURRAO = 2150; // segurando: sobe com 2150 - 1100
const VY_MAX = 400;

export const METROS_POR_NIVEL = 100;
export const NIVEL_MAX = 10;

// Tudo que muda de um nível pro outro fica aqui, pra calibrar num lugar só.
export function regras(nivel: number) {
  const n = Math.max(1, Math.min(NIVEL_MAX, nivel)) - 1; // 0..9
  return {
    vel: 190 + 30 * n, // px/s: 190 no nível 1, 460 no 10
    espaco: 560 - 30 * n, // distância mínima entre obstáculos
    espacoExtra: 220 - 12 * n, // sorteio em cima do mínimo
    chanceRato: n === 0 ? 0 : Math.min(0.5, 0.15 + 0.04 * (n - 1)), // nível 1 só tem cano
    ratoVel: 40 + 12 * n,
    fundoCano: 0.2 + 0.03 * n, // quanto do vão o cano ocupa (+ sorteio de até 15%)
    canoSolto: n >= 2, // cano no meio do túnel só a partir do nível 3
  };
}

export function nivelDe(dist: number): number {
  return Math.min(NIVEL_MAX, 1 + Math.floor(metros(dist) / METROS_POR_NIVEL));
}

export type Cano = { tipo: "cano"; x: number; y: number; w: number; h: number };
export type Rato = { tipo: "rato"; x: number; y0: number; y: number; fase: number; vx: number };
export type Obstaculo = Cano | Rato;

export type Tunel = { fases: [number, number, number] };

export type Estado = {
  y: number;
  vy: number;
  dist: number; // px percorridos (posição do mundo na borda esquerda da tela)
  vel: number;
  tempo: number;
  obstaculos: Obstaculo[];
  proximo: number; // dist do mundo onde nasce o próximo obstáculo
  tunel: Tunel;
  nivel: number;
  nivelEm: number; // tempo em que subiu de nível (pro aviso na tela)
  morto: boolean;
  causa: "parede" | "cano" | "rato" | null;
};

export type Rand = () => number;

export function novoEstado(rand: Rand = Math.random): Estado {
  return {
    y: H / 2,
    vy: 0,
    dist: 0,
    vel: regras(1).vel,
    tempo: 0,
    obstaculos: [],
    proximo: W + 400,
    nivel: 1,
    nivelEm: -99,
    tunel: { fases: [rand() * 6.28, rand() * 6.28, rand() * 6.28] },
    morto: false,
    causa: null,
  };
}

// Vão do túnel: quase reto e largo no nível 1, fecha aos poucos até o nível 10.
const FIM_DO_APERTO = (NIVEL_MAX - 1) * METROS_POR_NIVEL * PX_POR_METRO;
export function vao(xMundo: number): number {
  return 400 - 160 * Math.min(1, Math.max(0, xMundo / FIM_DO_APERTO));
}

// Teto e chão do esgoto no ponto x do mundo. A amplitude cresce junto com o aperto,
// mas nunca deixa a parede passar de 22px da borda.
export function paredes(t: Tunel, xMundo: number): { teto: number; chao: number } {
  const g = vao(xMundo);
  const amp = (H - g) / 2 - 22;
  const [a, b, c] = t.fases;
  const onda =
    0.55 * Math.sin(xMundo * 0.0045 + a) +
    0.3 * Math.sin(xMundo * 0.011 + b) +
    0.15 * Math.sin(xMundo * 0.023 + c);
  const centro = H / 2 + amp * onda;
  return { teto: centro - g / 2, chao: centro + g / 2 };
}

export function metros(dist: number): number {
  return Math.floor(dist / PX_POR_METRO);
}

function circuloRet(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number) {
  const px = Math.max(x, Math.min(cx, x + w));
  const py = Math.max(y, Math.min(cy, y + h));
  return (cx - px) ** 2 + (cy - py) ** 2 < r * r;
}

export function colide(e: Estado): Estado["causa"] {
  // Paredes: confere três pontos do corpo pra não atravessar quina.
  for (const dx of [-PLAYER_R, 0, PLAYER_R]) {
    const { teto, chao } = paredes(e.tunel, e.dist + PLAYER_X + dx);
    const meia = Math.sqrt(Math.max(0, PLAYER_R ** 2 - dx ** 2)) * 0.9;
    if (e.y - meia < teto || e.y + meia > chao) return "parede";
  }
  for (const o of e.obstaculos) {
    const sx = o.x - e.dist;
    if (o.tipo === "cano") {
      if (circuloRet(PLAYER_X, e.y, PLAYER_R * 0.9, sx, o.y, o.w, o.h)) return "cano";
    } else {
      if ((PLAYER_X - sx) ** 2 + (e.y - o.y) ** 2 < (PLAYER_R + 13) ** 2) return "rato";
    }
  }
  return null;
}

function gerar(e: Estado, rand: Rand) {
  const x = e.proximo;
  const { teto, chao } = paredes(e.tunel, x);
  const g = chao - teto;
  const r0 = regras(e.nivel);

  if (rand() < r0.chanceRato) {
    const y0 = teto + 40 + rand() * (g - 80);
    e.obstaculos.push({ tipo: "rato", x, y0, y: y0, fase: rand() * 6.28, vx: r0.ratoVel + rand() * 40 });
  } else {
    const w = 46;
    // Pior caso ao longo da largura do cano: a parede ondula, então mede em vários pontos.
    let tetoMax = -Infinity;
    let chaoMin = Infinity;
    for (let xi = x - 10; xi <= x + w + 10; xi += 8) {
      const p = paredes(e.tunel, xi);
      tetoMax = Math.max(tetoMax, p.teto);
      chaoMin = Math.min(chaoMin, p.chao);
    }
    const folga = 95; // espaço livre mínimo pra passar (picles tem ~34px)
    const r = rand();
    if (r < 0.8 || g < 300 || !r0.canoSolto) {
      const noTeto = r < 0.4 || (r >= 0.8 && rand() < 0.5);
      if (noTeto) {
        const fundo = Math.min(g * (r0.fundoCano + rand() * 0.15), chaoMin - folga - teto);
        e.obstaculos.push({ tipo: "cano", x, y: 0, w, h: teto + Math.max(20, fundo) });
      } else {
        const fundo = Math.min(g * (r0.fundoCano + rand() * 0.15), chao - (tetoMax + folga));
        const y = chao - Math.max(20, fundo);
        e.obstaculos.push({ tipo: "cano", x, y, w, h: H - y });
      }
    } else {
      // Cano solto no meio (só em trecho largo): sobra espaço por cima e por baixo.
      const h = 60 + rand() * 30;
      const y = teto + (g - h) / 2 + (rand() - 0.5) * (g - h - 2 * folga);
      e.obstaculos.push({ tipo: "cano", x, y, w: w + 20, h });
    }
  }
  e.proximo = x + r0.espaco + rand() * r0.espacoExtra;
}

export function step(e: Estado, dt: number, segurando: boolean, rand: Rand = Math.random): Estado {
  if (e.morto) return e;
  e.tempo += dt;
  e.vy += (GRAVIDADE - (segurando ? EMPURRAO : 0)) * dt;
  e.vy = Math.max(-VY_MAX, Math.min(VY_MAX, e.vy));
  e.y += e.vy * dt;

  // Acelera aos poucos até a velocidade do nível, sem tranco.
  e.vel = Math.min(regras(e.nivel).vel, e.vel + 40 * dt);
  e.dist += e.vel * dt;
  const n = nivelDe(e.dist);
  if (n > e.nivel) {
    e.nivel = n;
    e.nivelEm = e.tempo;
    // Respiro: um trecho sem obstáculo novo logo depois de subir de nível.
    e.proximo = Math.max(e.proximo, e.dist + W + 350);
  }

  for (const o of e.obstaculos) {
    if (o.tipo === "rato") {
      o.x -= o.vx * dt;
      o.fase += dt * 5;
      o.y = o.y0 + Math.sin(o.fase) * 22;
    }
  }
  e.obstaculos = e.obstaculos.filter((o) => o.x - e.dist > -120);
  while (e.proximo < e.dist + W + 100) gerar(e, rand);

  const causa = colide(e);
  if (causa) {
    e.morto = true;
    e.causa = causa;
  }
  return e;
}

export const frasesMorte: Record<NonNullable<Estado["causa"]>, string[]> = {
  parede: [
    "Eu virei picles pra fugir da terapia, não pra beijar parede de esgoto.",
    "Nota mental: picles não têm freio.",
    "Ok. Isso não estava nos cálculos.",
  ],
  cano: [
    "Encanamento da prefeitura: 1, gênio mais inteligente do universo: 0.",
    "Morty! Pega a seringa! ...Morty?",
    "Eu desviei de um império galáctico e perdi pra um cano.",
  ],
  rato: [
    "Morri pra um rato. Um RATO, Morty.",
    "Esse rato vai virar meu exoesqueleto. Assim que eu tiver braços.",
    "Respeito. Ele mereceu.",
  ],
};

export function rank(m: number): { titulo: string; texto: string } {
  if (m < 50) return { titulo: "Picles de conserva", texto: "Ficou no pote. A Beth nem percebeu que você saiu." };
  if (m < 150) return { titulo: "Pepino promissor", texto: "Já dá pra chamar de fuga. Uma fuga curta." };
  if (m < 300) return { titulo: "Picles com atitude", texto: "Os ratos estão começando a comentar." };
  if (m < 600) return { titulo: "Rei do bueiro", texto: "O esgoto inteiro sabe seu nome. E tem medo." };
  return { titulo: "Picles Rick, o próprio", texto: "Ciência, ódio e salmoura. Nada te para." };
}
