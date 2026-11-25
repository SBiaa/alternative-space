/**
 * Exporta a ficha para o formato do Chummer5a (.chum5, XML puro).
 *
 * Os itens, qualidades, perícias e feitiços da nossa ficha usam os mesmos ids
 * do Chummer (os dados vieram de lá), então o arquivo aponta para eles pelo
 * `sourceid`. Cobre o essencial; o Chummer recalcula o resto ao abrir.
 * Limites conhecidos: efeitos de qualidades/implantes (a lista `improvements`
 * do Chummer) e o histórico de gastos não são exportados.
 */
import type { CharacterDraft, DraftGear } from './character';
import { characterDisplayName } from './character';
import { sr5Data } from './data';
import type { RulesResult } from './rules';
import { findItem, modCatalog } from './rules';
import type { AttrKey, GearItem, ItemMod } from './types';

/** Versão do Chummer que o arquivo declara (a mínima que lê este formato). */
export const CHUMMER_VERSION = '5.214.1';

type Guid = () => string;

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const el = (name: string, value: unknown = '') => `<${name}>${esc(value)}</${name}>`;
const bool = (v: boolean) => (v ? 'True' : 'False');
const block = (name: string, children: string[]) => (children.length ? `<${name}>${children.join('')}</${name}>` : `<${name} />`);

const CORE: AttrKey[] = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL'];
const MELEE = new Set(['Blades', 'Clubs', 'Exotic Melee Weapons', 'Unarmed']);

const GRADE_NAME = { standard: 'Standard', alpha: 'Alphaware', used: 'Used' } as const;

function attributes(draft: CharacterDraft, result: RulesResult): string {
  const meta = sr5Data.metatypes.find((m) => m.id === draft.metatypeId);
  const out: string[] = [];
  const mmin = (k: AttrKey) => meta?.attributes[k]?.min ?? result.attributes[k].min;
  const row = (name: string, key: AttrKey, base: number, karma: number, totalOverride?: number) => {
    const a = result.attributes[key];
    const r = meta?.attributes[key];
    out.push(
      `<attribute>${el('name', name)}${el('metatypemin', r?.min ?? a.min)}${el('metatypemax', Math.max(r?.max ?? a.max, a.max))}` +
        `${el('metatypeaugmax', Math.max(r?.aug ?? a.max, a.max))}${el('base', base)}${el('karma', karma)}` +
        `${el('metatypecategory', meta?.category ?? 'Metahuman')}${el('totalvalue', totalOverride ?? a.value)}</attribute>`,
    );
  };
  for (const k of CORE) {
    const alloc = draft.attributes[k as keyof CharacterDraft['attributes']];
    const a = result.attributes[k];
    // Melhorias de carreira entram como karma extra, para o total bater.
    row(k, k, alloc.points, Math.max(alloc.karma, a.value - mmin(k) - alloc.points));
  }
  const edg = draft.special.EDG;
  const e = result.attributes.EDG;
  row('EDG', 'EDG', edg.points, Math.max(edg.karma, e.value - mmin('EDG') - edg.points));
  for (const k of ['MAG', 'RES'] as const) {
    const a = result.attributes[k];
    row(k, k, Math.max(0, a.value - mmin(k) - draft.special[k].karma), draft.special[k].karma);
  }
  row('ESS', 'ESS', 0, 0, result.derived.essence);
  return block('attributes', out);
}

function skills(draft: CharacterDraft, result: RulesResult, guid: Guid): string {
  const out: string[] = [];
  const bySkill = new Map(draft.skills.map((s) => [s.id, s]));
  for (const s of sr5Data.skills.skills) {
    const total = result.skillRatings[s.id] ?? 0;
    const d = bySkill.get(s.id);
    if (!total && !d) continue;
    const base = d?.points ?? 0;
    const karma = Math.max(d?.karma ?? 0, total - base);
    out.push(
      `<skill>${el('guid', guid())}${el('suid', s.id)}${el('isknowledge', 'False')}${el('skillcategory', s.category)}` +
        `${el('karma', total ? karma : 0)}${el('base', base)}${el('notes', '')}${el('name', s.name)}${el('buywithkarma', bool(!!d?.specialization && d.specialization.paidWith === 'karma'))}` +
        `${block('specs', d?.specialization ? [`<spec>${el('guid', guid())}${el('name', d.specialization.name)}${el('free', bool(false))}${el('expertise', bool(false))}</spec>`] : [])}</skill>`,
    );
  }
  const groups = draft.skillGroups.map((g) => {
    const def = sr5Data.skills.groups.find((x) => x.id === g.id);
    return `<group>${el('karma', g.karma)}${el('base', g.points)}${el('isbroken', 'False')}${el('id', g.id)}${el('name', def?.name ?? g.id)}</group>`;
  });
  const knowledge = draft.knowledge.map((k) =>
    `<skill>${el('guid', guid())}${el('suid', guid())}${el('isknowledge', 'True')}${el('skillcategory', k.category)}` +
    `${el('karma', k.karma)}${el('base', k.native ? 0 : k.points)}${el('notes', '')}${el('name', k.name)}${el('buywithkarma', 'False')}` +
    `${el('isnativelanguage', bool(!!k.native))}${el('type', k.category)}` +
    `${block('specs', k.specialization ? [`<spec>${el('guid', guid())}${el('name', k.specialization.name)}</spec>`] : [])}</skill>`,
  );
  return `<skills>${out.join('')}</skills>` + block('knoskills', knowledge) + block('groups', groups);
}

function qualities(draft: CharacterDraft, guid: Guid): string {
  const out = draft.qualities.flatMap((q) => {
    const def = sr5Data.qualities.find((x) => x.id === q.id);
    if (!def) return [];
    const extra = q.choice ? sr5Data.skills.skills.find((s) => s.id === q.choice)?.name ?? q.choice : '';
    // Qualidades com nível viram uma entrada por nível, como no Chummer.
    return Array.from({ length: Math.max(1, q.rating) }, () =>
      `<quality>${el('sourceid', def.id)}${el('guid', guid())}${el('name', def.name)}${el('extra', extra)}` +
      `${el('bp', def.kind === 'positive' ? def.karma : -def.karma)}${el('implemented', 'True')}${el('contributetobp', 'True')}` +
      `${el('contributetolimit', bool(def.countsTowardLimit))}${el('stagedpurchase', 'False')}${el('doublecareer', 'True')}` +
      `${el('canbuywithspellpoints', 'False')}${el('metagenic', 'False')}${el('print', 'True')}` +
      `${el('qualitytype', def.kind === 'positive' ? 'Positive' : 'Negative')}${el('qualitysource', 'Selected')}${el('mutant', 'False')}` +
      `${el('source', def.source)}${el('page', def.page)}${el('notes', '')}</quality>`,
    );
  });
  return block('qualities', out);
}

function magic(draft: CharacterDraft, guid: Guid): string {
  const m = draft.magic;
  const parts: string[] = [];
  const trad = sr5Data.traditions.find((t) => t.id === m.traditionId);
  const stream = sr5Data.streams.find((t) => t.id === m.streamId);
  const t = trad ?? stream;
  if (t) {
    parts.push(
      `<tradition>${el('traditiontype', trad ? 'TRA' : 'RES')}${el('sourceid', t.id)}${el('guid', guid())}${el('name', t.name)}${el('extra', '')}` +
        `${el('drain', t.drain)}${el('source', t.source)}${el('page', t.page)}${el('spiritcombat', t.spiritCombat ?? '')}${el('spiritdetection', t.spiritDetection ?? '')}` +
        `${el('spirithealth', t.spiritHealth ?? '')}${el('spiritillusion', t.spiritIllusion ?? '')}${el('spiritmanipulation', t.spiritManipulation ?? '')}</tradition>`,
    );
  }
  const spells = m.spellIds.flatMap((id) => {
    const s = sr5Data.spells.find((x) => x.id === id);
    return s
      ? [`<spell>${el('sourceid', s.id)}${el('guid', guid())}${el('name', s.name)}${el('descriptors', s.descriptors.join(', '))}${el('category', s.category)}` +
          `${el('type', s.type)}${el('range', s.range)}${el('damage', s.damage)}${el('duration', s.duration)}${el('dv', s.dv)}${el('alchemical', 'False')}` +
          `${el('source', s.source)}${el('page', s.page)}${el('extra', '')}${el('notes', '')}${el('freebonus', 'False')}${el('barehandedadept', 'False')}</spell>`]
      : [];
  });
  const powers = m.powers.flatMap((p) => {
    const x = sr5Data.powers.find((y) => y.id === p.id);
    return x
      ? [`<power>${el('sourceid', x.id)}${el('guid', guid())}${el('name', x.name)}${el('extra', '')}${el('pointsperlevel', x.points)}${el('action', x.action ?? '')}` +
          `${el('rating', x.levels ? p.level : 1)}${el('levels', bool(x.levels))}${el('maxlevels', x.maxLevels ?? 0)}${el('source', x.source)}${el('page', x.page)}${el('notes', '')}</power>`]
      : [];
  });
  const cf = m.complexFormIds.flatMap((id) => {
    const x = sr5Data.complexForms.find((y) => y.id === id);
    return x
      ? [`<complexform>${el('sourceid', x.id)}${el('guid', guid())}${el('name', x.name)}${el('target', x.target)}${el('duration', x.duration)}${el('fv', x.fv)}` +
          `${el('extra', '')}${el('source', x.source)}${el('page', x.page)}${el('notes', '')}</complexform>`]
      : [];
  });
  return parts.join('') + block('spells', spells) + block('powers', powers) + block('complexforms', cf);
}

function modXml(m: { itemId: string; rating?: number; kind: string }, cat: ItemMod[], guid: Guid, tag: string): string {
  const mi = cat.find((x) => x.id === m.itemId);
  if (!mi) return '';
  return `<${tag}>${el('sourceid', mi.id)}${el('guid', guid())}${el('name', mi.name)}${el('rating', m.rating ?? 0)}${el('avail', mi.avail.raw)}` +
    `${el('cost', mi.cost.raw)}${el('source', mi.source)}${el('page', mi.page)}${el('included', 'False')}${el('equipped', 'True')}${el('notes', '')}</${tag}>`;
}

const common = (item: GearItem, guid: Guid, g: DraftGear) =>
  `${el('sourceid', item.id)}${el('guid', guid())}${el('name', item.name)}${el('category', item.category)}` +
  `${el('avail', item.avail.raw)}${el('cost', item.cost.value ?? g.customCost ?? item.cost.raw)}${el('source', item.source)}${el('page', item.page)}`;

function equipment(draft: CharacterDraft, result: RulesResult, guid: Guid) {
  const weapons: string[] = [], armors: string[] = [], ware: string[] = [], gears: string[] = [], vehicles: string[] = [];
  const ctx = { data: sr5Data } as Parameters<typeof findItem>[0];
  for (const g of draft.gear) {
    const item = findItem(ctx, g.kind, g.itemId) as (GearItem & Record<string, unknown>) | undefined;
    if (!item) continue;
    const mods = g.mods ?? [];
    if (g.kind === 'weapon') {
      const w = item as unknown as import('./types').Weapon;
      weapons.push(
        `<weapon>${common(item, guid, g)}${el('type', MELEE.has(w.category) ? 'Melee' : 'Ranged')}${el('reach', w.reach ?? 0)}${el('damage', w.damage)}` +
          `${el('ap', w.ap)}${el('mode', w.mode)}${el('rc', w.rc ?? '')}${el('ammo', w.ammo ?? '')}${el('accuracy', w.accuracy)}${el('weaponname', '')}` +
          `${el('equipped', 'False')}${block('accessories', mods.map((m) => modXml(m, modCatalog(ctx, 'accessory'), guid, 'accessory')).filter(Boolean))}${el('notes', '')}</weapon>`,
      );
    } else if (g.kind === 'armor') {
      const a = item as unknown as import('./types').Armor;
      armors.push(
        `<armor>${common(item, guid, g)}${el('armor', a.armor)}${el('armorname', '')}${el('equipped', 'False')}` +
          `${block('armormods', mods.map((m) => modXml(m, modCatalog(ctx, 'armorMod'), guid, 'armormod')).filter(Boolean))}${el('notes', '')}</armor>`,
      );
    } else if (g.kind === 'cyberware' || g.kind === 'bioware') {
      const grade = g.grade ?? 'standard';
      const aug = item as unknown as import('./types').Augmentation;
      ware.push(
        `<cyberware>${common(item, guid, g)}${el('ess', aug.essence.raw)}${el('rating', g.rating ?? 0)}${el('grade', GRADE_NAME[grade])}` +
          `${el('improvementsource', g.kind === 'cyberware' ? 'Cyberware' : 'Bioware')}${el('wirelesson', 'False')}${el('notes', '')}</cyberware>`,
      );
    } else if (g.kind === 'vehicle') {
      const v = item as unknown as import('./types').Vehicle;
      vehicles.push(
        `<vehicle>${common(item, guid, g)}${el('handling', v.handling)}${el('accel', v.accel)}${el('speed', v.speed)}${el('pilot', v.pilot)}` +
          `${el('body', v.body)}${el('armor', v.armor)}${el('sensor', v.sensor)}${el('seats', v.seats)}${el('vehiclename', '')}` +
          `${block('mods', mods.map((m) => modXml(m, modCatalog(ctx, 'vehicleMod'), guid, 'mod')).filter(Boolean))}${el('notes', '')}</vehicle>`,
      );
    } else {
      gears.push(
        `<gear>${common(item, guid, g)}${el('rating', g.rating ?? 0)}${el('qty', g.qty ?? 1)}${el('bonded', bool(!!g.bonded))}${el('equipped', 'True')}` +
          `${el('wirelesson', 'False')}${el('extra', '')}${el('notes', '')}</gear>`,
      );
    }
  }
  return block('weapons', weapons) + block('armors', armors) + block('cyberwares', ware) + block('gears', gears) + block('vehicles', vehicles);
}

/** Gera o XML de um personagem do Chummer5a. `created` = já saiu da criação (modo carreira). */
export function exportChummer(
  draft: CharacterDraft,
  result: RulesResult,
  opts: { created?: boolean; guid?: Guid } = {},
): string {
  const guid = opts.guid ?? (() => crypto.randomUUID());
  const meta = sr5Data.metatypes.find((m) => m.id === draft.metatypeId);
  const p = draft.priorities;
  const prio = (k: keyof typeof p) => p[k] ?? '';
  const talent = draft.talent ?? 'mundane';
  const body: string[] = [
    el('createdversion', CHUMMER_VERSION),
    el('minimumappversion', CHUMMER_VERSION),
    el('appversion', CHUMMER_VERSION),
    el('gameedition', 'SR5'),
    el('settings', 'default.xml'),
    el('buildmethod', 'Priority'),
    block('sources', ['SR5', ...(draft.gear.some((g) => g.kind === 'vehicle') ? ['R5'] : []), ...((draft.martialArts?.length ?? 0) > 0 ? ['RG'] : [])].map((s) => el('source', s))),
    el('metatype', meta?.name ?? 'Human'),
    el('metatypeid', meta?.id ?? ''),
    el('metatypebp', 0),
    el('metavariant', ''),
    el('metatypecategory', meta?.category ?? 'Metahuman'),
    el('movement', meta ? `${meta.movement.walk}/${meta.movement.run}/${meta.movement.sprint}` : ''),
    el('prioritymetatype', prio('metatype')),
    el('priorityattributes', prio('attributes')),
    el('priorityspecial', prio('talent')),
    el('priorityskills', prio('skills')),
    el('priorityresources', prio('resources')),
    el('prioritytalent', prio('talent')),
    el('name', draft.concept.name),
    el('alias', draft.concept.alias ?? ''),
    el('concept', draft.concept.role ?? ''),
    el('notes', draft.concept.notes ?? ''),
    el('description', ''),
    el('background', ''),
    el('created', bool(!!opts.created)),
    el('adept', bool(talent === 'adept' || talent === 'mysticAdept')),
    el('magician', bool(talent === 'magician' || talent === 'mysticAdept' || talent === 'aspectedMagician')),
    el('technomancer', bool(talent === 'technomancer')),
    el('ai', 'False'),
    el('magenabled', bool((result.attributes.MAG?.value ?? 0) > 0)),
    el('initiategrade', draft.career?.initiationGrade ?? 0),
    el('resenabled', bool((result.attributes.RES?.value ?? 0) > 0)),
    el('submersiongrade', draft.career?.submersionGrade ?? 0),
    attributes(draft, result),
    magic(draft, guid),
    skills(draft, result, guid),
    qualities(draft, guid),
    block('contacts', draft.contacts.map((c) => {
      const arch = sr5Data.contacts.find((x) => x.id === c.archetypeId);
      return `<contact>${el('name', c.name)}${el('role', arch?.name ?? '')}${el('connection', c.connection)}${el('loyalty', c.loyalty)}` +
        `${el('free', 'False')}${el('type', 'Contact')}${el('guid', guid())}</contact>`;
    })),
    block('martialarts', (draft.martialArts ?? []).flatMap((m) => {
      const a = sr5Data.martialArts.find((x) => x.id === m.id);
      return a
        ? [`<martialart>${el('name', a.name)}${el('sourceid', a.id)}${el('guid', guid())}${el('source', a.source)}${el('page', a.page)}${el('cost', sr5Data.settings.martialArtKarma)}` +
            `${el('isquality', 'False')}${block('martialarttechniques', m.techniques.map((t) => `<martialarttechnique>${el('name', t)}${el('guid', guid())}</martialarttechnique>`))}${el('notes', '')}</martialart>`]
        : [];
    })),
    block('lifestyles', draft.lifestyles.flatMap((l) => {
      const ls = sr5Data.lifestyles.find((x) => x.id === l.id);
      return ls
        ? [`<lifestyle>${el('sourceid', ls.id)}${el('guid', guid())}${el('name', ls.name)}${el('cost', ls.cost)}${el('dice', ls.dice)}${el('multiplier', ls.multiplier)}` +
            `${el('months', l.months)}${el('baselifestyle', ls.name)}${el('source', ls.source)}${el('page', ls.page)}${el('notes', '')}</lifestyle>`]
        : [];
    })),
    equipment(draft, result, guid),
    block('enemies', (draft.enemies ?? []).map((e) =>
      `<contact>${el('name', e.name)}${el('role', e.notes ?? '')}${el('connection', 1)}${el('loyalty', 1)}${el('type', 'Enemy')}${el('guid', guid())}</contact>`)),
    el('physicalcmfilled', 0),
    el('stuncmfilled', 0),
  ];
  return `<?xml version="1.0" encoding="utf-8"?>\n<character>${body.join('')}</character>\n`;
}

export function chummerFilename(draft: CharacterDraft): string {
  const base = characterDisplayName(draft).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base || 'ficha'}.chum5`;
}
