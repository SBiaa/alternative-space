/**
 * Junta todos os JSONs de content/fichas/sr5 num único objeto tipado.
 * O motor de regras recebe esse objeto como parâmetro (facilita testes e
 * permite trocar a lista de livros no futuro).
 */
import type {
  AdeptPower,
  Armor,
  Augmentation,
  Book,
  ComplexForm,
  ContactArchetype,
  CreationSettings,
  DataMeta,
  Echo,
  ItemMod,
  MartialArt,
  Metamagic,
  Program,
  Spirit,
  Vehicle,
  GearItem,
  Lifestyle,
  LifestyleQuality,
  City,
  Mentor,
  Metatype,
  PriorityData,
  Quality,
  SkillData,
  Spell,
  Tradition,
  Weapon,
} from './types';

import armor from '../../../../content/fichas/sr5/armor.json';
import bioware from '../../../../content/fichas/sr5/bioware.json';
import books from '../../../../content/fichas/sr5/books.json';
import complexforms from '../../../../content/fichas/sr5/complexforms.json';
import contacts from '../../../../content/fichas/sr5/contacts.json';
import cyberware from '../../../../content/fichas/sr5/cyberware.json';
import gear from '../../../../content/fichas/sr5/gear.json';
import lifestyles from '../../../../content/fichas/sr5/lifestyles.json';
import lifestyleQualities from '../../../../content/fichas/sr5/lifestylequalities.json';
import cities from '../../../../content/fichas/sr5/cities.json';
import mentors from '../../../../content/fichas/sr5/mentors.json';
import meta from '../../../../content/fichas/sr5/meta.json';
import metatypes from '../../../../content/fichas/sr5/metatypes.json';
import powers from '../../../../content/fichas/sr5/powers.json';
import priorities from '../../../../content/fichas/sr5/priorities.json';
import qualities from '../../../../content/fichas/sr5/qualities.json';
import settings from '../../../../content/fichas/sr5/settings.json';
import skills from '../../../../content/fichas/sr5/skills.json';
import spells from '../../../../content/fichas/sr5/spells.json';
import streams from '../../../../content/fichas/sr5/streams.json';
import traditions from '../../../../content/fichas/sr5/traditions.json';
import weapons from '../../../../content/fichas/sr5/weapons.json';
import armormods from '../../../../content/fichas/sr5/armormods.json';
import echoes from '../../../../content/fichas/sr5/echoes.json';
import martialarts from '../../../../content/fichas/sr5/martialarts.json';
import metamagics from '../../../../content/fichas/sr5/metamagics.json';
import programs from '../../../../content/fichas/sr5/programs.json';
import spirits from '../../../../content/fichas/sr5/spirits.json';
import vehiclemods from '../../../../content/fichas/sr5/vehiclemods.json';
import vehicles from '../../../../content/fichas/sr5/vehicles.json';
import weaponaccessories from '../../../../content/fichas/sr5/weaponaccessories.json';

export interface Sr5Data {
  meta: DataMeta;
  books: Book[];
  settings: CreationSettings;
  priorities: PriorityData;
  metatypes: Metatype[];
  qualities: Quality[];
  skills: SkillData;
  contacts: ContactArchetype[];
  traditions: Tradition[];
  streams: Tradition[];
  spells: Spell[];
  powers: AdeptPower[];
  complexForms: ComplexForm[];
  mentors: Mentor[];
  lifestyles: Lifestyle[];
  lifestyleQualities: LifestyleQuality[];
  cities: City[];
  weapons: Weapon[];
  armor: Armor[];
  gear: GearItem[];
  cyberware: Augmentation[];
  bioware: Augmentation[];
  vehicles: Vehicle[];
  vehicleMods: ItemMod[];
  weaponAccessories: ItemMod[];
  armorMods: ItemMod[];
  programs: Program[];
  metamagics: Metamagic[];
  echoes: Echo[];
  spirits: Spirit[];
  martialArts: MartialArt[];
}

export const sr5Data: Sr5Data = {
  meta: meta as DataMeta,
  books: books as Book[],
  settings: settings as CreationSettings,
  priorities: priorities as unknown as PriorityData,
  metatypes: metatypes as unknown as Metatype[],
  qualities: qualities as unknown as Quality[],
  skills: skills as unknown as SkillData,
  contacts: contacts as ContactArchetype[],
  traditions: traditions as Tradition[],
  streams: streams as Tradition[],
  spells: spells as Spell[],
  powers: powers as AdeptPower[],
  complexForms: complexforms as ComplexForm[],
  mentors: mentors as Mentor[],
  lifestyles: lifestyles as Lifestyle[],
  lifestyleQualities: lifestyleQualities as LifestyleQuality[],
  cities: cities as City[],
  weapons: weapons as unknown as Weapon[],
  armor: armor as unknown as Armor[],
  gear: gear as unknown as GearItem[],
  cyberware: cyberware as unknown as Augmentation[],
  bioware: bioware as unknown as Augmentation[],
  vehicles: vehicles as unknown as Vehicle[],
  vehicleMods: vehiclemods as unknown as ItemMod[],
  weaponAccessories: weaponaccessories as unknown as ItemMod[],
  armorMods: armormods as unknown as ItemMod[],
  programs: programs as unknown as Program[],
  metamagics: metamagics as Metamagic[],
  echoes: echoes as Echo[],
  spirits: spirits as unknown as Spirit[],
  martialArts: martialarts as MartialArt[],
};

/** Nome para exibir: pt-BR quando houver, senão o original. */
export function label(x: { name: string; namePt?: string }): string {
  return x.namePt ?? x.name;
}
