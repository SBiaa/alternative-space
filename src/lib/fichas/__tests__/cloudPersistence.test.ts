import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyDraft, type CharacterDraft } from '../sr5/character';
import type { SaveResult, Saver } from '../cloudPersistence';

async function fresh() {
  vi.resetModules();
  return import('../cloudPersistence');
}

const draft = (name: string): CharacterDraft => ({ ...createEmptyDraft(), concept: { name } });
const ok = (): SaveResult => ({ ok: true, savedAt: '2026-11-03T12:00:00.000Z' });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Um saver controlável: cada chamada fica pendente até `resolve`. */
function manualSaver() {
  const calls: { draft: CharacterDraft; step: number; resolve: (r: SaveResult) => void }[] = [];
  const save: Saver = (_id, d, step) => new Promise((resolve) => calls.push({ draft: d, step, resolve }));
  return { save, calls };
}

describe('autosave na conta', () => {
  it('load devolve a ficha que veio do servidor', async () => {
    const { createCloudPersistence } = await fresh();
    const initial = { draft: draft('Agulha'), step: 2 };
    const p = createCloudPersistence({ id: 'x', initial, save: vi.fn() });
    expect(p.load()).toBe(initial);
  });

  it('espera parar de editar e grava só a última versão', async () => {
    const { createCloudPersistence, hasUnsavedChanges } = await fresh();
    const save = vi.fn<Saver>().mockResolvedValue(ok());
    const p = createCloudPersistence({ id: 'x', initial: { draft: draft(''), step: 0 }, save, delay: 800 });

    p.save({ draft: draft('A'), step: 0 });
    vi.advanceTimersByTime(500);
    p.save({ draft: draft('AB'), step: 1 });
    expect(hasUnsavedChanges()).toBe(true);
    vi.advanceTimersByTime(799);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('x', draft('AB'), 1);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('mudança durante a gravação vira uma segunda gravação, nunca duas ao mesmo tempo', async () => {
    const { createCloudPersistence, hasUnsavedChanges } = await fresh();
    const { save, calls } = manualSaver();
    const p = createCloudPersistence({ id: 'x', initial: { draft: draft(''), step: 0 }, save, delay: 100 });

    p.save({ draft: draft('A'), step: 0 });
    await vi.advanceTimersByTimeAsync(100);
    expect(calls).toHaveLength(1);

    p.save({ draft: draft('AB'), step: 0 });
    await vi.advanceTimersByTimeAsync(100);
    expect(calls).toHaveLength(1); // espera a primeira terminar

    calls[0].resolve(ok());
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    expect(calls[1].draft.concept.name).toBe('AB');
    expect(hasUnsavedChanges()).toBe(true);

    calls[1].resolve(ok());
    await vi.advanceTimersByTimeAsync(0);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('se falhar, mostra o erro e tenta de novo sem perder a mudança', async () => {
    const { createCloudPersistence, hasUnsavedChanges } = await fresh();
    const save = vi
      .fn<Saver>()
      .mockResolvedValueOnce({ ok: false, error: 'Fora do ar' })
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValue(ok());
    const p = createCloudPersistence({ id: 'x', initial: { draft: draft(''), step: 0 }, save, delay: 10, retryDelay: 1000 });

    p.save({ draft: draft('A'), step: 0 });
    await vi.advanceTimersByTimeAsync(10);
    expect(save).toHaveBeenCalledTimes(1);
    expect(hasUnsavedChanges()).toBe(true);

    await vi.advanceTimersByTimeAsync(1000); // falha de rede
    expect(save).toHaveBeenCalledTimes(2);
    expect(hasUnsavedChanges()).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith('x', draft('A'), 0);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('dispose grava na hora o que estiver pendente', async () => {
    const { createCloudPersistence } = await fresh();
    const save = vi.fn<Saver>().mockResolvedValue(ok());
    const p = createCloudPersistence({ id: 'x', initial: { draft: draft(''), step: 0 }, save, delay: 10_000 });

    p.save({ draft: draft('A'), step: 3 });
    await expect(p.dispose!()).resolves.toBe(true);
    expect(save).toHaveBeenCalledWith('x', draft('A'), 3);

    await expect(p.dispose!()).resolves.toBe(true); // sem pendência: não grava de novo
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('dispose espera a gravação em andamento e avisa se falhou', async () => {
    const { createCloudPersistence } = await fresh();
    const { save, calls } = manualSaver();
    const p = createCloudPersistence({ id: 'x', initial: { draft: draft(''), step: 0 }, save, delay: 10 });

    p.save({ draft: draft('A'), step: 0 });
    await vi.advanceTimersByTimeAsync(10);
    let done: boolean | undefined;
    void Promise.resolve(p.dispose!()).then((r) => (done = r as boolean));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBeUndefined(); // ainda gravando

    calls[0].resolve({ ok: false, error: 'Fora do ar' });
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);
  });
});
