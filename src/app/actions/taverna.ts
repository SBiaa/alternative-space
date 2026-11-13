"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { dentroDoLimite } from "@/lib/limite";
import { layoutValido, nivelDe } from "@/lib/taverna/atributos";
import { PAPEIS, TAVERNA, TEXTOS_ERRO } from "@/lib/taverna/config";
import { apagarTaverna, comprarMelhoriaDb, contratarDb, gravarNoiteDb, gravarTavernaInteira, lerCatalogo, lerTaverna, melhorarFuncionarioDb, salvarLayoutDb } from "@/lib/taverna/dados";
import { comprarMelhoria, contratar, fecharNoite, melhorarFuncionario, novaTaverna, vagasDe, type FechamentoNoite } from "@/lib/taverna/economia";
import { novaSeed } from "@/lib/taverna/rng";
import { escolherSave, migrar, saveCoerente } from "@/lib/taverna/save";
import type { Catalogo, MesaLayout, Papel, Progresso, RegistroNoite, RegistroSemana, ResumoNoite } from "@/lib/taverna/tipos";

const E = TEXTOS_ERRO;

export type RespostaTaverna = { ok: true; prog: Progresso } | { ok: false; erro: string; semConta?: boolean };

/** Estado inicial da tela: taverna da conta (se houver) e o catálogo. */
export async function carregarTaverna(): Promise<{ logado: boolean; prog: Progresso | null; catalogo: Catalogo }> {
  const [user, catalogo] = await Promise.all([getUser(), lerCatalogo()]);
  if (!user) return { logado: false, prog: null, catalogo };
  try {
    return { logado: true, prog: (await lerTaverna(user.id))?.prog ?? null, catalogo };
  } catch (e) {
    console.error("Não deu pra carregar a taverna:", e);
    return { logado: true, prog: null, catalogo };
  }
}

async function contexto() {
  const user = await getUser();
  if (!user) return { falha: { ok: false, erro: E.semConta, semConta: true } as const };
  const [cat, salva] = await Promise.all([lerCatalogo(), lerTaverna(user.id)]);
  if (!salva) return { falha: { ok: false, erro: E.generico } as const };
  return { falha: null, user, cat, salva };
}

/** Começa uma taverna nova na conta (apaga a anterior, se houver). */
export async function novaTavernaConta(): Promise<RespostaTaverna> {
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta, semConta: true };
  try {
    const cat = await lerCatalogo();
    const prog = novaTaverna(novaSeed());
    await apagarTaverna(user.id);
    await gravarTavernaInteira(user.id, prog, cat);
    return { ok: true, prog: (await lerTaverna(user.id))?.prog ?? prog };
  } catch (e) {
    console.error("Não deu pra criar a taverna:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function comprarMelhoriaConta(slug: string): Promise<RespostaTaverna> {
  if (typeof slug !== "string") return { ok: false, erro: E.generico };
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = comprarMelhoria(c.salva.prog, c.cat, slug);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    const item = c.cat.itens.find((i) => i.slug === slug)!;
    const saldo = await comprarMelhoriaDb(c.user.id, c.salva.id, item, nivelDe(c.salva.prog, slug), r.preco, r.prog.layout);
    if (saldo === null) return { ok: false, erro: E.saldo };
    return { ok: true, prog: (await lerTaverna(c.user.id))?.prog ?? r.prog };
  } catch (e) {
    console.error("Não deu pra comprar a melhoria:", e);
    return { ok: false, erro: E.generico };
  }
}

const papelValido = (p: unknown): p is Papel => typeof p === "string" && (PAPEIS as string[]).includes(p);

export async function contratarFuncionarioConta(papel: string): Promise<RespostaTaverna> {
  if (!papelValido(papel)) return { ok: false, erro: E.generico };
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = contratar(c.salva.prog, papel);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    const saldo = await contratarDb(c.user.id, c.salva.id, papel, r.preco, c.salva.prog.noite, vagasDe(c.salva.prog.nivel));
    if (saldo === null) return { ok: false, erro: E.saldo };
    return { ok: true, prog: (await lerTaverna(c.user.id))?.prog ?? r.prog };
  } catch (e) {
    console.error("Não deu pra contratar:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function melhorarFuncionarioConta(papel: string): Promise<RespostaTaverna> {
  if (!papelValido(papel)) return { ok: false, erro: E.generico };
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = melhorarFuncionario(c.salva.prog, papel);
    if (!r.ok) return { ok: false, erro: E[r.erro] };
    const saldo = await melhorarFuncionarioDb(c.user.id, c.salva.id, papel, r.nivel - 1, r.preco);
    if (saldo === null) return { ok: false, erro: E.saldo };
    return { ok: true, prog: (await lerTaverna(c.user.id))?.prog ?? r.prog };
  } catch (e) {
    console.error("Não deu pra melhorar o funcionário:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function salvarLayoutConta(layout: MesaLayout[]): Promise<RespostaTaverna> {
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    if (!Array.isArray(layout) || !layoutValido(layout, c.salva.prog, c.cat)) return { ok: false, erro: E.layout };
    await salvarLayoutDb(c.user.id, c.salva.id, layout);
    return { ok: true, prog: { ...c.salva.prog, layout } };
  } catch (e) {
    console.error("Não deu pra guardar o salão:", e);
    return { ok: false, erro: E.generico };
  }
}

export type RespostaNoite =
  | { ok: true; prog: Progresso; registro: RegistroNoite; semana: RegistroSemana | null; subiuDeNivel: boolean }
  | { ok: false; erro: string; semConta?: boolean };

/** Fim da noite. O servidor refaz ganhos e gastos com os preços dele, confere o teto e só então grava. */
export async function fecharNoiteConta(resumo: ResumoNoite): Promise<RespostaNoite> {
  const c = await contexto();
  if (c.falha) return c.falha;
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite(`taverna:${c.user.id}`, req, TAVERNA.limiteGravacoes.max, TAVERNA.limiteGravacoes.janelaSeg))) return { ok: false, erro: E.limite };
  try {
    const f = fecharNoite(c.salva.prog, c.cat, resumo);
    if (!f.ok) return { ok: false, erro: E[f.erro] };
    const gravou = await gravarNoiteDb(c.user.id, c.salva.id, c.salva.prog, f as FechamentoNoite);
    if (!gravou) return { ok: false, erro: E.invalido };
    return { ok: true, prog: f.prog, registro: f.registro, semana: f.semana, subiuDeNivel: f.subiuDeNivel };
  } catch (e) {
    console.error("Não deu pra guardar a noite:", e);
    return { ok: false, erro: E.generico };
  }
}

/** Logo depois de criar a conta: leva a taverna do navegador pra conta (a mais avançada vence). */
export async function migrarSaveLocal(bruto: unknown): Promise<{ ok: boolean; prog: Progresso | null }> {
  const user = await getUser();
  if (!user) return { ok: false, prog: null };
  const local = bruto ? migrar(bruto) : null;
  try {
    const [cat, remota] = await Promise.all([lerCatalogo(), lerTaverna(user.id)]);
    const { save, origem } = escolherSave(local, remota?.prog ?? null);
    if (origem === "local" && save) {
      if (!layoutValido(save.layout, save, cat) || !saveCoerente(save, cat)) return { ok: false, prog: remota?.prog ?? null };
      await gravarTavernaInteira(user.id, save, cat);
    }
    return { ok: true, prog: save };
  } catch (e) {
    console.error("Não deu pra migrar o save da taverna:", e);
    return { ok: false, prog: null };
  }
}
