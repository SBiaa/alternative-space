"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { novaSeed } from "@/lib/gestao/rng";
import { dentroDoLimite } from "@/lib/limite";
import { LAJE } from "@/lib/laje/config";
import { TEXTOS_ERRO as E } from "@/lib/laje/conteudo";
import { aplicarAcao, schemaAcao, semExtras } from "@/lib/laje/acoes";
import { criarLaje, gravarAcao, lerLaje, registrarVisitaDoDia } from "@/lib/laje/dados";
import { novoSave } from "@/lib/laje/motor";
import { migrar, normalizarImportado, saveCoerente } from "@/lib/laje/save";
import type { Save } from "@/lib/laje/tipos";
import { montarVisao, type Visao } from "@/lib/laje/visao";

export type RespostaLaje = { ok: true; visao: Visao } | { ok: false; erro: string; semConta?: boolean; visao?: Visao };

/** Estado inicial da tela: laje da conta (se houver). */
export async function carregarLaje(): Promise<{ logado: boolean; visao: Visao | null }> {
  const user = await getUser();
  if (!user) return { logado: false, visao: null };
  try {
    const agora = Date.now();
    const salva = await lerLaje(user.id);
    if (!salva) return { logado: true, visao: null };
    await registrarVisitaDoDia(user.id, agora).catch((e) => console.error("Não deu pra registrar a visita:", e));
    return { logado: true, visao: montarVisao(salva.save, agora) };
  } catch (e) {
    console.error("Não deu pra carregar a laje:", e);
    return { logado: true, visao: null };
  }
}

const limitado = async (userId: string) => {
  const req = { headers: await headers() } as Request;
  return !(await dentroDoLimite(`laje:${userId}`, req, LAJE.limiteGravacoes.max, LAJE.limiteGravacoes.janelaSeg));
};

/** Abre a laje da conta. Com `local`, leva o save do aparelho pra conta (os carimbos viram do servidor daqui pra frente). */
export async function criarLajeConta(local?: unknown): Promise<RespostaLaje> {
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta, semConta: true };
  if (await limitado(user.id)) return { ok: false, erro: E.limite };
  try {
    const agora = Date.now();
    const existente = await lerLaje(user.id);
    if (existente) return { ok: true, visao: montarVisao(existente.save, agora) };
    const importado = local ? migrar(local) : null;
    const usar: Save = importado && saveCoerente(importado, agora) ? normalizarImportado(importado, agora) : novoSave(novaSeed(), agora);
    const salva = await criarLaje(user.id, usar);
    if (!salva) return { ok: false, erro: E.generico };
    await registrarVisitaDoDia(user.id, agora).catch(() => {});
    return { ok: true, visao: montarVisao(salva.save, agora) };
  } catch (e) {
    console.error("Não deu pra abrir a laje:", e);
    return { ok: false, erro: E.generico };
  }
}

/** Uma ação da laje da conta: o servidor confere, calcula e grava. A tela só recebe o resultado. */
export async function agirNaLaje(bruta: unknown): Promise<RespostaLaje> {
  const parsed = schemaAcao.safeParse(bruta);
  if (!parsed.success) return { ok: false, erro: E.invalido };
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta, semConta: true };
  if (await limitado(user.id)) return { ok: false, erro: E.limite };
  try {
    const agora = Date.now();
    const salva = await lerLaje(user.id);
    if (!salva) return { ok: false, erro: E.generico };
    const { r, log, payload, evento } = aplicarAcao(salva.save, agora, parsed.data);
    if (!r.ok) return { ok: false, erro: E[r.erro], visao: montarVisao(salva.save, agora) };
    const depois = semExtras(r.save);
    const gravou = await gravarAcao(user.id, salva, depois, agora, log, payload, evento);
    if (!gravou) {
      const atual = await lerLaje(user.id);
      return { ok: false, erro: E.versao, visao: atual ? montarVisao(atual.save, agora) : undefined };
    }
    return { ok: true, visao: montarVisao(depois, agora) };
  } catch (e) {
    console.error("Não deu pra gravar a ação da laje:", e);
    return { ok: false, erro: E.generico };
  }
}

