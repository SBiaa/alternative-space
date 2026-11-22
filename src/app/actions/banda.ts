"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { dentroDoLimite } from "@/lib/limite";
import { novaBanda } from "@/lib/banda/candidatos";
import { BANDA } from "@/lib/banda/config";
import { ERROS } from "@/lib/banda/conteudo";
import { apagarBanda, gravarBandaInteira, gravarPasso, lerBanda, type BandaSalva, type Extras } from "@/lib/banda/dados";
import { compor, consertar, fazerDia, gravarDemo, type EscolhasComposicao } from "@/lib/banda/motor";
import { escolherSave, migrar, saveCoerente } from "@/lib/banda/save";
import { pularShow, tocarShow } from "@/lib/banda/show";
import type { ErroJogo, Montagem, Musica, Progresso, RegistroShow } from "@/lib/banda/tipos";

export type Falha = { ok: false; erro: string; semConta?: boolean };
export type RespostaBanda = { ok: true; prog: Progresso } | Falha;
export type RespostaDiaBanda = { ok: true; prog: Progresso; aviso: string[]; briga: { a: string; b: string } | null; musica?: Musica } | Falha;
export type RespostaShowBanda =
  | { ok: true; prog: Progresso; registro: RegistroShow; faltou: string[]; saidas: { nome: string; entrou: string }[] }
  | Falha;

const falha = (e: ErroJogo): Falha => ({ ok: false, erro: ERROS[e] });

/** Estado inicial da tela: a banda da conta, se houver. */
export async function carregarBanda(): Promise<{ logado: boolean; prog: Progresso | null }> {
  const user = await getUser();
  if (!user) return { logado: false, prog: null };
  try {
    return { logado: true, prog: (await lerBanda(user.id))?.prog ?? null };
  } catch (e) {
    console.error("Não deu pra carregar a banda:", e);
    return { logado: true, prog: null };
  }
}

type Contexto = { falha: Falha; user?: undefined; salva?: undefined } | { falha: null; user: { id: string }; salva: BandaSalva };

/** Quem está logado, a banda dele e o limite de gravações. */
async function contexto(): Promise<Contexto> {
  const user = await getUser();
  if (!user) return { falha: { ok: false, erro: ERROS.semConta, semConta: true } };
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite(`banda:${user.id}`, req, BANDA.limiteGravacoes.max, BANDA.limiteGravacoes.janelaSeg))) return { falha: falha("limite") };
  const salva = await lerBanda(user.id);
  if (!salva) return { falha: falha("generico") };
  return { falha: null, user, salva };
}

/** Roda a regra pura em cima do save lido e grava o resultado se ninguém mexeu nesse meio tempo. */
async function passo<R extends { ok: boolean }>(
  regra: (p: Progresso) => R,
  gravar: (r: Extract<R, { ok: true }>) => { prog: Progresso; extras?: Extras },
  erroLog: string,
): Promise<(Extract<R, { ok: true }> & { prog: Progresso }) | Falha> {
  const c = await contexto();
  if (c.falha) return c.falha;
  try {
    const r = regra(c.salva.prog);
    if (!r.ok) return { ok: false, erro: ERROS[(r as unknown as { erro: ErroJogo }).erro] ?? ERROS.generico };
    const { prog, extras } = gravar(r as Extract<R, { ok: true }>);
    const gravou = await gravarPasso(c.user.id, c.salva.id, c.salva.versao, prog, extras);
    if (!gravou) return falha("invalido");
    return { ...(r as Extract<R, { ok: true }>), prog };
  } catch (e) {
    console.error(erroLog, e);
    return falha("generico");
  }
}

/** Abre uma banda nova na conta (apaga a anterior, se houver). O servidor refaz os candidatos pela seed. */
export async function novaBandaConta(seed: string, montagem: Montagem): Promise<RespostaBanda> {
  const user = await getUser();
  if (!user) return { ok: false, erro: ERROS.semConta, semConta: true };
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite(`banda:${user.id}`, req, BANDA.limiteGravacoes.max, BANDA.limiteGravacoes.janelaSeg))) return falha("limite");
  try {
    const prog = novaBanda(seed, montagem);
    if (!prog) return falha("invalido");
    await apagarBanda(user.id);
    await gravarBandaInteira(user.id, prog);
    return { ok: true, prog };
  } catch (e) {
    console.error("Não deu pra criar a banda:", e);
    return falha("generico");
  }
}

export async function fazerDiaConta(acao: string): Promise<RespostaDiaBanda> {
  return passo((p) => fazerDia(p, acao), (r) => ({ prog: r.prog }), "Não deu pra guardar o dia da banda:");
}

export async function comporConta(esc: EscolhasComposicao): Promise<RespostaDiaBanda> {
  return passo(
    (p) => compor(p, esc),
    (r) => ({
      prog: r.prog,
      extras: r.musica ? { musica: r.musica, evento: { kind: "band_song_composed", payload: { slot: r.musica.slot, nota: r.musica.nota, estilo: r.prog.estilo, clima: r.musica.clima } } } : {},
    }),
    "Não deu pra guardar a música:",
  );
}

export async function consertarConta(parte: string): Promise<RespostaBanda> {
  return passo((p) => consertar(p, parte), (r) => ({ prog: r.prog }), "Não deu pra consertar o equipamento:");
}

export async function tocarShowConta(palco: string, repertorio: number[]): Promise<RespostaShowBanda> {
  return passo(
    (p) => tocarShow(p, palco, repertorio),
    (r) => ({
      prog: r.prog,
      extras: {
        registro: r.registro,
        evento: { kind: "game_played", payload: { semana: r.registro.semana, palco: r.registro.palco, publico: r.registro.publico, cache: r.registro.cache, nota: r.registro.nota } },
      },
    }),
    "Não deu pra guardar o show:",
  );
}

export async function pularShowConta(): Promise<RespostaBanda> {
  return passo((p) => pularShow(p), (r) => ({ prog: r.prog }), "Não deu pra passar o fim de semana:");
}

export async function gravarDemoConta(): Promise<RespostaBanda> {
  return passo((p) => gravarDemo(p), (r) => ({ prog: r.prog }), "Não deu pra gravar a demo:");
}

/** Logo depois de criar a conta: leva a banda do navegador pra conta (a mais avançada vence). */
export async function migrarSaveLocal(bruto: unknown): Promise<{ ok: boolean; prog: Progresso | null }> {
  const user = await getUser();
  if (!user) return { ok: false, prog: null };
  const local = bruto ? migrar(bruto) : null;
  try {
    const remota = await lerBanda(user.id);
    const { save, origem } = escolherSave(local, remota?.prog ?? null);
    if (origem === "local" && save) {
      if (!saveCoerente(save)) return { ok: false, prog: remota?.prog ?? null };
      await gravarBandaInteira(user.id, save);
    }
    return { ok: true, prog: save };
  } catch (e) {
    console.error("Não deu pra migrar o save da banda:", e);
    return { ok: false, prog: null };
  }
}
