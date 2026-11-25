import { describe, expect, it } from 'vitest';
import { emptyCareer } from '../../character';
import { sr5Data } from '../../data';
import { evaluate } from '../index';
import { codes, draft, ids, points } from './helpers';

const base = () =>
  draft((d) => {
    d.priorities = { metatype: 'D', talent: 'E', attributes: 'A', skills: 'B', resources: 'A' };
    d.metatypeId = ids.metatype('Human');
    d.talent = 'mundane';
    points(d, { BOD: 3, AGI: 3, REA: 3, STR: 3, CHA: 3, INT: 3, LOG: 3, WIL: 3 });
    d.special.EDG.points = 3;
  });

const magician = () =>
  draft((d) => {
    d.priorities = { talent: 'A', attributes: 'B', skills: 'C', metatype: 'D', resources: 'E' };
    d.metatypeId = ids.metatype('Human');
    d.talent = 'magician';
  });

const byName = <T extends { name: string; id: string }>(list: T[], name: string) => {
  const x = list.find((i) => i.name === name);
  if (!x) throw new Error(`"${name}" não existe nos dados`);
  return x;
};

describe('dados novos', () => {
  it('importou veículos, programas, espíritos e artes marciais', () => {
    expect(sr5Data.vehicles.length).toBeGreaterThan(20);
    expect(sr5Data.vehicles.some((v) => v.drone)).toBe(true);
    expect(sr5Data.programs.length).toBeGreaterThan(10);
    expect(sr5Data.spirits.some((s) => s.category === 'Sprites')).toBe(true);
    expect(sr5Data.martialArts.length).toBeGreaterThan(10);
  });

  it('cyberdecks têm array ASDF e focos têm custo de vínculo', () => {
    const decks = sr5Data.gear.filter((g) => g.category === 'Cyberdecks');
    expect(decks.length).toBeGreaterThan(0);
    expect(decks.every((d) => d.device?.array?.length === 4)).toBe(true);
    const power = byName(sr5Data.gear, 'Power Focus');
    expect(power.bindKarma).toBe(6);
  });
});

describe('veículos e modificações', () => {
  it('veículo e acessório de arma entram no custo', () => {
    const v = sr5Data.vehicles.find((x) => x.cost.value && x.cost.value > 0 && x.avail.value !== null && x.avail.value <= 12)!;
    const d = base();
    d.gear.push({ key: 'v', kind: 'vehicle', itemId: v.id, qty: 1 });
    const r = evaluate(d);
    expect(r.budgets.nuyen.spent).toBe(v.cost.value);
    expect(codes(r, 'error')).not.toContain('gear.unknown');
  });

  it('modificações de veículo passando do Corpo dão erro', () => {
    const v = sr5Data.vehicles.find((x) => x.body > 0 && x.avail.value !== null && x.avail.value <= 12)!;
    const mod = sr5Data.vehicleMods.find((m) => m.slots > 0)!;
    const d = base();
    d.gear.push({
      key: 'v', kind: 'vehicle', itemId: v.id, qty: 1,
      mods: Array.from({ length: v.body + 1 }, (_, i) => ({ key: `m${i}`, kind: 'vehicleMod' as const, itemId: mod.id, customCost: 1 })),
    });
    expect(codes(evaluate(d), 'error')).toContain('mod.slots');
  });

  it('modificação de tipo errado é recusada', () => {
    const gun = sr5Data.weapons.find((w) => w.avail.value !== null && w.avail.value <= 12 && w.cost.value)!;
    const mod = sr5Data.armorMods[0];
    const d = base();
    d.gear.push({ key: 'w', kind: 'weapon', itemId: gun.id, qty: 1, mods: [{ key: 'm', kind: 'armorMod', itemId: mod.id, customCost: 1 }] });
    expect(codes(evaluate(d), 'error')).toContain('mod.host');
  });
});

describe('cyberdeck e programas', () => {
  const deck = () => sr5Data.gear.find((g) => g.category === 'Cyberdecks' && g.device?.programs === 1 && (g.avail.value ?? 99) <= 12)!;
  const prog = () => sr5Data.programs.find((p) => p.cost.value !== null && (p.avail.value ?? 99) <= 12)!;

  it('cabe um programa em um deck de 1 slot, dois não', () => {
    const d = base();
    d.gear.push({ key: 'deck', kind: 'gear', itemId: deck().id, qty: 1 });
    d.gear.push({ key: 'p1', kind: 'program', itemId: prog().id, qty: 1, loadedIn: 'deck' });
    expect(codes(evaluate(d), 'error')).not.toContain('program.slots');
    d.gear.push({ key: 'p2', kind: 'program', itemId: prog().id, qty: 1, loadedIn: 'deck' });
    expect(codes(evaluate(d), 'error')).toContain('program.slots');
  });

  it('programa carregado em algo que não é deck dá erro', () => {
    const d = base();
    d.gear.push({ key: 'p1', kind: 'program', itemId: prog().id, qty: 1, loadedIn: 'inexistente' });
    expect(codes(evaluate(d), 'error')).toContain('program.host');
  });
});

describe('focos vinculados', () => {
  it('custam Força × multiplicador em karma', () => {
    const d = magician();
    const power = byName(sr5Data.gear, 'Power Focus');
    d.gear.push({ key: 'f', kind: 'gear', itemId: power.id, qty: 1, rating: 2, bonded: true });
    const r = evaluate(d);
    expect(r.karmaBreakdown['focos vinculados']).toBe(12);
  });

  it('mundano não vincula foco', () => {
    const d = base();
    const power = byName(sr5Data.gear, 'Power Focus');
    d.gear.push({ key: 'f', kind: 'gear', itemId: power.id, qty: 1, rating: 1, bonded: true });
    expect(codes(evaluate(d), 'error')).toContain('focus.noMagic');
  });

  it('item que não é foco não pode ser vinculado', () => {
    const d = base();
    d.gear.push({ key: 'g', kind: 'gear', itemId: sr5Data.gear.find((g) => g.category === 'Commlinks')!.id, qty: 1, bonded: true });
    expect(codes(evaluate(d), 'error')).toContain('focus.notFocus');
  });
});

describe('artes marciais', () => {
  it('cobra 7 por estilo e 5 por técnica', () => {
    const d = base();
    const art = sr5Data.martialArts.find((a) => a.techniques.length >= 2)!;
    d.martialArts = [{ id: art.id, techniques: [art.techniques[0], art.techniques[1]] }];
    const r = evaluate(d);
    expect(r.karmaBreakdown['artes marciais']).toBe(17);
  });

  it('técnica de outro estilo é recusada', () => {
    const d = base();
    const [a, b] = sr5Data.martialArts.filter((x) => x.techniques.length > 0);
    const foreign = b.techniques.find((t) => !a.techniques.includes(t))!;
    d.martialArts = [{ id: a.id, techniques: [foreign] }];
    expect(codes(evaluate(d), 'error')).toContain('martial.technique');
  });
});

describe('carreira', () => {
  it('melhorias de atributo e perícia entram nos valores', () => {
    const d = base();
    const before = evaluate(d);
    d.career = {
      ...emptyCareer(),
      improvements: [
        { key: 'g1', kind: 'attribute', ref: 'AGI', label: 'AGI', from: 3, to: 5, karma: 0, at: '2026-01-01' },
        { key: 'g2', kind: 'skill', ref: sr5Data.skills.skills[0].id, label: 'x', from: 0, to: 4, karma: 0, at: '2026-01-01' },
      ],
    };
    const after = evaluate(d);
    expect(after.attributes.AGI.value).toBe(5);
    expect(after.skillRatings[sr5Data.skills.skills[0].id]).toBe(4);
    // Iniciativa acompanha REA, que não mudou; limite físico não.
    expect(after.derived.initiative.base).toBe(before.derived.initiative.base);
  });

  it('subir Corpo muda o monitor físico', () => {
    const d = base();
    const before = evaluate(d).derived.monitors.physical;
    d.career = { ...emptyCareer(), improvements: [{ key: 'g', kind: 'attribute', ref: 'BOD', label: 'BOD', from: 3, to: 6, karma: 0, at: '2026-01-01' }] };
    expect(evaluate(d).derived.monitors.physical).toBeGreaterThan(before);
  });
});

describe('regras da casa', () => {
  it('a tabela Street Level troca o dinheiro inicial', () => {
    const d = base();
    const std = evaluate(d).budgets.nuyen.total;
    d.options = { priorityTable: 'streetLevel' };
    const street = evaluate(d).budgets.nuyen.total;
    expect(street).toBe(sr5Data.priorities.rows.A.resources.streetLevel);
    expect(street).not.toBe(std);
  });

  it('karma inicial e disponibilidade máxima mudam e valores absurdos são ignorados', () => {
    const d = base();
    const start = evaluate(d).budgets.karma.total;
    d.options = { startingKarma: 100 };
    expect(evaluate(d).budgets.karma.total).toBe(100);
    d.options = { startingKarma: -5, maxAvailability: 999 };
    expect(evaluate(d).budgets.karma.total).toBe(start);
  });
});
