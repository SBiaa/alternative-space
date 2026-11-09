// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyDraft, DRAFT_SCHEMA_VERSION } from '../sr5/character';

const KEY = 'fixer:sr5:draft';

/** A store guarda estado no módulo: cada teste carrega uma cópia nova. */
async function freshStore() {
  vi.resetModules();
  return import('../store');
}

const saved = () => JSON.parse(localStorage.getItem(KEY)!);

beforeEach(() => localStorage.clear());

describe('normalizeDraft', () => {
  it('lixo vira ficha vazia', async () => {
    const { normalizeDraft } = await freshStore();
    expect(normalizeDraft(null)).toEqual(createEmptyDraft());
    expect(normalizeDraft('texto')).toEqual(createEmptyDraft());
  });

  it('completa campos que faltam em fichas antigas', async () => {
    const { normalizeDraft } = await freshStore();
    const d = normalizeDraft({ schemaVersion: DRAFT_SCHEMA_VERSION, concept: { name: 'Agulha' } });
    expect(d.concept.name).toBe('Agulha');
    expect(d.attributes.BOD).toEqual({ points: 0, karma: 0 });
    expect(d.magic.spellIds).toEqual([]);
    expect(d.contacts).toEqual([]);
  });

  it('mantém o que já existe nos objetos aninhados', async () => {
    const { normalizeDraft } = await freshStore();
    const d = normalizeDraft({
      schemaVersion: DRAFT_SCHEMA_VERSION,
      attributes: { BOD: { points: 4, karma: 1 } },
    });
    expect(d.attributes.BOD).toEqual({ points: 4, karma: 1 });
    expect(d.attributes.AGI).toEqual({ points: 0, karma: 0 });
  });

  it('recusa versão de ficha desconhecida', async () => {
    const { normalizeDraft } = await freshStore();
    expect(() => normalizeDraft({ schemaVersion: 999 })).toThrow('Versão de ficha não suportada.');
  });
});

describe('carregar do localStorage', () => {
  it('sem nada salvo, começa vazio no passo 0', async () => {
    const { getStateForTests } = await storeWithSnapshot();
    expect(getStateForTests()).toEqual({ draft: createEmptyDraft(), step: 0 });
  });

  it('lê a ficha e o passo salvos', async () => {
    const draft = { ...createEmptyDraft(), concept: { name: 'Agulha' } };
    localStorage.setItem(KEY, JSON.stringify({ draft, step: 3 }));
    const { getStateForTests } = await storeWithSnapshot();
    expect(getStateForTests()).toEqual({ draft, step: 3 });
  });

  it('JSON corrompido não quebra: começa do zero', async () => {
    localStorage.setItem(KEY, '{não é json');
    const { getStateForTests } = await storeWithSnapshot();
    expect(getStateForTests()).toEqual({ draft: createEmptyDraft(), step: 0 });
  });
});

describe('alterações', () => {
  it('updateDraft salva no localStorage', async () => {
    const { updateDraft } = await freshStore();
    updateDraft((d) => {
      d.concept.name = 'Agulha';
    });
    expect(saved().draft.concept.name).toBe('Agulha');
  });

  it('updateDraft trabalha numa cópia (não muta o estado anterior)', async () => {
    const { updateDraft, getStateForTests } = await storeWithSnapshot();
    const before = getStateForTests().draft;
    updateDraft((d) => {
      d.attributes.BOD.points = 5;
    });
    expect(before.attributes.BOD.points).toBe(0);
    expect(getStateForTests().draft.attributes.BOD.points).toBe(5);
  });

  it('setStep, replaceDraft e resetDraft', async () => {
    const { setStep, replaceDraft, resetDraft } = await freshStore();
    setStep(4);
    expect(saved().step).toBe(4);

    const other = { ...createEmptyDraft(), concept: { name: 'Outro' } };
    replaceDraft(other);
    expect(saved()).toEqual({ draft: other, step: 0 });

    resetDraft();
    expect(saved()).toEqual({ draft: createEmptyDraft(), step: 0 });
  });

  it('uid gera ids curtos e diferentes', async () => {
    const { uid } = await freshStore();
    const ids = new Set(Array.from({ length: 50 }, uid));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{1,8}$/);
  });
});

describe('trocar onde a ficha é salva', () => {
  const memory = (initial: { draft: ReturnType<typeof createEmptyDraft>; step: number }) => {
    const saves: unknown[] = [];
    return { saves, persistence: { load: () => initial, save: (s: unknown) => saves.push(s), dispose: vi.fn() } };
  };

  it('bindStore passa a ler e gravar no lugar novo, sem tocar no localStorage', async () => {
    const { bindStore, updateDraft, getStateForTests } = await storeWithSnapshot();
    const initial = { draft: { ...createEmptyDraft(), concept: { name: 'Da conta' } }, step: 4 };
    const m = memory(initial);
    bindStore('cloud:1', () => m.persistence);

    expect(getStateForTests()).toEqual(initial);
    updateDraft((d) => {
      d.concept.name = 'Mudou';
    });
    expect(m.saves).toHaveLength(1);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('mesma chave não recria; chave nova grava o pendente da anterior', async () => {
    const { bindStore } = await freshStore();
    const a = memory({ draft: createEmptyDraft(), step: 0 });
    const make = vi.fn(() => a.persistence);
    bindStore('cloud:1', make);
    bindStore('cloud:1', make);
    expect(make).toHaveBeenCalledTimes(1);

    bindStore('cloud:2', () => memory({ draft: createEmptyDraft(), step: 0 }).persistence);
    expect(a.persistence.dispose).toHaveBeenCalled();
  });

  it('unbindStore faz a mesma chave recarregar do servidor na volta', async () => {
    const { bindStore, unbindStore } = await freshStore();
    const make = vi.fn(() => memory({ draft: createEmptyDraft(), step: 0 }).persistence);
    bindStore('cloud:1', make);
    unbindStore('cloud:1');
    bindStore('cloud:1', make);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it('bindLocalStore volta a usar o localStorage', async () => {
    const { bindStore, bindLocalStore, updateDraft } = await freshStore();
    bindStore('cloud:1', () => memory({ draft: createEmptyDraft(), step: 0 }).persistence);
    bindLocalStore();
    updateDraft((d) => {
      d.concept.name = 'Local';
    });
    expect(saved().draft.concept.name).toBe('Local');
  });

  it('readLocalState e clearLocalState', async () => {
    const { readLocalState, clearLocalState } = await freshStore();
    expect(readLocalState()).toBeNull();
    const draft = { ...createEmptyDraft(), concept: { name: 'Agulha' } };
    localStorage.setItem(KEY, JSON.stringify({ draft, step: 2 }));
    expect(readLocalState()).toEqual({ draft, step: 2 });
    clearLocalState();
    expect(readLocalState()).toBeNull();
  });
});

/** Lê o estado atual pela mesma via que o React usa (useSyncExternalStore). */
async function storeWithSnapshot() {
  const store = await freshStore();
  const { renderHook } = await import('@testing-library/react');
  const getStateForTests = () => renderHook(() => store.useWizard()).result.current!;
  return { ...store, getStateForTests };
}
