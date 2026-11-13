"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { novaSeed } from "@/lib/gestao/rng";
import { dentroDoLimite } from "@/lib/limite";
import { layoutValido, nivelDe } from "@/lib/lan/atributos";
import { EQUIPE, LAN, PAPEIS } from "@/lib/lan/config";
import { TEXTOS_ERRO } from "@/lib/lan/conteudo";
import { apagarLan, comprarMelhoriaDb, contratarDb, gravarDiaDb, gravarLanInteira, lerCatalogo, lerLan, melhorarFuncionarioDb, salvarLayoutDb } from "@/lib/lan/dados";
import { comprarMelhoria, contratar, fecharDia, melhorarFuncionario, novaLan, vagasDe, type FechamentoDia } from "@/lib/lan/economia";
import { escolherSave, migrar, saveCoerente } from "@/lib/lan/save";
import type { Catalogo, Layout, Papel, Progresso, RegistroDia, RegistroSemana, ResumoDia } from "@/lib/lan/tipos";

const E = TEXTOS_ERRO;

export type RespostaLan = { ok: true; prog: Progresso } | { ok: false; erro: string; semConta?: boolean };

/** Estado inicial da tela: lan da conta (se houver) e o catálogo. */
export async function carregarLan(): Promise<{ logado: boolean; prog: Progresso | null; catalogo: Catalogo }> {
  const [user, catalogo] = await Promise.all([getUser(), lerCatalogo()]);
  if (!user) return { logado: false, prog: null, catalogo };
  try {
    return { logado: true, prog: (await lerLan(user.id))?.prog ?? null, catalogo };
  } catch (e) {
    console.error("Não deu pra carregar a lan:", e);
    return { logado: true, prog: null, catalogo };
  }
}

async function contexto() {
  const user = await getUser();
  if (!user) return { falha: { ok: false, erro: E.semConta, semConta: true } as const };
  const [cat, salva] = await Promise.all([lerCatalogo(), lerLan(user.id)]);
  if (!salva) return { falha: { ok: false, erro: E.generico } as const };
  return { falha: null, user, cat, salva };
}

const releitura = async (userId: string, fallback: Progresso) => (await lerLan(userId))?.prog ?? fallback;

/** Abre uma lan nova na conta (fecha a anterior, se houver). */
export async function novaLanConta(): Promise<RespostaLan> {
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta, semConta: true };
  try {
    const cat = await lerCatalogo();
    const prog = novaLan(novaSeed(), cat);
    await apagarLan(user.id);
    await gravarLanInteira(user.id, prog, cat);
    return { ok: true, prog: await releitura(user.id, prog) };
  } catch (e) {
    console.error("Não deu pra abrir a lan:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function comprarMelhoriaConta(slug: string): Promise<RespostaLan> {
  if (typeof slug !== "string") return { ok: false, erro: E.generico };
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = comprarMelhoria(c.salva.prog, c.cat, slug);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    const item = c.cat.itens.find((i) => i.slug === slug)!;
    const saldo = await comprarMelhoriaDb(c.user.id, c.salva.id, item, nivelDe(c.salva.prog, slug), r.preco, r.prog);
    if (saldo === null) return { ok: false, erro: E.saldo };
    return { ok: true, prog: await releitura(c.user.id, r.prog) };
  } catch (e) {
    console.error("Não deu pra comprar a melhoria da lan:", e);
    return { ok: false, erro: E.generico };
  }
}

const papelValido = (p: unknown): p is Papel => typeof p === "string" && (PAPEIS as string[]).includes(p);

export async function contratarConta(papel: string): Promise<RespostaLan> {
  if (!papelValido(papel)) return { ok: false, erro: E.generico };
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = contratar(c.salva.prog, papel);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    const saldo = await contratarDb(c.user.id, c.salva.id, papel, r.preco, c.salva.prog.dia, vagasDe(c.salva.prog.nivel), EQUIPE[papel].nivelLan);
    if (saldo === null) return { ok: false, erro: E.saldo };
    return { ok: true, prog: await releitura(c.user.id, r.prog) };
  } catch (e) {
    console.error("Não deu pra contratar na lan:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function melhorarFuncionarioConta(papel: string): Promise<RespostaLan> {
  if (!papelValido(papel)) return { ok: false, erro: E.generico };
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = melhorarFuncionario(c.salva.prog, papel);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    const saldo = await melhorarFuncionarioDb(c.user.id, c.salva.id, papel, r.nivel - 1, r.preco);
    if (saldo === null) return { ok: false, erro: E.saldo };
    return { ok: true, prog: await releitura(c.user.id, r.prog) };
  } catch (e) {
    console.error("Não deu pra melhorar o funcionário da lan:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function salvarLayoutConta(layout: Layout): Promise<RespostaLan> {
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    if (!layoutValido(layout, c.salva.prog, c.cat)) return { ok: false, erro: E.layout };
    const limpo: Layout = { pcs: layout.pcs.map(({ id, x, y }) => ({ id, x, y })), divisoria: layout.divisoria };
    await salvarLayoutDb(c.user.id, c.salva.id, limpo);
    return { ok: true, prog: { ...c.salva.prog, layout: limpo } };
  } catch (e) {
    console.error("Não deu pra guardar o salão da lan:", e);
    return { ok: false, erro: E.generico };
  }
}

export type RespostaDia =
  | { ok: true; prog: Progresso; registro: RegistroDia; semana: RegistroSemana | null; subiuDeNivel: boolean }
  | { ok: false; erro: string; semConta?: boolean };

/** Fim do dia. O servidor refaz ganhos e gastos com os preços dele, confere os tetos e só então grava. */
export async function fecharDiaConta(resumo: ResumoDia): Promise<RespostaDia> {
  const c = await contexto();
  if (c.falha) return c.falha;
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite(`lan:${c.user.id}`, req, LAN.limiteGravacoes.max, LAN.limiteGravacoes.janelaSeg))) return { ok: false, erro: E.limite };
  try {
    const f = fecharDia(c.salva.prog, c.cat, resumo);
    if (!f.ok) return { ok: false, erro: E[f.erro] };
    const gravou = await gravarDiaDb(c.user.id, c.salva.id, c.salva.prog, f as FechamentoDia);
    if (!gravou) return { ok: false, erro: E.invalido };
    return { ok: true, prog: f.prog, registro: f.registro, semana: f.semana, subiuDeNivel: f.subiuDeNivel };
  } catch (e) {
    console.error("Não deu pra guardar o dia da lan:", e);
    return { ok: false, erro: E.generico };
  }
}

/** Logo depois de criar a conta: leva a lan do navegador pra conta (a mais avançada vence). */
export async function migrarSaveLocal(bruto: unknown): Promise<{ ok: boolean; prog: Progresso | null }> {
  const user = await getUser();
  if (!user) return { ok: false, prog: null };
  const local = bruto ? migrar(bruto) : null;
  try {
    const [cat, remota] = await Promise.all([lerCatalogo(), lerLan(user.id)]);
    const { save, origem } = escolherSave(local, remota?.prog ?? null);
    if (origem === "local" && save) {
      if (!saveCoerente(save, cat)) return { ok: false, prog: remota?.prog ?? null };
      await gravarLanInteira(user.id, save, cat);
    }
    return { ok: true, prog: save };
  } catch (e) {
    console.error("Não deu pra migrar o save da lan:", e);
    return { ok: false, prog: null };
  }
}
