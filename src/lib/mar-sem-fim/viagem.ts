// Viagem em tempo real. O tempo é sempre de timestamps (partiuEm, chegaEm) calculados pelo servidor;
// o cliente só mostra. Os eventos são sorteados na hora de zarpar, com semente (seed do save + número da viagem).

import { EVENTOS, ILHA, MUNDO, eventoDe, marDe, oficioDe } from "./conteudo";
import { aplicarEfeitos, emViagem, liberarPelaAgulha, limitesDoBarco, tempoDasMelhorias } from "./estado";
import { escolherPeso, sortear } from "../gestao/rng";
import { menorRota, type Rota } from "./rotas";
import type { EventoViagem, Efeitos, Estado, Resultado, Viagem } from "./tipos";

const N = MUNDO.navegacao;
const MS_MIN = 60_000;

export type PlanoDeViagem = {
  rota: Rota;
  minutos: number;
  vento: number;
  mantimentosGastos: number;
  faltouMantimento: boolean;
  eventos: EventoViagem[];
};

/** Consumo de mantimentos por minuto de mar, com o ofício de cozinheira e o bônus do mar de origem. */
export function consumoPorMinuto(e: Estado): number {
  return N.consumoPorMinuto * (oficioDe(e.oficio)?.vantagem.consumo ?? 1) * (marDe(e.mar)?.bonus.consumo ?? 1);
}

/** Sorteia os eventos da viagem. Mesma seed + mesmo número de viagem + mesma rota = mesmos eventos. */
export function sortearEventos(seed: string, numero: number, minutos: number, tiposDeTrecho: string[]): EventoViagem[] {
  const qtd = Math.min(N.eventosMax, Math.max(1, Math.floor(minutos / N.minutosPorEvento)));
  if (N.eventosMax === 0) return [];
  const elegiveis = EVENTOS.eventos.filter((ev) => ev.rotas.some((r) => tiposDeTrecho.includes(r)));
  const lista: EventoViagem[] = [];
  for (let i = 0; i < qtd; i++) {
    let pool = elegiveis.filter((ev) => !lista.some((x) => x.id === ev.id));
    if (pool.length === 0) pool = elegiveis;
    if (pool.length === 0) break;
    const ev = escolherPeso(pool, pool.map((p) => p.peso), sortear(seed, numero, `evento:${i}`));
    lista.push({ id: ev.id, quando: Number(((i + 1) / (qtd + 1)).toFixed(3)), escolha: null });
  }
  return lista;
}

/** Calcula tudo da viagem sem mexer no estado. Tempo = distância × velocidade do barco × modificadores. */
export function planejarViagem(e: Estado, destino: string): { ok: true; plano: PlanoDeViagem } | { ok: false; erro: "sem-ilha" | "travada" | "viagem-em-andamento" | "ja-la" | "sem-rota" } {
  if (emViagem(e)) return { ok: false, erro: "viagem-em-andamento" };
  if (!ILHA[destino]) return { ok: false, erro: "sem-ilha" };
  if (destino === e.barco.ilhaAtual) return { ok: false, erro: "ja-la" };
  const st = e.ilhas[destino]?.status ?? "travada";
  if (st === "travada") return { ok: false, erro: "travada" };
  const rota = menorRota(e.barco.ilhaAtual, destino);
  if (!rota) return { ok: false, erro: "sem-rota" };

  const numero = e.viagens + 1;
  const vento = Number((N.ventoMin + sortear(e.seed, numero, "vento") * (N.ventoMax - N.ventoMin)).toFixed(3));
  const lentidaoCasco = 1 + (1 - e.barco.casco / limitesDoBarco(e).casco) * N.lentidaoCascoMax;
  const mods = vento * (oficioDe(e.oficio)?.vantagem.tempo ?? 1) * tempoDasMelhorias(e) * (marDe(e.mar)?.bonus.tempo ?? 1) * lentidaoCasco;
  let minutos = rota.graus * N.leguasPorGrau * N.minutosPorLegua * MUNDO.barco.velocidadeBase * mods;

  // Mantimentos: se não bastam pro caminho todo, o resto da viagem anda mais devagar.
  const consumo = consumoPorMinuto(e);
  const precisa = consumo * minutos;
  let gastos = Math.ceil(precisa);
  let faltou = false;
  if (precisa > e.barco.mantimentos) {
    faltou = true;
    const comComida = consumo > 0 ? e.barco.mantimentos / consumo : minutos;
    minutos = comComida + (minutos - comComida) * N.fatorSemMantimentos;
    gastos = e.barco.mantimentos;
  }
  minutos = Math.max(1, Math.round(minutos * 10) / 10);

  const tipos = rota.trechos.map((t) => t.tipo);
  return { ok: true, plano: { rota, minutos, vento, mantimentosGastos: Math.min(gastos, e.barco.mantimentos), faltouMantimento: faltou, eventos: sortearEventos(e.seed, numero, minutos, tipos) } };
}

export function zarpar(e: Estado, destino: string, agora: number): Resultado {
  const p = planejarViagem(e, destino);
  if (!p.ok) return { ok: false, erro: p.erro };
  const { plano } = p;
  const viagem: Viagem = {
    numero: e.viagens + 1,
    de: e.barco.ilhaAtual,
    para: destino,
    partiuEm: agora,
    chegaEm: agora + Math.round(plano.minutos * MS_MIN),
    rota: plano.rota.nos,
    vento: plano.vento,
    mantimentosGastos: plano.mantimentosGastos,
    faltouMantimento: plano.faltouMantimento,
    chegou: false,
    eventos: plano.eventos,
    resolvida: false,
  };
  return { ok: true, estado: { ...e, viagens: e.viagens + 1, viagem } };
}

/** A viagem só termina se agora >= chegaEm. */
export function chegar(e: Estado, agora: number): Resultado {
  const v = e.viagem;
  if (!v || v.resolvida || v.chegou) return { ok: false, erro: "sem-viagem" };
  if (agora < v.chegaEm) return { ok: false, erro: "nao-chegou" };
  const ilhas = { ...e.ilhas };
  const prog = ilhas[v.para];
  if (prog && (prog.status === "liberada" || prog.status === "travada")) ilhas[v.para] = { ...prog, status: "visitada" };
  const noOrdem = MUNDO.agulha.ordem.includes(v.para);
  const agulha = noOrdem ? { ilha: v.para, carregada: false, desde: v.chegaEm } : e.agulha;
  const resolvida = v.eventos.length === 0;
  return {
    ok: true,
    estado: liberarPelaAgulha({
      ...e,
      ilhas,
      agulha,
      barco: { ...e.barco, ilhaAtual: v.para, mantimentos: Math.max(0, e.barco.mantimentos - v.mantimentosGastos) },
      viagem: { ...v, chegou: true, resolvida },
    }),
  };
}

/** Efeitos finais de uma escolha de evento: fome piora o que dói, o mar de origem e o ofício mexem nos números. */
export function efeitosDoEvento(e: Estado, tipo: string, base: Efeitos, faltou: boolean): Efeitos {
  const ef: Efeitos = { ...base };
  const dano = marDe(e.mar)?.bonus.dano ?? 1;
  for (const k of ["casco", "mantimentos"] as const) {
    const v = ef[k];
    if (v && v < 0) ef[k] = -Math.round(Math.abs(v) * (faltou ? N.penalidadeFome : 1) * (k === "casco" ? dano : 1));
  }
  const bonus = oficioDe(e.oficio)?.vantagem.evento;
  if (bonus && bonus.tipo === tipo) {
    for (const k of ["ouro", "recompensa", "casco", "mantimentos"] as const) {
      if (bonus.efeitos[k]) ef[k] = (ef[k] ?? 0) + bonus.efeitos[k]!;
    }
  }
  return ef;
}

/** Resolve o próximo evento pendente da viagem. Só vale depois da chegada. */
export function resolverEvento(e: Estado, eventoId: string, opcaoId: string): Resultado {
  const v = e.viagem;
  if (!v || v.resolvida) return { ok: false, erro: "sem-viagem" };
  if (!v.chegou) return { ok: false, erro: "nao-chegou" };
  const idx = v.eventos.findIndex((x) => x.escolha === null);
  if (idx < 0 || v.eventos[idx].id !== eventoId) return { ok: false, erro: "evento-invalido" };
  const def = eventoDe(eventoId);
  const op = def?.opcoes.find((o) => o.id === opcaoId);
  if (!def || !op) return { ok: false, erro: "opcao-invalida" };
  if (op.exige && e.ouro < op.exige.ouro) return { ok: false, erro: "sem-ouro" };

  const ef = efeitosDoEvento(e, def.tipo, op.efeitos, v.faltouMantimento);
  if ((ef.ouro ?? 0) < 0 && e.ouro + (ef.ouro ?? 0) < 0) return { ok: false, erro: "sem-ouro" };
  const { estado } = aplicarEfeitos(e, ef, { ouro: Number.MAX_SAFE_INTEGER, recompensa: MUNDO.economia.eventoRecompensaMax });
  const eventos = v.eventos.map((x, i) => (i === idx ? { ...x, escolha: opcaoId } : x));
  const resolvida = eventos.every((x) => x.escolha !== null);
  return { ok: true, estado: { ...estado, viagem: { ...v, eventos, resolvida } } };
}

/** Quanto falta pra chegar, em ms (nunca negativo). `agora` vem do servidor. */
export const faltaParaChegar = (v: Viagem, agora: number) => Math.max(0, v.chegaEm - agora);
/** Progresso da viagem, 0..1. */
export const progressoDaViagem = (v: Viagem, agora: number) => Math.min(1, Math.max(0, (agora - v.partiuEm) / Math.max(1, v.chegaEm - v.partiuEm)));
