import type { DraftGear, GearKind, WareGrade } from '../character';
import { label } from '../data';
import type { Augmentation, GearItem } from '../types';
import { addKarma, budget, issue, round2, type Ctx } from './context';
import { evalExpr, stripRestriction } from './expr';

/** Multiplicadores de grau (cyberware.xml do Chummer). */
export const WARE_GRADES: Record<WareGrade, { name: string; namePt: string; ess: number; cost: number; avail: number }> = {
  standard: { name: 'Standard', namePt: 'Padrão', ess: 1, cost: 1, avail: 0 },
  alpha: { name: 'Alphaware', namePt: 'Alfa', ess: 0.8, cost: 1.2, avail: 2 },
  used: { name: 'Used', namePt: 'Usado', ess: 1.25, cost: 0.75, avail: -4 },
};

/** Quanto do nuyen pode sobrar para o jogo. */
export const NUYEN_CARRYOVER = 5000;

export function findItem(ctx: Ctx, kind: GearKind, id: string): GearItem | Augmentation | undefined {
  const list: GearItem[] = {
    gear: ctx.data.gear,
    weapon: ctx.data.weapons,
    armor: ctx.data.armor,
    cyberware: ctx.data.cyberware,
    bioware: ctx.data.bioware,
  }[kind];
  return list.find((x) => x.id === id);
}

function maxRatingOf(item: GearItem | Augmentation): number | undefined {
  return ('maxRating' in item && item.maxRating) || item.rating || undefined;
}

export interface GearLine {
  unitCost: number | null;
  avail: number | null;
  essence: number;
}

/** Custo unitário, disponibilidade e Essência de um item, já com nível e grau. */
export function gearLine(ctx: Ctx, g: DraftGear, item: GearItem | Augmentation): GearLine {
  const vars = { rating: g.rating ?? 1, minRating: 1 };
  const grade = isWare(g.kind) ? WARE_GRADES[g.grade ?? 'standard'] : WARE_GRADES.standard;
  const baseCost = item.cost.value ?? evalExpr(item.cost.raw, vars) ?? g.customCost ?? null;
  const baseAvail = item.avail.value ?? evalExpr(stripRestriction(item.avail.raw), vars);
  let essence = 0;
  if ('essence' in item) {
    essence = (item.essence.value ?? evalExpr(item.essence.raw, vars) ?? 0) * grade.ess;
  }
  return {
    unitCost: baseCost === null ? null : Math.round(baseCost * grade.cost),
    avail: baseAvail === null ? null : baseAvail + grade.avail,
    essence: round2(essence),
  };
}

const isWare = (k: GearKind) => k === 'cyberware' || k === 'bioware';

export function checkResources(ctx: Ctx): void {
  const { draft, s } = ctx;

  // Karma → nuyen
  const k2n = draft.karmaToNuyen ?? 0;
  if (!Number.isInteger(k2n) || k2n < 0 || k2n > s.maxKarmaToNuyen) {
    issue(ctx, 'error', 'resources', 'resources.karmaToNuyen',
      `Dá para trocar de 0 a ${s.maxKarmaToNuyen} de karma por nuyen.`, 'karmaToNuyen');
  }
  addKarma(ctx, 'karma em nuyen', Math.max(0, k2n));

  const total = (ctx.rows.resources?.resources[s.priorityTable] ?? 0) + Math.max(0, k2n) * s.nuyenPerKarma;
  let spent = 0;
  let essenceUsed = 0;

  draft.gear.forEach((g, i) => {
    const path = `gear.${i}`;
    const item = findItem(ctx, g.kind, g.itemId);
    if (!item) {
      issue(ctx, 'error', 'resources', 'gear.unknown', 'Item desconhecido nos livros ativos.', path);
      return;
    }
    const name = label(item);
    const qty = g.qty ?? 1;
    if (!Number.isInteger(qty) || qty < 1) {
      issue(ctx, 'error', 'resources', 'gear.qty', `${name}: quantidade inválida.`, path);
    }
    const max = maxRatingOf(item);
    if (g.rating !== undefined && (!Number.isInteger(g.rating) || g.rating < 1 || (max && g.rating > max))) {
      issue(ctx, 'error', 'resources', 'gear.rating',
        max ? `${name}: o nível vai de 1 a ${max}.` : `${name}: nível inválido.`, path);
    }
    if (g.grade && !isWare(g.kind)) {
      issue(ctx, 'error', 'resources', 'gear.grade', `${name}: só implantes têm grau.`, path);
    }
    if (g.grade && s.bannedWareGrades.includes(WARE_GRADES[g.grade]?.name ?? '')) {
      issue(ctx, 'error', 'resources', 'gear.grade', `${name}: esse grau não é permitido na criação.`, path);
    }

    const line = gearLine(ctx, g, item);
    if (line.unitCost === null) {
      issue(ctx, 'error', 'resources', 'gear.cost', `${name}: o preço varia; informe quanto vai pagar.`, path);
    } else {
      spent += line.unitCost * Math.max(1, qty);
    }
    if (line.avail !== null && line.avail > s.maxAvailability) {
      issue(ctx, 'error', 'resources', 'gear.availability',
        `${name}: disponibilidade ${line.avail} passa do limite de ${s.maxAvailability} na criação.`, path);
    }
    essenceUsed += line.essence * Math.max(1, qty);
  });

  // Estilo de vida
  const pct = (ctx.metatype?.bonus.lifestyleCostPct ?? 0)
    + ctx.effects.reduce((n, e) => n + (e.effect.type === 'lifestyleCostPct' ? e.effect.delta : 0), 0);
  draft.lifestyles.forEach((l, i) => {
    const ls = ctx.data.lifestyles.find((x) => x.id === l.id);
    if (!ls) {
      issue(ctx, 'error', 'resources', 'lifestyle.unknown', 'Estilo de vida desconhecido.', `lifestyles.${i}`);
      return;
    }
    if (!Number.isInteger(l.months) || l.months < 1) {
      issue(ctx, 'error', 'resources', 'lifestyle.months', `${label(ls)}: pague pelo menos 1 mês.`, `lifestyles.${i}`);
    }
    spent += Math.round(ls.cost * (1 + pct / 100)) * Math.max(1, l.months);
  });
  if (!draft.lifestyles.length) {
    issue(ctx, 'warning', 'resources', 'lifestyle.none', 'Escolha um estilo de vida (onde o personagem mora) e pague pelo menos 1 mês.');
  }

  ctx.budgets.nuyen = budget(total, spent);
  if (spent > total) {
    issue(ctx, 'error', 'resources', 'nuyen.overspent',
      `Você gastou ${fmtNuyen(spent)}, mas tem ${fmtNuyen(total)}.`);
  } else if (ctx.rows.resources && total - spent > NUYEN_CARRYOVER) {
    issue(ctx, 'warning', 'resources', 'nuyen.leftover',
      `Sobraram ${fmtNuyen(total - spent)}. Só ${fmtNuyen(NUYEN_CARRYOVER)} passam para o jogo; o resto é perdido.`);
  }

  ctx.essence = round2(6 - essenceUsed);
  if (ctx.essence <= 0) {
    issue(ctx, 'error', 'resources', 'essence.depleted',
      `Os implantes consomem ${round2(essenceUsed)} de Essência: com 0 ou menos o personagem morre.`);
  }
}

export function fmtNuyen(n: number): string {
  return `${n.toLocaleString('pt-BR')}¥`;
}
