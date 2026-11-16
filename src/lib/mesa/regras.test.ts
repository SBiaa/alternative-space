import { describe, expect, it } from 'vitest';
import { InputError } from '@/lib/fichas/sr5/play';
import {
  dataLocal,
  deHorarioLocal,
  gradeDoMes,
  horaLocal,
  lerApelido,
  lerCampanha,
  lerMes,
  lerSessao,
  mesVizinho,
  papelNaCampanha,
  podeVerFicha,
  quando,
  semNotasPessoais,
  sessaoVisivel,
} from './regras';

describe('quem vê o quê', () => {
  it('reconhece mestre, jogador e estranho', () => {
    expect(papelNaCampanha('m', 'm', ['a'])).toBe('mestre');
    expect(papelNaCampanha('a', 'm', ['a', 'b'])).toBe('jogador');
    expect(papelNaCampanha('x', 'm', ['a'])).toBeNull();
  });

  it('a ficha vinculada é do mestre e do dono, não dos colegas', () => {
    expect(podeVerFicha('mestre', 'm', 'a')).toBe(true);
    expect(podeVerFicha('jogador', 'a', 'a')).toBe(true);
    expect(podeVerFicha('jogador', 'b', 'a')).toBe(false);
  });

  it('jogador não recebe as notas do mestre', () => {
    const s = { resumo: 'público', notasMestre: 'o vilão é o pai' };
    expect(sessaoVisivel(s, 'jogador').notasMestre).toBe('');
    expect(sessaoVisivel(s, 'jogador').resumo).toBe('público');
    expect(sessaoVisivel(s, 'mestre').notasMestre).toBe('o vilão é o pai');
  });

  it('o mestre não lê as anotações pessoais da ficha de Pathfinder', () => {
    expect(semNotasPessoais({ nome: 'Valeros', notas: 'segredo' })).toEqual({ nome: 'Valeros', notas: '' });
  });
});

describe('validação', () => {
  it('lê a campanha e aplica os padrões', () => {
    expect(lerCampanha({ nome: '  Ruínas de Absalom ', sistema: 'pf2e' })).toEqual({
      nome: 'Ruínas de Absalom',
      sistema: 'pf2e',
      sinopse: '',
      status: 'planejando',
      rotina: '',
      cor: 'laranja',
    });
  });

  it('recusa campanha sem nome ou com sistema inventado', () => {
    expect(() => lerCampanha({ nome: ' ', sistema: 'sr5' })).toThrow(InputError);
    expect(() => lerCampanha({ nome: 'X', sistema: 'gurps' })).toThrow(InputError);
  });

  it('lê a sessão no horário de Brasília', () => {
    const s = lerSessao({ data: '2026-11-21', hora: '19:30', duracaoMin: 180 });
    expect(s.iniciaEm.toISOString()).toBe('2026-11-21T22:30:00.000Z');
    expect(s.duracaoMin).toBe(180);
    expect(() => lerSessao({ data: '2026-02-30', hora: '19:30' })).toThrow(InputError);
    expect(() => lerSessao({ data: '2026-11-21', hora: '19:30', duracaoMin: 5 })).toThrow(InputError);
  });

  it('tira o @ do apelido', () => {
    expect(lerApelido(' @Bia.Lua ')).toBe('Bia.Lua');
    expect(() => lerApelido('@')).toThrow(InputError);
  });
});

describe('data e hora', () => {
  it('ida e volta pelo fuso de Brasília', () => {
    const d = deHorarioLocal('2027-01-02', '23:15')!;
    expect(d.toISOString()).toBe('2027-01-03T02:15:00.000Z');
    expect(dataLocal(d)).toBe('2027-01-02');
    expect(horaLocal(d)).toBe('23:15');
    expect(quando(d)).toBe('sáb, 02/jan · 23:15');
  });

  it('recusa horário inválido', () => {
    expect(deHorarioLocal('2026-11-21', '24:00')).toBeNull();
    expect(deHorarioLocal('21/11/2026', '19:00')).toBeNull();
  });

  it('lê o mês da URL e cai no mês atual se vier lixo', () => {
    expect(lerMes('2026-12', '2026-11-16')).toEqual({ ano: 2026, mes: 12 });
    expect(lerMes('2026-13', '2026-11-16')).toEqual({ ano: 2026, mes: 11 });
    expect(lerMes(undefined, '2026-11-16')).toEqual({ ano: 2026, mes: 11 });
    expect(mesVizinho(2026, 12, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(mesVizinho(2027, 1, -1)).toEqual({ ano: 2026, mes: 12 });
  });

  it('a grade do mês começa na segunda e cobre o mês inteiro', () => {
    const g = gradeDoMes(2026, 11); // 01/11/2026 é domingo
    expect(g[0][0]).toEqual({ data: '2026-10-26', foraDoMes: true });
    expect(g[0][6]).toEqual({ data: '2026-11-01', foraDoMes: false });
    expect(g.at(-1)!.at(-1)!.data).toBe('2026-12-06');
    expect(g.flat().filter((d) => !d.foraDoMes)).toHaveLength(30);
  });
});
