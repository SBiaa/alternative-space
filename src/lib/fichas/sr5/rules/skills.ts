import type { Specialization } from '../character';
import { label } from '../data';
import type { Skill, SkillGroup } from '../types';
import { stepCost } from './attributes';
import { addKarma, budget, issue, missing, pluralize, talentKey, talentLabel, type Ctx } from './context';
import type { Availability } from './result';

const MAGIC_GROUPS = ['conjuring', 'enchanting', 'sorcery'];
const BILINGUAL = 'Bilingual';

// ---------------------------------------------------------------------------
// Quem pode ter qual perícia

export function skillBlock(ctx: Ctx, skill: Skill): string | undefined {
  const k = talentKey(ctx);
  if (skill.category === 'Magical Active') {
    if (k === 'magician' || k === 'mysticAdept') return undefined;
    if (k === 'aspectedMagician') {
      if (!skill.groupId || !MAGIC_GROUPS.includes(skill.groupId)) return undefined;
      const aspect = ctx.draft.magic.freeSkillGroupId;
      if (!aspect) return 'Escolha primeiro o aspecto do Mago de Aspecto (passo Magia).';
      if (skill.groupId !== aspect) {
        const g = ctx.idx.groups.get(aspect);
        return `Mago de Aspecto só usa as perícias de ${g ? label(g) : aspect}.`;
      }
      return undefined;
    }
    if (k === 'adept') {
      return skill.groupId ? 'Adeptos não lançam magias, não invocam espíritos e não fazem encantamentos.' : undefined;
    }
    return 'Exige um talento mágico (Mago, Adepto, Adepto Místico ou Mago de Aspecto).';
  }
  if (skill.category === 'Resonance Active' && k !== 'technomancer') {
    return 'Exige o talento Tecnomante.';
  }
  return undefined;
}

export function groupBlock(ctx: Ctx, group: SkillGroup): string | undefined {
  const blocks = group.skillIds
    .map((id) => ctx.idx.skills.get(id))
    .filter((s): s is Skill => !!s)
    .map((s) => skillBlock(ctx, s))
    .filter(Boolean);
  return blocks[0];
}

export function skillAvailability(ctx: Ctx): Record<string, Availability> {
  const out: Record<string, Availability> = {};
  for (const s of ctx.data.skills.skills) {
    const b = skillBlock(ctx, s);
    out[s.id] = b ? { ok: false, reason: b } : { ok: true };
  }
  for (const g of ctx.data.skills.groups) {
    const b = groupBlock(ctx, g);
    out[`group:${g.id}`] = b ? { ok: false, reason: b } : { ok: true };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Perícias gratuitas do talento

function freeSkillAllowed(ctx: Ctx, skill: Skill): string | undefined {
  const grant = ctx.talent?.freeSkills;
  if (!grant) return undefined;
  switch (grant.kind) {
    case 'magic':
      return skill.category === 'Magical Active' ? undefined : 'precisa ser uma perícia mágica';
    case 'resonance':
      return skill.category === 'Resonance Active' ? undefined : 'precisa ser uma perícia de Ressonância';
    case 'nonMagicActive':
      return skill.category === 'Magical Active' || skill.category === 'Resonance Active'
        ? 'precisa ser uma perícia ativa não mágica'
        : undefined;
    case 'specific':
      return grant.choices?.includes(skill.id) ? undefined : 'não está entre as opções do talento';
    case 'matrix':
      return undefined;
  }
}

function checkFreePicks(ctx: Ctx): Map<string, number> {
  const { draft, talent } = ctx;
  const free = new Map<string, number>();
  const grant = talent?.freeSkills;
  const picks = draft.magic.freeSkillIds;
  const name = talentLabel(ctx);

  if (!grant && picks.length) {
    issue(ctx, 'error', 'magic', 'freeSkills.none', `${name} não dá perícias gratuitas.`);
  }
  if (grant) {
    if (picks.length > grant.count) {
      issue(ctx, 'error', 'magic', 'freeSkills.tooMany',
        `${name} dá ${pluralize(grant.count, 'perícia gratuita', 'perícias gratuitas')}; você escolheu ${picks.length}.`);
    } else if (picks.length < grant.count) {
      issue(ctx, 'warning', 'magic', 'freeSkills.pending',
        `${missing(grant.count - picks.length, 'perícia gratuita', 'perícias gratuitas')} de nível ${grant.rating} para escolher.`);
    }
    picks.forEach((id, i) => {
      const skill = ctx.idx.skills.get(id);
      if (!skill) {
        issue(ctx, 'error', 'magic', 'freeSkills.unknown', 'Perícia gratuita desconhecida.', `magic.freeSkillIds.${i}`);
        return;
      }
      if (free.has(id)) {
        issue(ctx, 'error', 'magic', 'freeSkills.duplicate', `${label(skill)} foi escolhida duas vezes.`, `magic.freeSkillIds.${i}`);
        return;
      }
      const why = freeSkillAllowed(ctx, skill);
      if (why) issue(ctx, 'error', 'magic', 'freeSkills.invalid', `${label(skill)} ${why}.`, `magic.freeSkillIds.${i}`);
      free.set(id, grant.rating);
    });
  }

  const groupGrant = talent?.freeSkillGroup;
  const gid = draft.magic.freeSkillGroupId;
  if (groupGrant) {
    if (!gid) {
      issue(ctx, 'error', 'magic', 'freeGroup.missing',
        `Escolha o aspecto: ${groupGrant.choices.map((c) => label(ctx.idx.groups.get(c) ?? { name: c })).join(', ')}.`);
    } else if (!groupGrant.choices.includes(gid)) {
      issue(ctx, 'error', 'magic', 'freeGroup.invalid', 'Esse grupo não é uma opção do talento.');
    }
  } else if (gid && talentKey(ctx) !== 'aspectedMagician') {
    issue(ctx, 'error', 'magic', 'freeGroup.none', `${name} não dá grupo de perícias gratuito.`);
  }

  const total = (grant?.count ?? 0) + (groupGrant?.count ?? 0);
  ctx.budgets.freeSkills = budget(total, Math.min(picks.length, grant?.count ?? 0) + (groupGrant && gid ? 1 : 0));
  return free;
}

// ---------------------------------------------------------------------------

function nonNegInt(n: number | undefined): boolean {
  return n === undefined || (Number.isInteger(n) && n >= 0);
}

function specCost(ctx: Ctx, spec: Specialization | undefined): { points: number; karma: number } {
  if (!spec) return { points: 0, karma: 0 };
  return spec.paidWith === 'points'
    ? { points: 1, karma: 0 }
    : { points: 0, karma: ctx.s.karmaCosts.specialization };
}

export function checkSkills(ctx: Ctx): void {
  const { draft, idx, s } = ctx;
  const free = checkFreePicks(ctx);
  const kc = s.karmaCosts;

  const aptitude = new Set(
    ctx.effects.filter((e) => e.effect.type === 'chooseSkillMax' && e.choice).map((e) => e.choice as string),
  );

  // Grupos
  let groupPoints = 0;
  const groupKarma = new Map<string, number>();
  const seenGroups = new Set<string>();
  draft.skillGroups.forEach((dg, i) => {
    const path = `skillGroups.${i}`;
    const g = idx.groups.get(dg.id);
    if (!g) {
      issue(ctx, 'error', 'skills', 'group.unknown', 'Grupo de perícias desconhecido.', path);
      return;
    }
    if (seenGroups.has(g.id)) {
      issue(ctx, 'error', 'skills', 'group.duplicate', `${label(g)} aparece duas vezes.`, path);
      return;
    }
    seenGroups.add(g.id);
    if (!nonNegInt(dg.points) || !nonNegInt(dg.karma)) {
      issue(ctx, 'error', 'skills', 'group.invalid', `${label(g)}: use números inteiros a partir de zero.`, path);
    }
    const freeBase = draft.magic.freeSkillGroupId === g.id && ctx.talent?.freeSkillGroup ? ctx.talent.freeSkillGroup.rating : 0;
    const base = freeBase + dg.points;
    const rating = base + dg.karma;
    ctx.groupRatings[g.id] = rating;
    groupPoints += dg.points;
    groupKarma.set(g.id, dg.karma);
    addKarma(ctx, 'perícias', stepCost(base, rating, kc.improveSkillGroup));
    if (rating > s.maxSkillRating) {
      issue(ctx, 'error', 'skills', 'group.overMax', `${label(g)}: o máximo na criação é ${s.maxSkillRating}.`, path);
    }
    if (rating > 0) {
      const block = groupBlock(ctx, g);
      if (block) issue(ctx, 'error', 'skills', 'group.blocked', `${label(g)}: ${block}`, path);
    }
  });
  // Grupo gratuito do aspecto, mesmo sem entrada no rascunho
  const aspect = draft.magic.freeSkillGroupId;
  if (aspect && ctx.talent?.freeSkillGroup && ctx.groupRatings[aspect] === undefined) {
    ctx.groupRatings[aspect] = ctx.talent.freeSkillGroup.rating;
  }

  // Perícias individuais
  let skillPoints = 0;
  const seen = new Set<string>();
  const handled = new Set<string>();
  draft.skills.forEach((ds, i) => {
    const path = `skills.${i}`;
    const skill = idx.skills.get(ds.id);
    if (!skill) {
      issue(ctx, 'error', 'skills', 'skill.unknown', 'Perícia desconhecida.', path);
      return;
    }
    const name = label(skill);
    if (seen.has(skill.id)) {
      issue(ctx, 'error', 'skills', 'skill.duplicate', `${name} aparece duas vezes.`, path);
      return;
    }
    seen.add(skill.id);
    handled.add(skill.id);
    if (!nonNegInt(ds.points) || !nonNegInt(ds.karma)) {
      issue(ctx, 'error', 'skills', 'skill.invalid', `${name}: use números inteiros a partir de zero.`, path);
    }

    const freeBase = free.get(skill.id) ?? 0;
    const group = skill.groupId ? idx.groups.get(skill.groupId) : undefined;
    const groupRating = group ? ctx.groupRatings[group.id] ?? 0 : 0;
    const base = freeBase + groupRating + ds.points;
    const rating = base + ds.karma;
    ctx.skillRatings[skill.id] = rating;
    addKarma(ctx, 'perícias', stepCost(base, rating, kc.improveActiveSkill));
    skillPoints += ds.points;

    if (group && groupRating > 0) {
      if (ds.points > 0) {
        issue(ctx, 'error', 'skills', 'skill.groupPoints',
          `${name} faz parte do grupo ${label(group)}. Com o grupo comprado, só dá para subir ${name} sozinha com karma.`, path);
      }
      if (freeBase > 0) {
        issue(ctx, 'error', 'skills', 'skill.groupFree',
          `${name} é perícia gratuita do talento e também está no grupo ${label(group)}. Escolha outra perícia gratuita ou tire o grupo.`, path);
      }
      if (ds.karma > 0 && (groupKarma.get(group.id) ?? 0) > 0) {
        issue(ctx, 'error', 'skills', 'skill.groupKarma',
          `${name}: não dá para subir com karma a perícia e o grupo ${label(group)} ao mesmo tempo.`, path);
      }
      if (ds.specialization) {
        issue(ctx, 'error', 'skills', 'skill.groupSpec',
          `${name}: especializar uma perícia desfaz o grupo ${label(group)}. Compre as perícias separadas para especializar.`, path);
      }
    }

    const max = aptitude.has(skill.id) ? s.maxSkillRatingWithAptitude : s.maxSkillRating;
    if (rating > max) {
      issue(ctx, 'error', 'skills', 'skill.overMax',
        `${name}: o máximo na criação é ${max}${aptitude.has(skill.id) ? '' : ' (7 com a qualidade Aptidão)'}.`, path);
    }
    if (rating > 0 || ds.specialization) {
      const block = skillBlock(ctx, skill);
      if (block) issue(ctx, 'error', 'skills', 'skill.blocked', `${name}: ${block}`, path);
    }

    if (ds.specialization) {
      if (rating < 1) {
        issue(ctx, 'error', 'skills', 'skill.specNoRating', `${name}: compre ao menos o nível 1 antes de especializar.`, path);
      }
      if (!ds.specialization.name.trim()) {
        issue(ctx, 'error', 'skills', 'skill.specName', `${name}: diga qual é a especialização.`, path);
      }
      const c = specCost(ctx, ds.specialization);
      skillPoints += c.points;
      addKarma(ctx, 'especializações', c.karma);
    }
  });

  // Perícias que só aparecem como gratuitas ou via grupo
  for (const [id, r] of free) {
    if (handled.has(id)) continue;
    const skill = idx.skills.get(id);
    if (!skill) continue;
    const gr = skill.groupId ? ctx.groupRatings[skill.groupId] ?? 0 : 0;
    if (gr > 0) {
      issue(ctx, 'error', 'magic', 'skill.groupFree',
        `${label(skill)} é perícia gratuita do talento e também está num grupo comprado. Escolha outra perícia gratuita ou tire o grupo.`);
    }
    ctx.skillRatings[id] = r + gr;
    handled.add(id);
  }
  for (const [gid, r] of Object.entries(ctx.groupRatings)) {
    for (const sid of idx.groups.get(gid)?.skillIds ?? []) {
      if (!handled.has(sid)) ctx.skillRatings[sid] = r;
    }
  }

  // Orçamentos
  const skTotal = ctx.rows.skills?.skillPoints ?? 0;
  const grTotal = ctx.rows.skills?.skillGroupPoints ?? 0;
  ctx.budgets.skills = budget(skTotal, skillPoints);
  ctx.budgets.skillGroups = budget(grTotal, groupPoints);
  if (skillPoints > skTotal) {
    issue(ctx, 'error', 'skills', 'skills.overspent', `Você usou ${skillPoints} pontos de perícia, mas tem ${skTotal}.`);
  } else if (ctx.rows.skills && skillPoints < skTotal) {
    issue(ctx, 'warning', 'skills', 'skills.leftover',
      `Sobraram ${pluralize(skTotal - skillPoints, 'ponto', 'pontos')} de perícia. Pontos não usados são perdidos.`);
  }
  if (groupPoints > grTotal) {
    issue(ctx, 'error', 'skills', 'skillGroups.overspent',
      `Você usou ${groupPoints} pontos de grupo de perícias, mas tem ${grTotal}.`);
  } else if (ctx.rows.skills && groupPoints < grTotal) {
    issue(ctx, 'warning', 'skills', 'skillGroups.leftover',
      `Sobraram ${pluralize(grTotal - groupPoints, 'ponto', 'pontos')} de grupo de perícias.`);
  }

  checkKnowledge(ctx);
}

function checkKnowledge(ctx: Ctx): void {
  const { draft, s } = ctx;
  // settings.knowledgePointsExpr = ({INTUnaug} + {LOGUnaug}) * 2
  const total = (ctx.attrs.INT.value + ctx.attrs.LOG.value) * 2;
  const bilingual = [...ctx.ownedQualityIds].some((id) => ctx.idx.qualities.get(id)?.name === BILINGUAL);
  const maxNative = bilingual ? 2 : 1;
  let spent = 0;
  let natives = 0;

  draft.knowledge.forEach((k, i) => {
    const path = `knowledge.${i}`;
    const name = k.name.trim() || 'Perícia de conhecimento';
    if (!k.name.trim()) {
      issue(ctx, 'error', 'skills', 'knowledge.name', 'Dê um nome à perícia de conhecimento.', path);
    }
    if (!nonNegInt(k.points) || !nonNegInt(k.karma)) {
      issue(ctx, 'error', 'skills', 'knowledge.invalid', `${name}: use números inteiros a partir de zero.`, path);
    }
    if (k.native) {
      natives++;
      if (k.category !== 'Language') {
        issue(ctx, 'error', 'skills', 'knowledge.nativeCategory', `${name}: só idiomas podem ser nativos.`, path);
      }
      if (k.points || k.karma || k.specialization) {
        issue(ctx, 'error', 'skills', 'knowledge.nativeCost', `${name}: o idioma nativo é de graça e não tem nível.`, path);
      }
      return;
    }
    const rating = k.points + k.karma;
    spent += k.points;
    addKarma(ctx, 'conhecimentos', stepCost(k.points, rating, s.karmaCosts.improveKnowledgeSkill));
    if (rating < 1) {
      issue(ctx, 'error', 'skills', 'knowledge.zero', `${name}: dê pelo menos nível 1.`, path);
    }
    if (rating > s.maxSkillRating) {
      issue(ctx, 'error', 'skills', 'knowledge.overMax', `${name}: o máximo na criação é ${s.maxSkillRating}.`, path);
    }
    if (k.specialization) {
      const c = specCost(ctx, k.specialization);
      spent += c.points;
      addKarma(ctx, 'especializações', c.karma);
      if (!k.specialization.name.trim()) {
        issue(ctx, 'error', 'skills', 'knowledge.specName', `${name}: diga qual é a especialização.`, path);
      }
    }
  });

  if (natives > maxNative) {
    issue(ctx, 'error', 'skills', 'knowledge.tooManyNative',
      bilingual ? 'Mesmo com Bilíngue, são no máximo 2 idiomas nativos.' : 'Só um idioma pode ser nativo (dois com a qualidade Bilíngue).');
  } else if (natives === 0 && ctx.rows.skills) {
    issue(ctx, 'warning', 'skills', 'knowledge.noNative', 'Defina o idioma nativo do personagem (é de graça).');
  }

  ctx.budgets.knowledge = budget(total, spent);
  if (spent > total) {
    issue(ctx, 'error', 'skills', 'knowledge.overspent',
      `Você usou ${spent} pontos de conhecimento, mas tem ${total} ((Intuição + Lógica) × 2).`);
  } else if (ctx.metatype && spent < total) {
    issue(ctx, 'warning', 'skills', 'knowledge.leftover',
      `Sobraram ${pluralize(total - spent, 'ponto', 'pontos')} de conhecimento (são de graça: aproveite).`);
  }
}
