"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { novaSeed } from "@/lib/gestao/rng";
import { dentroDoLimite } from "@/lib/limite";
import { BANCA } from "@/lib/banca/config";
import { TEXTOS_ERRO } from "@/lib/banca/conteudo";
import { apagarBanca, comprarMelhoriaDb, fecharEventoDb, gravarBancaInteira, lerBanca, produzirDb, salvarLayoutDb } from "@/lib/banca/dados";
import { comprarMelhoria, definirLayout, fecharEvento, novaBanca, produzir } from "@/lib/banca/economia";
import { escolherSave, migrar, saveCoerente } from "@/lib/banca/save";
import type { Layout, Progresso, RegistroEvento, ResumoEvento } from "@/lib/banca/tipos";

const E = TEXTOS_ERRO;

export type RespostaBanca = { ok: true; prog: Progresso } | { ok: false; erro: string; semConta?: boolean };

/** Estado inicial da tela: banca da conta (se houver). */
export async function carregarBanca(): Promise<{ logado: boolean; prog: Progresso | null }> {
  const user = await getUser();
  if (!user) return { logado: false, prog: null };
  try {
    return { logado: true, prog: (await lerBanca(user.id))?.prog ?? null };
  } catch (e) {
    console.error("Não deu pra carregar a banca:", e);
    return { logado: true, prog: null };
  }
}

async function contexto() {
  const user = await getUser();
  if (!user) return { falha: { ok: false, erro: E.semConta, semConta: true } as const };
  const salva = await lerBanca(user.id);
  if (!salva) return { falha: { ok: false, erro: E.generico } as const };
  return { falha: null, user, salva };
}

const releitura = async (userId: string, fallback: Progresso) => (await lerBanca(userId))?.prog ?? fallback;

/** Abre uma banca nova na conta (fecha a anterior, se houver). */
export async function novaBancaConta(): Promise<RespostaBanca> {
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta, semConta: true };
  try {
    await apagarBanca(user.id);
    const prog = novaBanca(novaSeed());
    await gravarBancaInteira(user.id, prog);
    return { ok: true, prog: await releitura(user.id, prog) };
  } catch (e) {
    console.error("Não deu pra abrir a banca:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function produzirConta(produto: string, tema: string, lotes: number): Promise<RespostaBanca> {
  if (typeof produto !== "string" || typeof tema !== "string") return { ok: false, erro: E.generico };
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = produzir(c.salva.prog, produto, tema, lotes);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    const saldo = await produzirDb(c.user.id, c.salva.id, c.salva.prog, r.prog);
    if (saldo === null) return { ok: false, erro: E.saldo };
    return { ok: true, prog: await releitura(c.user.id, r.prog) };
  } catch (e) {
    console.error("Não deu pra produzir na banca:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function comprarMelhoriaConta(slug: string): Promise<RespostaBanca> {
  if (typeof slug !== "string") return { ok: false, erro: E.generico };
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = comprarMelhoria(c.salva.prog, slug);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    const saldo = await comprarMelhoriaDb(c.user.id, c.salva.id, slug, c.salva.prog, r.prog, r.preco);
    if (saldo === null) return { ok: false, erro: E.saldo };
    return { ok: true, prog: await releitura(c.user.id, r.prog) };
  } catch (e) {
    console.error("Não deu pra comprar a melhoria da banca:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function salvarLayoutConta(layout: Layout): Promise<RespostaBanca> {
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = definirLayout(c.salva.prog, layout);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    await salvarLayoutDb(c.user.id, c.salva.id, r.prog.layout);
    return { ok: true, prog: r.prog };
  } catch (e) {
    console.error("Não deu pra guardar a mesa da banca:", e);
    return { ok: false, erro: E.generico };
  }
}

export type RespostaEvento =
  | { ok: true; prog: Progresso; registro: RegistroEvento; subiu: boolean }
  | { ok: false; erro: string; semConta?: boolean };

/** Fim do evento. O servidor refaz receita e custos com os preços dele, confere estoque e tetos e só então grava. */
export async function fecharEventoConta(resumo: ResumoEvento): Promise<RespostaEvento> {
  const c = await contexto();
  if (c.falha) return c.falha;
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite(`banca:${c.user.id}`, req, BANCA.limiteGravacoes.max, BANCA.limiteGravacoes.janelaSeg))) return { ok: false, erro: E.limite };
  try {
    const f = fecharEvento(c.salva.prog, resumo);
    if (!f.ok) return { ok: false, erro: E[f.erro] };
    const gravou = await fecharEventoDb(c.user.id, c.salva.id, c.salva.prog, f.prog, f.registro);
    if (!gravou) return { ok: false, erro: E.invalido };
    return { ok: true, prog: f.prog, registro: f.registro, subiu: f.subiu };
  } catch (e) {
    console.error("Não deu pra guardar o evento da banca:", e);
    return { ok: false, erro: E.generico };
  }
}

/** Logo depois de criar a conta: leva a banca do navegador pra conta (a mais avançada vence). */
export async function migrarSaveLocal(bruto: unknown): Promise<{ ok: boolean; prog: Progresso | null }> {
  const user = await getUser();
  if (!user) return { ok: false, prog: null };
  const local = bruto ? migrar(bruto) : null;
  try {
    const remota = await lerBanca(user.id);
    const { save, origem } = escolherSave(local, remota?.prog ?? null);
    if (origem === "local" && save) {
      if (!saveCoerente(save)) return { ok: false, prog: remota?.prog ?? null };
      await gravarBancaInteira(user.id, save);
    }
    return { ok: true, prog: save };
  } catch (e) {
    console.error("Não deu pra migrar o save da banca:", e);
    return { ok: false, prog: null };
  }
}
