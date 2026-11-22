'use server';

import {
  adicionarAvulsoAoCombate,
  adicionarJogadorAoCombate,
  adicionarNpcAoCombate,
  apagarNpc,
  criarNpc,
  duplicarNpc,
  editarNpc,
  encerrarCombate,
  iniciarCombate,
  mudarParticipante,
  novaRodadaDoCombate,
  proximoDoCombate,
  rolarNpcsDoCombate,
  tirarDoCombate,
} from '@/lib/mesa/server/ao-vivo';
import type { MudancaParticipante } from '@/lib/mesa/regras-combate';
import { run } from './rodar';

export const criarNpcAction = async (campanhaId: string, dados: Record<string, unknown>) =>
  run(() => criarNpc(campanhaId, dados), () => 'NPC criado.');
export const editarNpcAction = async (campanhaId: string, npcId: string, dados: Record<string, unknown>) =>
  run(() => editarNpc(campanhaId, npcId, dados), () => 'NPC salvo.');
export const duplicarNpcAction = async (campanhaId: string, npcId: string, copias: number) =>
  run(() => duplicarNpc(campanhaId, npcId, copias), (n) => (n === 1 ? '1 cópia criada.' : `${n} cópias criadas.`));
export const apagarNpcAction = async (campanhaId: string, npcId: string) => run(() => apagarNpc(campanhaId, npcId));

export const adicionarJogadorAction = async (campanhaId: string, userId: string) =>
  run(() => adicionarJogadorAoCombate(campanhaId, userId));
export const adicionarNpcAoCombateAction = async (campanhaId: string, npcId: string, quantidade: number) =>
  run(() => adicionarNpcAoCombate(campanhaId, npcId, quantidade));
export const adicionarAvulsoAction = async (campanhaId: string, nome: string, iniciativa: string) =>
  run(() => adicionarAvulsoAoCombate(campanhaId, nome, iniciativa));
export const iniciarCombateAction = async (campanhaId: string) => run(() => iniciarCombate(campanhaId));
export const proximoTurnoAction = async (campanhaId: string) => run(() => proximoDoCombate(campanhaId));
export const novaRodadaAction = async (campanhaId: string) => run(() => novaRodadaDoCombate(campanhaId));
export const encerrarCombateAction = async (campanhaId: string) => run(() => encerrarCombate(campanhaId));
export const tirarDoCombateAction = async (campanhaId: string, participanteId: string) =>
  run(() => tirarDoCombate(campanhaId, participanteId));
export const mudarParticipanteAction = async (campanhaId: string, participanteId: string, mudanca: MudancaParticipante) =>
  run(() => mudarParticipante(campanhaId, participanteId, mudanca));
export const rolarNpcsAction = async (campanhaId: string) => run(() => rolarNpcsDoCombate(campanhaId), () => 'Iniciativa dos NPCs rolada.');
