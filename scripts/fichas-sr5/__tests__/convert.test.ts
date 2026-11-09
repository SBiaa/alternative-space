import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertBooks, convertLifestyles, convertSpells, parseAvail, parseCost, type Ctx } from '../convert';
import { loadTranslations, translator } from '../i18n';

const fixtures = join(__dirname, 'fixtures');
const ctx = (books = ['SR5']): Ctx => ({
  dataDir: join(fixtures, 'data'),
  books: new Set(books),
  tr: loadTranslations(join(fixtures, 'lang/pt-br_data.xml')),
});

describe('parseAvail', () => {
  it.each([
    ['12R', { value: 12, restriction: 'R' }],
    ['6F', { value: 6, restriction: 'F' }],
    ['4', { value: 4, restriction: null }],
    ['+2', { value: 2, restriction: null }],
    ['Rating * 2', { value: null, restriction: null }],
    ['', { value: null, restriction: null }],
  ])('%j', (raw, expected) => {
    expect(parseAvail(raw)).toEqual({ raw, ...expected });
  });
});

describe('parseCost', () => {
  it('número vira valor; fórmula ou vazio vira null', () => {
    expect(parseCost('2500')).toEqual({ raw: '2500', value: 2500 });
    expect(parseCost('Rating * 100')).toEqual({ raw: 'Rating * 100', value: null });
    expect(parseCost('')).toEqual({ raw: '', value: null });
  });
});

describe('traduções', () => {
  const tr = loadTranslations(join(fixtures, 'lang/pt-br_data.xml'));

  it('separa por arquivo e acha por id ou por nome', () => {
    const t = translator(tr, 'lifestyles.xml');
    expect(t('Low', 'ls-low')).toBe('Baixo');
    expect(t('Street')).toBe('Rua');
    expect(t('Inexistente')).toBeUndefined();
  });

  it('entende tradução inline (category com atributo translate)', () => {
    expect(translator(tr, 'spells.xml')('Combat')).toBe('Combate');
  });

  it('arquivo sem tradução devolve undefined', () => {
    expect(translator(tr, 'nada.xml')('Low')).toBeUndefined();
  });
});

describe('conversores', () => {
  it('livros', () => {
    expect(convertBooks(ctx())).toEqual([
      { id: 'b-sr5', code: 'SR5', name: 'Shadowrun 5th Edition', namePt: 'Shadowrun 5ª Edição' },
      { id: 'b-rf', code: 'RF', name: 'Run Faster', namePt: undefined },
    ]);
  });

  it('estilos de vida: só livros escolhidos e sem itens ocultos', () => {
    const list = convertLifestyles(ctx());
    expect(list.map((l) => l.name)).toEqual(['Low', 'Street']);
    expect(list[0]).toEqual({
      id: 'ls-low', name: 'Low', namePt: 'Baixo', source: 'SR5', page: 369, cost: 2000, dice: 3, multiplier: 40,
    });
  });

  it('incluir outro livro traz os itens dele', () => {
    expect(convertLifestyles(ctx(['SR5', 'RF'])).map((l) => l.name)).toContain('Bolt Hole');
  });

  it('magias: tradução, categoria e descritores', () => {
    const [bolt] = convertSpells(ctx());
    expect(bolt).toMatchObject({
      id: 'sp-bolt', namePt: 'Raio de Mana', category: 'Combat', categoryPt: 'Combate',
      dv: 'F-3', descriptors: ['Direct', 'Indirect'],
    });
  });
});
