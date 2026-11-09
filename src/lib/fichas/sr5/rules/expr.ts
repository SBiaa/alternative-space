/**
 * Avalia as fórmulas de custo, disponibilidade e Essência do Chummer, como
 * "Rating * 2000", "FixedValues(2,3,5)" ou "4000 * Rating - 2000 * number(Rating > 1)".
 * Sem eval: um parser pequeno que só entende números, Rating/MinRating,
 * + - * /, parênteses, comparações e number().
 */

export interface ExprVars {
  rating?: number;
  minRating?: number;
}

/** Remove a letra de restrição (R/F) do fim de uma disponibilidade. */
export function stripRestriction(raw: string): string {
  return raw.trim().replace(/[RF]$/, '').trim();
}

/** Retorna null quando a fórmula não é calculável (ex.: "Variable(20-100000)"). */
export function evalExpr(raw: string, vars: ExprVars = {}): number | null {
  let src = raw.trim();
  if (src === '') return null;
  if (/^Variable\(/i.test(src)) return null;

  const fixed = src.match(/^FixedValues\((.*)\)$/i);
  if (fixed) {
    const parts = fixed[1].split(',');
    const idx = Math.max(1, vars.rating ?? 1) - 1;
    const pick = parts[Math.min(idx, parts.length - 1)];
    return evalExpr(stripRestriction(pick), vars);
  }

  // "+Rating" (acréscimo de disponibilidade de acessório) vale como valor simples.
  if (src.startsWith('+')) src = src.slice(1);

  try {
    const p = new Parser(src, vars);
    const v = p.parseComparison();
    p.expectEnd();
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

class Parser {
  private i = 0;
  constructor(
    private readonly s: string,
    private readonly vars: ExprVars,
  ) {}

  private ws() {
    while (this.s[this.i] === ' ') this.i++;
  }

  private peek(): string {
    this.ws();
    return this.s[this.i] ?? '';
  }

  expectEnd() {
    this.ws();
    if (this.i < this.s.length) throw new Error('sobra');
  }

  parseComparison(): number {
    const left = this.parseSum();
    this.ws();
    const op = this.s.slice(this.i).match(/^(>=|<=|>|<|==)/)?.[0];
    if (!op) return left;
    this.i += op.length;
    const right = this.parseSum();
    switch (op) {
      case '>': return left > right ? 1 : 0;
      case '<': return left < right ? 1 : 0;
      case '>=': return left >= right ? 1 : 0;
      case '<=': return left <= right ? 1 : 0;
      default: return left === right ? 1 : 0;
    }
  }

  private parseSum(): number {
    let v = this.parseProduct();
    for (;;) {
      const c = this.peek();
      if (c === '+') { this.i++; v += this.parseProduct(); }
      else if (c === '-') { this.i++; v -= this.parseProduct(); }
      else return v;
    }
  }

  private parseProduct(): number {
    let v = this.parseUnary();
    for (;;) {
      const c = this.peek();
      if (c === '*') { this.i++; v *= this.parseUnary(); }
      else if (c === '/') { this.i++; v /= this.parseUnary(); }
      else return v;
    }
  }

  private parseUnary(): number {
    if (this.peek() === '-') { this.i++; return -this.parseUnary(); }
    return this.parseAtom();
  }

  private parseAtom(): number {
    const c = this.peek();
    if (c === '(') {
      this.i++;
      const v = this.parseComparison();
      if (this.peek() !== ')') throw new Error('falta )');
      this.i++;
      return v;
    }
    const rest = this.s.slice(this.i);
    const num = rest.match(/^\d+(\.\d+)?/);
    if (num) {
      this.i += num[0].length;
      return Number(num[0]);
    }
    const ident = rest.match(/^[A-Za-z]+/);
    if (ident) {
      this.i += ident[0].length;
      switch (ident[0]) {
        case 'Rating': return this.vars.rating ?? 1;
        case 'MinRating': return this.vars.minRating ?? 1;
        case 'number': {
          if (this.peek() !== '(') throw new Error('number sem (');
          this.i++;
          const v = this.parseComparison();
          if (this.peek() !== ')') throw new Error('falta )');
          this.i++;
          return v ? 1 : 0;
        }
      }
    }
    throw new Error(`token inesperado em "${this.s}"`);
  }
}
