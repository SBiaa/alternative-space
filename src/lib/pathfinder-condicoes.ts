// Condições e estado de jogo da ficha (dados puros, sem cálculo).
export const CONDICOES = [
  { id: "amedrontado", nome: "Amedrontado", valor: true, texto: "−X em todos os testes e CDs. Cai 1 no fim de cada turno." },
  { id: "adoentado", nome: "Adoentado", valor: true, texto: "−X em todos os testes e CDs. Não come nem bebe." },
  { id: "desajeitado", nome: "Desajeitado", valor: true, texto: "−X em testes e CDs de Destreza, incluindo CA e Reflexos." },
  { id: "enfraquecido", nome: "Enfraquecido", valor: true, texto: "−X em testes e CDs de Força, incluindo ataques corpo a corpo." },
  { id: "drenado", nome: "Drenado", valor: true, texto: "−X em testes de Constituição e perde X × nível de PV máximos." },
  { id: "estupidificado", nome: "Estupidificado", valor: true, texto: "−X em testes de Int, Sab e Car, incluindo Percepção, Vontade e magias." },
  { id: "cansado", nome: "Cansado", valor: false, texto: "−1 na CA e nos salvamentos. Some com uma noite de descanso." },
  { id: "desprevenido", nome: "Desprevenido", valor: false, texto: "−2 de circunstância na CA." },
  { id: "moribundo", nome: "Moribundo", valor: true, texto: "Inconsciente. Morre no moribundo 4 (menos o condenado)." },
  { id: "ferido", nome: "Ferido", valor: true, texto: "Ao ficar moribundo, soma o ferido ao valor." },
  { id: "condenado", nome: "Condenado", valor: true, texto: "Morre com moribundo menor: 4 − X." },
] as const;
export type Condicao = (typeof CONDICOES)[number]["id"];
export const IDS_CONDICAO = new Set<string>(CONDICOES.map((c) => c.id));

export type Jogo = {
  // null = PV cheio.
  pvAtual: number | null;
  pvTemp: number;
  heroi: number;
  focoGasto: number;
  // Chaves de VagaMagia já conjuradas hoje.
  espacosGastos: string[];
  condicoes: Partial<Record<Condicao, number>>;
};

export const JOGO_VAZIO: Jogo = { pvAtual: null, pvTemp: 0, heroi: 1, focoGasto: 0, espacosGastos: [], condicoes: {} };
export const MAX_HEROI = 3;

export function normalizarJogo(x: unknown): Jogo {
  const o = typeof x === "object" && x && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
  const n = (y: unknown, min: number, max: number, padrao: number) => (typeof y === "number" && Number.isFinite(y) ? Math.min(max, Math.max(min, Math.round(y))) : padrao);
  const cond = typeof o.condicoes === "object" && o.condicoes && !Array.isArray(o.condicoes) ? (o.condicoes as Record<string, unknown>) : {};
  return {
    pvAtual: o.pvAtual === null || o.pvAtual === undefined ? null : n(o.pvAtual, 0, 9999, 0),
    pvTemp: n(o.pvTemp, 0, 999, 0),
    heroi: n(o.heroi, 0, MAX_HEROI, 1),
    focoGasto: n(o.focoGasto, 0, 3, 0),
    espacosGastos: (Array.isArray(o.espacosGastos) ? o.espacosGastos : []).filter((k): k is string => typeof k === "string" && /^r\d{1,2}-\d{1,2}$/.test(k)).slice(0, 60),
    condicoes: Object.fromEntries(Object.entries(cond).filter(([k, v]) => IDS_CONDICAO.has(k) && typeof v === "number" && v > 0).map(([k, v]) => [k, Math.min(9, Math.round(v as number))])),
  };
}
