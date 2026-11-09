import { describe, expect, it } from 'vitest';
import fixture from './fixtures/ficha-valida.json';
import { createEmptyDraft } from '../character';
import { exportFilename, exportJson, INVALID_FILE, parseImport } from '../io';
import { evaluate, isComplete } from '../rules';

describe('export JSON', () => {
  it('tem o envelope do app e a data', () => {
    const out = JSON.parse(exportJson(createEmptyDraft(), new Date('2026-05-01T12:00:00Z')));
    expect(out).toMatchObject({ app: 'fixer-sr5', format: 1, exportedAt: '2026-05-01T12:00:00.000Z' });
    expect(out.draft).toEqual(createEmptyDraft());
  });

  it('exportar e importar devolve a mesma ficha', () => {
    const draft = parseImport(JSON.stringify(fixture));
    expect(parseImport(exportJson(draft))).toEqual(draft);
  });

  it('nome do arquivo usa o codinome, sem acentos', () => {
    const d = createEmptyDraft();
    expect(exportFilename(d)).toBe('personagem.json');
    d.concept.name = 'João da Silva';
    expect(exportFilename(d)).toBe('joao-da-silva.json');
    d.concept.alias = 'Ágil & Rápido!';
    expect(exportFilename(d)).toBe('agil-rapido.json');
    d.concept.alias = '***';
    expect(exportFilename(d)).toBe('personagem.json');
  });
});

describe('import JSON', () => {
  it('aceita a ficha sem o envelope', () => {
    expect(parseImport(JSON.stringify(fixture.draft))).toEqual(parseImport(JSON.stringify(fixture)));
  });

  it.each([
    ['texto que não é JSON', 'olá'],
    ['número', '42'],
    ['null', 'null'],
    ['envelope sem ficha', '{"draft": null}'],
  ])('recusa %s com mensagem amigável', (_, text) => {
    expect(() => parseImport(text)).toThrow(INVALID_FILE);
  });

  it('avisa quando a versão da ficha não é suportada', () => {
    expect(() => parseImport('{"draft": {"schemaVersion": 99}}')).toThrow('Versão de ficha não suportada.');
  });
});

describe('fixture usada nos testes E2E', () => {
  it('é uma ficha completa, sem erros de regra', () => {
    const r = evaluate(parseImport(JSON.stringify(fixture)));
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(isComplete(r)).toBe(true);
  });
});
