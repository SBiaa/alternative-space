'use server';

import { gerarTokenDaAgenda, salvarRotina } from '@/lib/mesa/server/agenda';
import { run } from './rodar';

export const salvarRotinaAction = async (campanhaId: string, dados: Record<string, unknown>) =>
  run(() => salvarRotina(campanhaId, dados), () => (dados.ativa ? 'Rotina salva.' : 'Rotina desligada.'));

export const gerarLinkDaAgendaAction = async () => run(() => gerarTokenDaAgenda(), () => 'Link pronto.');
