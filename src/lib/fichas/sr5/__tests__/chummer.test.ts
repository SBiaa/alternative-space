import { XMLParser } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import { chummerFilename, CHUMMER_VERSION, exportChummer } from '../chummer';
import { sr5Data } from '../data';
import { evaluate } from '../rules';
import { draft, ids, points } from '../rules/__tests__/helpers';

const parse = (xml: string) => new XMLParser({ ignoreAttributes: true, parseTagValue: false }).parse(xml).character;
const arr = <T,>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

let n = 0;
const guid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;

const sample = () =>
  draft((d) => {
    d.priorities = { metatype: 'D', talent: 'A', attributes: 'B', skills: 'C', resources: 'E' };
    d.metatypeId = ids.metatype('Human');
    d.talent = 'magician';
    d.concept = { name: 'Ana & "Cia" <1>', alias: 'Kestrel', role: 'Mago de rua' };
    points(d, { BOD: 2, AGI: 1 });
    d.magic.traditionId = ids.tradition('Hermetic');
    d.magic.spellIds = [sr5Data.spells[0].id];
    d.skills.push({ id: ids.skill('Pistols'), points: 4, karma: 0, specialization: { name: 'Semi-Automatics', paidWith: 'points' } });
    d.qualities.push({ id: ids.quality('Ambidextrous'), rating: 1 });
    d.contacts.push({ key: 'c', name: 'Fixer', connection: 3, loyalty: 2 });
    const gun = sr5Data.weapons.find((w) => w.avail.value !== null && w.avail.value <= 8 && w.cost.value)!;
    d.gear.push({ key: 'w', kind: 'weapon', itemId: gun.id, qty: 1 });
    const veh = sr5Data.vehicles.find((v) => v.drone && v.cost.value)!;
    d.gear.push({ key: 'v', kind: 'vehicle', itemId: veh.id, qty: 1 });
    const mart = sr5Data.martialArts.find((a) => a.techniques.length > 0)!;
    d.martialArts = [{ id: mart.id, techniques: [mart.techniques[0]] }];
    d.lifestyles.push({ id: ids.lifestyle('Street'), months: 1 });
  });

describe('exportChummer', () => {
  const d = sample();
  const xml = exportChummer(d, evaluate(d), { guid });
  const c = parse(xml);

  it('gera XML bem formado com a versão e as fontes', () => {
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(c.appversion).toBe(CHUMMER_VERSION);
    expect(c.gameedition).toBe('SR5');
    expect(c.buildmethod).toBe('Priority');
    expect(arr(c.sources.source)).toEqual(expect.arrayContaining(['SR5', 'R5', 'RG']));
  });

  it('escapa caracteres especiais do nome', () => {
    expect(xml).toContain('Ana &amp; &quot;Cia&quot; &lt;1&gt;');
    expect(c.name).toBe('Ana & "Cia" <1>');
    expect(c.alias).toBe('Kestrel');
  });

  it('exporta metatipo por id do Chummer e prioridades', () => {
    expect(c.metatype).toBe('Human');
    expect(c.metatypeid).toBe(ids.metatype('Human'));
    expect([c.prioritymetatype, c.priorityattributes, c.priorityspecial, c.priorityskills, c.priorityresources]).toEqual(['D', 'B', 'A', 'C', 'E']);
    expect(c.magician).toBe('True');
  });

  it('atributos: base, karma e valor total conferem com o motor de regras', () => {
    const r = evaluate(d);
    const bod = arr<Record<string, string>>(c.attributes.attribute).find((a) => a.name === 'BOD')!;
    expect(Number(bod.totalvalue)).toBe(r.attributes.BOD.value);
    expect(Number(bod.metatypemin) + Number(bod.base) + Number(bod.karma)).toBe(r.attributes.BOD.value);
    const mag = arr<Record<string, string>>(c.attributes.attribute).find((a) => a.name === 'MAG')!;
    expect(Number(mag.metatypemin) + Number(mag.base) + Number(mag.karma)).toBe(r.attributes.MAG.value);
  });

  it('perícia com especialização, qualidade, feitiço, tradição e contato', () => {
    const pistols = arr<Record<string, unknown>>(c.skills.skill).find((s) => s.name === 'Pistols')!;
    expect(pistols.suid).toBe(ids.skill('Pistols'));
    expect(pistols.base).toBe('4');
    expect((pistols.specs as { spec: { name: string } }).spec.name).toBe('Semi-Automatics');
    expect(arr<Record<string, string>>(c.qualities.quality)[0]).toMatchObject({ name: 'Ambidextrous', sourceid: ids.quality('Ambidextrous'), qualitytype: 'Positive' });
    expect(c.tradition.name).toBe('Hermetic');
    expect(c.spells.spell.sourceid).toBe(sr5Data.spells[0].id);
    expect(c.contacts.contact).toMatchObject({ name: 'Fixer', connection: '3', loyalty: '2' });
  });

  it('equipamento: arma, drone e arte marciais', () => {
    expect(c.weapons.weapon.sourceid).toBeTruthy();
    expect(c.vehicles.vehicle.body).toBeDefined();
    expect(c.martialarts.martialart.name).toBeTruthy();
    expect(c.lifestyles.lifestyle.name).toBe('Street');
  });

  it('cada item recebe um guid próprio', () => {
    const guids = [...xml.matchAll(/<guid>([^<]+)<\/guid>/g)].map((m) => m[1]);
    expect(guids.length).toBeGreaterThan(5);
    expect(new Set(guids).size).toBe(guids.length);
  });

  it('created marca modo carreira', () => {
    expect(c.created).toBe('False');
    expect(parse(exportChummer(d, evaluate(d), { created: true, guid })).created).toBe('True');
  });

  it('nome do arquivo', () => {
    expect(chummerFilename(d)).toBe('Kestrel.chum5');
    expect(chummerFilename(draft(() => {}))).toBe('Sem-nome.chum5');
  });
});
