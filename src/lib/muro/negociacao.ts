// Aceitar encomenda, conversar com o responsável do muro e começar o mural. Sem autorização, o mural não começa.

import { sortear } from "../gestao/rng";
import { CLIENTES } from "./catalogo";
import { MURO, TAMANHOS, limitar } from "./config";
import { atributos } from "./efeitos";
import { precisaAndaime } from "./geometria";
import type { Catalogo, Dialogo, Job, Progresso } from "./tipos";
import { avancar, clonar, jobPorId, type Resultado } from "./trabalho";

export const clienteDe = (job: Pick<Job, "cliente">) => CLIENTES.find((c) => c.slug === job.cliente);
export const dialogoDe = (cat: Pick<Catalogo, "dialogos">, job: Pick<Job, "cliente">): Dialogo | undefined => {
  const kind = clienteDe(job)?.dialogo;
  return kind ? cat.dialogos.find((d) => d.kind === kind) : undefined;
};

export function croquiBase(p: Pick<Progresso, "nivel" | "tagPropria" | "melhorias" | "equipe">, cat: Pick<Catalogo, "itens" | "arquetipos">): number {
  const attr = atributos(p, cat);
  const C = MURO.croqui;
  return limitar(C.base + (p.tagPropria ? C.comTag : 0) + p.nivel * C.porNivel + attr.croqui, 0, 1);
}

export function exigenciaOk(p: Progresso, job: Job): boolean {
  return p.repClientes >= job.exige.clientes && p.repQuebrada >= job.exige.quebrada;
}

export function aceitar(p0: Progresso, cat: Catalogo, jobId: string): Resultado {
  const p = clonar(p0);
  const job = jobPorId(p, jobId);
  if (!job || job.aceita || job.status !== "aberta" || job.encontro) return { ok: false, erro: "invalido" };
  if (!TAMANHOS[job.tamanho].jogavel) return { ok: false, erro: "empena" };
  if (TAMANHOS[job.tamanho].nivelMin > p.nivel) return { ok: false, erro: "nivel" };
  if (!exigenciaOk(p, job)) return { ok: false, erro: "exigencia" };
  job.aceita = true;
  job.prazo = p.dia + 1 + job.prazoDias + (p.tranquilo ? MURO.prazo.extraTranquilo : 0);
  job.croqui = croquiBase(p, cat);
  job.auth = job.comunitario ? "falta" : "autorizado"; // comércio próprio nasce autorizado
  return { ok: true, prog: p, avisos: [] };
}

/** Recusar fica fora do MVP: a encomenda que não for aceita some no fim da semana. */

export type Pontuacao = { total: number; aprova: number; mudanca: number };
export function pontuar(p: Progresso, cat: Catalogo, job: Job, dialogo: Dialogo): Pontuacao {
  const attr = atributos(p, cat);
  const soma = job.negociacao.respostas.reduce((s, r, i) => s + (dialogo.steps[i]?.opcoes[r]?.pontos ?? 0), 0);
  const N = MURO.negociacao;
  const ruido = (sortear(p.seed, 0, `neg|${job.id}`) - 0.5) * 2 * N.ruido;
  const dif = N.dificuldadePorTamanho[job.tamanho];
  const total = soma + p.repQuebrada * N.pesoQuebrada + job.croqui * N.pesoCroqui + attr.negociacao + ruido;
  return { total, aprova: dialogo.requirements.aprova + dif, mudanca: dialogo.requirements.mudanca + dif };
}

export type RespostaConversa = { resposta: string; fim: boolean; resultado: Job["negociacao"]["resultado"] };
export function responder(p0: Progresso, cat: Catalogo, jobId: string, escolha: number): Resultado<RespostaConversa> {
  const p = clonar(p0);
  const job = jobPorId(p, jobId);
  if (!job || !job.aceita || job.auth !== "falta" || job.status !== "aberta") return { ok: false, erro: job && !job.aceita ? "aceita" : "invalido" };
  const dialogo = dialogoDe(cat, job);
  if (!dialogo) return { ok: false, erro: "invalido" };
  const etapa = job.negociacao.respostas.length;
  const opcao = dialogo.steps[etapa]?.opcoes[escolha];
  if (!opcao || !Number.isInteger(escolha)) return { ok: false, erro: "invalido" };
  if (opcao.minQuebrada !== undefined && p.repQuebrada < opcao.minQuebrada) return { ok: false, erro: "exigencia" };
  job.negociacao.respostas.push(escolha);
  if (opcao.prazo) job.prazo += opcao.prazo;
  if (opcao.preco) job.pagamento = Math.round(job.pagamento * (1 - opcao.preco));
  if (opcao.croqui) job.croqui = limitar(job.croqui + opcao.croqui, 0, 1);
  const fim = job.negociacao.respostas.length >= dialogo.steps.length;
  if (fim) {
    const s = pontuar(p, cat, job, dialogo);
    if (s.total >= s.aprova) {
      job.negociacao.resultado = "autorizado";
      job.auth = "autorizado";
    } else if (s.total >= s.mudanca) {
      job.negociacao.resultado = "mudanca";
      job.auth = "autorizado";
      job.revisao = true;
      job.pagamento = Math.round(job.pagamento * MURO.negociacao.mudancaPagamento);
      job.briefing.tema = dialogo.requirements.mudancaTema;
    } else {
      job.negociacao.resultado = "recusado";
      job.auth = "recusado";
      job.status = "perdida";
    }
  }
  return { ok: true, prog: p, avisos: [], resposta: opcao.resposta, fim, resultado: job.negociacao.resultado };
}

/** Autorizado com mudança: o desenho volta pra revisão. Refazer o croqui custa tempo do dia. */
export function revisar(p0: Progresso, cat: Catalogo, jobId: string): Resultado {
  const p = clonar(p0);
  const job = jobPorId(p, jobId);
  if (!job || !job.revisao) return { ok: false, erro: "invalido" };
  const attr = atributos(p, cat);
  job.revisao = false;
  job.croqui = limitar(job.croqui + 0.1, 0, 1);
  const t = avancar(p, cat, attr.croqui > 0 ? MURO.negociacao.revisaoMinMesa : MURO.negociacao.revisaoMin);
  return { ok: true, prog: t.prog, avisos: t.avisos };
}

export type PodeIniciar = { ok: true } | { ok: false; motivo: "aceita" | "autorizacao" | "revisao" | "nivel" | "artistas" | "empena" | "invalido" };
/** O botão de começar só liga com autorização. O motivo aparece na tela. */
export function podeIniciar(p: Progresso, job: Job): PodeIniciar {
  const cfg = TAMANHOS[job.tamanho];
  if (!cfg.jogavel) return { ok: false, motivo: "empena" };
  if (!job.aceita) return { ok: false, motivo: "aceita" };
  if (job.status !== "aberta") return { ok: false, motivo: "invalido" };
  if (job.auth !== "autorizado") return { ok: false, motivo: "autorizacao" };
  if (job.revisao) return { ok: false, motivo: "revisao" };
  if (cfg.nivelMin > p.nivel) return { ok: false, motivo: "nivel" };
  if (p.equipe.length < cfg.artistasMin) return { ok: false, motivo: "artistas" };
  return { ok: true };
}

export function iniciarMural(p0: Progresso, cat: Catalogo, jobId: string): Resultado {
  const p = clonar(p0);
  const job = jobPorId(p, jobId);
  if (!job) return { ok: false, erro: "invalido" };
  const pode = podeIniciar(p, job);
  if (!pode.ok) return { ok: false, erro: pode.motivo === "aceita" ? "aceita" : pode.motivo === "autorizacao" ? "autorizacao" : pode.motivo };
  job.status = "em_andamento";
  if (precisaAndaime(job.tamanho) && !job.montado) {
    job.montado = true;
    const t = avancar(p, cat, Math.round(TAMANHOS[job.tamanho].montagemMin * atributos(p, cat).montagem));
    return { ok: true, prog: t.prog, avisos: t.avisos };
  }
  return { ok: true, prog: p, avisos: [] };
}

export const minutosDeMontagem = (job: Pick<Job, "tamanho">, p: Pick<Progresso, "melhorias" | "equipe">, cat: Pick<Catalogo, "itens" | "arquetipos">) =>
  precisaAndaime(job.tamanho) ? Math.round(TAMANHOS[job.tamanho].montagemMin * atributos(p, cat).montagem) : 0;
