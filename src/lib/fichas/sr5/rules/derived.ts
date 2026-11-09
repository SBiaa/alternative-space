import type { AttrKey } from '../types';
import { isAwakened, isEmerged, needsTradition, type Ctx } from './context';
import type { Derived } from './result';

function effectSum(ctx: Ctx, pick: (e: Ctx['effects'][number]['effect']) => number): number {
  return ctx.effects.reduce((n, a) => n + pick(a.effect) * a.rating, 0);
}

/** Avalia "{WIL} + {LOG}" com os valores atuais. */
function attrFormula(ctx: Ctx, expr: string): number | undefined {
  let ok = true;
  const total = expr.split('+').reduce((n, part) => {
    const key = part.trim().replace(/[{}]/g, '') as AttrKey;
    const st = ctx.attrs[key];
    if (!st) ok = false;
    return n + (st?.value ?? 0);
  }, 0);
  return ok ? total : undefined;
}

export function computeDerived(ctx: Ctx, essenceMagicLoss: number): Derived {
  const v = (k: AttrKey) => ctx.attrs[k].value;
  const limitBonus = (l: 'physical' | 'mental' | 'social') =>
    effectSum(ctx, (e) => (e.type === 'limit' && e.limit === l ? e.delta : 0));
  const cm = (f: 'physical' | 'stun' | 'overflow' | 'threshold' | 'thresholdOffset') =>
    effectSum(ctx, (e) => (e.type === 'conditionMonitor' && e.field === f ? e.delta : 0));

  const essence = ctx.essence;
  const k = ctx.talent?.key;

  const derived: Derived = {
    limits: {
      physical: Math.ceil((v('STR') * 2 + v('BOD') + v('REA')) / 3) + limitBonus('physical'),
      mental: Math.ceil((v('LOG') * 2 + v('INT') + v('WIL')) / 3) + limitBonus('mental'),
      social: Math.ceil((v('CHA') * 2 + v('WIL') + Math.ceil(essence)) / 3) + limitBonus('social'),
    },
    initiative: { base: v('REA') + v('INT'), dice: ctx.s.initiativeDice.min },
    monitors: {
      physical: 8 + Math.ceil(v('BOD') / 2) + cm('physical'),
      stun: 8 + Math.ceil(v('WIL') / 2) + cm('stun'),
      // Chummer: Corpo + 1 (a caixa extra marca a morte).
      overflow: v('BOD') + 1 + cm('overflow'),
      woundThreshold: 3 + cm('threshold'),
    },
    essence,
    essenceMagicLoss,
    composure: v('WIL') + v('CHA'),
    judgeIntentions: v('INT') + v('CHA'),
    memory: v('LOG') + v('WIL'),
    liftCarry: v('STR') + v('BOD'),
  };

  if (isAwakened(ctx) && (needsTradition(ctx) || k === 'adept')) {
    derived.astralInitiative = { base: v('INT') * 2, dice: 3 };
  }
  if (isEmerged(ctx)) {
    // Persona viva: Processamento de Dados = Lógica.
    const base = v('LOG') + v('INT');
    derived.matrixInitiative = {
      ar: { base: v('REA') + v('INT'), dice: 1 },
      coldSim: { base, dice: 3 },
      hotSim: { base, dice: 4 },
    };
  }

  const tradition = ctx.data.traditions.find((t) => t.id === ctx.draft.magic.traditionId);
  const stream = ctx.data.streams.find((t) => t.id === ctx.draft.magic.streamId);
  if (needsTradition(ctx) && tradition) derived.drainResist = attrFormula(ctx, tradition.drain);
  else if (isEmerged(ctx) && stream) derived.drainResist = attrFormula(ctx, stream.drain);

  return derived;
}
