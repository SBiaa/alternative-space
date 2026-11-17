import { describe, expect, it } from 'vitest';
import { dadosDoSistema, lerCopias, lerNpc, nomesDasCopias } from './regras-npcs';

describe('lerNpc', () => {
  it('usa o padrão do sistema e guarda os ataques', () => {
    const n = lerNpc({ nome: ' Segurança ', tipo: 'inimigo', dados: { fisico: '12', ataques: ' Pistola 5P ' } }, 'sr5');
    expect(n).toMatchObject({ nome: 'Segurança', tipo: 'inimigo' });
    expect(n.dados).toMatchObject({ fisico: 12, atordoamento: 10, dados: 1, ataques: 'Pistola 5P' });
  });
  it('recusa nome vazio e números fora da faixa', () => {
    expect(() => lerNpc({ nome: '  ' }, 'pf2e')).toThrow();
    expect(() => lerNpc({ nome: 'x', dados: { pvMax: 0 } }, 'pf2e')).toThrow();
    expect(() => lerNpc({ nome: 'x', dados: { dados: 9 } }, 'sr5')).toThrow();
    expect(() => lerNpc({ nome: 'x', dados: { pvMax: 1.5 } }, 'pf2e')).toThrow();
  });
  it('tipo desconhecido vira npc', () => {
    expect(lerNpc({ nome: 'x', tipo: 'deus' }, 'outro').tipo).toBe('npc');
  });
  it('dados de outro sistema voltam com o padrão', () => {
    expect(dadosDoSistema({ fisico: 3 }, 'pf2e')).toMatchObject({ pvMax: 20, ca: 15, ataques: '' });
  });
});

describe('cópias', () => {
  it('numera sem repetir o número antigo', () => {
    expect(nomesDasCopias('Segurança', 3)).toEqual(['Segurança 1', 'Segurança 2', 'Segurança 3']);
    expect(nomesDasCopias('Segurança 2', 2)).toEqual(['Segurança 1', 'Segurança 2']);
  });
  it('limita a quantidade', () => {
    expect(() => lerCopias(0)).toThrow();
    expect(() => lerCopias(21)).toThrow();
    expect(lerCopias('3')).toBe(3);
  });
});
