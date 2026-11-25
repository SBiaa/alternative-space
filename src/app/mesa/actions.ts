'use server';

import * as campanhas from '@/lib/mesa/server/campanhas';
import * as sessoes from '@/lib/mesa/server/sessoes';
import { eIr, run } from './rodar';

export type { MesaResultado } from './rodar';

// Campanha
export const criarCampanhaAction = async (dados: Record<string, unknown>) =>
  eIr(() => campanhas.criarCampanha(dados), (id) => `/mesa/${id}`);
export const editarCampanhaAction = async (id: string, dados: Record<string, unknown>) =>
  run(() => campanhas.editarCampanha(id, dados), () => 'Campanha salva.');
export const apagarCampanhaAction = async (id: string) => eIr(() => campanhas.apagarCampanha(id), () => '/mesa');
export const trocarLinkAction = async (id: string) => run(() => campanhas.trocarLink(id));

// Jogadores
export const entrarPorLinkAction = async (code: string, characterId: unknown) =>
  eIr(() => campanhas.entrarPorLink(code, characterId), (id) => `/mesa/${id}`);
export const convidarAction = async (id: string, apelido: unknown) =>
  run(() => campanhas.convidarPorApelido(id, apelido), (a) => `Convite enviado para @${a}. Aparece na Mesa do Mestre da pessoa.`);
export const cancelarConviteAction = async (id: string, userId: string) => run(() => campanhas.cancelarConvite(id, userId));
export const aceitarConviteAction = async (id: string, characterId: unknown) =>
  eIr(() => campanhas.aceitarConvite(id, characterId), () => `/mesa/${id}`);
export const recusarConviteAction = async (id: string) => run(() => campanhas.recusarConvite(id));
export const vincularFichaAction = async (id: string, characterId: unknown) =>
  run(() => campanhas.vincularFicha(id, characterId), () => 'Ficha atualizada.');
export const sairAction = async (id: string) => eIr(() => campanhas.sairDaCampanha(id), () => '/mesa');
export const removerJogadorAction = async (id: string, userId: string) => run(() => campanhas.removerJogador(id, userId));

// Sessões
export const criarSessaoAction = async (id: string, dados: Record<string, unknown>) =>
  run(() => sessoes.criarSessao(id, dados), () => 'Sessão marcada.');
export const editarSessaoAction = async (id: string, sessaoId: string, dados: Record<string, unknown>) =>
  run(() => sessoes.editarSessao(id, sessaoId, dados), () => 'Sessão atualizada.');
export const apagarSessaoAction = async (id: string, sessaoId: string) =>
  eIr(() => sessoes.apagarSessao(id, sessaoId), () => `/mesa/${id}?aba=sessoes`);
export const salvarDiarioAction = async (id: string, sessaoId: string, dados: Record<string, unknown>) =>
  run(() => sessoes.salvarDiario(id, sessaoId, dados), () => 'Diário salvo.');
export const responderPresencaAction = async (id: string, sessaoId: string, resposta: string) =>
  run(() => sessoes.responderPresenca(id, sessaoId, resposta));

// Ganchos
export const criarGanchoAction = async (id: string, texto: unknown, sessaoId?: string) =>
  run(() => sessoes.criarGancho(id, texto, sessaoId));
export const marcarGanchoAction = async (id: string, ganchoId: string, resolvido: boolean) =>
  run(() => sessoes.marcarGancho(id, ganchoId, resolvido));
export const apagarGanchoAction = async (id: string, ganchoId: string) => run(() => sessoes.apagarGancho(id, ganchoId));
