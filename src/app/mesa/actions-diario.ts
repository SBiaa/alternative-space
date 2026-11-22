'use server';

import { salvarMeuDiario } from '@/lib/mesa/server/diarios';
import { aceitarRecompensa, cancelarRecompensa, darRecompensa, recusarRecompensa } from '@/lib/mesa/server/recompensas';
import { run } from './rodar';

export const darRecompensaAction = async (campanhaId: string, sessaoId: string, dados: Record<string, unknown>) =>
  run(
    () => darRecompensa(campanhaId, sessaoId, dados),
    (n) => (n === 1 ? 'Recompensa enviada para 1 jogador.' : `Recompensa enviada para ${n} jogadores.`),
  );
export const cancelarRecompensaAction = async (campanhaId: string, recompensaId: string) =>
  run(() => cancelarRecompensa(campanhaId, recompensaId));
export const aceitarRecompensaAction = async (campanhaId: string, recompensaId: string) =>
  run(() => aceitarRecompensa(campanhaId, recompensaId), (m) => String(m));
export const recusarRecompensaAction = async (campanhaId: string, recompensaId: string) =>
  run(() => recusarRecompensa(campanhaId, recompensaId));

export const salvarMeuDiarioAction = async (campanhaId: string, sessaoId: string, dados: Record<string, unknown>) =>
  run(() => salvarMeuDiario(campanhaId, sessaoId, dados), () => 'Diário salvo.');
