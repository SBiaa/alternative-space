import { CORE_ATTRS, SPECIAL_ATTR_KEYS } from '../character';
import { label } from '../data';
import type { AttrKey, Quality, Requirement, RequirementGroup } from '../types';
import { addKarma, budget, isAwakened, isEmerged, issue, type Ctx } from './context';
import type { Availability } from './result';

/** Monta o conjunto de qualidades do personagem e os efeitos ativos. Rodar antes das outras regras. */
export function collectQualities(ctx: Ctx): void {
  const { draft, idx } = ctx;
  const add = (id: string, rating: number, choice?: string) => {
    ctx.ownedQualityIds.add(id);
    const q = idx.qualities.get(id);
    if (!q) return;
    for (const effect of q.effects) ctx.effects.push({ effect, qualityId: id, rating, choice });
  };
  for (const id of ctx.metatype?.racialQualityIds ?? []) add(id, 1);
  if (ctx.talent?.qualityId) add(ctx.talent.qualityId, 1);
  for (const q of draft.qualities) add(q.id, Math.max(1, q.rating), q.choice);
}

export function checkQualities(ctx: Ctx): void {
  const { draft, idx, s } = ctx;
  const racial = new Set(ctx.metatype?.racialQualityIds ?? []);
  const seen = new Map<string, number>();
  let positive = 0;
  let negative = 0;

  draft.qualities.forEach((dq, i) => {
    const path = `qualities.${i}`;
    const q = idx.qualities.get(dq.id);
    if (!q) {
      issue(ctx, 'error', 'qualities', 'quality.unknown', 'Qualidade desconhecida nos livros ativos.', path);
      return;
    }
    const name = label(q);
    if (q.onlyFromPriority) {
      issue(ctx, 'error', 'qualities', 'quality.priorityOnly',
        `${name} só vem pela escolha de Magia/Ressonância na tabela de prioridades.`, path);
      return;
    }
    if (racial.has(q.id)) {
      issue(ctx, 'error', 'qualities', 'quality.racial', `${name} já vem com o seu metatipo.`, path);
      return;
    }
    if (q.hidden) {
      issue(ctx, 'error', 'qualities', 'quality.hidden', `${name} não pode ser escolhida diretamente.`, path);
      return;
    }

    const count = (seen.get(q.id) ?? 0) + 1;
    seen.set(q.id, count);
    if (q.maxRating === null) {
      if (dq.rating !== 1) {
        issue(ctx, 'error', 'qualities', 'quality.rating',
          `${name} não tem níveis; adicione de novo se quiser mais de uma.`, path);
      }
    } else {
      if (count > 1) {
        issue(ctx, 'error', 'qualities', 'quality.duplicate', `${name} já foi escolhida.`, path);
      }
      if (!Number.isInteger(dq.rating) || dq.rating < 1 || dq.rating > q.maxRating) {
        issue(ctx, 'error', 'qualities', 'quality.rating',
          q.maxRating === 1 ? `${name} não tem níveis.` : `${name} vai do nível 1 ao ${q.maxRating}.`, path);
      }
    }

    const blocked = requirementBlock(ctx, q);
    if (blocked) issue(ctx, 'error', 'qualities', 'quality.requirement', `${name}: ${blocked}`, path);

    checkChoice(ctx, q, dq.choice, path);

    const cost = q.karma * Math.max(1, dq.rating);
    if (q.kind === 'positive') {
      addKarma(ctx, 'qualidades positivas', cost);
      if (q.countsTowardLimit) positive += cost;
    } else {
      addKarma(ctx, 'qualidades negativas', -cost);
      if (q.countsTowardLimit) negative += cost;
    }
  });

  ctx.budgets.positiveQualities = budget(s.qualityKarmaLimit, positive);
  ctx.budgets.negativeQualities = budget(s.qualityKarmaLimit, negative);
  if (positive > s.qualityKarmaLimit) {
    issue(ctx, 'error', 'qualities', 'qualities.positiveLimit',
      `Qualidades positivas somam ${positive} de karma; o limite na criação é ${s.qualityKarmaLimit}.`);
  }
  if (negative > s.qualityKarmaLimit) {
    issue(ctx, 'error', 'qualities', 'qualities.negativeLimit',
      `Qualidades negativas somam ${negative} de karma; o limite na criação é ${s.qualityKarmaLimit}.`);
  }
}

function checkChoice(ctx: Ctx, q: Quality, choice: string | undefined, path: string): void {
  const name = label(q);
  for (const e of q.effects) {
    if (e.type === 'chooseAttributeMax') {
      const valid = [...CORE_ATTRS, ...SPECIAL_ATTR_KEYS].filter((a) => !e.exclude.includes(a)) as AttrKey[];
      if (!choice || !valid.includes(choice as AttrKey)) {
        issue(ctx, 'error', 'qualities', 'quality.choice', `${name}: escolha qual atributo.`, path);
      } else if ((choice === 'MAG' && !isAwakened(ctx)) || (choice === 'RES' && !isEmerged(ctx))) {
        issue(ctx, 'error', 'qualities', 'quality.choice', `${name}: o personagem não tem esse atributo.`, path);
      }
    } else if (e.type === 'chooseSkillMax') {
      if (!choice || !ctx.idx.skills.has(choice)) {
        issue(ctx, 'error', 'qualities', 'quality.choice', `${name}: escolha qual perícia.`, path);
      }
    } else if (e.type === 'chooseText') {
      if (!choice?.trim()) {
        issue(ctx, 'error', 'qualities', 'quality.choice', `${name}: descreva a escolha (ex.: do que é o vício).`, path);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Requisitos

function reqMet(ctx: Ctx, r: Requirement, self?: string): boolean {
  switch (r.type) {
    case 'quality':
      return r.id !== self && ctx.ownedQualityIds.has(r.id);
    case 'metatype':
      return ctx.draft.metatypeId === r.id;
    case 'metatypeCategory':
      return ctx.metatype?.category === r.name;
    case 'magicEnabled':
      return isAwakened(ctx);
    case 'resonanceEnabled':
      return isEmerged(ctx);
    case 'depthEnabled':
    case 'critterPower':
      return false;
    case 'power':
      return ctx.draft.magic.powers.some((p) => ctx.data.powers.find((x) => x.id === p.id)?.name === r.name);
    case 'bioware':
      return ctx.draft.gear.some(
        (g) => g.kind === 'bioware' && ctx.data.bioware.find((x) => x.id === g.itemId)?.name === r.name,
      );
    case 'other':
      // Requisitos que não modelamos não bloqueiam.
      return true;
  }
}

/** Requisito existe nos livros ativos (para não citar coisas que a pessoa nem pode escolher). */
function reqExists(ctx: Ctx, r: Requirement): boolean {
  if (r.type === 'quality') return ctx.idx.qualities.has(r.id);
  if (r.type === 'metatype') return ctx.data.metatypes.some((m) => m.id === r.id);
  if (r.type === 'power') return ctx.data.powers.some((p) => p.name === r.name);
  if (r.type === 'depthEnabled' || r.type === 'critterPower') return false;
  return true;
}

function reqLabel(ctx: Ctx, r: Requirement): string {
  switch (r.type) {
    case 'quality': {
      const q = ctx.idx.qualities.get(r.id);
      return q ? label(q) : r.name;
    }
    case 'metatype': {
      const m = ctx.data.metatypes.find((x) => x.id === r.id);
      return m ? label(m) : r.name;
    }
    case 'metatypeCategory':
      return `metatipo ${r.name}`;
    case 'magicEnabled':
      return 'ter Magia';
    case 'resonanceEnabled':
      return 'ter Ressonância';
    case 'depthEnabled':
      return 'ter Profundidade';
    case 'power': {
      const p = ctx.data.powers.find((x) => x.name === r.name);
      return `o poder ${p ? label(p) : r.name}`;
    }
    case 'bioware':
      return `o bioware ${r.name}`;
    case 'critterPower':
      return `o poder de criatura ${r.name}`;
    case 'other':
      return r.tag;
  }
}

function orList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ou ${items[items.length - 1]}`;
}

function groupBlock(ctx: Ctx, g: RequirementGroup, self: string): string | undefined {
  if (g.oneOf.length && !g.oneOf.some((r) => reqMet(ctx, r, self))) {
    const options = g.oneOf.filter((r) => reqExists(ctx, r));
    if (!options.length) return 'não disponível com os livros atuais.';
    return `exige ${orList(options.map((r) => reqLabel(ctx, r)))}.`;
  }
  const missing = g.allOf.filter((r) => !reqMet(ctx, r, self));
  if (missing.length) {
    if (missing.some((r) => !reqExists(ctx, r))) return 'não disponível com os livros atuais.';
    return `exige ${missing.map((r) => reqLabel(ctx, r)).join(' e ')}.`;
  }
  return undefined;
}

/** Motivo pelo qual a qualidade não pode ser escolhida agora, ou undefined. */
export function requirementBlock(ctx: Ctx, q: Quality): string | undefined {
  const req = groupBlock(ctx, q.required, q.id);
  if (req) return req;
  const hit = q.forbidden.oneOf.find((r) => reqMet(ctx, r, q.id));
  if (hit) return `incompatível com ${reqLabel(ctx, hit)}.`;
  if (q.forbidden.allOf.length && q.forbidden.allOf.every((r) => reqMet(ctx, r, q.id))) {
    return `incompatível com ${q.forbidden.allOf.map((r) => reqLabel(ctx, r)).join(' e ')}.`;
  }
  return undefined;
}

export function qualityAvailability(ctx: Ctx): Record<string, Availability> {
  const out: Record<string, Availability> = {};
  const racial = new Set(ctx.metatype?.racialQualityIds ?? []);
  for (const q of ctx.data.qualities) {
    if (q.hidden || q.onlyFromPriority) continue;
    if (racial.has(q.id)) {
      out[q.id] = { ok: false, reason: 'Já vem com o seu metatipo.' };
      continue;
    }
    const block = requirementBlock(ctx, q);
    out[q.id] = block ? { ok: false, reason: block[0].toUpperCase() + block.slice(1) } : { ok: true };
  }
  return out;
}
