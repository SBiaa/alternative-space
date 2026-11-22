"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { dentroDoLimite } from "@/lib/limite";
import { aventuraPorSlug } from "@/lib/bolso/aventuras";
import { REGRAS } from "@/lib/bolso/config";
import type { Aventura } from "@/lib/bolso/conteudo";
import {
  abandonarRun,
  criarPersonagem,
  criarRun,
  fecharRun,
  gravarPasso,
  importarLocal,
  listarPersonagens,
  personagemDoDono,
  runAtiva,
  type Fechamento,
} from "@/lib/bolso/dados";
import {
  apagarPersonagemLocal,
  apagarRunLocal,
  gravarPersonagemLocal,
  gravarRunLocal,
  lerPersonagemLocal,
  lerRunLocal,
  lerRunsLocais,
} from "@/lib/bolso/local";
import { escolher, iniciar, recompensasDe, resumoDaPartida } from "@/lib/bolso/motor";
import { personagemSchema } from "@/lib/bolso/personagem";
import { novaSeed } from "@/lib/bolso/rng";
import type { Estado, RolagemEstado } from "@/lib/bolso/save";

// A tela só manda a escolha. O servidor confere o dono, rola os dados com a seed da partida, aplica os efeitos e grava.

export type Resp<T = object> = ({ ok: true } & T) | { ok: false; erro: string; semConta?: boolean };

const MUITOS = "Muitos toques seguidos. Espera um pouquinho e tenta de novo.";
const FALHOU = "Não deu pra salvar agora. Tenta de novo em instantes.";

async function dentro(nome: string, max: number, janelaS: number) {
  return dentroDoLimite(nome, { headers: await headers() } as Request, max, janelaS);
}

export async function criarPersonagemAcao(bruto: unknown): Promise<Resp<{ id: string | null }>> {
  const r = personagemSchema.safeParse(bruto);
  if (!r.success) return { ok: false, erro: r.error.issues[0]?.message ?? "Personagem inválida." };
  if (!(await dentro("bolso-pj", 20, 60))) return { ok: false, erro: MUITOS };
  const user = await getUser();
  try {
    if (!user) {
      await gravarPersonagemLocal(r.data);
      return { ok: true, id: null };
    }
    const id = await criarPersonagem(user.id, r.data);
    if (!id) return { ok: false, erro: `Você já tem ${REGRAS.personagensPorConta} personagens.` };
    return { ok: true, id };
  } catch (e) {
    console.error("Mesa de Bolso: não deu pra criar a personagem:", e);
    return { ok: false, erro: FALHOU };
  }
}

/** `personagemId` só vale logado (id de solo_characters do próprio usuário); sem conta usa a personagem do cookie. */
export async function iniciarPartida(slug: string, personagemId?: string): Promise<Resp> {
  const a = aventuraPorSlug(String(slug));
  if (!a) return { ok: false, erro: "Aventura não encontrada." };
  const user = await getUser();
  try {
    if (!user) {
      const p = await lerPersonagemLocal();
      if (!p) return { ok: false, erro: "Cria uma personagem primeiro." };
      await gravarRunLocal(iniciar(a, p, novaSeed()));
      return { ok: true };
    }
    const p = personagemId ? await personagemDoDono(user.id, personagemId) : null;
    if (!p) return { ok: false, erro: "Escolhe uma das suas personagens." };
    const id = await criarRun(user.id, p.id, iniciar(a, p, novaSeed()));
    if (!id) return { ok: false, erro: "Essa aventura já está em andamento." };
    return { ok: true };
  } catch (e) {
    console.error("Mesa de Bolso: não deu pra iniciar:", e);
    return { ok: false, erro: FALHOU };
  }
}

function fechamento(a: Aventura, e: Estado): Fechamento {
  const r = resumoDaPartida(a, e)!;
  return { finalId: e.final!.id, resumo: `${r.titulo}. ${r.texto}`, recompensas: recompensasDe(a, e) };
}

export async function escolherOpcao(slug: string, opcaoId: string): Promise<Resp<{ rolagem?: RolagemEstado; terminou: boolean }>> {
  const a = aventuraPorSlug(String(slug));
  if (!a) return { ok: false, erro: "Aventura não encontrada." };
  if (typeof opcaoId !== "string" || opcaoId.length > 64) return { ok: false, erro: "Opção inválida." };
  if (!(await dentro("bolso-rolar", REGRAS.limite.max, REGRAS.limite.janelaS))) return { ok: false, erro: MUITOS };
  const user = await getUser();

  try {
    const guardada = user ? await runAtiva(user.id, a.slug) : null;
    const estado = user ? guardada?.estado : await lerRunLocal(a.slug);
    if (!estado || (user && !guardada)) return { ok: false, erro: "Não achei essa partida. Começa de novo pela capa." };

    let r;
    try {
      r = escolher(a, estado, opcaoId);
    } catch {
      return { ok: false, erro: "Essa aventura mudou desde a última vez. Recomeça pela capa." };
    }
    if (!r.ok) return { ok: false, erro: r.erro };

    if (!user) {
      await gravarRunLocal(r.estado);
    } else if (r.terminou) {
      if (!(await fecharRun(user.id, guardada!.id, estado.passos, r.estado, fechamento(a, r.estado)))) return { ok: false, erro: "A partida já andou em outra aba. Atualiza a página." };
    } else if (!(await gravarPasso(user.id, guardada!.id, estado.passos, r.estado))) {
      return { ok: false, erro: "A partida já andou em outra aba. Atualiza a página." };
    }
    return { ok: true, rolagem: r.rolagem, terminou: r.terminou };
  } catch (e) {
    console.error("Mesa de Bolso: não deu pra gravar o passo:", e);
    return { ok: false, erro: FALHOU };
  }
}

/** Larga a partida em andamento (ou a terminada sem conta) pra poder começar outra. */
export async function abandonarPartida(slug: string): Promise<Resp> {
  const a = aventuraPorSlug(String(slug));
  if (!a) return { ok: false, erro: "Aventura não encontrada." };
  const user = await getUser();
  try {
    if (!user) await apagarRunLocal(a.slug);
    else await abandonarRun(user.id, a.slug);
    return { ok: true };
  } catch (e) {
    console.error("Mesa de Bolso: não deu pra largar a partida:", e);
    return { ok: false, erro: FALHOU };
  }
}

// Logo depois de criar a conta: leva a personagem e as partidas do navegador pra conta.
export async function migrarLocal(): Promise<Resp<{ importadas: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, erro: "Entre na sua conta.", semConta: true };
  try {
    const p = await lerPersonagemLocal();
    const runs = await lerRunsLocais();
    if (!p || !runs.length) {
      // Só a personagem: guarda também, pra não perder.
      if (p && !(await listarPersonagens(user.id)).length) await criarPersonagem(user.id, p);
      await apagarPersonagemLocal();
      return { ok: true, importadas: 0 };
    }
    const partidas = runs.flatMap((estado) => {
      const a = aventuraPorSlug(estado.aventura);
      if (!a) return [];
      try {
        return [{ estado, fechamento: estado.final ? fechamento(a, estado) : undefined }];
      } catch {
        return [];
      }
    });
    const r = await importarLocal(user.id, p, partidas);
    await apagarPersonagemLocal();
    for (const e of runs) await apagarRunLocal(e.aventura);
    return { ok: true, importadas: r.importadas };
  } catch (e) {
    console.error("Mesa de Bolso: não deu pra migrar o jogo local:", e);
    return { ok: false, erro: FALHOU };
  }
}
