import type { AttrKey, TalentKey } from '../types';

/** Passos do assistente. Cada problema aponta para o passo onde se resolve. */
export type StepKey =
  | 'concept'
  | 'priorities'
  | 'metatype'
  | 'attributes'
  | 'magic'
  | 'qualities'
  | 'skills'
  | 'resources'
  | 'contacts'
  | 'review';

export const STEP_ORDER: readonly StepKey[] = [
  'concept',
  'priorities',
  'metatype',
  'attributes',
  'magic',
  'qualities',
  'skills',
  'resources',
  'contacts',
  'review',
];

/**
 * error = regra quebrada, bloqueia avançar;
 * warning = permitido, mas provavelmente não é o que a pessoa quer (pontos sobrando etc.);
 * info = dica.
 */
export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  severity: Severity;
  /** Código estável para testes e para a UI (ex.: "attributes.overspent"). */
  code: string;
  step: StepKey;
  /** Texto em pt-BR, pronto para exibir. */
  message: string;
  /** Caminho no rascunho, quando o problema é de um item específico (ex.: "skills.3"). */
  path?: string;
}

export interface Budget {
  total: number;
  spent: number;
  remaining: number;
}

export type BudgetKey =
  | 'attributes'
  | 'special'
  | 'skills'
  | 'skillGroups'
  | 'knowledge'
  | 'contacts'
  | 'karma'
  | 'nuyen'
  | 'powerPoints'
  | 'freeSpells'
  | 'freeComplexForms'
  | 'freeSkills'
  | 'positiveQualities'
  | 'negativeQualities';

export interface AttributeState {
  /** Mínimo do metatipo (para MAG/RES, o valor dado pelo talento). */
  min: number;
  /** Máximo natural, já com qualidades (Sortudo, Atributo Excepcional). */
  max: number;
  /** Valor depois dos pontos, antes do karma. */
  base: number;
  value: number;
  /** Karma gasto neste atributo. */
  karma: number;
  atMax: boolean;
}

export interface Derived {
  limits: { physical: number; mental: number; social: number };
  initiative: { base: number; dice: number };
  astralInitiative?: { base: number; dice: number };
  matrixInitiative?: {
    ar: { base: number; dice: number };
    coldSim: { base: number; dice: number };
    hotSim: { base: number; dice: number };
  };
  monitors: {
    physical: number;
    stun: number;
    overflow: number;
    /** A cada quantas caixas o personagem sofre −1 nas paradas. */
    woundThreshold: number;
  };
  essence: number;
  /** Pontos de Magia/Ressonância perdidos por Essência gasta (arredondado para cima). */
  essenceMagicLoss: number;
  composure: number;
  judgeIntentions: number;
  memory: number;
  liftCarry: number;
  /** Atributo usado para resistir ao dreno/desvanecimento, quando houver. */
  drainResist?: number;
}

export interface Availability {
  ok: boolean;
  /** Por que não está disponível (pt-BR). */
  reason?: string;
}

export interface MetatypeAvailability extends Availability {
  /** Letras em que o metatipo aparece. */
  letters: string[];
  /** Pontos especiais na prioridade atual (se disponível). */
  specialPoints?: number;
}

export interface TalentAvailability extends Availability {
  letters: string[];
}

export interface RulesResult {
  budgets: Record<BudgetKey, Budget>;
  attributes: Record<AttrKey, AttributeState>;
  derived: Derived;
  /** Para onde foi o karma. Positivo = gasto; negativo = ganho. */
  karmaBreakdown: Record<string, number>;
  /** Nível final de cada perícia ativa escolhida (id → nível). */
  skillRatings: Record<string, number>;
  /** Nível final de cada grupo (id → nível). */
  groupRatings: Record<string, number>;
  issues: Issue[];
  availability: {
    metatypes: Record<string, MetatypeAvailability>;
    talents: Partial<Record<TalentKey, TalentAvailability>>;
    qualities: Record<string, Availability>;
    skills: Record<string, Availability>;
  };
}
