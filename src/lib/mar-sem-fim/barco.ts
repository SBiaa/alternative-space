// O barco: reparo, mantimentos, melhorias e a carga da Agulha de Maré. Serviços só funcionam na ilha onde o barco está.

import { ILHA, MUNDO, melhoriaDe, oficioDe } from "./conteudo";
import { emViagem, liberarPelaAgulha, limitesDoBarco, ordemDaAgulha } from "./estado";
import type { Estado, Resultado } from "./tipos";

const servicosAqui = (e: Estado) => ILHA[e.barco.ilhaAtual]?.servicos ?? { mercado: false, estaleiro: false };

export const custoDoReparo = (e: Estado) => MUNDO.barco.custoReparoPorPonto * (oficioDe(e.oficio)?.vantagem.reparo ?? 1);

/** Conserta o casco com o ouro que der (até encher). Precisa de estaleiro. */
export function reparar(e: Estado): Resultado {
  if (emViagem(e)) return { ok: false, erro: "viagem-em-andamento" };
  if (!servicosAqui(e).estaleiro) return { ok: false, erro: "sem-servico" };
  const falta = limitesDoBarco(e).casco - e.barco.casco;
  if (falta <= 0) return { ok: false, erro: "nada-a-fazer" };
  const preco = custoDoReparo(e);
  const pontos = preco > 0 ? Math.min(falta, Math.floor(e.ouro / preco)) : falta;
  if (pontos <= 0) return { ok: false, erro: "sem-ouro" };
  return { ok: true, estado: { ...e, ouro: e.ouro - Math.ceil(pontos * preco), barco: { ...e.barco, casco: e.barco.casco + pontos } } };
}

/** Compra mantimentos com o ouro que der (até encher a despensa). Precisa de mercado. */
export function abastecer(e: Estado): Resultado {
  if (emViagem(e)) return { ok: false, erro: "viagem-em-andamento" };
  if (!servicosAqui(e).mercado) return { ok: false, erro: "sem-servico" };
  const falta = limitesDoBarco(e).mantimentos - e.barco.mantimentos;
  if (falta <= 0) return { ok: false, erro: "nada-a-fazer" };
  const preco = MUNDO.barco.custoMantimentoPorPonto;
  const pontos = preco > 0 ? Math.min(falta, Math.floor(e.ouro / preco)) : falta;
  if (pontos <= 0) return { ok: false, erro: "sem-ouro" };
  return { ok: true, estado: { ...e, ouro: e.ouro - Math.ceil(pontos * preco), barco: { ...e.barco, mantimentos: e.barco.mantimentos + pontos } } };
}

/** Compra uma melhoria. Precisa de estaleiro; as "em breve" não se compram. */
export function comprarMelhoria(e: Estado, id: string): Resultado {
  if (emViagem(e)) return { ok: false, erro: "viagem-em-andamento" };
  const m = melhoriaDe(id);
  if (!m) return { ok: false, erro: "invalido" };
  if (m.emBreve) return { ok: false, erro: "em-breve" };
  if (!servicosAqui(e).estaleiro) return { ok: false, erro: "sem-servico" };
  if (e.barco.melhorias.includes(id)) return { ok: false, erro: "ja-tem" };
  if (e.ouro < m.custo) return { ok: false, erro: "sem-ouro" };
  const barco = { ...e.barco, melhorias: [...e.barco.melhorias, id] };
  const novo = { ...e, ouro: e.ouro - m.custo, barco };
  // Casco novo já vem inteiro na parte que ele acrescentou.
  barco.casco = Math.min(limitesDoBarco(novo).casco, barco.casco + (m.efeito.cascoMax ?? 0));
  return { ok: true, estado: novo };
}

/** Segundos que faltam pra Agulha carregar sozinha na ilha atual (0 = pronta ou não se aplica). */
export function faltaParaCarregar(e: Estado, agora: number): number {
  const a = e.agulha;
  if (a.carregada || !a.ilha || a.ilha !== e.barco.ilhaAtual) return 0;
  return Math.max(0, Math.ceil((a.desde + MUNDO.agulha.cargaSegundos * 1000 - agora) / 1000));
}

/** Ficar tempo suficiente na ilha carrega a Agulha, que então aponta a próxima da ordem. */
export function carregarAgulha(e: Estado, agora: number): Resultado {
  if (emViagem(e)) return { ok: false, erro: "viagem-em-andamento" };
  const a = e.agulha;
  if (!a.ilha || a.ilha !== e.barco.ilhaAtual || !ordemDaAgulha.includes(a.ilha)) return { ok: false, erro: "nada-a-fazer" };
  if (a.carregada) return { ok: false, erro: "nada-a-fazer" };
  if (faltaParaCarregar(e, agora) > 0) return { ok: false, erro: "nao-chegou" };
  return { ok: true, estado: liberarPelaAgulha({ ...e, agulha: { ...a, carregada: true } }) };
}
