/**
 * Tipos dos dados estáticos de Shadowrun 5ª edição.
 * Os JSONs em content/fichas/sr5 são gerados a partir dos XMLs do Chummer5a
 * pelo script scripts/build-data (npm run data:build).
 */

/** Código do livro de origem. "SR5" = livro básico. */
export type BookCode = string;

export type AttrKey =
  | 'BOD' | 'AGI' | 'REA' | 'STR' | 'CHA' | 'INT' | 'LOG' | 'WIL'
  | 'EDG' | 'MAG' | 'RES' | 'ESS';

export const PHYSICAL_ATTRS = ['BOD', 'AGI', 'REA', 'STR'] as const;
export const MENTAL_ATTRS = ['CHA', 'INT', 'LOG', 'WIL'] as const;
export const SPECIAL_ATTRS = ['EDG', 'MAG', 'RES'] as const;

export type PriorityLetter = 'A' | 'B' | 'C' | 'D' | 'E';
export type PriorityCategory = 'metatype' | 'talent' | 'attributes' | 'skills' | 'resources';
export type PriorityTableKey = 'standard' | 'primeRunner' | 'streetLevel';

export interface Sourced {
  id: string;
  source: BookCode;
  page: number;
}

export interface Named {
  /** Nome original (inglês), igual ao do Chummer. */
  name: string;
  /** Nome em pt-BR, quando houver tradução. */
  namePt?: string;
}

export interface Book extends Named {
  id: string;
  code: BookCode;
}

// ---------------------------------------------------------------------------
// Metatipos

export interface AttributeRange {
  min: number;
  max: number;
  /** Máximo aumentado (com ciberware, magia etc.). */
  aug: number;
}

export interface Movement {
  walk: number;
  run: number;
  sprint: number;
}

export interface MetatypeBonus {
  armor?: number;
  reach?: number;
  /** Acréscimo percentual no custo de estilo de vida (Troll: 100). */
  lifestyleCostPct?: number;
}

export interface Metavariant extends Sourced, Named {
  parentId: string;
  attributes: Record<AttrKey, AttributeRange>;
  racialQualityIds: string[];
  bonus: MetatypeBonus;
}

export interface Metatype extends Sourced, Named {
  category: string;
  categoryPt?: string;
  attributes: Record<AttrKey, AttributeRange>;
  initiative: { min: number; max: number; aug: number };
  movement: Movement;
  racialQualityIds: string[];
  bonus: MetatypeBonus;
  metavariants: Metavariant[];
}

// ---------------------------------------------------------------------------
// Prioridades

export type TalentKey =
  | 'magician' | 'mysticAdept' | 'adept' | 'aspectedMagician' | 'technomancer' | 'mundane'
  // Talentos fora do livro básico (ficam disponíveis se o livro for incluído):
  | 'aware' | 'explorer' | 'enchanter' | 'apprentice' | 'ai';

export interface FreeSkillGrant {
  count: number;
  rating: number;
  /**
   * magic = perícias mágicas; resonance = perícias de ressonância;
   * nonMagicActive = qualquer perícia ativa não mágica (adepto);
   * specific = uma lista fechada em `choices`; matrix = perícias de Matriz (A.I.).
   */
  kind: 'magic' | 'resonance' | 'nonMagicActive' | 'specific' | 'matrix';
  /** Ids de perícia, quando kind = specific. */
  choices?: string[];
}

export interface FreeSkillGroupGrant {
  count: number;
  rating: number;
  /** Ids de grupo de perícia. */
  choices: string[];
}

export interface TalentOption extends Named {
  key: TalentKey;
  /** Qualidade concedida (Mago, Adepto...). Ausente para Mundano. */
  qualityId?: string;
  magic?: number;
  resonance?: number;
  depth?: number;
  freeSpells?: number;
  freeComplexForms?: number;
  freeSkills?: FreeSkillGrant;
  freeSkillGroup?: FreeSkillGroupGrant;
  forbiddenMetatypeIds: string[];
  requiredMetatypeIds: string[];
  requiredMetatypeCategories: string[];
}

export interface PriorityMetatypeOption {
  metatypeId: string;
  /** Pontos de atributo especial (Edge, Magia, Ressonância). */
  specialPoints: number;
  /** Karma extra exigido (metavariantes/metassapientes). */
  karmaCost: number;
  metavariants: { metavariantId: string; specialPoints: number; karmaCost: number }[];
}

export interface PriorityRow {
  letter: PriorityLetter;
  metatypes: PriorityMetatypeOption[];
  talents: TalentOption[];
  attributePoints: number;
  skillPoints: number;
  skillGroupPoints: number;
  resources: Record<PriorityTableKey, number>;
}

export interface PriorityData {
  letters: PriorityLetter[];
  rows: Record<PriorityLetter, PriorityRow>;
}

// ---------------------------------------------------------------------------
// Perícias

export type SkillKind = 'active' | 'knowledge';

export interface SkillCategory extends Named {
  kind: SkillKind;
}

export type SkillSpec = Named;

export interface Skill extends Sourced, Named {
  attribute: AttrKey;
  category: string;
  /** Id do grupo de perícia, se fizer parte de um. */
  groupId?: string;
  /** Pode ser usada sem treino (defaulting). */
  canDefault: boolean;
  exotic: boolean;
  specs: SkillSpec[];
}

export interface SkillGroup extends Named {
  id: string;
  skillIds: string[];
}

/** Sugestões de perícias de conhecimento (o jogador também pode criar as suas). */
export interface KnowledgeSkillSuggestion extends Named {
  id: string;
  attribute: AttrKey;
  category: string;
  specs: SkillSpec[];
}

export interface SkillData {
  categories: SkillCategory[];
  groups: SkillGroup[];
  skills: Skill[];
  knowledgeSuggestions: KnowledgeSkillSuggestion[];
}

// ---------------------------------------------------------------------------
// Qualidades

export type Requirement =
  | { type: 'quality'; id: string; name: string }
  | { type: 'metatype'; id: string; name: string }
  | { type: 'metatypeCategory'; name: string }
  | { type: 'magicEnabled' }
  | { type: 'resonanceEnabled' }
  | { type: 'depthEnabled' }
  | { type: 'power'; name: string }
  | { type: 'bioware'; name: string }
  | { type: 'critterPower'; name: string }
  | { type: 'other'; tag: string; value?: string };

/** Grupo de requisitos: `oneOf` = basta um; `allOf` = todos. */
export interface RequirementGroup {
  oneOf: Requirement[];
  allOf: Requirement[];
}

export type QualityEffect =
  | { type: 'attributeMax'; attr: AttrKey; delta: number }
  | { type: 'chooseAttributeMax'; delta: number; exclude: AttrKey[] }
  | { type: 'chooseSkillMax'; delta: number }
  | { type: 'limit'; limit: 'physical' | 'mental' | 'social'; delta: number }
  | {
      type: 'conditionMonitor';
      /** physical/stun = caixas extras; overflow = excedente; threshold = caixas por −1; thresholdOffset = caixas ignoradas. */
      field: 'physical' | 'stun' | 'overflow' | 'threshold' | 'thresholdOffset';
      delta: number;
    }
  | { type: 'enableAttribute'; attr: AttrKey }
  | { type: 'notoriety'; delta: number }
  | { type: 'lifestyleCostPct'; delta: number }
  | { type: 'chooseText' }
  | { type: 'other'; tag: string };

export interface Quality extends Sourced, Named {
  kind: 'positive' | 'negative';
  /** Karma por nível. Positivo custa; negativo é o valor (positivo) que a qualidade concede. */
  karma: number;
  /** Quantas vezes/níveis pode ser escolhida. null = sem limite. */
  maxRating: number | null;
  /** Expressão original do Chummer quando não numérica (ex.: "{arm} - 1"). */
  limitExpr?: string;
  /** Conta no teto de 25 de karma em qualidades. */
  countsTowardLimit: boolean;
  /** Só pode vir pela tabela de prioridades (Mago, Adepto...). */
  onlyFromPriority: boolean;
  /** Só existe durante a criação. */
  chargenOnly: boolean;
  /** Não aparece na lista de escolha (ex.: Visão na Penumbra, que só vem do metatipo). */
  hidden: boolean;
  forbidden: RequirementGroup;
  required: RequirementGroup;
  effects: QualityEffect[];
}

// ---------------------------------------------------------------------------
// Magia e Ressonância

export interface Tradition extends Sourced, Named {
  /** Atributo de resistência a dreno, ex.: "{WIL} + {LOG}". */
  drain: string;
  spiritCombat?: string;
  spiritDetection?: string;
  spiritHealth?: string;
  spiritIllusion?: string;
  spiritManipulation?: string;
}

export interface Spell extends Sourced, Named {
  category: string;
  categoryPt?: string;
  type: string;
  range: string;
  damage: string;
  duration: string;
  dv: string;
  descriptors: string[];
}

export interface AdeptPower extends Sourced, Named {
  /** Custo em pontos de poder (por nível, se `levels`). */
  points: number;
  levels: boolean;
  maxLevels?: number | null;
  /** Custo fixo somado uma vez, além do custo por nível (ex.: Reflexos Melhorados +0,5). */
  extraPointCost?: number;
  action?: string;
}

export interface ComplexForm extends Sourced, Named {
  target: string;
  duration: string;
  fv: string;
}

export interface Mentor extends Sourced, Named {
  category: string;
}

// ---------------------------------------------------------------------------
// Equipamento (versão simples)

export interface Availability {
  raw: string;
  value: number | null;
  /** R = restrito, F = proibido. */
  restriction: 'R' | 'F' | null;
}

export interface Cost {
  raw: string;
  /** Valor numérico quando o custo é fixo. */
  value: number | null;
}

export interface GearItem extends Sourced, Named {
  category: string;
  categoryPt?: string;
  cost: Cost;
  avail: Availability;
  rating?: number;
}

export interface Weapon extends GearItem {
  damage: string;
  ap: string;
  mode: string;
  accuracy: string;
  reach?: number;
  rc?: string;
  ammo?: string;
}

export interface Armor extends GearItem {
  armor: string;
}

export interface Augmentation extends GearItem {
  /** Custo de Essência (pode ser expressão por nível, ex.: "FixedValues(2,3,5)"). */
  essence: Cost;
  maxRating?: number;
}

export interface Lifestyle extends Sourced, Named {
  cost: number;
  dice: number;
  multiplier: number;
}

export interface ContactArchetype extends Named {
  id: string;
}

// ---------------------------------------------------------------------------
// Configurações de criação (perfil "Standard" do Chummer)

export interface KarmaCosts {
  attribute: number;
  quality: number;
  specialization: number;
  newKnowledgeSkill: number;
  newActiveSkill: number;
  newSkillGroup: number;
  improveKnowledgeSkill: number;
  improveActiveSkill: number;
  improveSkillGroup: number;
  spell: number;
  newComplexForm: number;
  contact: number;
  carryover: number;
  mysticAdeptPowerPoint: number;
}

export interface CreationSettings {
  name: string;
  books: BookCode[];
  priorityTable: PriorityTableKey;
  startingKarma: number;
  qualityKarmaLimit: number;
  maxKarmaToNuyen: number;
  nuyenPerKarma: number;
  maxAvailability: number;
  maxAttributesAtMax: number;
  maxSkillRating: number;
  maxSkillRatingWithAptitude: number;
  contactPointsExpr: string;
  knowledgePointsExpr: string;
  bannedWareGrades: string[];
  initiativeDice: { min: number; max: number };
  karmaCosts: KarmaCosts;
}

// ---------------------------------------------------------------------------

export interface DataMeta {
  chummerCommit: string;
  books: BookCode[];
  counts: Record<string, number>;
}
