'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { InputError } from '@/lib/fichas/sr5/play';
import { NotFoundError } from '@/lib/fichas/server/characters';
import {
  addMyCharacter,
  createTeam,
  deleteTeam,
  joinTeam,
  regenerateInvite,
  removeMember,
  renameTeam,
} from '@/lib/fichas/server/teams';

export type TeamActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<unknown>): Promise<TeamActionResult> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof InputError || e instanceof NotFoundError) return { ok: false, error: e.message };
    console.error('Falha no time', e);
    return { ok: false, error: 'Não deu para salvar agora. Tente de novo.' };
  }
}

/** Cria e abre o time. Erros de validação voltam como mensagem. */
export async function createTeamAction(input: { name: unknown; characterId: unknown }): Promise<TeamActionResult> {
  let id: string;
  try {
    id = await createTeam(input);
  } catch (e) {
    if (e instanceof InputError) return { ok: false, error: e.message };
    throw e;
  }
  redirect(`/fichas/times/${id}`);
}

export async function joinTeamAction(code: string, characterId: unknown): Promise<TeamActionResult> {
  let id: string;
  try {
    id = await joinTeam(code, characterId);
  } catch (e) {
    if (e instanceof InputError) return { ok: false, error: e.message };
    throw e;
  }
  redirect(`/fichas/times/${id}`);
}

export async function addMyCharacterAction(teamId: string, characterId: unknown) {
  return run(() => addMyCharacter(teamId, characterId));
}

export async function removeMemberAction(teamId: string, characterId: string) {
  return run(() => removeMember(teamId, characterId));
}

export async function regenerateInviteAction(teamId: string) {
  return run(() => regenerateInvite(teamId));
}

export async function renameTeamAction(teamId: string, name: unknown) {
  return run(() => renameTeam(teamId, name));
}

export async function deleteTeamAction(teamId: string): Promise<TeamActionResult> {
  try {
    await deleteTeam(teamId);
  } catch (e) {
    if (e instanceof InputError || e instanceof NotFoundError) return { ok: false, error: e.message };
    throw e;
  }
  redirect('/fichas/times');
}
