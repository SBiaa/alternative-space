import { describe, expect, it } from 'vitest';
import { assignPriority, fmtEss } from '../shared';

describe('assignPriority', () => {
  it('coloca a letra numa área vazia', () => {
    expect(assignPriority({}, 'skills', 'A')).toEqual({ skills: 'A' });
  });

  it('se a letra já é de outra área, as duas trocam', () => {
    expect(assignPriority({ skills: 'A', attributes: 'B' }, 'attributes', 'A')).toEqual({
      skills: 'B',
      attributes: 'A',
    });
  });

  it('se a área nova não tinha letra, a outra fica vazia', () => {
    expect(assignPriority({ skills: 'A' }, 'attributes', 'A')).toEqual({ attributes: 'A' });
  });

  it('escolher de novo a mesma letra não muda nada', () => {
    expect(assignPriority({ skills: 'A' }, 'skills', 'A')).toEqual({ skills: 'A' });
  });

  it('não muta o objeto original', () => {
    const before = { skills: 'A' as const };
    assignPriority(before, 'attributes', 'A');
    expect(before).toEqual({ skills: 'A' });
  });
});

it('fmtEss usa vírgula e duas casas', () => {
  expect(fmtEss(6)).toBe('6,00');
  expect(fmtEss(5.4)).toBe('5,40');
});
