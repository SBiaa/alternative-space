/**
 * Regras da ficha em jogo (depois da criação). Funções puras, usadas no
 * servidor (validação) e na tela (exibição).
 */
import { sr5Data } from './data';
import { NUYEN_CARRYOVER, type RulesResult } from './rules';

/** Erro de validação com mensagem pronta para mostrar ao jogador. */
export class InputError extends Error {}

export const MAX_LEDGER_AMOUNT = 10_000_000;
export const MAX_REASON_LENGTH = 200;
export const MAX_NOTES_LENGTH = 20_000;
export const MAX_TITLE_LENGTH = 120;

/** Quanto passa da criação para o jogo: nuyen até 5.000¥, karma até 7. */
export function startingBalances(result: RulesResult): { nuyen: number; karma: number } {
  const carry = sr5Data.settings.karmaCosts.carryover;
  return {
    nuyen: Math.max(0, Math.min(result.budgets.nuyen.remaining, NUYEN_CARRYOVER)),
    karma: Math.max(0, Math.min(result.budgets.karma.remaining, carry)),
  };
}

export interface LedgerLike {
  kind: 'nuyen' | 'karma';
  amount: number;
}

/** Saldos atuais e karma total já ganho (karma de carreira). */
export function ledgerTotals(entries: LedgerLike[]): { nuyen: number; karma: number; karmaEarned: number } {
  let nuyen = 0;
  let karma = 0;
  let karmaEarned = 0;
  for (const e of entries) {
    if (e.kind === 'nuyen') nuyen += e.amount;
    else {
      karma += e.amount;
      if (e.amount > 0) karmaEarned += e.amount;
    }
  }
  return { nuyen, karma, karmaEarned };
}

export interface ConditionLimits {
  physical: number;
  stun: number;
  /** Caixas além do monitor físico antes da morte. */
  overflow: number;
  woundThreshold: number;
}

export function conditionLimits(result: RulesResult): ConditionLimits {
  const m = result.derived.monitors;
  return { physical: m.physical, stun: m.stun, overflow: m.overflow, woundThreshold: m.woundThreshold };
}

/** Dano físico vai até o monitor + transbordamento; atordoamento até o monitor. */
export function clampDamage(
  value: unknown,
  track: 'physical' | 'stun',
  limits: ConditionLimits,
): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;
  const max = track === 'physical' ? limits.physical + limits.overflow : limits.stun;
  return Math.min(Math.max(n, 0), max);
}

/** Penalidade nos testes: −1 a cada `woundThreshold` caixas, somando os dois monitores. */
export function woundModifier(physical: number, stun: number, limits: ConditionLimits): number {
  const t = Math.max(1, limits.woundThreshold);
  const p = Math.min(physical, limits.physical);
  return -(Math.floor(p / t) + Math.floor(stun / t));
}

export type ConditionState = 'ok' | 'unconscious' | 'dying' | 'dead';

export function conditionState(physical: number, stun: number, limits: ConditionLimits): ConditionState {
  if (physical >= limits.physical + limits.overflow) return 'dead';
  if (physical > limits.physical) return 'dying';
  if (physical >= limits.physical || stun >= limits.stun) return 'unconscious';
  return 'ok';
}

/** Valida um lançamento de nuyen/karma vindo do navegador. Lança InputError com mensagem pronta. */
export function parseLedgerInput(input: { kind: unknown; amount: unknown; reason: unknown }): {
  kind: 'nuyen' | 'karma';
  amount: number;
  reason: string;
} {
  const kind = input.kind === 'nuyen' || input.kind === 'karma' ? input.kind : null;
  if (!kind) throw new InputError('Escolha nuyen ou karma.');
  const amount = typeof input.amount === 'number' ? input.amount : Number(input.amount);
  if (!Number.isInteger(amount) || amount === 0) throw new InputError('Informe um valor inteiro diferente de zero.');
  if (Math.abs(amount) > MAX_LEDGER_AMOUNT) throw new InputError('Valor alto demais.');
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!reason) throw new InputError('Diga o motivo (ex.: "Pagamento da missão").');
  if (reason.length > MAX_REASON_LENGTH) throw new InputError(`Motivo com no máximo ${MAX_REASON_LENGTH} letras.`);
  return { kind, amount, reason };
}
