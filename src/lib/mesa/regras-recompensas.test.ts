import { describe, expect, it } from 'vitest';
import { InputError } from '@/lib/fichas/sr5/play';
import { descreverRecompensa, lerRecompensa, milhar, motivoNoHistorico, textoDasRecompensas } from './regras-recompensas';

describe('lerRecompensa', () => {
  it('lê uma recompensa válida para todos', () => {
    expect(lerRecompensa({ tipo: 'karma', quantidade: '5', descricao: ' Missão do galpão ', para: 'todos' }, 'sr5')).toEqual({
      tipo: 'karma',
      quantidade: 5,
      descricao: 'Missão do galpão',
      para: 'todos',
    });
  });

  it('aceita uma lista de jogadores, sem repetir', () => {
    expect(lerRecompensa({ tipo: 'xp', quantidade: 300, para: ['a', 'b', 'a'] }, 'pf2e').para).toEqual(['a', 'b']);
  });

  it('cada sistema só dá o que a ficha dele sabe receber', () => {
    expect(() => lerRecompensa({ tipo: 'karma', quantidade: 1, para: 'todos' }, 'pf2e')).toThrow(InputError);
    expect(() => lerRecompensa({ tipo: 'nuyen', quantidade: 1, para: 'todos' }, 'outro')).toThrow(InputError);
    expect(() => lerRecompensa({ tipo: 'po', quantidade: 1, para: 'todos' }, 'sr5')).toThrow(InputError);
    expect(lerRecompensa({ tipo: 'po', quantidade: 15, para: 'todos' }, 'pf2e').tipo).toBe('po');
    expect(lerRecompensa({ tipo: 'xp', quantidade: 10, para: 'todos' }, 'outro').tipo).toBe('xp');
  });

  const invalidas: [Record<string, unknown>, string][] = [
    [{ tipo: 'ouro', quantidade: 1, para: 'todos' }, 'tipo desconhecido'],
    [{ tipo: 'karma', quantidade: 0, para: 'todos' }, 'zero'],
    [{ tipo: 'karma', quantidade: -3, para: 'todos' }, 'negativo'],
    [{ tipo: 'karma', quantidade: 1.5, para: 'todos' }, 'fracionado'],
    [{ tipo: 'karma', quantidade: 'muito', para: 'todos' }, 'texto'],
    [{ tipo: 'karma', quantidade: 99_000_000, para: 'todos' }, 'alto demais'],
    [{ tipo: 'item', quantidade: 1, descricao: '', para: 'todos' }, 'item sem nome'],
    [{ tipo: 'item', quantidade: 10_000, descricao: 'Flecha', para: 'todos' }, 'itens demais'],
    [{ tipo: 'karma', quantidade: 1, descricao: 'x'.repeat(121), para: 'todos' }, 'descrição longa'],
    [{ tipo: 'karma', quantidade: 1, para: [] }, 'ninguém'],
    [{ tipo: 'karma', quantidade: 1 }, 'sem destinatário'],
    [{ tipo: 'karma', quantidade: 1, para: 'alguns' }, 'destinatário inválido'],
  ];
  it.each(invalidas)('recusa %j (%s)', (campos) => {
    expect(() => lerRecompensa(campos, 'sr5')).toThrow(InputError);
  });
});

describe('textos', () => {
  it('milhar usa ponto', () => {
    expect([0, 999, 1000, 3000, 1234567].map(milhar)).toEqual(['0', '999', '1.000', '3.000', '1.234.567']);
  });

  it('descreve cada tipo', () => {
    expect(descreverRecompensa({ tipo: 'karma', quantidade: 5, descricao: '' })).toBe('+5 karma');
    expect(descreverRecompensa({ tipo: 'nuyen', quantidade: 3000, descricao: '' })).toBe('+3.000¥');
    expect(descreverRecompensa({ tipo: 'po', quantidade: 15, descricao: '' })).toBe('+15 PO');
    expect(descreverRecompensa({ tipo: 'xp', quantidade: 300, descricao: '' })).toBe('+300 XP');
    expect(descreverRecompensa({ tipo: 'item', quantidade: 1, descricao: 'Espada longa' })).toBe('Espada longa');
    expect(descreverRecompensa({ tipo: 'item', quantidade: 3, descricao: 'Poção' })).toBe('Poção ×3');
  });

  it('junta o motivo quando pedido, menos no item (a descrição já é o nome)', () => {
    expect(descreverRecompensa({ tipo: 'nuyen', quantidade: 500, descricao: 'pagamento' }, true)).toBe('+500¥ (pagamento)');
    expect(descreverRecompensa({ tipo: 'item', quantidade: 1, descricao: 'Chave' }, true)).toBe('Chave');
  });

  it('o motivo do histórico cabe no limite do lançamento', () => {
    expect(motivoNoHistorico('Sombras', 'Galpão')).toBe('Mesa Sombras: Galpão');
    expect(motivoNoHistorico('Sombras', '')).toBe('Mesa Sombras');
    expect(motivoNoHistorico('x'.repeat(300), 'y')).toHaveLength(200);
  });
});

describe('textoDasRecompensas', () => {
  const base = { campanha: 'Sombras', url: 'https://exemplo.test/mesa/1' };
  it('uma linha por jogador, sem recusadas nem canceladas', () => {
    const texto = textoDasRecompensas({
      ...base,
      recompensas: [
        { nome: '@ana', tipo: 'karma', quantidade: 5, descricao: '', status: 'pendente' },
        { nome: '@ana', tipo: 'nuyen', quantidade: 3000, descricao: 'pagamento', status: 'aceita' },
        { nome: '@beto', tipo: 'karma', quantidade: 5, descricao: '', status: 'recusada' },
        { nome: '@caio', tipo: 'karma', quantidade: 5, descricao: '', status: 'cancelada' },
        { nome: '@duda', tipo: 'item', quantidade: 1, descricao: 'Chave', status: 'pendente' },
      ],
    });
    expect(texto).toBe(
      ['🎁 *Recompensas — Sombras*', '@ana: +5 karma, +3.000¥ (pagamento)', '@duda: Chave', 'Aceite na Mesa: https://exemplo.test/mesa/1'].join('\n'),
    );
  });

  it('sem nada para avisar, devolve vazio', () => {
    expect(textoDasRecompensas({ ...base, recompensas: [] })).toBe('');
    expect(textoDasRecompensas({ ...base, recompensas: [{ nome: '@a', tipo: 'xp', quantidade: 1, descricao: '', status: 'recusada' }] })).toBe('');
  });
});
