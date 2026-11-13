// Encontro de grafite (sábado): inscrição, muro cedido, tema e julgamento com participantes genéricos.
// Sorteio e notas usam a seed do save + a semana, então a mesma seed dá o mesmo resultado.

import { sortear } from "../gestao/rng";
import { MIN_DIA, MURO, TAMANHOS, ehSabado, semanaDe } from "./config";
import { TEMAS_ENCONTRO } from "./conteudo";
import { camadasVazias, fidelidadeFinal, progressoTotal, qualidadeFinal } from "./pintura";
import { templatesDe } from "./templates";
import type { Catalogo, Job, Progresso, ScoreEncontro } from "./tipos";
import { avancar, clonar, type Resultado } from "./trabalho";

export const temaDaSemana = (seed: string, semana: number) => TEMAS_ENCONTRO[Math.floor(sortear(seed, semana, "tema-encontro") * TEMAS_ENCONTRO.length)];

export function inscrever(p0: Progresso, cat: Catalogo): Resultado {
  const p = clonar(p0);
  const dia = p.dia + 1;
  const E = MURO.encontro;
  if (!ehSabado(dia)) return { ok: false, erro: "sabado" };
  if (p.encontro.inscrito) return { ok: false, erro: "inscrito" };
  if (p.dinheiro < E.taxa) return { ok: false, erro: "saldo" };
  if (p.minuto + E.tempoMin >= MIN_DIA - 60) return { ok: false, erro: "fim" };
  const semana = semanaDe(dia);
  const tema = temaDaSemana(p.seed, semana);
  const tpl = templatesDe(E.tamanho, cat.templates);
  const modelo = tpl[Math.floor(sortear(p.seed, semana, "modelo-encontro") * tpl.length)];
  p.dinheiro -= E.taxa;
  p.gastosDia.outros += E.taxa;
  const job: Job = {
    id: `e${semana}`, modelo: modelo.slug, cliente: "encontro", nomeCliente: "Encontro de grafite", tamanho: E.tamanho,
    briefing: { tema: tema.tema, palavra: tema.palavra, cores: tema.cores, tagDestaque: false, obs: "Muro cedido pelo encontro." },
    pagamento: 0, prazo: dia, prazoDias: 0, auth: "autorizado", revisao: false, aceita: true, status: "em_andamento", comunitario: true, encontro: true,
    exige: { clientes: 0, quebrada: 0 }, croqui: 0.5, camadas: camadasVazias(), coberto: false, ruinas: 0, ruinasHoje: 0, montado: false, tintaMax: 0,
    negociacao: { respostas: [], resultado: null }, criadoDia: dia, entregueDia: null, qualFinal: null, pago: null,
  };
  p.jobs.push(job);
  p.encontro = { semana, inscrito: true, jobId: job.id, fimMinuto: Math.min(MIN_DIA, p.minuto + E.tempoMin + E.duracaoMin) };
  const t = avancar(p, cat, E.tempoMin);
  void TAMANHOS;
  return { ok: true, prog: t.prog, avisos: t.avisos };
}

export type Julgamento = { resultado: "podio" | "mencao" | "nada"; score: ScoreEncontro; nota: number; posicao: number; participantes: number[] };

/** Compara técnica, tema e assinatura da crew com participantes genéricos. Sem ranking global. */
export function julgar(p: Pick<Progresso, "seed" | "nivel" | "tagPropria">, job: Job, semana: number): Julgamento {
  const E = MURO.encontro;
  const prog = progressoTotal(job) / 100;
  const tecnica = qualidadeFinal(job) * prog;
  const tema = fidelidadeFinal(job) * prog * 0.7 + (job.briefing.tema ? 0 : 0) + job.camadas.preenchimento.progresso * 0.3;
  const assinatura = job.camadas.detalhe.progresso * (p.tagPropria ? 1 : 0.8);
  const score: ScoreEncontro = { tecnica: Math.round(tecnica), tema: Math.round(Math.min(100, tema)), assinatura: Math.round(assinatura) };
  const nota = score.tecnica * E.pesos.tecnica + score.tema * E.pesos.tema + score.assinatura * E.pesos.assinatura;
  const participantes = Array.from({ length: E.participantes }, (_, i) => {
    const [a, b] = E.notaBase;
    return Math.round((a + sortear(p.seed, semana, `part${i}`) * (b - a) + (p.nivel - 1) * E.notaPorNivel) * 10) / 10;
  });
  const posicao = 1 + participantes.filter((n) => n > nota).length;
  const resultado = posicao <= E.podio ? "podio" : nota >= E.mencaoMinimo ? "mencao" : "nada";
  return { resultado, score, nota: Math.round(nota * 10) / 10, posicao, participantes };
}
