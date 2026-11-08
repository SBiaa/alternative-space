// Lógica pura do "Bússola Doida": nada de DOM aqui, só estado e física.
// O componente BussolaDoida chama step() a cada frame e desenha o resultado.
//
// O mar anda pra esquerda; o navio se move livre pela tela. A pegadinha: a bússola
// gira de vez em quando e as direções giram junto (↑ pode virar →, ← pode virar →...).

export const W = 800;
export const H = 450;
export const NAVIO_R = 16;
export const PX_POR_MILHA = 30;
export const MILHAS_POR_NIVEL = 150;
export const NIVEL_MAX = 8;
export const VIDAS = 3;
export const AVISO_BUSSOLA = 1.5; // segundos de tremedeira antes de girar
const ACEL = 1500;
const ATRITO = 4;
const VMAX = 300;
const INVULNERAVEL = 1.6;

// Tudo que muda de um nível pro outro fica aqui, pra calibrar num lugar só.
export function regras(nivel: number) {
  const n = Math.max(1, Math.min(NIVEL_MAX, nivel)) - 1; // 0..7
  return {
    vel: 150 + 22 * n, // px/s do mar
    espaco: 340 - 18 * n, // distância mínima entre perigos
    espacoExtra: 200 - 10 * n,
    chanceTempestade: n === 0 ? 0 : 0.16 + 0.03 * n,
    reiCada: n === 0 ? Infinity : Math.max(5, 13 - 1.2 * n), // segundos entre reis do mar
    trocaCada: Math.max(4, 11 - 0.9 * n), // segundos entre giros da bússola
    rotacoes: n < 2 ? [0, 2] : [0, 1, 2, 3], // nos 2 primeiros níveis ela só inverte
    raioCada: 1.4 - 0.08 * n,
    ventoForca: 140 + 20 * n,
  };
}

export function nivelDe(dist: number): number {
  return Math.min(NIVEL_MAX, 1 + Math.floor(milhas(dist) / MILHAS_POR_NIVEL));
}

export function milhas(dist: number): number {
  return Math.floor(dist / PX_POR_MILHA);
}

export type Redemoinho = { tipo: "redemoinho"; x: number; y: number; r: number };
export type Tempestade = { tipo: "tempestade"; x: number; w: number; vento: number };
export type Moeda = { tipo: "moeda"; x: number; y: number };
export type Reparo = { tipo: "reparo"; x: number; y: number };
export type Coisa = Redemoinho | Tempestade | Moeda | Reparo;

// Raio: x no mundo. t conta até o estalo; depois fica "aceso" uns instantes só pro desenho.
export type Raio = { x: number; y: number; t: number; aceso: number };
// Rei do mar: ataca uma linha da tela (y fixo na tela), da direita pra esquerda.
export type Rei = { y: number; aviso: number; cabeca: number };

export type Causa = "redemoinho" | "raio" | "rei";

export type Bussola = { rot: number; proxima: number; trocaEm: number; giradaEm: number };

export type Estado = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dist: number;
  vel: number;
  tempo: number;
  nivel: number;
  nivelEm: number;
  vidas: number;
  invulneravel: number;
  moedas: number;
  coisas: Coisa[];
  raios: Raio[];
  reis: Rei[];
  proximo: number;
  semTempestadeAte: number;
  raioTimer: number;
  reiTimer: number;
  bussola: Bussola;
  danoEm: number;
  morto: boolean;
  causa: Causa | null;
};

export type Rand = () => number;
export type Entrada = { x: number; y: number };

function sortearRot(atual: number, opcoes: number[], rand: Rand): number {
  const outras = opcoes.filter((r) => r !== atual);
  return outras[Math.floor(rand() * outras.length)] ?? 0;
}

export function novoEstado(rand: Rand = Math.random): Estado {
  const r0 = regras(1);
  return {
    x: 170,
    y: H / 2,
    vx: 0,
    vy: 0,
    dist: 0,
    vel: r0.vel,
    tempo: 0,
    nivel: 1,
    nivelEm: -99,
    vidas: VIDAS,
    invulneravel: 0,
    moedas: 0,
    coisas: [],
    raios: [],
    reis: [],
    proximo: W + 250,
    semTempestadeAte: 0,
    raioTimer: 1,
    reiTimer: 6,
    // Primeiro giro com uma folguinha pra pessoa entender o controle normal.
    bussola: { rot: 0, proxima: sortearRot(0, r0.rotacoes, rand), trocaEm: 8, giradaEm: -99 },
    danoEm: -99,
    morto: false,
    causa: null,
  };
}

// Gira um vetor em quartos de volta no sentido horário da tela (y pra baixo).
export function girar(x: number, y: number, rot: number): [number, number] {
  const k = ((rot % 4) + 4) % 4;
  let a = x;
  let b = y;
  for (let i = 0; i < k; i++) [a, b] = [-b, a];
  return [a + 0, b + 0]; // + 0 tira o -0
}

export function avisandoGiro(e: Estado): boolean {
  return e.tempo >= e.bussola.trocaEm - AVISO_BUSSOLA;
}

export function pontos(e: Pick<Estado, "dist" | "moedas">): number {
  return milhas(e.dist) + e.moedas * 10;
}

function gerar(e: Estado, rand: Rand) {
  const x = e.proximo;
  const r0 = regras(e.nivel);
  const n = e.nivel - 1;
  const roll = rand();

  if (roll < r0.chanceTempestade && x > e.semTempestadeAte) {
    const w = 700 + rand() * 500;
    e.coisas.push({ tipo: "tempestade", x, w, vento: (rand() < 0.5 ? -1 : 1) * r0.ventoForca });
    e.semTempestadeAte = x + w + 600;
    // Perigos continuam aparecendo dentro da tempestade.
    e.proximo = x + 200;
    return;
  }

  if (roll < r0.chanceTempestade + 0.25) {
    // Trilha de moedas em onda.
    const base = 80 + rand() * (H - 160);
    const amp = 30 + rand() * 40;
    for (let i = 0; i < 6; i++) {
      const y = Math.max(30, Math.min(H - 30, base + Math.sin(i * 0.9) * amp));
      e.coisas.push({ tipo: "moeda", x: x + i * 45, y });
    }
    if (e.nivel >= 2 && e.vidas < VIDAS && rand() < 0.35) {
      e.coisas.push({ tipo: "reparo", x: x + 6 * 45 + 30, y: base });
    }
    e.proximo = x + 6 * 45 + r0.espaco * 0.6 + rand() * r0.espacoExtra;
    return;
  }

  const r = 38 + rand() * 28 + 2 * n;
  const y = r + 25 + rand() * (H - 2 * r - 50);
  e.coisas.push({ tipo: "redemoinho", x, y, r });
  e.proximo = x + r0.espaco + rand() * r0.espacoExtra;
}

function tempestadeEm(e: Estado, xMundo: number): Tempestade | null {
  for (const c of e.coisas) if (c.tipo === "tempestade" && xMundo >= c.x && xMundo <= c.x + c.w) return c;
  return null;
}

function machucar(e: Estado, causa: Causa, deX: number, deY: number) {
  if (e.invulneravel > 0 || e.morto) return;
  e.vidas -= 1;
  e.invulneravel = INVULNERAVEL;
  e.danoEm = e.tempo;
  // Tranco pra longe do que bateu.
  const dx = e.x - deX;
  const dy = e.y - deY;
  const d = Math.hypot(dx, dy) || 1;
  e.vx = (dx / d) * 320;
  e.vy = (dy / d) * 320;
  if (e.vidas <= 0) {
    e.morto = true;
    e.causa = causa;
  }
}

export function step(e: Estado, dt: number, entrada: Entrada, rand: Rand = Math.random): Estado {
  if (e.morto) return e;
  e.tempo += dt;
  e.invulneravel = Math.max(0, e.invulneravel - dt);

  // Bússola
  const r0 = regras(e.nivel);
  if (e.tempo >= e.bussola.trocaEm) {
    e.bussola.rot = e.bussola.proxima;
    e.bussola.giradaEm = e.tempo;
    e.bussola.proxima = sortearRot(e.bussola.rot, r0.rotacoes, rand);
    e.bussola.trocaEm = e.tempo + r0.trocaCada + rand() * 3;
  }

  // Mar e nível
  e.vel = Math.min(r0.vel, e.vel + 30 * dt);
  e.dist += e.vel * dt;
  const nv = nivelDe(e.dist);
  if (nv > e.nivel) {
    e.nivel = nv;
    e.nivelEm = e.tempo;
    e.proximo = Math.max(e.proximo, e.dist + W + 300); // respiro
  }

  // Navio: entrada girada pela bússola.
  let [ix, iy] = girar(entrada.x, entrada.y, e.bussola.rot);
  const len = Math.hypot(ix, iy);
  if (len > 1) {
    ix /= len;
    iy /= len;
  }
  let fx = ix * ACEL;
  let fy = iy * ACEL;

  const xMundo = e.dist + e.x;
  for (const c of e.coisas) {
    if (c.tipo !== "redemoinho") continue;
    const dx = c.x - xMundo;
    const dy = c.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const alcance = c.r * 2.2;
    if (d < alcance) {
      const k = 1 - d / alcance;
      // Puxa pro centro e gira em volta.
      fx += (dx / d) * 430 * k + (-dy / d) * 160 * k;
      fy += (dy / d) * 430 * k + (dx / d) * 160 * k;
    }
  }
  const temp = tempestadeEm(e, xMundo);
  if (temp) fy += temp.vento;

  e.vx += (fx - e.vx * ATRITO) * dt;
  e.vy += (fy - e.vy * ATRITO) * dt;
  const v = Math.hypot(e.vx, e.vy);
  if (v > VMAX * 1.5) {
    e.vx *= (VMAX * 1.5) / v;
    e.vy *= (VMAX * 1.5) / v;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  const m = NAVIO_R + 8;
  if (e.x < m) [e.x, e.vx] = [m, Math.max(0, e.vx)];
  if (e.x > W - m) [e.x, e.vx] = [W - m, Math.min(0, e.vx)];
  if (e.y < m) [e.y, e.vy] = [m, Math.max(0, e.vy)];
  if (e.y > H - m) [e.y, e.vy] = [H - m, Math.min(0, e.vy)];

  // Raios: só caem quando tem tempestade na tela, mirando perto do navio.
  const tempVisivel = e.coisas.some((c) => c.tipo === "tempestade" && c.x < e.dist + W && c.x + c.w > e.dist);
  if (tempVisivel) {
    e.raioTimer -= dt;
    if (e.raioTimer <= 0) {
      const rx = e.dist + Math.max(40, Math.min(W - 40, e.x + (rand() - 0.3) * 300));
      if (tempestadeEm(e, rx)) {
        const ry = Math.max(40, Math.min(H - 40, e.y + (rand() - 0.5) * 240));
        e.raios.push({ x: rx, y: ry, t: 1, aceso: 0.3 });
      }
      e.raioTimer = r0.raioCada * (0.7 + rand() * 0.6);
    }
  }
  for (const r of e.raios) {
    if (r.t > 0) {
      r.t -= dt;
      if (r.t <= 0) {
        const sx = r.x - e.dist;
        if (Math.hypot(e.x - sx, e.y - r.y) < 36 + NAVIO_R * 0.7) machucar(e, "raio", sx, r.y);
      }
    } else r.aceso -= dt;
  }
  e.raios = e.raios.filter((r) => r.aceso > 0 && r.x - e.dist > -60);

  // Reis do mar: avisam numa linha e atravessam a tela.
  e.reiTimer -= dt;
  if (e.reiTimer <= 0 && Number.isFinite(r0.reiCada)) {
    const y = Math.max(50, Math.min(H - 50, e.y + (rand() - 0.5) * 80));
    e.reis.push({ y, aviso: 1.3, cabeca: W + 80 });
    e.reiTimer = r0.reiCada + rand() * 3;
  }
  for (const rei of e.reis) {
    if (rei.aviso > 0) rei.aviso -= dt;
    else {
      rei.cabeca -= 1000 * dt;
      if (Math.abs(e.y - rei.y) < 26 + NAVIO_R * 0.8 && e.x + NAVIO_R > rei.cabeca) machucar(e, "rei", e.x, rei.y);
    }
  }
  e.reis = e.reis.filter((r) => r.cabeca > -260);

  // Redemoinho (só o miolo machuca), moedas e reparo.
  for (const c of e.coisas) {
    const sx = c.x - e.dist;
    if (c.tipo === "redemoinho") {
      if (Math.hypot(e.x - sx, e.y - c.y) < c.r * 0.35 + NAVIO_R * 0.5) machucar(e, "redemoinho", sx, c.y);
    }
  }
  const sobra: Coisa[] = [];
  for (const c of e.coisas) {
    const sx = c.x - e.dist;
    if ((c.tipo === "moeda" || c.tipo === "reparo") && Math.hypot(e.x - sx, e.y - c.y) < NAVIO_R + 12) {
      if (c.tipo === "moeda") e.moedas += 1;
      else e.vidas = Math.min(VIDAS, e.vidas + 1);
      continue;
    }
    const fim = c.tipo === "tempestade" ? c.x + c.w : c.x + (c.tipo === "redemoinho" ? c.r * 2.2 : 20);
    if (fim - e.dist > -40) sobra.push(c);
  }
  e.coisas = sobra;

  while (e.proximo < e.dist + W + 100) gerar(e, rand);
  return e;
}

export const frasesMorte: Record<Causa, string[]> = {
  redemoinho: [
    "A bússola disse norte. O redemoinho disse pra baixo.",
    "Girou, girou e foi parar no fundo do mar.",
    "Pelo menos agora o navio para de balançar.",
  ],
  raio: [
    "Mastro de metal numa tempestade. Quem teve essa ideia?",
    "O cabelo ficou ótimo. O navio, nem tanto.",
    "Foi rápido. Muito rápido. Uns 300 mil km por segundo.",
  ],
  rei: [
    "O Rei do Mar mandou lembranças. E dentes.",
    "Virou lanchinho de serpente gigante.",
    "A bússola apontava pra boca dele o tempo todo.",
  ],
};

export function rank(p: number): { titulo: string; texto: string } {
  if (p < 80) return { titulo: "Grumete de banheira", texto: "O porto ainda está ali atrás. Dá pra ver." };
  if (p < 250) return { titulo: "Marujo enjoado", texto: "Já sabe que bússola não é pra confiar." };
  if (p < 500) return { titulo: "Navegador teimoso", texto: "A bússola gira e você gira junto, sem reclamar." };
  if (p < 900) return { titulo: "Capitão sem norte", texto: "Quem precisa de norte com um instinto desses?" };
  return { titulo: "Lenda dos sete mares", texto: "Os reis do mar contam histórias sobre você pros filhotes." };
}
