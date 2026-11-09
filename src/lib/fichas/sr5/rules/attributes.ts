import { CORE_ATTRS, type Alloc, type CoreAttr, type SpecialAttr } from '../character';
import type { AttrKey } from '../types';
import { addKarma, budget, isAwakened, isEmerged, issue, pluralize, type Ctx } from './context';

export const ATTR_LABEL: Record<AttrKey, string> = {
  BOD: 'Corpo',
  AGI: 'Agilidade',
  REA: 'Reação',
  STR: 'Força',
  CHA: 'Carisma',
  INT: 'Intuição',
  LOG: 'Lógica',
  WIL: 'Vontade',
  EDG: 'Trunfo',
  MAG: 'Magia',
  RES: 'Ressonância',
  ESS: 'Essência',
};

/** Karma para subir de `from` até `to`: cada passo custa novo nível × multiplicador. */
export function stepCost(from: number, to: number, mult: number): number {
  let total = 0;
  for (let r = from + 1; r <= to; r++) total += r * mult;
  return total;
}

function maxBonus(ctx: Ctx, attr: AttrKey): number {
  let bonus = 0;
  for (const { effect, choice } of ctx.effects) {
    if (effect.type === 'attributeMax' && effect.attr === attr) bonus += effect.delta;
    if (effect.type === 'chooseAttributeMax' && choice === attr) bonus += effect.delta;
  }
  return bonus;
}

function validAlloc(a: Alloc | undefined): Alloc {
  return { points: a?.points ?? 0, karma: a?.karma ?? 0 };
}

export function computeAttributes(ctx: Ctx): void {
  const { draft, metatype, s } = ctx;
  if (!metatype) return;
  const karmaMult = s.karmaCosts.attribute;

  const set = (key: AttrKey, min: number, max: number, a: Alloc, enabled: boolean) => {
    const st = ctx.attrs[key];
    st.min = min;
    st.max = max;
    if (!enabled) {
      st.base = 0;
      st.value = 0;
      return;
    }
    st.base = min + a.points;
    st.value = st.base + a.karma;
    st.karma = stepCost(st.base, st.value, karmaMult);
    st.atMax = st.value >= max;
  };

  // Atributos físicos e mentais
  let pointsSpent = 0;
  for (const key of CORE_ATTRS) {
    const a = validAlloc(draft.attributes[key]);
    const r = metatype.attributes[key];
    set(key, r.min, r.max + maxBonus(ctx, key), a, true);
    pointsSpent += a.points;
    checkAlloc(ctx, key, a, 'attributes');
  }

  // Especiais
  const edg = validAlloc(draft.special.EDG);
  const mag = validAlloc(draft.special.MAG);
  const res = validAlloc(draft.special.RES);
  set('EDG', metatype.attributes.EDG.min, metatype.attributes.EDG.max + maxBonus(ctx, 'EDG'), edg, true);
  const magic = ctx.talent?.magic ?? 0;
  const resonance = ctx.talent?.resonance ?? 0;
  set('MAG', magic, metatype.attributes.MAG.max + maxBonus(ctx, 'MAG'), mag, isAwakened(ctx));
  set('RES', resonance, metatype.attributes.RES.max + maxBonus(ctx, 'RES'), res, isEmerged(ctx));
  checkAlloc(ctx, 'EDG', edg, 'attributes');
  checkAlloc(ctx, 'MAG', mag, 'attributes');
  checkAlloc(ctx, 'RES', res, 'attributes');
  if (!isAwakened(ctx) && (mag.points || mag.karma)) {
    issue(ctx, 'error', 'attributes', 'attributes.noMagic',
      'Só personagens com talento mágico podem ter Magia.', 'special.MAG');
  }
  if (!isEmerged(ctx) && (res.points || res.karma)) {
    issue(ctx, 'error', 'attributes', 'attributes.noResonance',
      'Só tecnomantes podem ter Ressonância.', 'special.RES');
  }

  // Máximos
  for (const key of [...CORE_ATTRS, 'EDG', 'MAG', 'RES'] as (CoreAttr | SpecialAttr)[]) {
    const st = ctx.attrs[key];
    if (st.value > st.max && (st.value > 0)) {
      issue(ctx, 'error', 'attributes', 'attributes.overMax',
        `${ATTR_LABEL[key]} passou do máximo (${st.value} de ${st.max}).`, `attributes.${key}`);
    }
  }

  // Só um atributo físico ou mental pode ficar no máximo natural.
  const atMax = CORE_ATTRS.filter((k) => ctx.attrs[k].atMax);
  if (atMax.length > s.maxAttributesAtMax) {
    issue(ctx, 'error', 'attributes', 'attributes.tooManyAtMax',
      `Só ${s.maxAttributesAtMax} atributo físico ou mental pode ficar no máximo na criação. Hoje estão no máximo: ${atMax.map((k) => ATTR_LABEL[k]).join(', ')}.`);
  }

  // Orçamentos de pontos
  const attrTotal = ctx.rows.attributes?.attributePoints ?? 0;
  ctx.budgets.attributes = budget(attrTotal, pointsSpent);
  if (pointsSpent > attrTotal) {
    issue(ctx, 'error', 'attributes', 'attributes.overspent',
      `Você usou ${pointsSpent} pontos de atributo, mas tem ${attrTotal}.`);
  } else if (ctx.rows.attributes && pointsSpent < attrTotal) {
    issue(ctx, 'warning', 'attributes', 'attributes.leftover',
      `Sobraram ${pluralize(attrTotal - pointsSpent, 'ponto', 'pontos')} de atributo. Pontos não usados são perdidos.`);
  }

  const specialTotal = ctx.metatypeOption?.specialPoints ?? 0;
  const specialSpent = edg.points + mag.points + res.points;
  ctx.budgets.special = budget(specialTotal, specialSpent);
  if (specialSpent > specialTotal) {
    issue(ctx, 'error', 'attributes', 'special.overspent',
      `Você usou ${specialSpent} pontos especiais, mas tem ${specialTotal}.`);
  } else if (ctx.metatypeOption && specialSpent < specialTotal) {
    issue(ctx, 'warning', 'attributes', 'special.leftover',
      `Sobraram ${pluralize(specialTotal - specialSpent, 'ponto especial', 'pontos especiais')} (Trunfo, Magia ou Ressonância).`);
  }

  for (const key of [...CORE_ATTRS, 'EDG', 'MAG', 'RES'] as AttrKey[]) {
    addKarma(ctx, 'atributos', ctx.attrs[key].karma);
  }
}

function checkAlloc(ctx: Ctx, key: AttrKey, a: Alloc, step: 'attributes'): void {
  if (!Number.isInteger(a.points) || !Number.isInteger(a.karma) || a.points < 0 || a.karma < 0) {
    issue(ctx, 'error', step, 'attributes.invalid',
      `${ATTR_LABEL[key]}: use números inteiros a partir de zero.`, `attributes.${key}`);
  }
}

/** Atualiza ESS e penalidade de Magia/Ressonância (depois de calcular os implantes). */
export function applyEssence(ctx: Ctx): number {
  const ess = ctx.attrs.ESS;
  ess.min = 0;
  ess.max = 6;
  ess.base = 6;
  ess.value = ctx.essence;
  // Cada ponto de Essência perdido (arredondando para cima) reduz Magia/Ressonância.
  const loss = Math.max(0, Math.ceil(6 - ctx.essence - 1e-9));
  if (loss > 0 && (isAwakened(ctx) || isEmerged(ctx))) {
    const key: AttrKey = isAwakened(ctx) ? 'MAG' : 'RES';
    const after = ctx.attrs[key].value - loss;
    issue(ctx, after <= 0 ? 'error' : 'warning', 'resources', 'essence.magicLoss',
      after <= 0
        ? `Os implantes custam tanta Essência que ${ATTR_LABEL[key]} cairia para ${after}: o personagem perderia o talento.`
        : `Os implantes reduzem ${ATTR_LABEL[key]} em ${loss} (fica ${after}).`);
  }
  return loss;
}
