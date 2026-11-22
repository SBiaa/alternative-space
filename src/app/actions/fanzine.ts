"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { dentroDoLimite } from "@/lib/limite";
import { capituloPublicado } from "@/lib/fanzine/carregar";
import { FANZINE, TEXTOS } from "@/lib/fanzine/config";
import { gravarProgresso, lerProgresso, registrarEvento } from "@/lib/fanzine/dados";
import { acharPista, conferir, deducoesFeitas, dicasLiberadas, ligar, pedirDica } from "@/lib/fanzine/motor";
import { migrar, migrarLocalParaConta, progressoVazio, sanear } from "@/lib/fanzine/save";
import type { Capitulo, Estado, Progresso } from "@/lib/fanzine/tipos";

const E = TEXTOS.erros;

type Falha = { ok: false; erro: string };
export type RespEstado = { ok: true; estado: Estado } | Falha;
export type RespAchar = { ok: true; estado: Estado; nova: boolean } | Falha;
export type RespLigar = { ok: true; resultado: "certa"; estado: Estado; texto: string; jaTinha: boolean } | { ok: true; resultado: "nao_fecha"; estado: Estado } | Falha;
export type RespDica = { ok: true; estado: Estado; nivel: number } | Falha;
export type RespResposta = { ok: true; resolvida: true; estado: Estado } | { ok: true; resolvida: false; faltou: string[]; estado: Estado } | Falha;

const estadoDe = (cap: Capitulo, prog: Progresso, logado: boolean): Estado => ({ logado, prog, deducoes: deducoesFeitas(cap, prog), dicas: dicasLiberadas(cap, prog) });

type Usuario = { id: string };
type Contexto = { falha: Falha } | { falha: null; cap: Capitulo; user: Usuario | null; prog: Progresso };

/**
 * Capítulo + progresso atual. Logado: o progresso é o do banco e o `local` é ignorado.
 * Sem conta: vale o `local`, saneado contra o conteúdo (só o que existe e faz sentido sobra).
 */
async function contexto(slug: unknown, local: unknown, comLimite: boolean): Promise<Contexto> {
  const cap = typeof slug === "string" ? capituloPublicado(slug) : null;
  if (!cap) return { falha: { ok: false, erro: E.capitulo } };
  const user = await getUser();
  if (comLimite) {
    const req = { headers: await headers() } as Request;
    if (!(await dentroDoLimite(`fanzine:${user?.id ?? "anon"}`, req, FANZINE.limiteAcoes.max, FANZINE.limiteAcoes.janelaSeg))) return { falha: { ok: false, erro: E.limite } };
  }
  try {
    const bruto = user ? ((await lerProgresso(user.id, cap.slug)) ?? progressoVazio()) : (migrar(local) ?? progressoVazio());
    return { falha: null, cap, user: user ? { id: user.id } : null, prog: sanear(cap, bruto, true) };
  } catch (e) {
    console.error("Fanzine: não deu pra ler o progresso:", e);
    return { falha: { ok: false, erro: E.generico } };
  }
}

/** Estado inicial da tela. */
export async function carregarFanzine(slug: string, local?: unknown): Promise<RespEstado> {
  const c = await contexto(slug, local, false);
  if (c.falha) return c.falha;
  return { ok: true, estado: estadoDe(c.cap, c.prog, c.user !== null) };
}

export async function acharPistaAcao(slug: string, pistaId: string, local?: unknown): Promise<RespAchar> {
  const c = await contexto(slug, local, true);
  if (c.falha) return c.falha;
  const r = acharPista(c.cap, c.prog, String(pistaId).slice(0, 64));
  if (!r.ok) return { ok: false, erro: E.pista };
  try {
    if (c.user && r.nova) {
      await gravarProgresso(c.user.id, c.cap.slug, r.prog);
      await registrarEvento(c.user.id, FANZINE.eventos.pista, { capitulo: c.cap.slug, pista: String(pistaId) });
    }
  } catch (e) {
    console.error("Fanzine: não deu pra gravar a pista:", e);
    return { ok: false, erro: E.generico };
  }
  return { ok: true, estado: estadoDe(c.cap, r.prog, c.user !== null), nova: r.nova };
}

export async function ligarAcao(slug: string, a: string, b: string, local?: unknown): Promise<RespLigar> {
  const c = await contexto(slug, local, true);
  if (c.falha) return c.falha;
  const r = ligar(c.cap, c.prog, String(a).slice(0, 64), String(b).slice(0, 64));
  if (!r.ok) return { ok: false, erro: r.erro === "iguais" ? TEXTOS.quadro.iguais : r.erro === "sem_pista" ? E.semPista : E.pista };
  if (r.resultado === "nao_fecha") return { ok: true, resultado: "nao_fecha", estado: estadoDe(c.cap, c.prog, c.user !== null) };
  try {
    if (c.user && !r.jaTinha) await gravarProgresso(c.user.id, c.cap.slug, r.prog);
  } catch (e) {
    console.error("Fanzine: não deu pra gravar a dedução:", e);
    return { ok: false, erro: E.generico };
  }
  return { ok: true, resultado: "certa", estado: estadoDe(c.cap, r.prog, c.user !== null), texto: r.deducao.texto, jaTinha: r.jaTinha };
}

export async function pedirDicaAcao(slug: string, local?: unknown): Promise<RespDica> {
  const c = await contexto(slug, local, true);
  if (c.falha) return c.falha;
  const r = pedirDica(c.cap, c.prog);
  if (!r.ok) return { ok: false, erro: TEXTOS.dicas.acabaram };
  try {
    if (c.user) await gravarProgresso(c.user.id, c.cap.slug, r.prog);
  } catch (e) {
    console.error("Fanzine: não deu pra gravar a dica:", e);
    return { ok: false, erro: E.generico };
  }
  return { ok: true, estado: estadoDe(c.cap, r.prog, c.user !== null), nivel: r.nivel };
}

/** Só aceita { parte: opção } com textos curtos; o resto vira "sem resposta". */
function limparRespostas(bruto: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (bruto && typeof bruto === "object") for (const [k, v] of Object.entries(bruto as Record<string, unknown>)) if (typeof v === "string" && k.length <= 48) out[k] = v.slice(0, 48);
  return out;
}

/** Confere a resposta no servidor. Quando erra, devolve só o que faltou, nunca a resposta certa. */
export async function responderAcao(slug: string, respostas: Record<string, string>, local?: unknown): Promise<RespResposta> {
  const c = await contexto(slug, local, true);
  if (c.falha) return c.falha;
  const r = conferir(c.cap, c.prog, limparRespostas(respostas));
  if (!r.resolvida) return { ok: true, resolvida: false, faltou: r.faltou, estado: estadoDe(c.cap, c.prog, c.user !== null) };
  try {
    if (c.user) {
      await gravarProgresso(c.user.id, c.cap.slug, r.prog);
      if (!c.prog.solved) await registrarEvento(c.user.id, FANZINE.eventos.jogada, { capitulo: c.cap.slug, dicas: r.prog.hints, pistas: r.prog.clues.length });
    }
  } catch (e) {
    console.error("Fanzine: não deu pra gravar o capítulo resolvido:", e);
    return { ok: false, erro: E.generico };
  }
  return { ok: true, resolvida: true, estado: estadoDe(c.cap, r.prog, c.user !== null) };
}

/**
 * Depois de criar a conta: leva as pistas do aparelho pra conta. O servidor refaz a conferência
 * (só entra pista que existe e dedução cujas duas pistas o jogador tem) e o "resolvido" do aparelho não vale:
 * o selo só sai de uma resposta conferida aqui.
 */
export async function migrarProgressoLocal(slug: string, local: unknown): Promise<RespEstado> {
  const c = await contexto(slug, null, true);
  if (c.falha) return c.falha;
  if (!c.user) return { ok: false, erro: E.generico };
  try {
    const daConta = await lerProgresso(c.user.id, c.cap.slug);
    const novo = migrarLocalParaConta(c.cap, local, daConta);
    const novasPistas = novo.clues.filter((p) => !(daConta?.clues ?? []).includes(p));
    await gravarProgresso(c.user.id, c.cap.slug, novo);
    for (const p of novasPistas) await registrarEvento(c.user.id, FANZINE.eventos.pista, { capitulo: c.cap.slug, pista: p, origem: "aparelho" });
    return { ok: true, estado: estadoDe(c.cap, novo, true) };
  } catch (e) {
    console.error("Fanzine: não deu pra migrar o progresso local:", e);
    return { ok: false, erro: E.generico };
  }
}
