"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { novaSeed } from "@/lib/gestao/rng";
import { dentroDoLimite } from "@/lib/limite";
import { MIN_DIA, MURO } from "@/lib/muro/config";
import { TEXTOS_ERRO } from "@/lib/muro/conteudo";
import { apagarMural, gravarCrewInteira, gravarDiaDb, lerCatalogo, lerCrew, salvarProgresso, type EventoJogo } from "@/lib/muro/dados";
import { comprarMaterial, comprarMelhoria, contratar, fecharDia, novoProgresso, type PedidoMaterial } from "@/lib/muro/economia";
import { escolherSave, migrar, reconciliar, saveCoerente } from "@/lib/muro/save";
import { TAG_PADRAO, getUserTag } from "@/lib/muro/tag";
import type { Catalogo, Progresso, RegistroDia, RegistroSemana, Tag } from "@/lib/muro/tipos";
import type { Erro } from "@/lib/muro/trabalho";

const E = TEXTOS_ERRO;
export type RespostaMuro = { ok: true; prog: Progresso } | { ok: false; erro: string; semConta?: boolean };
export type RespostaDia =
  | { ok: true; prog: Progresso; registro: RegistroDia; semana: RegistroSemana | null; subiuDeNivel: boolean }
  | { ok: false; erro: string; semConta?: boolean };

/** Estado inicial da tela: crew da conta (se houver), o catálogo e a tag do usuário. */
export async function carregarMuro(): Promise<{ logado: boolean; prog: Progresso | null; catalogo: Catalogo; tag: Tag; tagPropria: boolean }> {
  const [user, catalogo] = await Promise.all([getUser(), lerCatalogo()]);
  if (!user) return { logado: false, prog: null, catalogo, tag: TAG_PADRAO, tagPropria: false };
  const tag = await getUserTag(user.id).catch(() => null);
  try {
    const salva = await lerCrew(user.id);
    return { logado: true, prog: salva ? { ...salva.prog, tagPropria: !!tag } : null, catalogo, tag: tag ?? TAG_PADRAO, tagPropria: !!tag };
  } catch (e) {
    console.error("Não deu pra carregar a crew:", e);
    return { logado: true, prog: null, catalogo, tag: tag ?? TAG_PADRAO, tagPropria: !!tag };
  }
}

/** Lê o que o aparelho mandou, junta com o que o servidor sabe e devolve o ponto de partida de cada ação. */
async function contexto(bruto: unknown) {
  const user = await getUser();
  if (!user) return { falha: { ok: false, erro: E.semConta, semConta: true } as const };
  const cli = migrar(bruto);
  if (!cli) return { falha: { ok: false, erro: E.invalido } as const };
  const [cat, salva, tag] = await Promise.all([lerCatalogo(), lerCrew(user.id), getUserTag(user.id).catch(() => null)]);
  if (!salva) return { falha: { ok: false, erro: E.generico } as const };
  const r = reconciliar(salva.prog, cli, cat, !!tag);
  if (!r.ok) return { falha: { ok: false, erro: E[r.erro] } as const };
  return { falha: null, user, cat, salva, prog: r.prog };
}

const entregasNovas = (antes: Progresso, depois: Progresso): EventoJogo[] =>
  depois.entreguesDia
    .filter((id) => !antes.entreguesDia.includes(id))
    .map((id) => {
      const j = depois.jobs.find((x) => x.id === id);
      return { kind: "mural_delivered", payload: { job: id, tamanho: j?.tamanho, qualidade: j?.qualFinal, pago: j?.pago } };
    });

const nota = (e: Erro) => ({ ok: false, erro: E[e] }) as const;

/** Abre uma crew nova na conta (fecha a anterior, se houver). */
export async function novaCrewConta(): Promise<RespostaMuro> {
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta, semConta: true };
  try {
    const [cat, tag] = await Promise.all([lerCatalogo(), getUserTag(user.id).catch(() => null)]);
    const prog = novoProgresso(novaSeed(), cat, !!tag);
    await apagarMural(user.id);
    await gravarCrewInteira(user.id, prog, cat);
    return { ok: true, prog };
  } catch (e) {
    console.error("Não deu pra abrir a crew:", e);
    return { ok: false, erro: E.generico };
  }
}

/** Salva na pausa (e depois de entregar um mural). O servidor refaz entregas e aceites; o resto ele só confere. */
export async function salvarProgressoConta(bruto: unknown): Promise<RespostaMuro> {
  const c = await contexto(bruto);
  if (c.falha) return c.falha;
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite(`muro:${c.user.id}`, req, MURO.limiteGravacoes.max, MURO.limiteGravacoes.janelaSeg))) return { ok: false, erro: E.limite };
  try {
    const ok = await salvarProgresso(c.user.id, c.salva.id, c.prog, c.cat, { dia: c.salva.prog.dia }, entregasNovas(c.salva.prog, c.prog));
    return ok ? { ok: true, prog: c.prog } : { ok: false, erro: E.invalido };
  } catch (e) {
    console.error("Não deu pra salvar a crew:", e);
    return { ok: false, erro: E.generico };
  }
}

async function comprar(bruto: unknown, aplicar: (p: Progresso, cat: Catalogo) => { ok: true; prog: Progresso; evento: EventoJogo } | { ok: false; erro: Erro }): Promise<RespostaMuro> {
  const c = await contexto(bruto);
  if (c.falha) return c.falha;
  try {
    const r = aplicar(c.prog, c.cat);
    if (!r.ok) return nota(r.erro);
    const ok = await salvarProgresso(c.user.id, c.salva.id, r.prog, c.cat, { dia: c.salva.prog.dia, dinheiro: c.salva.prog.dinheiro }, [...entregasNovas(c.salva.prog, c.prog), r.evento]);
    return ok ? { ok: true, prog: r.prog } : { ok: false, erro: E.saldo };
  } catch (e) {
    console.error("Não deu pra concluir a compra:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function comprarMelhoriaConta(bruto: unknown, slug: string): Promise<RespostaMuro> {
  if (typeof slug !== "string") return { ok: false, erro: E.generico };
  return comprar(bruto, (p, cat) => {
    const r = comprarMelhoria(p, cat, slug);
    return r.ok ? { ok: true, prog: r.prog, evento: { kind: "mural_upgrade_purchased", payload: { melhoria: slug, nivel: r.nivel, preco: r.preco } } } : r;
  });
}

export async function comprarMaterialConta(bruto: unknown, pedido: PedidoMaterial): Promise<RespostaMuro> {
  if (!pedido || typeof pedido.item !== "string") return { ok: false, erro: E.generico };
  return comprar(bruto, (p, cat) => {
    const r = comprarMaterial(p, cat, { item: pedido.item, cor: pedido.cor });
    return r.ok ? { ok: true, prog: r.prog, evento: { kind: "mural_upgrade_purchased", payload: { material: pedido.item, cor: pedido.cor ?? null, preco: r.preco } } } : r;
  });
}

export async function contratarConta(bruto: unknown, slug: string): Promise<RespostaMuro> {
  if (typeof slug !== "string") return { ok: false, erro: E.generico };
  return comprar(bruto, (p, cat) => {
    const r = contratar(p, cat, slug);
    return r.ok ? { ok: true, prog: r.prog, evento: { kind: "mural_artist_hired", payload: { arquetipo: slug, preco: r.preco } } } : r;
  });
}

/** Fim do dia. O servidor refaz entregas, salários e contas com os valores dele, confere o dia e só então grava. */
export async function fecharDiaConta(bruto: unknown): Promise<RespostaDia> {
  const c = await contexto(bruto);
  if (c.falha) return c.falha;
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite(`muro:${c.user.id}`, req, MURO.limiteGravacoes.max, MURO.limiteGravacoes.janelaSeg))) return { ok: false, erro: E.limite };
  if (c.prog.minuto < MIN_DIA) return { ok: false, erro: E.dia };
  try {
    const f = fecharDia(c.prog, c.cat);
    const gravou = await gravarDiaDb(c.user.id, c.salva.id, c.prog, f, c.cat, entregasNovas(c.salva.prog, c.prog));
    if (!gravou) return { ok: false, erro: E.invalido };
    return { ok: true, prog: f.prog, registro: f.registro, semana: f.semana, subiuDeNivel: f.subiuDeNivel };
  } catch (e) {
    console.error("Não deu pra guardar o dia da crew:", e);
    return { ok: false, erro: E.generico };
  }
}

/** Logo depois de criar a conta: leva a crew do navegador pra conta (a mais avançada vence). */
export async function migrarSaveLocal(bruto: unknown): Promise<{ ok: boolean; prog: Progresso | null }> {
  const user = await getUser();
  if (!user) return { ok: false, prog: null };
  const local = bruto ? migrar(bruto) : null;
  try {
    const [cat, remota] = await Promise.all([lerCatalogo(), lerCrew(user.id)]);
    const { save, origem } = escolherSave(local, remota?.prog ?? null);
    if (origem === "local" && save) {
      if (!saveCoerente(save, cat)) return { ok: false, prog: remota?.prog ?? null };
      await gravarCrewInteira(user.id, save, cat);
    }
    return { ok: true, prog: save };
  } catch (e) {
    console.error("Não deu pra migrar o save do Muro Livre:", e);
    return { ok: false, prog: null };
  }
}
