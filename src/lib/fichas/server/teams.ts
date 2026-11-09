/**
 * Times. Regras de acesso:
 * - vê o time quem é dono ou tem alguma ficha nele;
 * - colegas veem a ficha, o dano, o karma e as metas ativas; nunca o nuyen,
 *   o histórico nem as anotações pessoais (decisão de produto, ver docs/fase2-plano.md);
 * - só o dono troca o link, tira membros ou apaga o time.
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { characters, goals, ledger, teamMembers, teams } from '@/lib/fichas/db/schema';
import { normalizeDraft } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { goalCost, goalSummary } from '@/lib/fichas/sr5/goals';
import { conditionLimits, InputError, MAX_TITLE_LENGTH } from '@/lib/fichas/sr5/play';
import { evaluate } from '@/lib/fichas/sr5/rules';
import { memberProfile, teamComposition, type MemberProfile, type RoleKey } from '@/lib/fichas/sr5/team';
import { NotFoundError, requireUserId } from './characters';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[A-Za-z0-9_-]{8,32}$/;

function newInviteCode(): string {
  return randomBytes(9).toString('base64url'); // 12 caracteres
}

function parseTeamName(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) throw new InputError('Dê um nome para o time.');
  if (t.length > MAX_TITLE_LENGTH) throw new InputError(`Nome com no máximo ${MAX_TITLE_LENGTH} letras.`);
  return t;
}

/**
 * Nome do jogador para os colegas: o @apelido do perfil, senão o nome da conta. Nunca o e-mail.
 * Os usuários ficam no schema do Neon Auth; o apelido, em perfis (db/perfis.sql).
 */
const playerName = sql<string>`coalesce(
  (select '@' || p.apelido from perfis p where p.user_id = ${characters.ownerId} and p.apelido is not null),
  (select nullif(trim(u.name), '') from neon_auth."user" u where u.id::text = ${characters.ownerId}),
  'Tripulante'
)`;

/** Ficha do usuário logado (qualquer status). */
async function myCharacter(userId: string, characterId: unknown) {
  if (typeof characterId !== 'string' || !UUID.test(characterId)) throw new InputError('Escolha uma ficha.');
  const [c] = await db()
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.id, characterId), eq(characters.ownerId, userId)));
  if (!c) throw new InputError('Escolha uma das suas fichas.');
  return c;
}

/** Time + se o usuário pode ver (dono ou tem ficha nele). */
async function access(teamId: string) {
  if (!UUID.test(teamId)) throw new NotFoundError();
  const userId = await requireUserId();
  const [team] = await db().select().from(teams).where(eq(teams.id, teamId));
  if (!team) throw new NotFoundError();
  const mine = await db()
    .select({ id: teamMembers.characterId })
    .from(teamMembers)
    .innerJoin(characters, eq(characters.id, teamMembers.characterId))
    .where(and(eq(teamMembers.teamId, teamId), eq(characters.ownerId, userId)));
  const isOwner = team.ownerId === userId;
  if (!isOwner && mine.length === 0) throw new NotFoundError();
  return { userId, team, isOwner, myMemberIds: new Set(mine.map((m) => m.id)) };
}

// ---------------------------------------------------------------------------
// Leitura

export interface TeamSummary {
  id: string;
  name: string;
  isOwner: boolean;
  members: number;
  myCharacters: string[];
}

export async function listMyTeams(): Promise<TeamSummary[]> {
  const userId = await requireUserId();
  const rows = await db()
    .select({
      id: teams.id,
      name: teams.name,
      ownerId: teams.ownerId,
      members: sql<number>`(select count(*)::int from ${teamMembers} tm where tm.team_id = ${teams.id})`,
      myCharacters: sql<string[]>`coalesce((
        select array_agg(c.name order by c.name) from ${teamMembers} tm
        join ${characters} c on c.id = tm.character_id
        where tm.team_id = ${teams.id} and c.user_id = ${userId}
      ), '{}')`,
    })
    .from(teams)
    .where(
      sql`${teams.ownerId} = ${userId} or exists (
        select 1 from ${teamMembers} tm join ${characters} c on c.id = tm.character_id
        where tm.team_id = ${teams.id} and c.user_id = ${userId}
      )`,
    )
    .orderBy(asc(teams.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isOwner: r.ownerId === userId,
    members: r.members,
    myCharacters: r.myCharacters,
  }));
}

export interface TeamMemberView {
  characterId: string;
  name: string;
  role: string;
  player: string;
  mine: boolean;
  status: 'draft' | 'active' | 'retired';
  metatype: string;
  essence: number;
  roles: RoleKey[];
  /** Só para fichas em jogo. */
  condition?: { physical: number; stun: number; physicalMax: number; stunMax: number };
  karma?: number;
  goals: { title: string; summary: string }[];
}

export async function getTeam(teamId: string) {
  const { userId, team, isOwner } = await access(teamId);

  const rows = await db()
    .select({
      id: characters.id,
      name: characters.name,
      status: characters.status,
      draft: characters.draft,
      ownerId: characters.ownerId,
      player: playerName,
      physical: characters.physicalDamage,
      stun: characters.stunDamage,
    })
    .from(teamMembers)
    .innerJoin(characters, eq(characters.id, teamMembers.characterId))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(asc(teamMembers.joinedAt));
  const ids = rows.map((r) => r.id);

  const [karmaRows, goalRows, mine] = await Promise.all([
    ids.length
      ? db()
          .select({ characterId: ledger.characterId, total: sql<number>`sum(${ledger.amount})::int` })
          .from(ledger)
          .where(and(inArray(ledger.characterId, ids), eq(ledger.kind, 'karma')))
          .groupBy(ledger.characterId)
      : [],
    ids.length
      ? db()
          .select()
          .from(goals)
          .where(and(inArray(goals.characterId, ids), eq(goals.status, 'active')))
          .orderBy(asc(goals.position))
      : [],
    // Fichas do usuário que ainda não estão no time (para "Adicionar outra ficha").
    db()
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(eq(characters.ownerId, userId))
      .orderBy(asc(characters.name)),
  ]);
  const karma = new Map(karmaRows.map((k) => [k.characterId, k.total]));

  const profiles: (MemberProfile & { name: string })[] = [];
  const members: TeamMemberView[] = rows.map((r) => {
    const draft = normalizeDraft(r.draft);
    const result = evaluate(draft);
    const profile = memberProfile(draft, result);
    profiles.push({ ...profile, name: r.name });
    const metatype = sr5Data.metatypes.find((m) => m.id === draft.metatypeId);
    const active = r.status === 'active';
    const limits = conditionLimits(result);
    const charGoals = goalRows.filter((g) => g.characterId === r.id);
    return {
      characterId: r.id,
      name: r.name,
      role: draft.concept.role ?? '',
      player: r.player ?? 'Jogador',
      mine: r.ownerId === userId,
      status: r.status,
      metatype: metatype ? label(metatype) : '',
      essence: result.derived.essence,
      roles: profile.roles,
      condition: active
        ? { physical: r.physical, stun: r.stun, physicalMax: limits.physical, stunMax: limits.stun }
        : undefined,
      karma: active ? (karma.get(r.id) ?? 0) : undefined,
      goals: charGoals.map((g) => ({
        title: g.title,
        summary: goalSummary(g.target, goalCost(g.target, result, charGoals)),
      })),
    };
  });

  return {
    id: team.id,
    name: team.name,
    isOwner,
    inviteCode: team.inviteCode,
    members,
    composition: teamComposition(profiles),
    available: mine.filter((c) => !ids.includes(c.id)),
  };
}

/** Ficha completa de um colega (sem nuyen, histórico nem anotações). */
export async function getTeammateSheet(teamId: string, characterId: string) {
  if (!UUID.test(characterId)) throw new NotFoundError();
  const { team, userId } = await access(teamId);
  const [row] = await db()
    .select({
      id: characters.id,
      ownerId: characters.ownerId,
      name: characters.name,
      status: characters.status,
      draft: characters.draft,
      physical: characters.physicalDamage,
      stun: characters.stunDamage,
      player: playerName,
    })
    .from(teamMembers)
    .innerJoin(characters, eq(characters.id, teamMembers.characterId))
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.characterId, characterId)));
  if (!row) throw new NotFoundError();
  const { ownerId, ...rest } = row;
  return {
    teamName: team.name,
    ...rest,
    mine: ownerId === userId,
    draft: normalizeDraft(row.draft),
    player: row.player ?? 'Jogador',
  };
}

/** O que mostrar na página do convite antes de entrar. */
export async function getInvite(code: string) {
  if (!CODE.test(code)) throw new NotFoundError();
  const userId = await requireUserId();
  const [team] = await db().select().from(teams).where(eq(teams.inviteCode, code));
  if (!team) throw new NotFoundError();
  const [members, mine] = await Promise.all([
    db()
      .select({ id: characters.id, name: characters.name, ownerId: characters.ownerId })
      .from(teamMembers)
      .innerJoin(characters, eq(characters.id, teamMembers.characterId))
      .where(eq(teamMembers.teamId, team.id)),
    db()
      .select({ id: characters.id, name: characters.name, status: characters.status })
      .from(characters)
      .where(eq(characters.ownerId, userId))
      .orderBy(asc(characters.name)),
  ]);
  const inTeam = new Set(members.map((m) => m.id));
  return {
    teamId: team.id,
    name: team.name,
    memberNames: members.map((m) => m.name),
    alreadyIn: members.some((m) => m.ownerId === userId) || team.ownerId === userId,
    available: mine.filter((c) => !inTeam.has(c.id)),
  };
}

// ---------------------------------------------------------------------------
// Escrita

export async function createTeam(input: { name: unknown; characterId: unknown }): Promise<string> {
  const userId = await requireUserId();
  const name = parseTeamName(input.name);
  const c = await myCharacter(userId, input.characterId);
  const [team] = await db()
    .insert(teams)
    .values({ name, ownerId: userId, inviteCode: newInviteCode() })
    .returning({ id: teams.id });
  await db().insert(teamMembers).values({ teamId: team.id, characterId: c.id });
  return team.id;
}

export async function joinTeam(code: unknown, characterId: unknown): Promise<string> {
  if (typeof code !== 'string' || !CODE.test(code)) throw new InputError('Convite inválido.');
  const userId = await requireUserId();
  const [team] = await db().select({ id: teams.id }).from(teams).where(eq(teams.inviteCode, code));
  if (!team) throw new InputError('Esse convite não vale mais. Peça um link novo.');
  const c = await myCharacter(userId, characterId);
  await db().insert(teamMembers).values({ teamId: team.id, characterId: c.id }).onConflictDoNothing();
  return team.id;
}

/** Adiciona outra ficha sua a um time em que você já está. */
export async function addMyCharacter(teamId: string, characterId: unknown): Promise<void> {
  const { userId } = await access(teamId);
  const c = await myCharacter(userId, characterId);
  await db().insert(teamMembers).values({ teamId, characterId: c.id }).onConflictDoNothing();
}

/**
 * Tira uma ficha do time. A própria ficha: qualquer um. De outra pessoa: só o dono do time.
 * Se o time ficar vazio e sem dono presente, ele continua existindo para o dono.
 */
export async function removeMember(teamId: string, characterId: unknown): Promise<void> {
  if (typeof characterId !== 'string' || !UUID.test(characterId)) throw new NotFoundError();
  const { isOwner, myMemberIds } = await access(teamId);
  if (!isOwner && !myMemberIds.has(characterId)) throw new InputError('Só o dono do time pode tirar a ficha de outra pessoa.');
  await db()
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.characterId, characterId)));
}

export async function regenerateInvite(teamId: string): Promise<void> {
  const { isOwner } = await access(teamId);
  if (!isOwner) throw new InputError('Só o dono do time pode trocar o link.');
  await db().update(teams).set({ inviteCode: newInviteCode() }).where(eq(teams.id, teamId));
}

export async function renameTeam(teamId: string, name: unknown): Promise<void> {
  const { isOwner } = await access(teamId);
  if (!isOwner) throw new InputError('Só o dono do time pode mudar o nome.');
  await db().update(teams).set({ name: parseTeamName(name) }).where(eq(teams.id, teamId));
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { isOwner } = await access(teamId);
  if (!isOwner) throw new InputError('Só o dono do time pode apagar o time.');
  await db().delete(teams).where(eq(teams.id, teamId));
}
