/**
 * Composição do time: que papéis cada personagem cobre e o que falta.
 * Os critérios são aproximações simples, explicadas ao jogador em ROLE_RULE.
 */
import type { CharacterDraft } from './character';
import { sr5Data } from './data';
import type { RulesResult } from './rules';
import type { TalentKey } from './types';

export type RoleKey =
  | 'face'
  | 'matrix'
  | 'mage'
  | 'adept'
  | 'combat'
  | 'tank'
  | 'rigger'
  | 'medic'
  | 'infiltrator';

export const ROLE_LABEL: Record<RoleKey, string> = {
  face: 'Face',
  matrix: 'Matriz (decker/tecnomante)',
  mage: 'Mago',
  adept: 'Adepto',
  combat: 'Combate',
  tank: 'Tanque',
  rigger: 'Rigger',
  medic: 'Médico',
  infiltrator: 'Infiltração',
};

/** Como o app decide (mostrado na tela). */
export const ROLE_RULE: Record<RoleKey, string> = {
  face: 'Negociação, Trapaça, Etiqueta ou Liderança 3+',
  matrix: 'Tecnomante, ou Hackear, Cibercombate ou Guerra Eletrônica 3+',
  mage: 'Talento mágico que conjura (Mago, Adepto Místico, Aspectado…)',
  adept: 'Adepto ou Adepto Místico',
  combat: 'Alguma perícia de arma ou combate 4+',
  tank: 'Corpo 5+ ou monitor físico 12+',
  rigger: 'Pilotar algum veículo ou Artilharia 3+',
  medic: 'Primeiros Socorros ou Medicina 3+',
  infiltrator: 'Esgueirar 4+',
};

/** Papéis que quase todo time quer ter. "Adepto" é bônus, não falta. */
export const CORE_ROLES: readonly RoleKey[] = ['face', 'matrix', 'mage', 'combat', 'tank', 'rigger', 'medic', 'infiltrator'];

const CASTERS: TalentKey[] = ['magician', 'mysticAdept', 'aspectedMagician', 'apprentice', 'enchanter', 'explorer', 'aware'];
const ADEPTS: TalentKey[] = ['adept', 'mysticAdept'];

const skillId = new Map(sr5Data.skills.skills.map((s) => [s.name, s.id]));

function best(result: RulesResult, names: string[]): number {
  return Math.max(0, ...names.map((n) => result.skillRatings[skillId.get(n) ?? ''] ?? 0));
}

export interface MemberProfile {
  roles: RoleKey[];
  essence: number;
  perception: number;
}

export function memberProfile(draft: CharacterDraft, result: RulesResult): MemberProfile {
  const talent = draft.talent;
  const roles: RoleKey[] = [];
  const has = (r: RoleKey, cond: boolean) => cond && roles.push(r);

  has('face', best(result, ['Negotiation', 'Con', 'Etiquette', 'Leadership']) >= 3);
  has(
    'matrix',
    talent === 'technomancer' || best(result, ['Hacking', 'Cybercombat', 'Electronic Warfare']) >= 3,
  );
  has('mage', !!talent && CASTERS.includes(talent));
  has('adept', !!talent && ADEPTS.includes(talent));
  has(
    'combat',
    best(result, ['Automatics', 'Pistols', 'Longarms', 'Blades', 'Clubs', 'Unarmed Combat', 'Heavy Weapons']) >= 4,
  );
  has('tank', result.attributes.BOD.value >= 5 || result.derived.monitors.physical >= 12);
  has(
    'rigger',
    best(result, ['Pilot Ground Craft', 'Pilot Aircraft', 'Pilot Watercraft', 'Pilot Walker', 'Gunnery']) >= 3,
  );
  has('medic', best(result, ['First Aid', 'Medicine']) >= 3);
  has('infiltrator', best(result, ['Sneaking']) >= 4);

  return { roles, essence: result.derived.essence, perception: best(result, ['Perception']) };
}

export interface TeamComposition {
  /** Para cada papel, os nomes de quem cobre. */
  covered: Record<RoleKey, string[]>;
  missing: RoleKey[];
  alerts: string[];
}

export function teamComposition(members: (MemberProfile & { name: string })[]): TeamComposition {
  const covered = Object.fromEntries((Object.keys(ROLE_LABEL) as RoleKey[]).map((r) => [r, [] as string[]])) as Record<
    RoleKey,
    string[]
  >;
  for (const m of members) for (const r of m.roles) covered[r].push(m.name);

  const missing = members.length ? CORE_ROLES.filter((r) => covered[r].length === 0) : [];
  const alerts: string[] = [];

  for (const m of members) {
    if (m.essence < 2) {
      alerts.push(
        `${m.name} está com Essência ${m.essence.toFixed(2).replace('.', ',')}: muito ciborgue. Cura mágica rende menos e mais implantes podem custar caro.`,
      );
    }
  }
  if (members.length && covered.mage.length === 0) {
    alerts.push('Ninguém enxerga o plano astral: espíritos e magia inimiga podem pegar o time de surpresa.');
  }
  if (members.length && covered.medic.length === 0) {
    alerts.push('Ninguém sabe cuidar de ferimentos. Um medkit ou um contato médico ajuda.');
  }
  const perception = Math.max(0, ...members.map((m) => m.perception));
  if (members.length && perception < 4) {
    alerts.push(`A Percepção do time é baixa (a melhor é ${perception}). Emboscadas e pistas passam despercebidas.`);
  }

  return { covered, missing, alerts };
}
