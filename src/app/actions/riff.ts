"use server";

import { assertAdmin } from "@/lib/auth/admin";
import { getUser } from "@/lib/auth/server";
import { normalizarAjustes, type Ajustes } from "@/lib/riff/ajustes";
import { ehDificuldade } from "@/lib/riff/config";
import { duracaoDaMusica, gravarAjustes, gravarMapa, gravarPartida, totalDoMapa } from "@/lib/riff/dados";
import { normalizarMapa, validarPartida, type Partida } from "@/lib/riff/regras";

export type RespostaPartida = { ok: true; recorde: boolean } | { ok: false; erro: string; semConta?: boolean };

// Fim de partida. O servidor confere que a pontuação cabe no mapa antes de gravar.
export async function salvarPartida(slug: string, dificuldade: string, p: Partida): Promise<RespostaPartida> {
  const user = await getUser();
  if (!user) return { ok: false, erro: "Entre na sua conta pra guardar o recorde.", semConta: true };
  if (typeof slug !== "string" || !ehDificuldade(dificuldade) || !p || typeof p !== "object") return { ok: false, erro: "Partida inválida." };
  const partida: Partida = {
    score: p.score,
    accuracy: p.accuracy,
    maxCombo: p.maxCombo,
    perfect: p.perfect,
    good: p.good,
    miss: p.miss,
  };
  try {
    const mapa = await totalDoMapa(slug, dificuldade);
    if (!mapa) return { ok: false, erro: "Essa música não está disponível." };
    const motivo = validarPartida(partida, mapa.total);
    if (motivo) return { ok: false, erro: "Essa pontuação não bate com o mapa da música." };
    const recorde = await gravarPartida(user.id, mapa.songId, slug, dificuldade, partida);
    return { ok: true, recorde };
  } catch (e) {
    console.error("Não deu pra salvar a partida:", e);
    return { ok: false, erro: "Não deu pra salvar agora. Tenta de novo em instantes." };
  }
}

// Ajustes (offset, teclas, velocidade). Sem conta, o navegador guarda sozinho.
export async function salvarAjustes(a: Ajustes): Promise<{ ok: boolean }> {
  const user = await getUser();
  const ajustes = normalizarAjustes(a);
  if (!user || !ajustes) return { ok: false };
  try {
    await gravarAjustes(user.id, ajustes);
    return { ok: true };
  } catch (e) {
    console.error("Não deu pra salvar os ajustes:", e);
    return { ok: false };
  }
}

// Editor de mapa (só admin).
export async function salvarMapa(songId: string, dificuldade: string, notas: unknown): Promise<{ ok: boolean; erro?: string; total?: number }> {
  await assertAdmin();
  if (typeof songId !== "string" || !/^[0-9a-f-]{36}$/i.test(songId) || !ehDificuldade(dificuldade)) return { ok: false, erro: "Música ou dificuldade inválida." };
  const duracao = await duracaoDaMusica(songId);
  if (duracao === null) return { ok: false, erro: "Música não encontrada." };
  const mapa = normalizarMapa(notas, duracao);
  if (!mapa) return { ok: false, erro: "Tem nota fora da música ou numa trilha que não existe." };
  await gravarMapa(songId, dificuldade, mapa);
  return { ok: true, total: mapa.length };
}
