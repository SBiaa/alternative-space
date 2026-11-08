// Lógica pura do "Defenda o Navio": nada de DOM aqui, só estado e regras.
// O componente DefendaONavio chama step() a cada frame e desenha o resultado.

export const W = 800;
export const H = 450;
export const COLS = 12;
export const ROWS = 6;
export const CELL = 60;
export const GX = 40; // canto do convés na tela
export const GY = 80;

export type Ponto = { x: number; y: number };

export function centro(col: number, row: number): Ponto {
  return { x: GX + col * CELL + CELL / 2, y: GY + row * CELL + CELL / 2 };
}

// Caminho da marinha pelo convés, em casas. Entra pela prancha (esquerda) e vai até a cabine (direita).
const ROTA_CASAS: [number, number][] = [
  [-1, 1],
  [3, 1],
  [3, 4],
  [7, 4],
  [7, 1],
  [10, 1],
  [10, 4],
  [12, 4],
];
export const ROTA: Ponto[] = ROTA_CASAS.map(([c, r]) => centro(c, r));

const SEGS = ROTA.slice(1).map((b, i) => {
  const a = ROTA[i];
  return { a, b, len: Math.hypot(b.x - a.x, b.y - a.y) };
});
export const COMPRIMENTO = SEGS.reduce((s, g) => s + g.len, 0);

/** Posição na rota depois de andar d pixels. */
export function posicao(d: number): Ponto & { ang: number } {
  let resto = Math.max(0, d);
  for (const s of SEGS) {
    if (resto <= s.len) {
      const k = resto / s.len;
      return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, ang: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) };
    }
    resto -= s.len;
  }
  const u = SEGS[SEGS.length - 1];
  return { x: u.b.x, y: u.b.y, ang: Math.atan2(u.b.y - u.a.y, u.b.x - u.a.x) };
}

const chave = (c: number, r: number) => `${c},${r}`;

export const CAMINHO = new Set<string>();
for (let i = 1; i < ROTA_CASAS.length; i++) {
  const [c0, r0] = ROTA_CASAS[i - 1];
  const [c1, r1] = ROTA_CASAS[i];
  const passos = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
  for (let k = 0; k <= passos; k++) {
    const c = c0 + Math.sign(c1 - c0) * k;
    const r = r0 + Math.sign(r1 - r0) * k;
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) CAMINHO.add(chave(c, r));
  }
}

// Mastros: ninguém fica em cima deles.
export const MASTROS: [number, number][] = [
  [5, 2],
  [9, 3],
];

// ---------- tripulantes ----------

export type TipoTrip = "espadachim" | "atiradora" | "cozinheiro" | "navegadora" | "canhoneiro";

type Nivel = { dano: number; alcance: number; cadencia: number; area?: number; lento?: number; alvos?: number };

export type InfoTrip = {
  nome: string;
  jeito: string;
  custo: number;
  melhorias: [number, number];
  niveis: [Nivel, Nivel, Nivel];
  minimo?: number; // não alcança quem está colado
  perfura?: boolean; // ignora boa parte da armadura
};

export const TIPOS_TRIP: TipoTrip[] = ["espadachim", "atiradora", "cozinheiro", "navegadora", "canhoneiro"];

export const TRIPULANTES: Record<TipoTrip, InfoTrip> = {
  espadachim: {
    nome: "Espadachim",
    jeito: "Corta rápido quem passa colado. No nível 3, acerta dois de uma vez.",
    custo: 50,
    melhorias: [55, 100],
    niveis: [
      { dano: 24, alcance: 85, cadencia: 0.6, alvos: 1 },
      { dano: 42, alcance: 90, cadencia: 0.55, alvos: 1 },
      { dano: 72, alcance: 95, cadencia: 0.5, alvos: 2 },
    ],
  },
  atiradora: {
    nome: "Atiradora",
    jeito: "Mosquete de longe. A bala atravessa escudo e armadura.",
    custo: 70,
    melhorias: [70, 130],
    perfura: true,
    niveis: [
      { dano: 34, alcance: 190, cadencia: 1.2 },
      { dano: 60, alcance: 210, cadencia: 1.1 },
      { dano: 105, alcance: 230, cadencia: 1.0 },
    ],
  },
  cozinheiro: {
    nome: "Cozinheiro",
    jeito: "Arremessa panela fervendo. Queima todo mundo em volta de onde cai.",
    custo: 85,
    melhorias: [80, 140],
    niveis: [
      { dano: 18, alcance: 135, cadencia: 1.5, area: 45 },
      { dano: 30, alcance: 145, cadencia: 1.4, area: 52 },
      { dano: 50, alcance: 155, cadencia: 1.3, area: 60 },
    ],
  },
  navegadora: {
    nome: "Navegadora",
    jeito: "Chama uma tempestade em volta dela: dano baixo, mas deixa todo mundo lento.",
    custo: 60,
    melhorias: [60, 110],
    niveis: [
      { dano: 5, alcance: 115, cadencia: 1.0, lento: 0.55 },
      { dano: 9, alcance: 125, cadencia: 1.0, lento: 0.45 },
      { dano: 15, alcance: 135, cadencia: 1.0, lento: 0.35 },
    ],
  },
  canhoneiro: {
    nome: "Canhoneiro",
    jeito: "Canhão pesado: demora, mas explode grupos. Não acerta quem está colado.",
    custo: 120,
    melhorias: [120, 200],
    minimo: 70,
    niveis: [
      { dano: 70, alcance: 240, cadencia: 3.0, area: 55 },
      { dano: 120, alcance: 260, cadencia: 2.8, area: 62 },
      { dano: 200, alcance: 280, cadencia: 2.5, area: 70 },
    ],
  },
};

export type Trip = {
  id: number;
  tipo: TipoTrip;
  col: number;
  row: number;
  x: number;
  y: number;
  nivel: number; // 0, 1 ou 2
  recarga: number;
  ang: number;
  investido: number;
  golpe: number; // tempo de animação do último ataque
};

// ---------- marinha ----------

export type TipoInim = "recruta" | "cabo" | "sargento" | "capitao";

export const INIMIGOS: Record<TipoInim, { nome: string; vida: number; vel: number; armadura: number; recompensa: number; dano: number }> = {
  recruta: { nome: "Recruta", vida: 60, vel: 48, armadura: 0, recompensa: 4, dano: 1 },
  cabo: { nome: "Cabo ligeiro", vida: 38, vel: 92, armadura: 0, recompensa: 4, dano: 1 },
  sargento: { nome: "Sargento de escudo", vida: 170, vel: 38, armadura: 10, recompensa: 9, dano: 2 },
  capitao: { nome: "Capitão", vida: 1000, vel: 28, armadura: 14, recompensa: 50, dano: 10 },
};

export type Inim = {
  id: number;
  tipo: TipoInim;
  d: number;
  x: number;
  y: number;
  ang: number;
  vida: number;
  vidaMax: number;
  vel: number;
  armadura: number;
  lento: number; // segundos restantes de lentidão
  fatorLento: number;
  recompensa: number;
  dano: number;
  ferido: number; // pisca quando apanha
};

// [tipo, quantidade, intervalo entre cada um]
export type Grupo = [TipoInim, number, number];

export const ONDAS: Grupo[][] = [
  [["recruta", 8, 1.0]],
  [["recruta", 12, 0.8]],
  [["recruta", 8, 0.9], ["cabo", 6, 0.6]],
  [["cabo", 12, 0.5], ["recruta", 6, 0.8]],
  [["recruta", 10, 0.8], ["sargento", 4, 1.6]],
  [["cabo", 14, 0.45], ["sargento", 5, 1.4]],
  [["sargento", 8, 1.2], ["recruta", 10, 0.6]],
  [["recruta", 10, 0.7], ["capitao", 1, 0]],
  [["cabo", 18, 0.4], ["sargento", 7, 1.1]],
  [["sargento", 12, 1.0], ["cabo", 14, 0.4]],
  [["sargento", 10, 1.0], ["capitao", 2, 5]],
  [["cabo", 15, 0.35], ["sargento", 15, 0.8], ["capitao", 3, 4]],
];

/** A marinha fica mais parruda a cada onda. */
export function vidaMult(onda: number) {
  return 1 + 0.42 * (onda - 1);
}

export function bonusOnda(onda: number) {
  return 15 + 3 * onda;
}

// ---------- tiros e efeitos ----------

export type Proj = {
  id: number;
  tipo: "bala" | "panela" | "bala-canhao";
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  alvoId: number;
  dano: number;
  area: number;
  perfura: boolean;
};

export type Efeito = {
  tipo: "corte" | "explosao" | "tempestade" | "moeda" | "raio";
  x: number;
  y: number;
  t: number;
  dur: number;
  raio?: number;
  valor?: number;
  ang?: number;
  x2?: number;
  y2?: number;
};

export type Estado = {
  moedas: number;
  vidas: number;
  onda: number; // 0 antes da primeira
  emOnda: boolean;
  tempo: number;
  fila: { tipo: TipoInim; em: number }[];
  tripulantes: Trip[];
  inimigos: Inim[];
  projeteis: Proj[];
  efeitos: Efeito[];
  proxId: number;
  abatidos: number;
  ultimoBonus: number;
  fim: null | "vitoria" | "derrota";
};

export const MOEDAS_INICIAIS = 150;
export const VIDAS_INICIAIS = 20;

export function novoEstado(): Estado {
  return {
    moedas: MOEDAS_INICIAIS,
    vidas: VIDAS_INICIAIS,
    onda: 0,
    emOnda: false,
    tempo: 0,
    fila: [],
    tripulantes: [],
    inimigos: [],
    projeteis: [],
    efeitos: [],
    proxId: 1,
    abatidos: 0,
    ultimoBonus: 0,
    fim: null,
  };
}

// ---------- ações do jogador ----------

export function livre(e: Estado, col: number, row: number) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (CAMINHO.has(chave(col, row))) return false;
  if (MASTROS.some(([c, r]) => c === col && r === row)) return false;
  return !e.tripulantes.some((t) => t.col === col && t.row === row);
}

export function casaEm(x: number, y: number): { col: number; row: number } | null {
  const col = Math.floor((x - GX) / CELL);
  const row = Math.floor((y - GY) / CELL);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { col, row };
}

export function colocar(e: Estado, tipo: TipoTrip, col: number, row: number): Trip | null {
  const info = TRIPULANTES[tipo];
  if (e.fim || !livre(e, col, row) || e.moedas < info.custo) return null;
  e.moedas -= info.custo;
  const { x, y } = centro(col, row);
  const t: Trip = { id: e.proxId++, tipo, col, row, x, y, nivel: 0, recarga: 0, ang: 0, investido: info.custo, golpe: 0 };
  e.tripulantes.push(t);
  return t;
}

export function custoMelhoria(t: Trip): number | null {
  return t.nivel >= 2 ? null : TRIPULANTES[t.tipo].melhorias[t.nivel];
}

export function melhorar(e: Estado, id: number): boolean {
  const t = e.tripulantes.find((x) => x.id === id);
  if (!t || e.fim) return false;
  const custo = custoMelhoria(t);
  if (custo === null || e.moedas < custo) return false;
  e.moedas -= custo;
  t.investido += custo;
  t.nivel += 1;
  return true;
}

export function valorVenda(t: Trip) {
  return Math.floor(t.investido * 0.7);
}

export function vender(e: Estado, id: number): boolean {
  const i = e.tripulantes.findIndex((x) => x.id === id);
  if (i < 0 || e.fim) return false;
  e.moedas += valorVenda(e.tripulantes[i]);
  e.tripulantes.splice(i, 1);
  return true;
}

export function iniciarOnda(e: Estado): boolean {
  if (e.emOnda || e.fim || e.onda >= ONDAS.length) return false;
  e.onda += 1;
  e.emOnda = true;
  let t = e.tempo + 0.5;
  for (const [tipo, qtd, intervalo] of ONDAS[e.onda - 1]) {
    for (let k = 0; k < qtd; k++) {
      e.fila.push({ tipo, em: t });
      t += intervalo;
    }
    t += 1.5;
  }
  return true;
}

// ---------- simulação ----------

export function stats(t: Trip) {
  return TRIPULANTES[t.tipo].niveis[t.nivel];
}

function danoEfetivo(dano: number, armadura: number, perfura: boolean) {
  return Math.max(1, dano - armadura * (perfura ? 0.3 : 1));
}

function ferir(i: Inim, dano: number, perfura: boolean) {
  i.vida -= danoEfetivo(dano, i.armadura, perfura);
  i.ferido = 0.12;
}

function emAlcance(e: Estado, t: Trip, alcance: number, minimo = 0) {
  return e.inimigos
    .filter((i) => {
      if (i.vida <= 0) return false;
      const dist = Math.hypot(i.x - t.x, i.y - t.y);
      return dist <= alcance && dist >= minimo;
    })
    .sort((a, b) => b.d - a.d); // quem está mais perto da cabine primeiro
}

function onde(i: Inim, daquiA: number) {
  const fator = i.lento > 0 ? i.fatorLento : 1;
  return posicao(Math.min(COMPRIMENTO, i.d + i.vel * fator * daquiA));
}

function atacar(e: Estado, t: Trip) {
  const info = TRIPULANTES[t.tipo];
  const n = stats(t);
  const alvos = emAlcance(e, t, n.alcance, info.minimo ?? 0);
  if (!alvos.length) return false;
  const a = alvos[0];
  t.ang = Math.atan2(a.y - t.y, a.x - t.x);
  t.golpe = 0.25;

  switch (t.tipo) {
    case "espadachim":
      for (const i of alvos.slice(0, n.alvos ?? 1)) {
        ferir(i, n.dano, false);
        e.efeitos.push({ tipo: "corte", x: i.x, y: i.y, t: 0, dur: 0.25, ang: Math.atan2(i.y - t.y, i.x - t.x) });
      }
      break;
    case "navegadora":
      for (const i of alvos) {
        ferir(i, n.dano, false);
        // Lentidão não acumula: vale a mais forte que estiver ativa.
        i.fatorLento = Math.min(i.lento > 0 ? i.fatorLento : 1, n.lento!);
        i.lento = 1.6;
        e.efeitos.push({ tipo: "raio", x: t.x, y: t.y - 30, x2: i.x, y2: i.y, t: 0, dur: 0.2 });
      }
      e.efeitos.push({ tipo: "tempestade", x: t.x, y: t.y, t: 0, dur: 0.5, raio: n.alcance });
      break;
    case "atiradora": {
      const dur = Math.hypot(a.x - t.x, a.y - t.y) / 700;
      const p = onde(a, dur);
      e.projeteis.push({ id: e.proxId++, tipo: "bala", ox: t.x, oy: t.y, tx: p.x, ty: p.y, t: 0, dur, alvoId: a.id, dano: n.dano, area: 0, perfura: true });
      break;
    }
    case "cozinheiro":
    case "canhoneiro": {
      const vel = t.tipo === "cozinheiro" ? 260 : 330;
      const dur = Math.max(0.25, Math.hypot(a.x - t.x, a.y - t.y) / vel);
      const p = onde(a, dur);
      e.projeteis.push({
        id: e.proxId++,
        tipo: t.tipo === "cozinheiro" ? "panela" : "bala-canhao",
        ox: t.x,
        oy: t.y,
        tx: p.x,
        ty: p.y,
        t: 0,
        dur,
        alvoId: a.id,
        dano: n.dano,
        area: n.area ?? 40,
        perfura: false,
      });
      break;
    }
  }
  return true;
}

function nascer(e: Estado, tipo: TipoInim) {
  const base = INIMIGOS[tipo];
  const vida = Math.round(base.vida * vidaMult(e.onda));
  const p = posicao(0);
  e.inimigos.push({
    id: e.proxId++,
    tipo,
    d: 0,
    x: p.x,
    y: p.y,
    ang: p.ang,
    vida,
    vidaMax: vida,
    vel: base.vel,
    armadura: base.armadura,
    lento: 0,
    fatorLento: 1,
    recompensa: base.recompensa,
    dano: base.dano,
    ferido: 0,
  });
}

export function step(e: Estado, dt: number) {
  if (e.fim) return;
  e.tempo += dt;

  // Marinha subindo pela prancha.
  while (e.fila.length && e.fila[0].em <= e.tempo) nascer(e, e.fila.shift()!.tipo);

  // Andando pelo convés.
  for (const i of e.inimigos) {
    const fator = i.lento > 0 ? i.fatorLento : 1;
    i.d += i.vel * fator * dt;
    i.lento = Math.max(0, i.lento - dt);
    if (i.lento === 0) i.fatorLento = 1;
    i.ferido = Math.max(0, i.ferido - dt);
    const p = posicao(i.d);
    i.x = p.x;
    i.y = p.y;
    i.ang = p.ang;
  }
  const chegaram = e.inimigos.filter((i) => i.d >= COMPRIMENTO && i.vida > 0);
  for (const i of chegaram) e.vidas -= i.dano;
  if (chegaram.length) e.inimigos = e.inimigos.filter((i) => !chegaram.includes(i));
  if (e.vidas <= 0) {
    e.vidas = 0;
    e.fim = "derrota";
    return;
  }

  // Tripulação trabalhando.
  for (const t of e.tripulantes) {
    t.golpe = Math.max(0, t.golpe - dt);
    t.recarga -= dt;
    if (t.recarga <= 0 && atacar(e, t)) t.recarga = stats(t).cadencia;
    else if (t.recarga < 0) t.recarga = 0;
  }

  // Projéteis em voo.
  for (const p of e.projeteis) {
    p.t += dt;
    if (p.t < p.dur) continue;
    if (p.tipo === "bala") {
      const alvo = e.inimigos.find((i) => i.id === p.alvoId && i.vida > 0);
      if (alvo) ferir(alvo, p.dano, p.perfura);
    } else {
      for (const i of e.inimigos) {
        if (i.vida > 0 && Math.hypot(i.x - p.tx, i.y - p.ty) <= p.area) ferir(i, p.dano, p.perfura);
      }
      e.efeitos.push({ tipo: "explosao", x: p.tx, y: p.ty, t: 0, dur: 0.4, raio: p.area });
    }
  }
  e.projeteis = e.projeteis.filter((p) => p.t < p.dur);

  // Quem caiu vira moeda.
  for (const i of e.inimigos) {
    if (i.vida > 0) continue;
    e.moedas += i.recompensa;
    e.abatidos += 1;
    e.efeitos.push({ tipo: "moeda", x: i.x, y: i.y - 10, t: 0, dur: 0.9, valor: i.recompensa });
  }
  e.inimigos = e.inimigos.filter((i) => i.vida > 0);

  for (const f of e.efeitos) f.t += dt;
  e.efeitos = e.efeitos.filter((f) => f.t < f.dur);

  // Fim da onda.
  if (e.emOnda && !e.fila.length && !e.inimigos.length) {
    e.emOnda = false;
    if (e.onda >= ONDAS.length) {
      e.fim = "vitoria";
    } else {
      e.ultimoBonus = bonusOnda(e.onda);
      e.moedas += e.ultimoBonus;
    }
  }
}

export function estrelas(e: Estado) {
  if (e.fim !== "vitoria") return 0;
  if (e.vidas >= VIDAS_INICIAIS) return 3;
  if (e.vidas >= VIDAS_INICIAIS / 2) return 2;
  return 1;
}
