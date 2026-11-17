import { describe, expect, it } from 'vitest';
import {
  adicionar,
  agemNoPasse,
  atualizar,
  COMBATE_VAZIO,
  iniciar,
  lerParticipantes,
  nomeUnico,
  proximoTurno,
  remover,
  rolarIniciativa,
  visaoDoJogador,
  type Combate,
  type Participante,
} from './regras-combate';

const p = (id: string, iniciativa: number, extra: Partial<Participante> = {}): Participante => ({
  id,
  tipo: 'npc',
  refId: null,
  nome: id,
  iniciativa,
  dano: 0,
  max: 10,
  atordoamento: 0,
  maxAtord: 10,
  condicoes: '',
  fora: false,
  ...extra,
});
const combate = (...ps: Participante[]): Combate => ({ ...COMBATE_VAZIO, participantes: ps });
const vez = (c: Combate) => `${c.rodada}.${c.passe}:${c.turnoId}`;

describe('pathfinder: uma volta por rodada', () => {
  it('segue a ordem e vira a rodada', () => {
    let c = iniciar(combate(p('a', 10), p('b', 20), p('c', 15)), 'pf2e');
    expect(vez(c)).toBe('1.1:b');
    c = proximoTurno(c, 'pf2e');
    expect(vez(c)).toBe('1.1:c');
    c = proximoTurno(c, 'pf2e');
    expect(vez(c)).toBe('1.1:a');
    c = proximoTurno(c, 'pf2e');
    expect(vez(c)).toBe('2.1:b');
  });
  it('pula quem está fora', () => {
    let c = iniciar(combate(p('a', 10), p('b', 20, { fora: true }), p('c', 15)), 'pf2e');
    expect(vez(c)).toBe('1.1:c');
    c = proximoTurno(c, 'pf2e');
    expect(vez(c)).toBe('1.1:a');
  });
  it('empate fica na ordem de entrada', () => {
    const c = iniciar(combate(p('a', 10), p('b', 10)), 'pf2e');
    expect(c.turnoId).toBe('a');
  });
});

describe('shadowrun: passes de iniciativa', () => {
  it('quem tem iniciativa alta age de novo no segundo passe; quem fica com 0 ou menos sai', () => {
    let c = iniciar(combate(p('rapido', 22), p('medio', 12), p('lento', 10)), 'sr5');
    expect(vez(c)).toBe('1.1:rapido');
    c = proximoTurno(c, 'sr5');
    expect(vez(c)).toBe('1.1:medio');
    c = proximoTurno(c, 'sr5');
    expect(vez(c)).toBe('1.1:lento');
    // passe 2: rapido 12, medio 2; lento 0 sai
    c = proximoTurno(c, 'sr5');
    expect(vez(c)).toBe('1.2:rapido');
    c = proximoTurno(c, 'sr5');
    expect(vez(c)).toBe('1.2:medio');
    // passe 3: rapido 2
    c = proximoTurno(c, 'sr5');
    expect(vez(c)).toBe('1.3:rapido');
    // passe 4: ninguém; rodada nova
    c = proximoTurno(c, 'sr5');
    expect(vez(c)).toBe('2.1:rapido');
  });
  it('lista quem age em cada passe', () => {
    const c = combate(p('a', 22), p('b', 10), p('c', 9));
    expect(agemNoPasse(c, 1, 'sr5').map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(agemNoPasse(c, 2, 'sr5').map((x) => x.id)).toEqual(['a']);
    expect(agemNoPasse(c, 3, 'sr5').map((x) => x.id)).toEqual(['a']);
    expect(agemNoPasse(c, 4, 'sr5')).toEqual([]);
  });
  it('mexer na iniciativa no meio do combate reordena', () => {
    let c = iniciar(combate(p('a', 20), p('b', 10)), 'sr5');
    c = atualizar(c, 'b', { iniciativa: 30 });
    expect(c.participantes.find((x) => x.id === 'b')!.iniciativa).toBe(30);
  });
});

describe('participantes', () => {
  it('sem ninguém não começa', () => {
    expect(() => iniciar(COMBATE_VAZIO, 'sr5')).toThrow();
  });
  it('ninguém age: a vez fica vazia e a rodada não corre', () => {
    let c = iniciar(combate(p('a', 10, { fora: true })), 'pf2e');
    expect(c.turnoId).toBeNull();
    c = proximoTurno(c, 'pf2e');
    expect(vez(c)).toBe('1.1:null');
  });
  it('tirar quem está na vez passa a vez adiante', () => {
    let c = iniciar(combate(p('a', 20), p('b', 10)), 'pf2e');
    c = remover(c, 'a', 'pf2e');
    expect(c.turnoId).toBe('b');
    expect(c.participantes.map((x) => x.id)).toEqual(['b']);
  });
  it('nomes repetidos ganham número', () => {
    expect(nomeUnico('Guarda', ['Guarda'])).toBe('Guarda 2');
    expect(nomeUnico('Guarda', ['Guarda', 'Guarda 2'])).toBe('Guarda 3');
    const c = adicionar(adicionar(COMBATE_VAZIO, p('1', 5, { nome: 'Guarda' })), p('2', 5, { nome: 'Guarda' }));
    expect(c.participantes.map((x) => x.nome)).toEqual(['Guarda', 'Guarda 2']);
  });
  it('o mesmo jogador não entra duas vezes', () => {
    const j = p('j1', 5, { tipo: 'jogador', refId: 'u1' });
    expect(() => adicionar(adicionar(COMBATE_VAZIO, j), { ...j, id: 'j2' })).toThrow();
  });
  it('valida dano e iniciativa', () => {
    const c = combate(p('a', 1));
    expect(() => atualizar(c, 'a', { dano: -1 })).toThrow();
    expect(() => atualizar(c, 'a', { iniciativa: 'x' })).toThrow();
    expect(() => atualizar(c, 'zzz', { dano: 1 })).toThrow();
    expect(atualizar(c, 'a', { dano: '3', fora: true }).participantes[0]).toMatchObject({ dano: 3, fora: true });
  });
  it('lê o jsonb sem confiar nele', () => {
    const lidos = lerParticipantes([null, { id: 1 }, { id: 'x', tipo: 'npc', iniciativa: 99999, dano: -4, nome: 5 }, { id: 'y', tipo: 'xx' }]);
    expect(lidos).toHaveLength(1);
    expect(lidos[0]).toMatchObject({ id: 'x', iniciativa: 999, dano: 0, nome: '' });
    expect(lerParticipantes('lixo')).toEqual([]);
  });
});

describe('dados', () => {
  it('sr5 soma base e d6; pathfinder soma o bônus e um d20', () => {
    expect(rolarIniciativa('sr5', 10, 2, () => 0.99)).toBe(22);
    expect(rolarIniciativa('sr5', 10, 2, () => 0)).toBe(12);
    expect(rolarIniciativa('pf2e', 7, 0, () => 0.99)).toBe(27);
    expect(rolarIniciativa('outro', 0, 0, () => 0)).toBe(1);
  });
});

describe('o que o jogador vê', () => {
  it('NPC sem números, na ordem certa; jogador mantém a iniciativa', () => {
    const c = iniciar(
      combate(p('goblin', 30, { dano: 4, condicoes: 'sangrando' }), p('ana', 12, { tipo: 'jogador', refId: 'u1', condicoes: 'rápida' })),
      'pf2e',
    );
    const v = visaoDoJogador(c);
    expect(v.participantes.map((x) => x.id)).toEqual(['goblin', 'ana']);
    expect(v.participantes[0]).toMatchObject({ iniciativa: 0, dano: 0, max: 0, condicoes: '' });
    expect(v.participantes[1]).toMatchObject({ iniciativa: 12, condicoes: 'rápida' });
    expect(v.turnoId).toBe('goblin');
  });
});
