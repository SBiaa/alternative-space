/**
 * Estado da ficha em criação (o que o usuário escolheu).
 * É isso que vai para o localStorage e para o export JSON.
 * Tudo que dá para calcular a partir daqui fica no motor de regras.
 */
import type { PriorityCategory, PriorityLetter, PriorityTableKey, TalentKey } from './types';

export const DRAFT_SCHEMA_VERSION = 1 as const;

export type CoreAttr = 'BOD' | 'AGI' | 'REA' | 'STR' | 'CHA' | 'INT' | 'LOG' | 'WIL';
export type SpecialAttr = 'EDG' | 'MAG' | 'RES';

export const CORE_ATTRS: readonly CoreAttr[] = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL'];
export const SPECIAL_ATTR_KEYS: readonly SpecialAttr[] = ['EDG', 'MAG', 'RES'];
export const PRIORITY_CATEGORIES: readonly PriorityCategory[] = [
  'metatype',
  'talent',
  'attributes',
  'skills',
  'resources',
];

/** Quanto foi comprado acima do mínimo: com pontos da prioridade e com karma. */
export interface Alloc {
  points: number;
  karma: number;
}

export interface Specialization {
  name: string;
  /** Especialização custa 1 ponto de perícia (ou de conhecimento) ou 7 de karma. */
  paidWith: 'points' | 'karma';
}

export interface DraftSkill {
  id: string;
  points: number;
  karma: number;
  specialization?: Specialization;
}

export interface DraftSkillGroup {
  id: string;
  points: number;
  karma: number;
}

export type KnowledgeCategory = 'Academic' | 'Interest' | 'Language' | 'Professional' | 'Street';

export interface DraftKnowledge {
  /** Identificador local (o nome é livre). */
  key: string;
  name: string;
  category: KnowledgeCategory;
  /** Idioma nativo: não custa pontos e não tem nível. */
  native?: boolean;
  points: number;
  karma: number;
  specialization?: Specialization;
}

export interface DraftQuality {
  id: string;
  rating: number;
  /** Escolha da qualidade: atributo (Atributo Excepcional), id de perícia (Aptidão) ou texto livre. */
  choice?: string;
}

export interface DraftPower {
  id: string;
  level: number;
}

export interface DraftMagic {
  traditionId?: string;
  streamId?: string;
  mentorId?: string;
  spellIds: string[];
  complexFormIds: string[];
  powers: DraftPower[];
  /** Adepto Místico compra pontos de poder com karma. */
  powerPointsBought: number;
  /** Perícias gratuitas dadas pelo talento (ids de perícia). */
  freeSkillIds: string[];
  /** Grupo gratuito do Mago de Aspecto. */
  freeSkillGroupId?: string;
}

export interface DraftContact {
  key: string;
  name: string;
  archetypeId?: string;
  connection: number;
  loyalty: number;
}

export type GearKind = 'gear' | 'weapon' | 'armor' | 'cyberware' | 'bioware' | 'vehicle' | 'program';
export type WareGrade = 'standard' | 'alpha' | 'used';

/** Acessório de arma, modificação de armadura ou de veículo/drone instalado num item. */
export interface GearMod {
  key: string;
  kind: 'accessory' | 'armorMod' | 'vehicleMod';
  itemId: string;
  rating?: number;
  /** Preço informado à mão, para modificações de custo variável. */
  customCost?: number;
}

export interface DraftGear {
  key: string;
  kind: GearKind;
  itemId: string;
  qty: number;
  rating?: number;
  /** Só para ciberware/bioware. */
  grade?: WareGrade;
  /** Preço informado à mão, para itens de custo variável. */
  customCost?: number;
  /** Modificações instaladas (armas, armaduras, veículos e drones). */
  mods?: GearMod[];
  /** Programa: `key` do cyberdeck onde ele está carregado. */
  loadedIn?: string;
  /** Foco vinculado ao personagem (custa karma). */
  bonded?: boolean;
}

export interface DraftMartialArt {
  id: string;
  /** Nomes (originais) das técnicas aprendidas desse estilo. */
  techniques: string[];
}

export interface DraftEnemy {
  key: string;
  name: string;
  notes?: string;
}

/** Espírito ou sprite que o personagem conjurou/compilou. */
export interface Companion {
  key: string;
  spiritId: string;
  /** Força (espíritos) ou Nível (sprites). */
  force: number;
  services: number;
  bound: boolean;
  name?: string;
}

/** Evolução depois da criação: o que foi comprado com karma. */
export interface Improvement {
  key: string;
  kind: 'attribute' | 'skill' | 'skillGroup' | 'specialization' | 'quality' | 'spell' | 'complexForm' | 'initiation' | 'submersion' | 'martialArt' | 'other';
  /** Atributo, id de perícia, etc. */
  ref?: string;
  label: string;
  from?: number;
  to?: number;
  karma: number;
  at: string;
}

/** Veículo ou drone adquirido em jogo (não entra no orçamento da criação). */
export interface CareerVehicle {
  key: string;
  vehicleId: string;
  /** Apelido dado pelo jogador. */
  name?: string;
  /** Modificações, armas, dano, autosofts… em texto livre. */
  notes?: string;
}

/** Dados que só existem com o personagem em jogo (guardados dentro da ficha). */
export interface Career {
  initiationGrade: number;
  submersionGrade: number;
  metamagicIds: string[];
  echoIds: string[];
  companions: Companion[];
  improvements: Improvement[];
  vehicles?: CareerVehicle[];
}

export interface DraftLifestyleQuality {
  id: string;
  extra?: string;
}

export interface DraftLifestyle {
  id: string;
  /** 100 = permanente. */
  months: number;
  name?: string;
  roommates?: number;
  splitCost?: boolean;
  /** Quanto o personagem paga quando divide os custos (0–100). */
  percentage?: number;
  qualities?: DraftLifestyleQuality[];
  city?: string;
  district?: string;
  borough?: string;
}

export interface CharacterDraft {
  schemaVersion: typeof DRAFT_SCHEMA_VERSION;
  concept: { name: string; alias?: string; role?: string; notes?: string };
  priorities: Partial<Record<PriorityCategory, PriorityLetter>>;
  metatypeId?: string;
  talent?: TalentKey;
  attributes: Record<CoreAttr, Alloc>;
  special: Record<SpecialAttr, Alloc>;
  magic: DraftMagic;
  qualities: DraftQuality[];
  skills: DraftSkill[];
  skillGroups: DraftSkillGroup[];
  knowledge: DraftKnowledge[];
  contacts: DraftContact[];
  gear: DraftGear[];
  lifestyles: DraftLifestyle[];
  /** Karma trocado por nuyen (até 10, 2.000¥ cada). */
  karmaToNuyen: number;
  /** Regras da casa: mudam as configurações de criação só desta ficha. */
  options?: DraftOptions;
  martialArts?: DraftMartialArt[];
  enemies?: DraftEnemy[];
  career?: Career;
  /** Retrato pequeno (data URL), até ~60 KB. */
  portrait?: string;
}

export interface DraftOptions {
  priorityTable?: PriorityTableKey;
  startingKarma?: number;
  maxAvailability?: number;
}

export const MAX_PORTRAIT_LENGTH = 80_000;

export function emptyCareer(): Career {
  return { initiationGrade: 0, submersionGrade: 0, metamagicIds: [], echoIds: [], companions: [], improvements: [] };
}

const zero = (): Alloc => ({ points: 0, karma: 0 });

export function createEmptyDraft(): CharacterDraft {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    concept: { name: '' },
    priorities: {},
    attributes: {
      BOD: zero(), AGI: zero(), REA: zero(), STR: zero(),
      CHA: zero(), INT: zero(), LOG: zero(), WIL: zero(),
    },
    special: { EDG: zero(), MAG: zero(), RES: zero() },
    magic: {
      spellIds: [],
      complexFormIds: [],
      powers: [],
      powerPointsBought: 0,
      freeSkillIds: [],
    },
    qualities: [],
    skills: [],
    skillGroups: [],
    knowledge: [],
    contacts: [],
    gear: [],
    lifestyles: [],
    karmaToNuyen: 0,
    options: {},
    martialArts: [],
    enemies: [],
    career: emptyCareer(),
  };
}

/** Completa campos que faltam (fichas salvas por versões antigas). */
export function normalizeDraft(raw: unknown): CharacterDraft {
  const empty = createEmptyDraft();
  if (!raw || typeof raw !== 'object') return empty;
  const d = raw as Partial<CharacterDraft>;
  if (d.schemaVersion !== DRAFT_SCHEMA_VERSION) throw new Error('Versão de ficha não suportada.');
  return {
    ...empty,
    ...d,
    concept: { ...empty.concept, ...d.concept },
    attributes: { ...empty.attributes, ...d.attributes },
    special: { ...empty.special, ...d.special },
    magic: { ...empty.magic, ...d.magic },
    options: { ...d.options },
    martialArts: d.martialArts ?? [],
    enemies: d.enemies ?? [],
    career: { ...emptyCareer(), ...d.career },
  };
}

/** Nome para listas: codinome, senão nome, senão "Sem nome". */
export function characterDisplayName(draft: Pick<CharacterDraft, 'concept'>): string {
  return draft.concept.alias?.trim() || draft.concept.name?.trim() || 'Sem nome';
}

/** Ficha ainda sem nenhuma escolha (não vale a pena importar nem salvar). */
export function isBlankDraft(draft: CharacterDraft): boolean {
  return (
    !draft.concept.name?.trim() &&
    !draft.concept.alias?.trim() &&
    !draft.metatypeId &&
    Object.keys(draft.priorities).length === 0
  );
}
