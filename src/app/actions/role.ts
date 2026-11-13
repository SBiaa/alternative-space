"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { assertAdmin } from "@/lib/auth/admin";
import { getUser } from "@/lib/auth/server";
import { dentroDoLimite } from "@/lib/limite";
import { PICOS, PISTA, TEXTOS } from "@/lib/role/config";
import * as dados from "@/lib/role/dados";
import { validarPista, validarRascunho } from "@/lib/role/pista";
import { hashDaPista, podePublicar, validarCorrida, type Corrida } from "@/lib/role/pontuacao";
import { gerarSlug, limparTexto, validarNomeEDescricao } from "@/lib/role/textos";

// Ações do Rolê Noturno. Dono checado no servidor em toda edição, publicação e exclusão.

type Erro = { ok: false; erro: string; semConta?: boolean };
const erro = (e: string, semConta?: boolean): Erro => ({ ok: false, erro: e, ...(semConta && { semConta }) });

const limite = async (nome: string, l: { max: number; janelaS: number }) =>
  dentroDoLimite(nome, { headers: await headers() } as Request, l.max, l.janelaS);

// Só os campos conhecidos de uma corrida vinda do navegador.
function corridaDe(c: unknown): Corrida | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  const inputs = Array.isArray(o.inputs) ? o.inputs.slice(0, 20_000).filter((e) => e && typeof e === "object" && Number.isInteger((e as { t: unknown }).t) && typeof (e as { a: unknown }).a === "string" && (e as { a: string }).a.length <= 24) : null;
  if (!inputs) return null;
  return {
    score: o.score as number,
    trickPoints: o.trickPoints as number,
    durationMs: o.durationMs as number,
    tricks: (o.tricks ?? {}) as Corrida["tricks"],
    maxCombo: o.maxCombo as number,
    finished: o.finished as boolean,
    inputs: inputs.map((e) => ({ t: (e as { t: number }).t, a: (e as { a: string }).a })),
  };
}

const textosDoRascunho = (titulo: unknown, descricao: unknown) => ({
  title: limparTexto(titulo).slice(0, PISTA.tituloMax),
  description: limparTexto(descricao).slice(0, PISTA.descricaoMax),
});

// Cria (id null) ou atualiza um rascunho. Também usado pra migrar o rascunho do navegador depois do cadastro.
export async function salvarRascunho(id: string | null, layout: unknown, titulo?: unknown, descricao?: unknown): Promise<{ ok: true; id: string } | Erro> {
  const user = await getUser();
  if (!user) return erro(TEXTOS.erros.semConta, true);
  if (!(await limite("role-rascunho", PICOS.limiteRascunhos))) return erro(TEXTOS.erros.muitos);
  const v = validarRascunho(layout);
  if (!v.ok) return erro(v.texto);
  const { title, description } = textosDoRascunho(titulo, descricao);
  try {
    if (id === null) {
      if ((await dados.contarRascunhos(user.id)) >= PICOS.maxRascunhos) return erro(TEXTOS.erros.muitosRascunhos);
      return { ok: true, id: await dados.criarRascunho(user.id, v.pista, title, description) };
    }
    const p = await dados.acharPorId(id);
    if (!p) return erro(TEXTOS.erros.naoEncontrado);
    if (p.userId !== user.id) return erro(TEXTOS.erros.naoEDono);
    if (p.status !== "draft") return erro(TEXTOS.erros.travado);
    await dados.atualizarRascunho(id, user.id, v.pista, title, description);
    return { ok: true, id };
  } catch (e) {
    console.error("Rolê Noturno: não deu pra salvar o rascunho:", e);
    return erro(TEXTOS.erros.generico);
  }
}

// O criador terminou o rascunho no Testar: grava a corrida como prova (e futuro primeiro recorde).
export async function verificarRascunho(id: string, layout: unknown, c: unknown): Promise<{ ok: true } | Erro> {
  const user = await getUser();
  if (!user) return erro(TEXTOS.erros.semConta, true);
  if (!(await limite("role-corrida", PICOS.limiteCorridas))) return erro(TEXTOS.erros.muitos);
  const corrida = corridaDe(c);
  const v = validarPista(layout);
  if (!corrida || !v.ok || !corrida.finished) return erro(TEXTOS.erros.corridaInvalida);
  const p = await dados.acharPorId(id);
  if (!p) return erro(TEXTOS.erros.naoEncontrado);
  if (p.userId !== user.id) return erro(TEXTOS.erros.naoEDono);
  if (p.status !== "draft") return erro(TEXTOS.erros.travado);
  // A corrida tem que ter sido nesta versão exata da pista salva.
  if (hashDaPista(v.pista) !== p.layoutHash) return erro(TEXTOS.erros.corridaInvalida);
  if (validarCorrida(corrida, p.layout)) return erro(TEXTOS.erros.corridaInvalida);
  try {
    await dados.registrarVerificacao(user.id, p, corrida);
    return { ok: true };
  } catch (e) {
    console.error("Rolê Noturno: não deu pra gravar a verificação:", e);
    return erro(TEXTOS.erros.generico);
  }
}

export async function publicarPico(id: string, titulo: unknown, descricao: unknown): Promise<{ ok: true; slug: string } | Erro> {
  const user = await getUser();
  if (!user) return erro(TEXTOS.erros.semConta, true);
  const t = validarNomeEDescricao(titulo, descricao);
  if (!t.ok) return erro(t.erro);
  const p = await dados.acharPorId(id);
  if (!p) return erro(TEXTOS.erros.naoEncontrado);
  if (p.userId !== user.id) return erro(TEXTOS.erros.naoEDono);
  if (p.status !== "draft") return erro(TEXTOS.erros.travado);
  if (!validarPista(p.layout).ok) return erro(TEXTOS.erros.naoTerminou);
  const corrida = p.verifiedRunId ? await dados.corridaPorId(p.verifiedRunId) : null;
  if (!podePublicar(p, corrida, user.id)) return erro(TEXTOS.erros.naoTerminou);
  try {
    const slug = gerarSlug(t.titulo, randomBytes(3).toString("hex"));
    if (!(await dados.publicar(p.id, user.id, slug, t.titulo, t.descricao))) return erro(TEXTOS.erros.travado);
    return { ok: true, slug };
  } catch (e) {
    console.error("Rolê Noturno: não deu pra publicar:", e);
    return erro(TEXTOS.erros.generico);
  }
}

export async function duplicarPico(id: string): Promise<{ ok: true; id: string } | Erro> {
  const user = await getUser();
  if (!user) return erro(TEXTOS.erros.semConta, true);
  const p = await dados.acharPorId(id);
  if (!p) return erro(TEXTOS.erros.naoEncontrado);
  if (p.userId !== user.id) return erro(TEXTOS.erros.naoEDono);
  if ((await dados.contarRascunhos(user.id)) >= PICOS.maxRascunhos) return erro(TEXTOS.erros.muitosRascunhos);
  return { ok: true, id: await dados.duplicar(p, user.id) };
}

export async function apagarPico(id: string): Promise<{ ok: true } | Erro> {
  const user = await getUser();
  if (!user) return erro(TEXTOS.erros.semConta, true);
  const p = await dados.acharPorId(id);
  if (!p) return erro(TEXTOS.erros.naoEncontrado);
  if (p.userId !== user.id) return erro(TEXTOS.erros.naoEDono);
  await dados.apagarPico(id, user.id);
  return { ok: true };
}

export type RespostaCorrida = { ok: true; recorde: boolean } | Erro;

// Fim de corrida num pico publicado. Sem conta, só conta a jogada (o navegador guarda o resultado).
// `pendente`: corrida guardada antes do cadastro, cuja jogada já foi contada.
export async function salvarCorrida(slug: string, c: unknown, pendente = false): Promise<RespostaCorrida> {
  if (typeof slug !== "string") return erro(TEXTOS.erros.naoEncontrado);
  const user = await getUser();
  if (!(await limite(user ? "role-corrida" : "role-jogada", user ? PICOS.limiteCorridas : PICOS.limiteJogadas))) return erro(TEXTOS.erros.muitos);
  const p = await dados.acharPorSlug(slug);
  if (!p || (p.status !== "published" && p.userId !== user?.id)) return erro(TEXTOS.erros.naoEncontrado);
  if (!user) {
    await dados.somarJogada(p.id).catch(() => {});
    return erro(TEXTOS.pico.entrarRanking, true);
  }
  const corrida = corridaDe(c);
  if (!corrida || validarCorrida(corrida, p.layout)) return erro(TEXTOS.erros.corridaInvalida);
  try {
    const r = await dados.registrarCorrida(user.id, p, corrida, !pendente);
    return { ok: true, recorde: r.recorde };
  } catch (e) {
    console.error("Rolê Noturno: não deu pra salvar a corrida:", e);
    return erro(TEXTOS.erros.generico);
  }
}

// ---------- Moderação ----------

export async function denunciarPico(slug: string, motivo: string): Promise<{ ok: true } | Erro> {
  const user = await getUser();
  if (!user) return erro(TEXTOS.erros.semConta, true);
  if (!(TEXTOS.denuncia.motivos as readonly string[]).includes(motivo)) return erro(TEXTOS.erros.generico);
  if (!(await limite("role-denuncia", PICOS.limiteRascunhos))) return erro(TEXTOS.erros.muitos);
  const p = await dados.acharPorSlug(slug);
  if (!p || p.status !== "published") return erro(TEXTOS.erros.naoEncontrado);
  const nova = await dados.denunciar(p.id, user.id, motivo);
  return nova ? { ok: true } : erro(TEXTOS.denuncia.jaEnviada);
}

// Só admin (papel conferido no banco a cada chamada).
export async function moderarPico(id: string, acao: "esconder" | "liberar"): Promise<{ ok: boolean }> {
  await assertAdmin();
  if (typeof id !== "string" || (acao !== "esconder" && acao !== "liberar")) return { ok: false };
  return { ok: await dados.moderar(id, acao) };
}
