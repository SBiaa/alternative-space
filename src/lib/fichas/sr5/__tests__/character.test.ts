import { describe, expect, it } from 'vitest';
import { characterDisplayName, createEmptyDraft, isBlankDraft } from '../character';

describe('characterDisplayName', () => {
  it('prefere o codinome, depois o nome, depois "Sem nome"', () => {
    expect(characterDisplayName({ concept: { name: 'Ana', alias: 'Agulha' } })).toBe('Agulha');
    expect(characterDisplayName({ concept: { name: 'Ana', alias: '  ' } })).toBe('Ana');
    expect(characterDisplayName({ concept: { name: '' } })).toBe('Sem nome');
  });
});

describe('isBlankDraft', () => {
  it('ficha nova está em branco', () => {
    expect(isBlankDraft(createEmptyDraft())).toBe(true);
  });

  it('nome, metatipo ou prioridade já contam como ficha começada', () => {
    expect(isBlankDraft({ ...createEmptyDraft(), concept: { name: 'Ana' } })).toBe(false);
    expect(isBlankDraft({ ...createEmptyDraft(), metatypeId: 'x' })).toBe(false);
    expect(isBlankDraft({ ...createEmptyDraft(), priorities: { metatype: 'A' } })).toBe(false);
  });
});
