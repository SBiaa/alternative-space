/**
 * Salva a ficha no banco enquanto a pessoa edita (autosave).
 * Espera `delay` ms sem mudanças, grava, e se falhar tenta de novo.
 * Nunca há duas gravações ao mesmo tempo: a mais nova espera a anterior.
 */
import { useSyncExternalStore } from 'react';
import type { Persistence, WizardState } from './store';
import type { CharacterDraft } from './sr5/character';

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string };
export type Saver = (id: string, draft: CharacterDraft, step: number) => Promise<SaveResult>;

export type SaveStatus =
  | { kind: 'saved'; at?: string }
  | { kind: 'pending' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string };

// Só existe um assistente aberto por vez, então o status é global.
let status: SaveStatus = { kind: 'saved' };
const listeners = new Set<() => void>();

function setStatus(next: SaveStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export function useSaveStatus(): SaveStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

/** Tem mudança que ainda não chegou no banco? */
export function hasUnsavedChanges(): boolean {
  return status.kind !== 'saved';
}

export function createCloudPersistence(opts: {
  id: string;
  initial: WizardState;
  save: Saver;
  delay?: number;
  retryDelay?: number;
}): Persistence {
  const { id, initial, save, delay = 800, retryDelay = 5000 } = opts;
  let latest: WizardState | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Gravação em andamento (inclui as mudanças que chegarem enquanto grava). */
  let running: Promise<void> | null = null;

  setStatus({ kind: 'saved' });

  function schedule(ms: number) {
    clearTimeout(timer);
    timer = setTimeout(flush, ms);
  }

  async function saveLoop() {
    while (latest) {
      const current = latest;
      latest = null;
      setStatus({ kind: 'saving' });

      let result: SaveResult;
      try {
        result = await save(id, current.draft, current.step);
      } catch {
        result = { ok: false, error: 'Sem conexão. Tentando de novo…' };
      }

      if (!result.ok) {
        latest ??= current; // não perde a mudança: tenta de novo depois
        setStatus({ kind: 'error', message: result.error });
        schedule(retryDelay);
        return;
      }
      if (!latest) setStatus({ kind: 'saved', at: result.savedAt });
      // Se mudou enquanto gravava, o laço grava de novo.
    }
  }

  function flush(): Promise<void> {
    clearTimeout(timer);
    if (running) return running; // a gravação em andamento pega a mudança nova no fim
    if (!latest) return Promise.resolve();
    running = saveLoop().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    load: () => initial,
    save(state) {
      latest = state;
      if (status.kind !== 'saving') setStatus({ kind: 'pending' });
      schedule(delay);
    },
    /** Grava agora. Resolve `true` se tudo chegou no banco. */
    async dispose() {
      await flush();
      return latest === null;
    },
  };
}
