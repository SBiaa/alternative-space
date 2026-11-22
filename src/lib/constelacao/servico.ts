import "server-only";
import type { Tema } from "./config";
import {
  distribuicaoDe, gravarPartida, palpitesDe, puzzleDoDia, puzzlesDasDatas, recalcularSequencia, sequenciaDe,
  type Distribuicao,
} from "./dados";
import { diaDe, msAteVirar } from "./dia";
import { avaliarPartida, normalizar, processarPalpite, visaoPublica, type ErroPalpite, type VisaoPartida } from "./jogo";
import { palavrasValidas } from "./palavras";
import { resolverSave, sequenciaDoSave, type SaveLocal } from "./save";
import { SEM_SEQUENCIA, sequenciaVigente, type Sequencia } from "./sequencia";

// Camada entre as ações e o banco: tudo aqui roda no servidor e só devolve a visão pública.

export type EstadoDoDia = {
  dia: string;
  logado: boolean;
  /** Sem a resposta: só o tamanho, o tema e a dica. */
  puzzle: { length: number; theme: Tema; hint: string } | null;
  partida: VisaoPartida | null;
  sequencia: Sequencia;
  distribuicao: Distribuicao | null;
  /** Milissegundos até a próxima meia-noite de Brasília, pelo relógio do servidor. */
  proximoEm: number;
};

async function sequenciaDoNavegador(save: SaveLocal | null, hoje: string): Promise<Sequencia> {
  if (!save) return SEM_SEQUENCIA;
  const puzzles = await puzzlesDasDatas(Object.keys(save.dias));
  const dias = resolverSave(save, puzzles, hoje, await palavrasValidas());
  return sequenciaVigente(sequenciaDoSave(dias), hoje);
}

export async function montarEstado(userId: string | null, save: SaveLocal | null, agora = new Date()): Promise<EstadoDoDia> {
  const dia = diaDe(agora);
  const puzzle = await puzzleDoDia(dia);
  const base = { dia, logado: userId !== null, proximoEm: msAteVirar(agora) };
  const sequencia = userId ? sequenciaVigente(await sequenciaDe(userId), dia) : await sequenciaDoNavegador(save, dia);
  if (!puzzle) return { ...base, puzzle: null, partida: null, sequencia, distribuicao: null };

  const validas = await palavrasValidas();
  const palpites = userId ? (await palpitesDe(userId, puzzle.id)).palpites : (save?.dias[dia] ?? []);
  const partida = avaliarPartida(puzzle.answer, palpites, validas);
  const distribuicao = partida.finalizada ? await distribuicaoDe(puzzle.id) : null;
  return {
    ...base,
    puzzle: { length: puzzle.length, theme: puzzle.theme, hint: puzzle.hint },
    partida: visaoPublica(puzzle.answer, partida),
    sequencia,
    distribuicao,
  };
}

export type RespostaPalpite = { ok: true; estado: EstadoDoDia } | { ok: false; erro: ErroPalpite | "sem-desafio" };

/** Confere um palpite. Logado: a partida vem do banco. Sem conta: vem do save do navegador, conferido do mesmo jeito. */
export async function jogarPalpite(userId: string | null, palpite: string, save: SaveLocal | null, agora = new Date()): Promise<RespostaPalpite> {
  const dia = diaDe(agora);
  const puzzle = await puzzleDoDia(dia);
  if (!puzzle) return { ok: false, erro: "sem-desafio" };
  const validas = await palavrasValidas();
  const anteriores = userId ? (await palpitesDe(userId, puzzle.id)).palpites : (save?.dias[dia] ?? []).map(normalizar);
  const r = processarPalpite({ resposta: puzzle.answer, validas, anteriores, palpite });
  if (!r.ok) return { ok: false, erro: r.erro };
  if (userId) await gravarPartida(userId, puzzle.id, dia, r.partida);
  const novoSave: SaveLocal | null = userId ? null : { versao: 1, dias: { ...(save?.dias ?? {}), [dia]: r.partida.palpites } };
  const sequencia = userId ? sequenciaVigente(await sequenciaDe(userId), dia) : await sequenciaDoNavegador(novoSave, dia);
  return {
    ok: true,
    estado: {
      dia,
      logado: userId !== null,
      puzzle: { length: puzzle.length, theme: puzzle.theme, hint: puzzle.hint },
      partida: visaoPublica(puzzle.answer, r.partida),
      sequencia,
      distribuicao: r.partida.finalizada ? await distribuicaoDe(puzzle.id) : null,
      proximoEm: msAteVirar(agora),
    },
  };
}

/** Leva as partidas do navegador pra conta, conferindo tudo de novo. Devolve quantos dias foram guardados. */
export async function migrarParaConta(userId: string, save: SaveLocal, agora = new Date()): Promise<number> {
  const hoje = diaDe(agora);
  const puzzles = await puzzlesDasDatas(Object.keys(save.dias));
  const dias = resolverSave(save, puzzles, hoje, await palavrasValidas());
  for (const d of dias) {
    const puzzle = puzzles.get(d.dia);
    if (puzzle) await gravarPartida(userId, puzzle.id, d.dia, d.partida);
  }
  if (dias.length > 0) await recalcularSequencia(userId);
  return dias.length;
}
