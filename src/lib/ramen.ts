// Lógica do Ramen do Ichiraku: clientes pedem tigelas, você monta e serve antes da paciência acabar.

export const DURACAO = 90;
export const ASSENTOS = 3;

export const CALDOS = ["misso", "shoyu", "tonkotsu"] as const;
export const EXTRAS = ["chashu", "naruto", "ovo", "menma", "cebolinha", "nori"] as const;
export const MAX_EXTRAS = 4;

export type Caldo = (typeof CALDOS)[number];
export type Extra = (typeof EXTRAS)[number];

export const NOMES: Record<Caldo | Extra, string> = {
  misso: "Missô",
  shoyu: "Shoyu",
  tonkotsu: "Tonkotsu",
  chashu: "Chashu",
  naruto: "Naruto",
  ovo: "Ovo",
  menma: "Menma",
  cebolinha: "Cebolinha",
  nori: "Nori",
};

export const ROSTOS = ["🥷", "👧", "👴", "🧑‍🎓", "👩‍🍳", "🐸", "🐶", "🦊"];

export type Pedido = { caldo: Caldo; extras: Extra[] };
export type Cliente = { id: number; rosto: string; pedido: Pedido; paciencia: number; pacienciaMax: number };
export type Tigela = { caldo: Caldo | null; extras: Extra[] };
export type Resultado = "certo" | "errado" | "vazio";

export type Estado = {
  tempo: number;
  status: "jogando" | "fim";
  assentos: (Cliente | null)[];
  tigela: Tigela;
  pontos: number;
  combo: number;
  maiorCombo: number;
  servidos: number;
  perdidos: number;
  proximo: number;
  ids: number;
  rnd: () => number;
};

export function novoEstado(rnd: () => number = Math.random): Estado {
  return {
    tempo: DURACAO,
    status: "jogando",
    assentos: Array(ASSENTOS).fill(null),
    tigela: { caldo: null, extras: [] },
    pontos: 0,
    combo: 0,
    maiorCombo: 0,
    servidos: 0,
    perdidos: 0,
    proximo: 0.6,
    ids: 0,
    rnd,
  };
}

/** 0 no começo do turno, 1 no fim. */
function pressa(e: Estado) {
  return 1 - e.tempo / DURACAO;
}

export function novoPedido(e: Estado): Pedido {
  const p = pressa(e);
  const caldo = CALDOS[Math.floor(e.rnd() * CALDOS.length)];
  const qtd = Math.min(MAX_EXTRAS, 1 + Math.floor(e.rnd() * 2) + (p > 0.4 ? 1 : 0) + (p > 0.75 ? 1 : 0));
  const pool = [...EXTRAS];
  const extras: Extra[] = [];
  while (extras.length < qtd) extras.push(pool.splice(Math.floor(e.rnd() * pool.length), 1)[0]);
  return { caldo, extras };
}

function chegaCliente(e: Estado) {
  const livres = e.assentos.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (!livres.length) return;
  const assento = livres[Math.floor(e.rnd() * livres.length)];
  const pedido = novoPedido(e);
  const max = 13 + pedido.extras.length * 2.5 - pressa(e) * 4;
  e.assentos[assento] = { id: ++e.ids, rosto: ROSTOS[Math.floor(e.rnd() * ROSTOS.length)], pedido, paciencia: max, pacienciaMax: max };
}

export function step(e: Estado, dt: number) {
  if (e.status !== "jogando") return;
  e.tempo = Math.max(0, e.tempo - dt);
  for (let i = 0; i < e.assentos.length; i++) {
    const c = e.assentos[i];
    if (!c) continue;
    c.paciencia -= dt;
    if (c.paciencia <= 0) {
      e.assentos[i] = null;
      e.perdidos++;
      e.combo = 0;
    }
  }
  e.proximo -= dt;
  if (e.proximo <= 0) {
    chegaCliente(e);
    e.proximo = 4.2 - pressa(e) * 2 + e.rnd() * 1.5;
  }
  if (e.tempo <= 0) e.status = "fim";
}

export function adicionar(e: Estado, item: Caldo | Extra) {
  if (e.status !== "jogando") return;
  if ((CALDOS as readonly string[]).includes(item)) {
    e.tigela.caldo = item as Caldo;
    return;
  }
  const extra = item as Extra;
  const i = e.tigela.extras.indexOf(extra);
  if (i >= 0) e.tigela.extras.splice(i, 1);
  else if (e.tigela.extras.length < MAX_EXTRAS) e.tigela.extras.push(extra);
}

export function limpar(e: Estado) {
  e.tigela = { caldo: null, extras: [] };
}

export function confere(t: Tigela, p: Pedido) {
  return t.caldo === p.caldo && t.extras.length === p.extras.length && p.extras.every((x) => t.extras.includes(x));
}

export function multiplicador(combo: number) {
  return 1 + Math.min(combo, 8) * 0.25;
}

/** Serve a tigela pro cliente do assento. Devolve o resultado e quantos pontos rendeu. */
export function servir(e: Estado, assento: number): { resultado: Resultado; ganho: number } {
  const c = e.assentos[assento];
  if (e.status !== "jogando" || !c) return { resultado: "vazio", ganho: 0 };
  if (!e.tigela.caldo) return { resultado: "vazio", ganho: 0 };
  if (!confere(e.tigela, c.pedido)) {
    e.combo = 0;
    c.paciencia = Math.max(0.5, c.paciencia - c.pacienciaMax * 0.25);
    limpar(e);
    return { resultado: "errado", ganho: 0 };
  }
  const base = 60 + c.pedido.extras.length * 20;
  const gorjeta = Math.round((c.paciencia / c.pacienciaMax) * 40);
  const ganho = Math.round((base + gorjeta) * multiplicador(e.combo));
  e.pontos += ganho;
  e.combo++;
  e.maiorCombo = Math.max(e.maiorCombo, e.combo);
  e.servidos++;
  e.assentos[assento] = null;
  limpar(e);
  return { resultado: "certo", ganho };
}

export function rank(pontos: number) {
  if (pontos >= 3500) return { titulo: "Lenda do balcão", texto: "O velho Teuchi já pensa em te passar a receita secreta." };
  if (pontos >= 2200) return { titulo: "Chef de mão cheia", texto: "Fila na porta e ninguém reclamando. Isso é raro." };
  if (pontos >= 1100) return { titulo: "Ajudante de confiança", texto: "Mãos rápidas, caldo no ponto. Já pode fechar a loja sozinho." };
  if (pontos >= 400) return { titulo: "Aprendiz de cozinha", texto: "Uns pedidos trocados, mas ninguém saiu com fome." };
  return { titulo: "Primeiro dia", texto: "Calma: até o melhor ramen começa com água fervendo." };
}
