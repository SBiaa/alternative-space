import { join } from 'node:path';
import type {
  AdeptPower, Armor, AttrKey, AttributeRange, Augmentation, Availability, Book, ComplexForm,
  ContactArchetype, Cost, CreationSettings, GearItem, KnowledgeSkillSuggestion, Lifestyle,
  Mentor, Metatype, MetatypeBonus, Metavariant, PriorityData, PriorityLetter,
  PriorityMetatypeOption, PriorityRow, PriorityTableKey, Quality, QualityEffect, Requirement,
  RequirementGroup, Skill, SkillCategory, SkillData, SkillGroup, Spell, TalentKey, TalentOption,
  Tradition, Weapon,
} from '../../src/lib/fichas/sr5/types';
import { translator, type Translations } from './i18n';
import { arr, attr, bool, has, loadXml, num, slug, text, type XNode } from './xml';

export interface Ctx {
  dataDir: string;
  books: Set<string>;
  tr: Translations;
}

const load = (ctx: Ctx, file: string) => loadXml(join(ctx.dataDir, file)).chummer;
const inBooks = (ctx: Ctx, n: XNode) => ctx.books.has(text(n.source));
const notHidden = (n: XNode) => !has(n.hide);
const page = (n: XNode) => num(n.page);

// ---------------------------------------------------------------------------
// Livros

export function convertBooks(ctx: Ctx): Book[] {
  const t = translator(ctx.tr, 'books.xml');
  return arr(load(ctx, 'books.xml').books.book).map((b: XNode) => ({
    id: text(b.id),
    code: text(b.code),
    name: text(b.name),
    namePt: t(text(b.name), text(b.id)),
  }));
}

// ---------------------------------------------------------------------------
// Qualidades (vêm antes dos metatipos, que referenciam qualidades raciais)

/** Mapa nome → id de TODAS as qualidades (de todos os livros), para referências estáveis. */
export function qualityIdIndex(ctx: Ctx): Map<string, string> {
  const m = new Map<string, string>();
  for (const q of arr(load(ctx, 'qualities.xml').qualities.quality)) m.set(text(q.name), text(q.id));
  return m;
}

function parseRequirements(node: XNode, qIds: Map<string, string>, mIds: Map<string, string>): RequirementGroup {
  const group: RequirementGroup = { oneOf: [], allOf: [] };
  if (!node || typeof node !== 'object') return group;
  for (const [bucket, key] of [['oneof', 'oneOf'], ['allof', 'allOf']] as const) {
    const g = node[bucket];
    if (!g || typeof g !== 'object') continue;
    for (const [tag, value] of Object.entries(g)) {
      if (tag.startsWith('@_')) continue;
      for (const v of arr(value as XNode)) group[key].push(toRequirement(tag, text(v), qIds, mIds));
    }
  }
  return group;
}

function toRequirement(tag: string, value: string, qIds: Map<string, string>, mIds: Map<string, string>): Requirement {
  switch (tag) {
    case 'quality': return { type: 'quality', id: qIds.get(value) ?? slug(value), name: value };
    case 'metatype': return { type: 'metatype', id: mIds.get(value) ?? slug(value), name: value };
    case 'metatypecategory': return { type: 'metatypeCategory', name: value };
    case 'magenabled': return { type: 'magicEnabled' };
    case 'resenabled': return { type: 'resonanceEnabled' };
    case 'depenabled': return { type: 'depthEnabled' };
    case 'power': return { type: 'power', name: value };
    case 'bioware': return { type: 'bioware', name: value };
    case 'critterpower': return { type: 'critterPower', name: value };
    default: return { type: 'other', tag, value: value || undefined };
  }
}

const ATTRS: AttrKey[] = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES', 'ESS'];
const asAttr = (s: string): AttrKey | undefined => (ATTRS as string[]).includes(s) ? (s as AttrKey) : undefined;

function parseEffects(bonus: XNode): QualityEffect[] {
  if (!bonus || typeof bonus !== 'object') return [];
  const out: QualityEffect[] = [];
  for (const [tag, raw] of Object.entries(bonus)) {
    if (tag.startsWith('@_') || tag === '#text') continue;
    for (const v of arr(raw as XNode)) {
      switch (tag) {
        case 'specificattribute': {
          const a = asAttr(text(v.name));
          if (a) out.push({ type: 'attributeMax', attr: a, delta: num(v.max) });
          break;
        }
        case 'selectattributes':
          for (const s of arr(v.selectattribute)) {
            out.push({
              type: 'chooseAttributeMax',
              delta: num(s.max),
              exclude: arr(s.excludeattribute).map(text).map(asAttr).filter(Boolean) as AttrKey[],
            });
          }
          break;
        case 'selectskill':
          out.push({ type: 'chooseSkillMax', delta: num(v.max) });
          break;
        case 'physicallimit': out.push({ type: 'limit', limit: 'physical', delta: num(v) }); break;
        case 'mentallimit': out.push({ type: 'limit', limit: 'mental', delta: num(v) }); break;
        case 'sociallimit': out.push({ type: 'limit', limit: 'social', delta: num(v) }); break;
        case 'conditionmonitor': {
          const fields = { physical: 'physical', stun: 'stun', overflow: 'overflow', threshold: 'threshold', thresholdoffset: 'thresholdOffset' } as const;
          for (const [k, field] of Object.entries(fields)) {
            if (has(v[k])) out.push({ type: 'conditionMonitor', field, delta: num(v[k]) });
          }
          break;
        }
        case 'enableattribute': {
          const a = asAttr(text(v.name));
          if (a) out.push({ type: 'enableAttribute', attr: a });
          break;
        }
        case 'notoriety': out.push({ type: 'notoriety', delta: num(v) }); break;
        case 'lifestylecost': out.push({ type: 'lifestyleCostPct', delta: num(v) }); break;
        case 'selecttext': out.push({ type: 'chooseText' }); break;
        default: out.push({ type: 'other', tag });
      }
    }
  }
  return out;
}

export function convertQualities(ctx: Ctx, qIds: Map<string, string>, mIds: Map<string, string>): Quality[] {
  const t = translator(ctx.tr, 'qualities.xml');
  return arr(load(ctx, 'qualities.xml').qualities.quality)
    .filter((q: XNode) => inBooks(ctx, q))
    .map((q: XNode): Quality => {
      const limitRaw = text(q.limit).trim();
      let maxRating: number | null = 1;
      let limitExpr: string | undefined;
      if (limitRaw === 'False') maxRating = null;
      else if (/^\d+$/.test(limitRaw)) maxRating = Number(limitRaw);
      else if (limitRaw) limitExpr = limitRaw;
      const karma = num(q.karma);
      return {
        id: text(q.id),
        name: text(q.name),
        namePt: t(text(q.name), text(q.id)),
        source: text(q.source),
        page: page(q),
        kind: text(q.category) === 'Negative' ? 'negative' : 'positive',
        karma: Math.abs(karma),
        maxRating,
        ...(limitExpr ? { limitExpr } : {}),
        countsTowardLimit: bool(q.contributetolimit, true),
        onlyFromPriority: has(q.onlyprioritygiven),
        chargenOnly: has(q.chargenonly),
        hidden: has(q.hide),
        forbidden: parseRequirements(q.forbidden, qIds, mIds),
        required: parseRequirements(q.required, qIds, mIds),
        effects: parseEffects(q.bonus),
      };
    });
}

// ---------------------------------------------------------------------------
// Metatipos

const ATTR_PREFIX: Record<AttrKey, string> = {
  BOD: 'bod', AGI: 'agi', REA: 'rea', STR: 'str', CHA: 'cha', INT: 'int',
  LOG: 'log', WIL: 'wil', EDG: 'edg', MAG: 'mag', RES: 'res', ESS: 'ess',
};

function readAttributes(n: XNode, fallback?: Record<AttrKey, AttributeRange>): Record<AttrKey, AttributeRange> {
  const out = {} as Record<AttrKey, AttributeRange>;
  for (const a of ATTRS) {
    const p = ATTR_PREFIX[a];
    out[a] = has(n[`${p}min`])
      ? { min: num(n[`${p}min`]), max: num(n[`${p}max`]), aug: num(n[`${p}aug`]) }
      : fallback?.[a] ?? { min: 0, max: 0, aug: 0 };
  }
  return out;
}

function readBonus(n: XNode): MetatypeBonus {
  const b = n.bonus;
  if (!b || typeof b !== 'object') return {};
  const out: MetatypeBonus = {};
  if (has(b.armor)) out.armor = num(b.armor);
  if (has(b.reach)) out.reach = num(b.reach);
  if (has(b.lifestylecost)) out.lifestyleCostPct = num(b.lifestylecost);
  return out;
}

function readRacialQualities(n: XNode, qIds: Map<string, string>): string[] {
  const q = n.qualities;
  if (!q || typeof q !== 'object') return [];
  return [...arr(q.positive?.quality), ...arr(q.negative?.quality)]
    .map((x: XNode) => text(x))
    .map((name: string) => qIds.get(name) ?? slug(name));
}

const firstNumber = (s: string) => num(s.split('/')[0]);

/** Mapa nome → id dos metatipos de todos os livros (para resolver referências). */
export function metatypeIdIndex(ctx: Ctx): Map<string, string> {
  const m = new Map<string, string>();
  for (const x of arr(load(ctx, 'metatypes.xml').metatypes.metatype)) m.set(text(x.name), text(x.id));
  return m;
}

export function convertMetatypes(ctx: Ctx, qIds: Map<string, string>): Metatype[] {
  const t = translator(ctx.tr, 'metatypes.xml');
  return arr(load(ctx, 'metatypes.xml').metatypes.metatype)
    .filter((m: XNode) => inBooks(ctx, m))
    .map((m: XNode): Metatype => {
      const attributes = readAttributes(m);
      const id = text(m.id);
      return {
        id,
        name: text(m.name),
        namePt: t(text(m.name), id),
        source: text(m.source),
        page: page(m),
        category: text(m.category),
        categoryPt: t(text(m.category)),
        attributes,
        initiative: { min: num(m.inimin), max: num(m.inimax), aug: num(m.iniaug) },
        movement: { walk: firstNumber(text(m.walk)), run: firstNumber(text(m.run)), sprint: firstNumber(text(m.sprint)) },
        racialQualityIds: readRacialQualities(m, qIds),
        bonus: readBonus(m),
        metavariants: arr(m.metavariants?.metavariant)
          .filter((v: XNode) => inBooks(ctx, v))
          .map((v: XNode): Metavariant => ({
            id: text(v.id),
            parentId: id,
            name: text(v.name),
            namePt: t(text(v.name), text(v.id)),
            source: text(v.source),
            page: page(v),
            attributes: readAttributes(v, attributes),
            racialQualityIds: readRacialQualities(v, qIds),
            bonus: readBonus(v),
          })),
      };
    });
}

// ---------------------------------------------------------------------------
// Perícias

const GROUP_PT: Record<string, string> = {
  Acting: 'Atuação',
  Athletics: 'Atletismo',
  Biotech: 'Biotecnologia',
  'Close Combat': 'Combate Corpo a Corpo',
  Conjuring: 'Convocação',
  Cracking: 'Invasão',
  Electronics: 'Eletrônica',
  Enchanting: 'Encantamento',
  Firearms: 'Armas de Fogo',
  Influence: 'Influência',
  Engineering: 'Engenharia',
  Outdoors: 'Vida ao Ar Livre',
  Sorcery: 'Feitiçaria',
  Stealth: 'Furtividade',
  Tasking: 'Tarefas',
};

export function convertSkills(ctx: Ctx): SkillData {
  const t = translator(ctx.tr, 'skills.xml');
  const root = load(ctx, 'skills.xml');
  const specs = (s: XNode) => arr(s.specs?.spec).map((x: XNode) => ({ name: text(x), namePt: t(text(x)) }));

  const categories: SkillCategory[] = arr(root.categories.category).map((c: XNode) => ({
    name: text(c),
    namePt: t(text(c)),
    kind: attr(c, 'type') === 'knowledge' ? 'knowledge' : 'active',
  }));

  const skills: Skill[] = arr(root.skills.skill)
    .filter((s: XNode) => inBooks(ctx, s))
    .map((s: XNode) => {
      const group = text(s.skillgroup).trim();
      return {
        id: text(s.id),
        name: text(s.name),
        namePt: t(text(s.name), text(s.id)),
        source: text(s.source),
        page: page(s),
        attribute: text(s.attribute) as AttrKey,
        category: text(s.category),
        ...(group ? { groupId: slug(group) } : {}),
        canDefault: bool(s.default),
        exotic: bool(s.exotic),
        specs: specs(s),
      };
    });

  const groups: SkillGroup[] = arr(root.skillgroups.name)
    .map((g: XNode) => text(g))
    .map((name: string) => ({
      id: slug(name),
      name,
      namePt: GROUP_PT[name] ?? t(name),
      skillIds: skills.filter((s) => s.groupId === slug(name)).map((s) => s.id),
    }))
    .filter((g: SkillGroup) => g.skillIds.length > 0);

  const knowledgeSuggestions: KnowledgeSkillSuggestion[] = arr(root.knowledgeskills.skill)
    .filter((s: XNode) => !has(s.source) || inBooks(ctx, s))
    .map((s: XNode) => ({
      id: text(s.id),
      name: text(s.name),
      namePt: t(text(s.name), text(s.id)),
      attribute: text(s.attribute) as AttrKey,
      category: text(s.category),
      specs: specs(s),
    }));

  return { categories, groups, skills, knowledgeSuggestions };
}

// ---------------------------------------------------------------------------
// Prioridades

const TALENT_KEYS: Record<string, TalentKey> = {
  Magician: 'magician',
  'Mystic Adept': 'mysticAdept',
  Adept: 'adept',
  'Aspected Magician': 'aspectedMagician',
  Technomancer: 'technomancer',
  Mundane: 'mundane',
  Aware: 'aware',
  Explorer: 'explorer',
  Enchanter: 'enchanter',
  Apprentice: 'apprentice',
  'A.I.': 'ai',
};

const TABLE_KEYS: Record<string, PriorityTableKey> = {
  Standard: 'standard',
  'Prime Runner': 'primeRunner',
  'Street Level': 'streetLevel',
};

const LETTERS: PriorityLetter[] = ['A', 'B', 'C', 'D', 'E'];

export function convertPriorities(
  ctx: Ctx,
  metatypes: Metatype[],
  qualities: Quality[],
  skills: SkillData,
): PriorityData {
  const t = translator(ctx.tr, 'priorities.xml');
  const metaByName = new Map(metatypes.map((m) => [m.name, m]));
  const qualityByName = new Map(qualities.map((q) => [q.name, q]));
  const skillIdByName = new Map(skills.skills.map((s) => [s.name, s.id]));
  const groupIds = new Set(skills.groups.map((g) => g.id));

  const emptyRow = (letter: PriorityLetter): PriorityRow => ({
    letter, metatypes: [], talents: [], attributePoints: 0, skillPoints: 0, skillGroupPoints: 0,
    resources: { standard: 0, primeRunner: 0, streetLevel: 0 },
  });
  const rows: Record<PriorityLetter, PriorityRow> = {
    A: emptyRow('A'), B: emptyRow('B'), C: emptyRow('C'), D: emptyRow('D'), E: emptyRow('E'),
  };

  for (const p of arr(load(ctx, 'priorities.xml').priorities.priority)) {
    const letter = text(p.value) as PriorityLetter;
    const row = rows[letter];
    if (!row) continue;

    switch (text(p.category)) {
      case 'Heritage':
        for (const m of arr(p.metatypes?.metatype)) {
          const meta = metaByName.get(text(m.name));
          if (!meta) continue; // metatipo de livro não incluído
          const variantByName = new Map(meta.metavariants.map((v) => [v.name, v]));
          row.metatypes.push({
            metatypeId: meta.id,
            specialPoints: num(m.value),
            karmaCost: num(m.karma),
            metavariants: arr(m.metavariants?.metavariant).flatMap((v: XNode) => {
              const mv = variantByName.get(text(v.name));
              return mv ? [{ metavariantId: mv.id, specialPoints: num(v.value), karmaCost: num(v.karma) }] : [];
            }),
          } satisfies PriorityMetatypeOption);
        }
        break;

      case 'Talent':
        for (const tal of arr(p.talents?.talent)) {
          const option = toTalent(tal, metaByName, qualityByName, skillIdByName, groupIds, t);
          if (option) row.talents.push(option);
        }
        break;

      case 'Attributes':
        row.attributePoints = num(p.attributes);
        break;

      case 'Skills':
        row.skillPoints = num(p.skills);
        row.skillGroupPoints = num(p.skillgroups);
        break;

      case 'Resources': {
        const table = TABLE_KEYS[text(p.prioritytable)];
        if (table) row.resources[table] = num(p.resources);
        break;
      }
    }
  }

  return { letters: LETTERS, rows };
}

function toTalent(
  tal: XNode,
  metaByName: Map<string, Metatype>,
  qualityByName: Map<string, Quality>,
  skillIdByName: Map<string, string>,
  groupIds: Set<string>,
  t: (name: string, id?: string) => string | undefined,
): TalentOption | null {
  const value = text(tal.value);
  const key = TALENT_KEYS[value];
  if (!key) return null;

  // Talento que concede qualidade de livro não incluído → fora.
  const qualityName = text(arr(tal.qualities?.quality)[0]);
  const quality = qualityName ? qualityByName.get(qualityName) : undefined;
  if (qualityName && !quality) return null;

  const metaIds = (bucket: XNode) => arr(bucket?.oneof?.metatype).map(text).map((n: string) => metaByName.get(n)?.id).filter(Boolean) as string[];
  const requiredNames = arr(tal.required?.oneof?.metatype).map(text);
  const requiredMetatypeIds = metaIds(tal.required);
  // Exige metatipo que não está nos livros incluídos (ex.: A.I.) → fora.
  if (requiredNames.length > 0 && requiredMetatypeIds.length === 0) return null;

  const option: TalentOption = {
    key,
    name: text(tal.name),
    namePt: t(text(tal.name)),
    ...(quality ? { qualityId: quality.id } : {}),
    forbiddenMetatypeIds: metaIds(tal.forbidden),
    requiredMetatypeIds,
    requiredMetatypeCategories: arr(tal.required?.oneof?.metatypecategory).map(text),
  };
  if (has(tal.magic)) option.magic = num(tal.magic);
  if (has(tal.resonance)) option.resonance = num(tal.resonance);
  if (has(tal.depth)) option.depth = num(tal.depth);
  if (has(tal.spells)) option.freeSpells = num(tal.spells);
  if (has(tal.cfp)) option.freeComplexForms = num(tal.cfp);

  // O Chummer às vezes declara "1 perícia/grupo nível 0" (sem efeito): ignoramos.
  if (has(tal.skillqty) && num(tal.skillval) > 0) {
    const type = text(tal.skilltype);
    const kind = type === 'xpath' ? 'nonMagicActive' : (type as 'magic' | 'resonance' | 'specific' | 'matrix');
    option.freeSkills = {
      count: num(tal.skillqty),
      rating: num(tal.skillval),
      kind,
      ...(kind === 'specific'
        ? { choices: arr(tal.skillchoices?.skill).map(text).map((n: string) => skillIdByName.get(n)).filter(Boolean) as string[] }
        : {}),
    };
  }
  if (has(tal.skillgroupqty) && num(tal.skillgroupval) > 0) {
    option.freeSkillGroup = {
      count: num(tal.skillgroupqty),
      rating: num(tal.skillgroupval),
      choices: arr(tal.skillgroupchoices?.skillgroup).map(text).map(slug).filter((g: string) => groupIds.has(g)),
    };
  }
  return option;
}

// ---------------------------------------------------------------------------
// Contatos

export function convertContacts(ctx: Ctx): ContactArchetype[] {
  const t = translator(ctx.tr, 'contacts.xml');
  return arr(load(ctx, 'contacts.xml').contacts.contact).map((c: XNode) => ({
    id: slug(text(c)),
    name: text(c),
    namePt: t(text(c)),
  }));
}

// ---------------------------------------------------------------------------
// Magia e Ressonância

function convertTraditionsFile(ctx: Ctx, file: string): Tradition[] {
  const t = translator(ctx.tr, file);
  return arr(load(ctx, file).traditions.tradition)
    .filter((x: XNode) => inBooks(ctx, x) && text(x.name) !== 'Custom')
    .map((x: XNode) => {
      const s = x.spirits && typeof x.spirits === 'object' ? x.spirits : {};
      return {
        id: text(x.id),
        name: text(x.name),
        namePt: t(text(x.name), text(x.id)),
        source: text(x.source),
        page: page(x),
        drain: text(x.drain),
        ...(has(s.spiritcombat) ? { spiritCombat: text(s.spiritcombat) } : {}),
        ...(has(s.spiritdetection) ? { spiritDetection: text(s.spiritdetection) } : {}),
        ...(has(s.spirithealth) ? { spiritHealth: text(s.spirithealth) } : {}),
        ...(has(s.spiritillusion) ? { spiritIllusion: text(s.spiritillusion) } : {}),
        ...(has(s.spiritmanipulation) ? { spiritManipulation: text(s.spiritmanipulation) } : {}),
      };
    });
}

export const convertTraditions = (ctx: Ctx) => convertTraditionsFile(ctx, 'traditions.xml');
export const convertStreams = (ctx: Ctx) => convertTraditionsFile(ctx, 'streams.xml');

export function convertSpells(ctx: Ctx): Spell[] {
  const t = translator(ctx.tr, 'spells.xml');
  return arr(load(ctx, 'spells.xml').spells.spell)
    .filter((x: XNode) => inBooks(ctx, x) && notHidden(x))
    .map((x: XNode) => ({
      id: text(x.id),
      name: text(x.name),
      namePt: t(text(x.name), text(x.id)),
      source: text(x.source),
      page: page(x),
      category: text(x.category),
      categoryPt: t(text(x.category)),
      type: text(x.type),
      range: text(x.range),
      damage: text(x.damage),
      duration: text(x.duration),
      dv: text(x.dv),
      descriptors: text(x.descriptor).split(',').map((d) => d.trim()).filter(Boolean),
    }));
}

export function convertPowers(ctx: Ctx): AdeptPower[] {
  const t = translator(ctx.tr, 'powers.xml');
  return arr(load(ctx, 'powers.xml').powers.power)
    .filter((x: XNode) => inBooks(ctx, x) && notHidden(x))
    .map((x: XNode) => ({
      id: text(x.id),
      name: text(x.name),
      namePt: t(text(x.name), text(x.id)),
      source: text(x.source),
      page: page(x),
      points: num(x.points),
      levels: bool(x.levels),
      maxLevels: has(x.maxlevels) ? num(x.maxlevels) : null,
      ...(has(x.extrapointcost) && num(x.extrapointcost) > 0 ? { extraPointCost: num(x.extrapointcost) } : {}),
      ...(has(x.action) ? { action: text(x.action) } : {}),
    }));
}

export function convertComplexForms(ctx: Ctx): ComplexForm[] {
  const t = translator(ctx.tr, 'complexforms.xml');
  return arr(load(ctx, 'complexforms.xml').complexforms.complexform)
    .filter((x: XNode) => inBooks(ctx, x) && notHidden(x))
    .map((x: XNode) => ({
      id: text(x.id),
      name: text(x.name),
      namePt: t(text(x.name), text(x.id)),
      source: text(x.source),
      page: page(x),
      target: text(x.target),
      duration: text(x.duration),
      fv: text(x.fv),
    }));
}

export function convertMentors(ctx: Ctx): Mentor[] {
  const t = translator(ctx.tr, 'mentors.xml');
  // Só nome/livro/página: as descrições de vantagens do Chummer resumem o livro; escreveremos as nossas.
  return arr(load(ctx, 'mentors.xml').mentors.mentor)
    .filter((x: XNode) => inBooks(ctx, x) && notHidden(x))
    .map((x: XNode) => ({
      id: text(x.id),
      name: text(x.name),
      namePt: t(text(x.name), text(x.id)),
      source: text(x.source),
      page: page(x),
      category: text(x.category),
    }));
}

// ---------------------------------------------------------------------------
// Equipamento

export function parseAvail(raw: string): Availability {
  const m = /^\+?(\d+)\s*([RF])?$/.exec(raw.trim());
  return m
    ? { raw, value: Number(m[1]), restriction: (m[2] as 'R' | 'F' | undefined) ?? null }
    : { raw, value: null, restriction: null };
}

export function parseCost(raw: string): Cost {
  const v = Number(raw.trim());
  return { raw, value: raw.trim() !== '' && Number.isFinite(v) ? v : null };
}

function gearBase(ctx: Ctx, x: XNode, t: (n: string, id?: string) => string | undefined): GearItem {
  return {
    id: text(x.id),
    name: text(x.name),
    namePt: t(text(x.name), text(x.id)),
    source: text(x.source),
    page: page(x),
    category: text(x.category),
    categoryPt: t(text(x.category)),
    cost: parseCost(text(x.cost)),
    avail: parseAvail(text(x.avail)),
    ...(has(x.rating) && num(x.rating) > 0 ? { rating: num(x.rating) } : {}),
  };
}

function gearList<T>(ctx: Ctx, file: string, listKey: string, itemKey: string, extra: (x: XNode) => Omit<T, keyof GearItem>): T[] {
  const t = translator(ctx.tr, file);
  return arr(load(ctx, file)[listKey]?.[itemKey])
    .filter((x: XNode) => inBooks(ctx, x) && notHidden(x))
    .map((x: XNode) => ({ ...gearBase(ctx, x, t), ...extra(x) }) as T);
}

export const convertGear = (ctx: Ctx) => gearList<GearItem>(ctx, 'gear.xml', 'gears', 'gear', () => ({}));

export const convertWeapons = (ctx: Ctx) =>
  gearList<Weapon>(ctx, 'weapons.xml', 'weapons', 'weapon', (x) => ({
    damage: text(x.damage),
    ap: text(x.ap),
    mode: text(x.mode),
    accuracy: text(x.accuracy),
    ...(has(x.reach) && num(x.reach) !== 0 ? { reach: num(x.reach) } : {}),
    ...(has(x.rc) ? { rc: text(x.rc) } : {}),
    ...(has(x.ammo) ? { ammo: text(x.ammo) } : {}),
  }));

export const convertArmor = (ctx: Ctx) =>
  gearList<Armor>(ctx, 'armor.xml', 'armors', 'armor', (x) => ({ armor: text(x.armor) }));

const augmentation = (x: XNode) => ({
  essence: parseCost(text(x.ess)),
  ...(has(x.rating) && num(x.rating) > 0 ? { maxRating: num(x.rating) } : {}),
});

export const convertCyberware = (ctx: Ctx) => gearList<Augmentation>(ctx, 'cyberware.xml', 'cyberwares', 'cyberware', augmentation);
export const convertBioware = (ctx: Ctx) => gearList<Augmentation>(ctx, 'bioware.xml', 'biowares', 'bioware', augmentation);

export function convertLifestyles(ctx: Ctx): Lifestyle[] {
  const t = translator(ctx.tr, 'lifestyles.xml');
  return arr(load(ctx, 'lifestyles.xml').lifestyles.lifestyle)
    .filter((x: XNode) => inBooks(ctx, x) && notHidden(x))
    .map((x: XNode) => ({
      id: text(x.id),
      name: text(x.name),
      namePt: t(text(x.name), text(x.id)),
      source: text(x.source),
      page: page(x),
      cost: num(x.cost),
      dice: num(x.dice),
      multiplier: num(x.multiplier),
    }));
}

// ---------------------------------------------------------------------------
// Configurações de criação (perfil Standard do settings.xml)

export function convertSettings(ctx: Ctx, profile = 'Standard'): CreationSettings {
  const s = arr(load(ctx, 'settings.xml').settings.setting).find((x: XNode) => text(x.name) === profile);
  if (!s) throw new Error(`Perfil "${profile}" não encontrado em settings.xml`);
  const k = s.karmacost;
  return {
    name: text(s.name),
    books: [...ctx.books],
    priorityTable: TABLE_KEYS[text(s.prioritytable)] ?? 'standard',
    startingKarma: num(s.buildpoints),
    qualityKarmaLimit: num(s.qualitykarmalimit),
    maxKarmaToNuyen: num(s.nuyenmaxbp),
    nuyenPerKarma: 2000, // vem de chargenkarmatonuyenexpression: {Karma} * 2000 + {PriorityNuyen}
    maxAvailability: num(s.availability),
    // MaxNumberMaxAttributesCreate: não está no XML; o padrão do Chummer é 1.
    maxAttributesAtMax: 1,
    // Regra do livro básico aplicada no código do Chummer (não está no XML).
    maxSkillRating: 6,
    maxSkillRatingWithAptitude: 7,
    contactPointsExpr: text(s.contactpointsexpression),
    knowledgePointsExpr: text(s.knowledgepointsexpression),
    bannedWareGrades: arr(s.bannedwaregrades?.grade).map(text),
    initiativeDice: { min: num(s.mininitiativedice), max: num(s.maxinitiativedice) },
    karmaCosts: {
      attribute: num(k.karmaattribute),
      quality: num(k.karmaquality),
      specialization: num(k.karmaspecialization),
      newKnowledgeSkill: num(k.karmanewknowledgeskill),
      newActiveSkill: num(k.karmanewactiveskill),
      newSkillGroup: num(k.karmanewskillgroup),
      improveKnowledgeSkill: num(k.karmaimproveknowledgeskill),
      improveActiveSkill: num(k.karmaimproveactiveskill),
      improveSkillGroup: num(k.karmaimproveskillgroup),
      spell: num(k.karmaspell),
      newComplexForm: num(k.karmanewcomplexform),
      contact: num(k.karmacontact),
      carryover: num(k.karmacarryover),
      mysticAdeptPowerPoint: num(k.karmamysadpp),
    },
  };
}
