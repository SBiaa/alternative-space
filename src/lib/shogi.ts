// Mini shogi (5x5), o jogo de tabuleiro do Shikamaru em versão compacta.
// Lado 0 = jogador (embaixo, anda pra cima). Lado 1 = CPU.

export type Tipo = "K" | "G" | "S" | "B" | "R" | "P";
export type Peca = { lado: 0 | 1; tipo: Tipo; prom: boolean };
export type Casa = Peca | null;
export type Mao = Record<Exclude<Tipo, "K">, number>;
export type Estado = { tab: Casa[]; maos: [Mao, Mao]; vez: 0 | 1 };
export type Lance =
  | { de: number; para: number; prom: boolean }
  | { drop: Exclude<Tipo, "K">; para: number };

export const N = 5;
export const NOMES: Record<Tipo, string> = { K: "Rei", G: "Ouro", S: "Prata", B: "Bispo", R: "Torre", P: "Peão" };
const VALOR: Record<Tipo, number> = { K: 0, G: 5, S: 4, B: 7, R: 8, P: 1 };
const VALOR_PROM: Partial<Record<Tipo, number>> = { S: 5, B: 10, R: 11, P: 5 };

const maoVazia = (): Mao => ({ G: 0, S: 0, B: 0, R: 0, P: 0 });

export function novoEstado(): Estado {
  const tab: Casa[] = Array(N * N).fill(null);
  const p = (lado: 0 | 1, tipo: Tipo): Peca => ({ lado, tipo, prom: false });
  (["R", "B", "S", "G", "K"] as Tipo[]).forEach((t, c) => (tab[c] = p(1, t)));
  tab[N + 4] = p(1, "P");
  (["K", "G", "S", "B", "R"] as Tipo[]).forEach((t, c) => (tab[4 * N + c] = p(0, t)));
  tab[3 * N] = p(0, "P");
  return { tab, maos: [maoVazia(), maoVazia()], vez: 0 };
}

const OURO = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]];
const PRATA = [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]];
const REI = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const dentro = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;
const zona = (lado: 0 | 1, r: number) => (lado === 0 ? r === 0 : r === N - 1);

/** Casas que a peça em `i` ataca (ignora se deixa o próprio rei em xeque). */
function alvos(tab: Casa[], i: number): number[] {
  const pc = tab[i]!;
  const r0 = Math.floor(i / N), c0 = i % N;
  const f = pc.lado === 0 ? 1 : -1; // espelha "pra frente"
  const out: number[] = [];
  const passo = (dirs: number[][]) => {
    for (const [dr, dc] of dirs) {
      const r = r0 + dr * f, c = c0 + dc;
      if (dentro(r, c) && tab[r * N + c]?.lado !== pc.lado) out.push(r * N + c);
    }
  };
  const desliza = (dirs: number[][]) => {
    for (const [dr, dc] of dirs) {
      let r = r0 + dr, c = c0 + dc;
      while (dentro(r, c)) {
        const alvo = tab[r * N + c];
        if (alvo?.lado === pc.lado) break;
        out.push(r * N + c);
        if (alvo) break;
        r += dr; c += dc;
      }
    }
  };
  const t = pc.tipo;
  if (t === "K") passo(REI);
  else if (t === "G" || (pc.prom && (t === "S" || t === "P"))) passo(OURO);
  else if (t === "S") passo(PRATA);
  else if (t === "P") passo([[-1, 0]]);
  else if (t === "B") { desliza(DIAG); if (pc.prom) passo(ORTO); }
  else if (t === "R") { desliza(ORTO); if (pc.prom) passo(DIAG); }
  return out;
}

export function emXeque(e: Estado, lado: 0 | 1): boolean {
  const rei = e.tab.findIndex((p) => p?.tipo === "K" && p.lado === lado);
  if (rei < 0) return true;
  return e.tab.some((p, i) => p && p.lado !== lado && alvos(e.tab, i).includes(rei));
}

export function aplicar(e: Estado, l: Lance): Estado {
  const tab = e.tab.slice();
  const maos: [Mao, Mao] = [{ ...e.maos[0] }, { ...e.maos[1] }];
  const lado = e.vez;
  if ("drop" in l) {
    maos[lado][l.drop]--;
    tab[l.para] = { lado, tipo: l.drop, prom: false };
  } else {
    const pc = tab[l.de]!;
    const cap = tab[l.para];
    if (cap && cap.tipo !== "K") maos[lado][cap.tipo]++;
    tab[l.para] = { ...pc, prom: pc.prom || l.prom };
    tab[l.de] = null;
  }
  return { tab, maos, vez: (1 - lado) as 0 | 1 };
}

/** Todos os lances (pseudo-legais) — sem checar o próprio rei. */
function pseudo(e: Estado): Lance[] {
  const out: Lance[] = [];
  const lado = e.vez;
  e.tab.forEach((pc, i) => {
    if (!pc || pc.lado !== lado) return;
    const podeProm = !pc.prom && pc.tipo !== "K" && pc.tipo !== "G";
    for (const para of alvos(e.tab, i)) {
      const r = Math.floor(para / N);
      const entraOuSai = zona(lado, r) || zona(lado, Math.floor(i / N));
      // Peão na última fileira é obrigado a promover.
      if (pc.tipo === "P" && !pc.prom && zona(lado, r)) { out.push({ de: i, para, prom: true }); continue; }
      out.push({ de: i, para, prom: false });
      if (podeProm && entraOuSai) out.push({ de: i, para, prom: true });
    }
  });
  const mao = e.maos[lado];
  for (const t of Object.keys(mao) as (keyof Mao)[]) {
    if (!mao[t]) continue;
    for (let para = 0; para < N * N; para++) {
      if (e.tab[para]) continue;
      if (t === "P") {
        if (zona(lado, Math.floor(para / N))) continue;
        const col = para % N; // nifu: dois peões na mesma coluna
        if (e.tab.some((p, j) => j % N === col && p?.lado === lado && p.tipo === "P" && !p.prom)) continue;
      }
      out.push({ drop: t, para });
    }
  }
  return out;
}

export function lancesLegais(e: Estado): Lance[] {
  return pseudo(e).filter((l) => {
    const prox = aplicar(e, l);
    if (emXeque(prox, e.vez)) return false;
    // Proibido dar mate com peão largado (uchifuzume).
    if ("drop" in l && l.drop === "P" && emXeque(prox, prox.vez) && lancesLegais(prox).length === 0) return false;
    return true;
  });
}

/** null = jogo segue; 0/1 = quem venceu. */
export function vencedor(e: Estado): 0 | 1 | null {
  return lancesLegais(e).length === 0 ? ((1 - e.vez) as 0 | 1) : null;
}

function avaliar(e: Estado, lado: 0 | 1): number {
  let s = 0;
  e.tab.forEach((p) => {
    if (!p) return;
    const v = p.prom ? VALOR_PROM[p.tipo] ?? VALOR[p.tipo] : VALOR[p.tipo];
    s += p.lado === lado ? v : -v;
  });
  for (const t of Object.keys(e.maos[0]) as (keyof Mao)[]) {
    s += (e.maos[lado][t] - e.maos[1 - lado][t]) * VALOR[t] * 1.1;
  }
  return s;
}

function negamax(e: Estado, prof: number, a: number, b: number): number {
  const lances = lancesLegais(e);
  if (lances.length === 0) return -1000 - prof;
  if (prof === 0) return avaliar(e, e.vez);
  let melhor = -Infinity;
  for (const l of ordenar(e, lances)) {
    const v = -negamax(aplicar(e, l), prof - 1, -b, -a);
    if (v > melhor) melhor = v;
    if (v > a) a = v;
    if (a >= b) break;
  }
  return melhor;
}

// Capturas primeiro deixam o corte alfa-beta bem mais eficiente.
function ordenar(e: Estado, ls: Lance[]): Lance[] {
  const peso = (l: Lance) => ("drop" in l ? 0 : (e.tab[l.para] ? 10 + VALOR[e.tab[l.para]!.tipo] : 0) + (l.prom ? 3 : 0));
  return ls.slice().sort((x, y) => peso(y) - peso(x));
}

export type Nivel = "genin" | "chunin" | "jonin";
const PROF: Record<Nivel, number> = { genin: 1, chunin: 2, jonin: 3 };

export function lanceCpu(e: Estado, nivel: Nivel, rnd = Math.random): Lance | null {
  const lances = lancesLegais(e);
  if (!lances.length) return null;
  let melhor = -Infinity;
  let bons: Lance[] = [];
  for (const l of ordenar(e, lances)) {
    const v = -negamax(aplicar(e, l), PROF[nivel] - 1, -Infinity, Infinity) + rnd() * (nivel === "genin" ? 2 : 0.3);
    if (v > melhor) { melhor = v; bons = [l]; }
    else if (v === melhor) bons.push(l);
  }
  return bons[0];
}
