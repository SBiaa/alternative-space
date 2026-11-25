import { describe, expect, it } from 'vitest';
import { calcularResumo, type PresencaStat, type SessaoStat } from './regras-estatisticas';

const dia = (n: number) => new Date(Date.UTC(2026, 10, n, 22, 0));
const agora = dia(20);
const sessao = (id: string, n: number, status: SessaoStat['status'] = 'realizada', duracaoMin = 240): SessaoStat => ({
  id,
  status,
  iniciaEm: dia(n),
  duracaoMin,
});
const presenca = (sessaoId: string, userId: string, compareceu: boolean | null): PresencaStat => ({ sessaoId, userId, compareceu });
const jogadores = [
  { userId: 'ana', nome: '@ana' },
  { userId: 'beto', nome: '@beto' },
];

describe('calcularResumo', () => {
  it('conta sessões por situação e as horas das realizadas', () => {
    const r = calcularResumo({
      sessoes: [sessao('a', 1), sessao('b', 2, 'realizada', 150), sessao('c', 3, 'cancelada'), sessao('d', 25, 'marcada'), sessao('e', 5, 'marcada')],
      jogadores,
      presencas: [],
      xpPorJogador: new Map(),
      agora,
    });
    expect(r).toMatchObject({ realizadas: 2, canceladas: 1, proximas: 1, horasJogadas: 6.5, comPresenca: 0 });
  });

  it('sem presença marcada, ninguém tem porcentagem', () => {
    const r = calcularResumo({ sessoes: [sessao('a', 1)], jogadores, presencas: [], xpPorJogador: new Map(), agora });
    expect(r.jogadores.map((j) => j.percentual)).toEqual([null, null]);
  });

  it('presença por jogador: veio, de quantas, porcentagem', () => {
    const r = calcularResumo({
      sessoes: [sessao('a', 1), sessao('b', 2), sessao('c', 3)],
      jogadores,
      presencas: [
        presenca('a', 'ana', true), presenca('a', 'beto', true),
        presenca('b', 'ana', true), presenca('b', 'beto', false),
        presenca('c', 'ana', false), presenca('c', 'beto', true),
      ],
      xpPorJogador: new Map(),
      agora,
    });
    const [ana, beto] = r.jogadores;
    expect([ana.compareceu, ana.de, ana.percentual]).toEqual([2, 3, 67]);
    expect([beto.compareceu, beto.de, beto.percentual]).toEqual([2, 3, 67]);
  });

  it('a sequência conta da sessão mais recente para trás e para na primeira falta', () => {
    const r = calcularResumo({
      sessoes: [sessao('a', 1), sessao('b', 2), sessao('c', 3), sessao('d', 4)],
      jogadores,
      presencas: [
        presenca('a', 'ana', false), presenca('a', 'beto', true),
        presenca('b', 'ana', true), presenca('b', 'beto', true),
        presenca('c', 'ana', true), presenca('c', 'beto', false),
        presenca('d', 'ana', true), presenca('d', 'beto', true),
      ],
      xpPorJogador: new Map(),
      agora,
    });
    expect(r.jogadores.map((j) => j.sequencia)).toEqual([3, 1]);
  });

  it('sessão realizada sem presença marcada não entra na conta de ninguém', () => {
    const r = calcularResumo({
      sessoes: [sessao('a', 1), sessao('b', 2)],
      jogadores,
      presencas: [presenca('a', 'ana', true), presenca('a', 'beto', true)],
      xpPorJogador: new Map(),
      agora,
    });
    expect(r.realizadas).toBe(2);
    expect(r.comPresenca).toBe(1);
    expect(r.jogadores.map((j) => j.de)).toEqual([1, 1]);
  });

  it('quem entrou depois não leva falta das sessões antigas', () => {
    const r = calcularResumo({
      sessoes: [sessao('a', 1), sessao('b', 2)],
      jogadores,
      presencas: [presenca('a', 'ana', true), presenca('b', 'ana', true), presenca('b', 'beto', true)],
      xpPorJogador: new Map(),
      agora,
    });
    const beto = r.jogadores[1];
    expect([beto.compareceu, beto.de, beto.percentual, beto.sequencia]).toEqual([1, 1, 100, 1]);
  });

  it('presença de sessão que não está realizada é ignorada', () => {
    const r = calcularResumo({
      sessoes: [sessao('a', 1, 'cancelada')],
      jogadores,
      presencas: [presenca('a', 'ana', true)],
      xpPorJogador: new Map(),
      agora,
    });
    expect(r.comPresenca).toBe(0);
    expect(r.jogadores[0].de).toBe(0);
  });

  it('traz o XP aceito de cada jogador', () => {
    const r = calcularResumo({
      sessoes: [],
      jogadores,
      presencas: [],
      xpPorJogador: new Map([['ana', 450]]),
      agora,
    });
    expect(r.jogadores.map((j) => j.xp)).toEqual([450, 0]);
  });
});
