import { describe, expect, it } from 'vitest';
import { evalExpr, stripRestriction } from '../expr';

describe('evalExpr', () => {
  it.each([
    ['2000', {}, 2000],
    ['Rating * 2000', { rating: 3 }, 6000],
    ['Rating * 2000', {}, 2000],
    ['(Rating + 1) * 100', { rating: 2 }, 300],
    ['10 - 2 * 3', {}, 4],
    ['-5 + 10', {}, 5],
    ['8 / 2', {}, 4],
    ['MinRating * 10', { minRating: 4 }, 40],
    ['4000 * Rating - 2000 * number(Rating > 1)', { rating: 1 }, 4000],
    ['4000 * Rating - 2000 * number(Rating > 1)', { rating: 3 }, 10000],
    ['Rating >= 3', { rating: 3 }, 1],
    ['Rating < 3', { rating: 3 }, 0],
    ['+Rating', { rating: 2 }, 2],
    ['  1500  ', {}, 1500],
  ])('%s com %o = %d', (src, vars, expected) => {
    expect(evalExpr(src, vars)).toBe(expected);
  });

  it('FixedValues escolhe pelo nível, e repete o último quando passa do fim', () => {
    expect(evalExpr('FixedValues(2,3,5)', { rating: 1 })).toBe(2);
    expect(evalExpr('FixedValues(2,3,5)', { rating: 3 })).toBe(5);
    expect(evalExpr('FixedValues(2,3,5)', { rating: 9 })).toBe(5);
    expect(evalExpr('FixedValues(4R,8F)', { rating: 2 })).toBe(8);
  });

  it.each(['', 'Variable(20-100000)', '2 +', '(1 + 2', 'Foo * 2', '1 / 0', 'number 3'])(
    'devolve null para fórmula não calculável: %j',
    (src) => {
      expect(evalExpr(src)).toBeNull();
    },
  );
});

describe('stripRestriction', () => {
  it('remove R/F do fim da disponibilidade', () => {
    expect(stripRestriction('12R')).toBe('12');
    expect(stripRestriction(' 6F ')).toBe('6');
    expect(stripRestriction('4')).toBe('4');
  });
});
