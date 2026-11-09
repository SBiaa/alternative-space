import { PRIORITY_CATEGORIES } from '../character';
import { label } from '../data';
import type { PriorityCategory, PriorityLetter, TalentKey } from '../types';
import { issue, joinLetters, type Ctx } from './context';
import type { MetatypeAvailability, TalentAvailability } from './result';

export const PRIORITY_LABEL: Record<PriorityCategory, string> = {
  metatype: 'Metatipo',
  talent: 'Magia/Ressonância',
  attributes: 'Atributos',
  skills: 'Perícias',
  resources: 'Recursos',
};

export function checkPriorities(ctx: Ctx): void {
  const { draft } = ctx;
  const used = new Map<PriorityLetter, PriorityCategory[]>();
  for (const cat of PRIORITY_CATEGORIES) {
    const letter = draft.priorities[cat];
    if (!letter) {
      issue(ctx, 'error', 'priorities', 'priorities.missing',
        `Escolha uma prioridade para ${PRIORITY_LABEL[cat]}.`, `priorities.${cat}`);
      continue;
    }
    used.set(letter, [...(used.get(letter) ?? []), cat]);
  }
  for (const [letter, cats] of used) {
    if (cats.length > 1) {
      issue(ctx, 'error', 'priorities', 'priorities.duplicate',
        `A prioridade ${letter} foi usada em ${cats.map((c) => PRIORITY_LABEL[c]).join(' e ')}. Cada letra só pode ser usada uma vez.`);
    }
  }

  // Metatipo
  if (!draft.metatypeId) {
    issue(ctx, 'error', 'metatype', 'metatype.missing', 'Escolha um metatipo.');
  } else if (!ctx.metatype) {
    issue(ctx, 'error', 'metatype', 'metatype.unknown', 'O metatipo escolhido não existe nos livros ativos.');
  } else if (draft.priorities.metatype && !ctx.metatypeOption) {
    const a = metatypeAvailability(ctx)[ctx.metatype.id];
    issue(ctx, 'error', 'metatype', 'metatype.unavailable', a.reason ?? 'Metatipo indisponível nesta prioridade.');
  }

  // Talento
  if (!draft.talent) {
    if (draft.priorities.talent) {
      issue(ctx, 'error', 'magic', 'talent.missing', 'Escolha se o personagem é mago, adepto, tecnomante ou mundano.');
    }
  } else if (draft.priorities.talent && !ctx.talent) {
    const a = talentAvailability(ctx)[draft.talent];
    issue(ctx, 'error', 'magic', 'talent.unavailable', a?.reason ?? 'Esse talento não está disponível nesta prioridade.');
  } else if (ctx.talent && ctx.metatype) {
    const reason = talentMetatypeBlock(ctx, draft.talent);
    if (reason) issue(ctx, 'error', 'magic', 'talent.metatype', reason);
  }
}

export function metatypeAvailability(ctx: Ctx): Record<string, MetatypeAvailability> {
  const { data, draft } = ctx;
  const out: Record<string, MetatypeAvailability> = {};
  for (const m of data.metatypes) {
    const letters = data.priorities.letters.filter((l) =>
      data.priorities.rows[l].metatypes.some((o) => o.metatypeId === m.id),
    );
    const current = draft.priorities.metatype;
    const option = current ? data.priorities.rows[current].metatypes.find((o) => o.metatypeId === m.id) : undefined;
    if (option) {
      out[m.id] = { ok: true, letters, specialPoints: option.specialPoints };
    } else if (!current) {
      out[m.id] = { ok: false, letters, reason: 'Escolha primeiro a prioridade de Metatipo.' };
    } else {
      out[m.id] = {
        ok: false,
        letters,
        reason: `${label(m)} exige prioridade ${joinLetters(letters)} em Metatipo.`,
      };
    }
  }
  return out;
}

function talentMetatypeBlock(ctx: Ctx, key: TalentKey): string | undefined {
  const m = ctx.metatype;
  const t = ctx.data.priorities.letters
    .flatMap((l) => ctx.data.priorities.rows[l].talents)
    .find((x) => x.key === key);
  if (!m || !t) return undefined;
  const name = label(t).replace(/\s*-.*$/, '');
  if (t.forbiddenMetatypeIds.includes(m.id)) return `${name} não está disponível para ${label(m)}.`;
  if (t.requiredMetatypeIds.length && !t.requiredMetatypeIds.includes(m.id)) {
    return `${name} não está disponível para ${label(m)}.`;
  }
  if (t.requiredMetatypeCategories.length && !t.requiredMetatypeCategories.includes(m.category)) {
    return `${name} exige um metatipo da categoria ${t.requiredMetatypeCategories.join(' ou ')}.`;
  }
  return undefined;
}

export function talentAvailability(ctx: Ctx): Partial<Record<TalentKey, TalentAvailability>> {
  const { data, draft } = ctx;
  const out: Partial<Record<TalentKey, TalentAvailability>> = {};
  const keys = new Map<TalentKey, string>();
  for (const l of data.priorities.letters) {
    for (const t of data.priorities.rows[l].talents) keys.set(t.key, label(t).replace(/\s*-.*$/, ''));
  }
  for (const [key, name] of keys) {
    const letters = data.priorities.letters.filter((l) => data.priorities.rows[l].talents.some((t) => t.key === key));
    const current = draft.priorities.talent;
    if (!current) {
      out[key] = { ok: false, letters, reason: 'Escolha primeiro a prioridade de Magia/Ressonância.' };
      continue;
    }
    if (!letters.includes(current)) {
      out[key] = { ok: false, letters, reason: `${name} exige prioridade ${joinLetters(letters)} em Magia/Ressonância.` };
      continue;
    }
    const block = talentMetatypeBlock(ctx, key);
    out[key] = block ? { ok: false, letters, reason: block } : { ok: true, letters };
  }
  return out;
}
