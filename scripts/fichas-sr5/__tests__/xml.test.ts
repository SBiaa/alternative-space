import { describe, expect, it } from 'vitest';
import { arr, attr, bool, has, num, slug, text } from '../xml';

describe('helpers de XML', () => {
  it('arr normaliza "um ou vários"', () => {
    expect(arr(undefined)).toEqual([]);
    expect(arr(null)).toEqual([]);
    expect(arr('')).toEqual([]);
    expect(arr('a')).toEqual(['a']);
    expect(arr(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('text lê string, número e nó com atributos', () => {
    expect(text('abc')).toBe('abc');
    expect(text(3)).toBe('3');
    expect(text(true)).toBe('true');
    expect(text({ '#text': 'Combat', '@_translate': 'Combate' })).toBe('Combat');
    expect(text({ outro: 1 })).toBe('');
    expect(text(undefined)).toBe('');
  });

  it('num usa o fallback quando vazio ou inválido', () => {
    expect(num('12')).toBe(12);
    expect(num(' 1.5 ')).toBe(1.5);
    expect(num('')).toBe(0);
    expect(num('abc', 7)).toBe(7);
    expect(num(undefined, -1)).toBe(-1);
  });

  it('has considera nó vazio como presente', () => {
    expect(has('')).toBe(true);
    expect(has(undefined)).toBe(false);
    expect(has(null)).toBe(false);
  });

  it('bool entende True/False do Chummer', () => {
    expect(bool('True')).toBe(true);
    expect(bool('false')).toBe(false);
    expect(bool('', true)).toBe(true);
    expect(bool('talvez')).toBe(false);
  });

  it('attr lê atributos com prefixo @_', () => {
    expect(attr({ '@_file': 'books.xml' }, 'file')).toBe('books.xml');
    expect(attr({ '@_n': 3 }, 'n')).toBe('3');
    expect(attr({}, 'file')).toBeUndefined();
    expect(attr('texto', 'file')).toBeUndefined();
  });

  it('slug tira acentos e símbolos', () => {
    expect(slug('Análise Mágica (Avançada)')).toBe('analise-magica-avancada');
    expect(slug('  --Já!--  ')).toBe('ja');
  });
});
