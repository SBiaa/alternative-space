'use server';

import {
  apagarHandout,
  apagarPagina,
  criarHandout,
  criarPagina,
  editarPagina,
  liberarPagina,
  revelarHandout,
} from '@/lib/mesa/server/mundo';
import { run } from './rodar';

export const criarPaginaAction = async (campanhaId: string, dados: Record<string, unknown>) =>
  run(() => criarPagina(campanhaId, dados), () => 'Página criada.');
export const editarPaginaAction = async (campanhaId: string, paginaId: string, dados: Record<string, unknown>) =>
  run(() => editarPagina(campanhaId, paginaId, dados), () => 'Página salva.');
export const liberarPaginaAction = async (campanhaId: string, paginaId: string, liberada: boolean) =>
  run(() => liberarPagina(campanhaId, paginaId, liberada), () => (liberada ? 'Página liberada para a mesa.' : 'Página oculta.'));
export const apagarPaginaAction = async (campanhaId: string, paginaId: string) => run(() => apagarPagina(campanhaId, paginaId));

export const criarHandoutAction = async (campanhaId: string, dados: Record<string, unknown>) =>
  run(() => criarHandout(campanhaId, dados), () => 'Handout criado.');
export const revelarHandoutAction = async (campanhaId: string, handoutId: string, revelado: boolean) =>
  run(() => revelarHandout(campanhaId, handoutId, revelado), () => (revelado ? 'Revelado para a mesa.' : 'Escondido de novo.'));
export const apagarHandoutAction = async (campanhaId: string, handoutId: string) => run(() => apagarHandout(campanhaId, handoutId));
