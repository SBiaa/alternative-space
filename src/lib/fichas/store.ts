/**
 * Estado do assistente: a ficha em criação e o passo atual.
 * Uso nos componentes: `useWizard()` (React useSyncExternalStore).
 *
 * Onde a ficha é salva depende da página:
 * - visitante: localStorage do navegador (padrão);
 * - logado, em /fichas/[id]: banco, via `bindStore` (ver `cloudPersistence.ts`).
 * Os passos do assistente só chamam `updateDraft` e não sabem a diferença.
 */
import { useSyncExternalStore } from 'react';
import { createEmptyDraft, normalizeDraft, type CharacterDraft } from './sr5/character';

const KEY = 'fixer:sr5:draft';

export interface WizardState {
  draft: CharacterDraft;
  step: number;
}

/** Lugar onde a ficha é guardada. */
export interface Persistence {
  /** Estado inicial (chamado ao trocar de ficha ou na primeira leitura). */
  load(): WizardState;
  /** Chamado a cada mudança. Pode adiar a gravação (debounce). */
  save(state: WizardState): void;
  /** Grava o que estiver pendente (ao trocar de ficha ou sair da página). Pode ser chamado mais de uma vez. */
  dispose?(): void | Promise<boolean>;
}

export { normalizeDraft };

// ---------------------------------------------------------------------------
// localStorage

export function readLocalState(): WizardState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { draft: unknown; step?: number };
    return { draft: normalizeDraft(parsed.draft), step: parsed.step ?? 0 };
  } catch {
    /* ficha corrompida ou storage bloqueado */
    return null;
  }
}

export function clearLocalState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage bloqueado */
  }
  if (bound.key === LOCAL) {
    state = null;
    notify();
  }
}

const localPersistence: Persistence = {
  load: () => readLocalState() ?? { draft: createEmptyDraft(), step: 0 },
  save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage cheio ou bloqueado: segue só em memória */
    }
  },
};

// ---------------------------------------------------------------------------
// Estado

const LOCAL = 'local';
let bound: { key: string; persistence: Persistence } = { key: LOCAL, persistence: localPersistence };
let state: WizardState | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/**
 * Escolhe onde a ficha é salva. Idempotente pela `key`: pode ser chamado
 * durante a renderização (antes do assistente montar) sem efeito repetido.
 * `make` só roda quando a chave muda.
 */
export function bindStore(key: string, make: () => Persistence) {
  if (bound.key === key) return;
  bound.persistence.dispose?.();
  bound = { key, persistence: make() };
  state = null;
}

/**
 * A página da ficha `key` saiu da tela: a próxima `bindStore` com essa chave
 * recomeça do estado que vier do servidor, em vez de reaproveitar o da memória.
 */
export function unbindStore(key: string) {
  if (bound.key === key) bound = { key: '', persistence: bound.persistence };
}

/**
 * Grava já o que estiver pendente (ao sair da página do assistente).
 * Resolve `true` quando tudo foi salvo (no localStorage é imediato).
 */
export async function flushStore(): Promise<boolean> {
  return (await bound.persistence.dispose?.()) ?? true;
}

/** Volta para o localStorage (página do visitante). */
export function bindLocalStore() {
  bindStore(LOCAL, () => localPersistence);
}

function set(next: WizardState) {
  state = next;
  bound.persistence.save(next);
  notify();
}

function onStorage(e: StorageEvent) {
  // Outra aba mudou a ficha do navegador.
  if (e.key === KEY && bound.key === LOCAL) {
    state = null;
    notify();
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): WizardState {
  if (!state) state = bound.persistence.load();
  return state;
}

/** No servidor não há ficha: a tela mostra um carregando. */
const getServerSnapshot = (): WizardState | null => null;

export function useWizard(): WizardState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Altera a ficha. `fn` recebe uma cópia e pode mutá-la. */
export function updateDraft(fn: (d: CharacterDraft) => void) {
  const cur = getSnapshot();
  const draft = structuredClone(cur.draft);
  fn(draft);
  set({ ...cur, draft });
}

export function setStep(step: number) {
  set({ ...getSnapshot(), step });
}

export function replaceDraft(draft: CharacterDraft) {
  set({ draft, step: 0 });
}

export function resetDraft() {
  set({ draft: createEmptyDraft(), step: 0 });
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
