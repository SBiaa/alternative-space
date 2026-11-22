import { describe, expect, it } from 'vitest';
import { InputError } from '@/lib/fichas/sr5/play';
import {
  datasDaRotina,
  HORIZONTE_DIAS,
  iniciosDaRotina,
  lerRotina,
  precisaRenovar,
  quandoRelativo,
  textoDaRotina,
  textoDoLembrete,
  type Rotina,
} from './regras-agenda';
import { deHorarioLocal } from './regras';

const sextaAs20: Rotina = { dia: 4, hora: '20:00', intervalo: 1, duracaoMin: 240, local: '' };

describe('lerRotina', () => {
  it('sem "ativa" é campanha sem rotina', () => {
    expect(lerRotina({ ativa: false, dia: 4, hora: '20:00', intervalo: 1 })).toBeNull();
  });

  it('lê uma rotina válida e limpa os campos', () => {
    expect(lerRotina({ ativa: true, dia: 4, hora: '20:00', intervalo: 2, duracaoMin: '180', local: '  Discord  ' })).toEqual({
      dia: 4,
      hora: '20:00',
      intervalo: 2,
      duracaoMin: 180,
      local: 'Discord',
    });
  });

  const invalidas: Record<string, unknown>[] = [
    { dia: 7, hora: '20:00', intervalo: 1 },
    { dia: -1, hora: '20:00', intervalo: 1 },
    { dia: 'sexta', hora: '20:00', intervalo: 1 },
    { dia: 4, hora: '25:00', intervalo: 1 },
    { dia: 4, hora: '', intervalo: 1 },
    { dia: 4, hora: '20:00', intervalo: 3 },
    { dia: 4, hora: '20:00', intervalo: 1, duracaoMin: 5 },
  ];
  it.each(invalidas)('recusa %j', (campos) => {
    expect(() => lerRotina({ ativa: true, ...campos })).toThrow(InputError);
  });
});

describe('textoDaRotina', () => {
  it('escreve dia e hora como o mestre falaria', () => {
    expect(textoDaRotina(sextaAs20)).toBe('sextas, 20h');
    expect(textoDaRotina({ dia: 5, hora: '19:30', intervalo: 2 })).toBe('sábados, 19h30 · quinzenal');
    expect(textoDaRotina({ dia: 0, hora: '09:05', intervalo: 1 })).toBe('segundas, 9h05');
  });
});

describe('datasDaRotina', () => {
  // 2026-11-16 é segunda-feira.
  it('toda semana: uma data por semana, a partir da primeira sexta', () => {
    expect(datasDaRotina(sextaAs20, '2026-11-16', '2026-12-11', null)).toEqual(['2026-11-20', '2026-11-27', '2026-12-04', '2026-12-11']);
  });

  it('se hoje é o dia da rotina, hoje conta', () => {
    expect(datasDaRotina(sextaAs20, '2026-11-20', '2026-11-26', null)).toEqual(['2026-11-20']);
  });

  it('quinzenal: pula uma semana', () => {
    expect(datasDaRotina({ dia: 4, intervalo: 2 }, '2026-11-16', '2026-12-11', null)).toEqual(['2026-11-20', '2026-12-04']);
  });

  it('continua do ritmo da última sessão criada e não repete as anteriores', () => {
    expect(datasDaRotina({ dia: 4, intervalo: 2 }, '2026-12-10', '2027-01-10', '2026-12-04')).toEqual(['2026-12-18', '2027-01-01']);
    expect(datasDaRotina(sextaAs20, '2026-11-16', '2026-12-11', '2026-11-27')).toEqual(['2026-12-04', '2026-12-11']);
  });

  it('se a última ficou muito para trás, mantém a semana certa da quinzenal', () => {
    // 02/10 + 14 dias, e assim por diante: 16/10, 30/10, 13/11, 27/11, 11/12.
    expect(datasDaRotina({ dia: 4, intervalo: 2 }, '2026-11-16', '2026-12-12', '2026-10-02')).toEqual(['2026-11-27', '2026-12-11']);
  });

  it('passa a virada do ano', () => {
    expect(datasDaRotina({ dia: 4, intervalo: 1 }, '2026-12-21', '2027-01-08', null)).toEqual(['2026-12-25', '2027-01-01', '2027-01-08']);
  });
});

describe('iniciosDaRotina', () => {
  it('devolve o instante em UTC (Brasília é UTC-3)', () => {
    const agora = new Date('2026-11-16T12:00:00Z');
    const [primeiro] = iniciosDaRotina(sextaAs20, '2026-11-16', null, agora);
    expect(primeiro.toISOString()).toBe('2026-11-20T23:00:00.000Z');
  });

  it('não cria sessão que já passou hoje', () => {
    // Sexta 20/11, 20h30 em Brasília: a das 20h já foi.
    const agora = new Date('2026-11-20T23:30:00Z');
    const inicios = iniciosDaRotina(sextaAs20, '2026-11-20', null, agora);
    expect(inicios[0].toISOString()).toBe('2026-11-27T23:00:00.000Z');
  });

  it('cria até seis semanas à frente', () => {
    const agora = new Date('2026-11-16T12:00:00Z');
    const inicios = iniciosDaRotina(sextaAs20, '2026-11-16', null, agora);
    expect(inicios).toHaveLength(6);
    expect(inicios.at(-1)! <= new Date(agora.getTime() + (HORIZONTE_DIAS + 1) * 86_400_000)).toBe(true);
  });
});

describe('quandoRelativo', () => {
  const sessao = deHorarioLocal('2026-11-21', '20:00')!;
  it('diz hoje e amanhã', () => {
    expect(quandoRelativo(sessao, new Date('2026-11-21T12:00:00Z'))).toBe('hoje, 20:00');
    expect(quandoRelativo(sessao, new Date('2026-11-20T12:00:00Z'))).toBe('amanhã, 20:00');
  });
  it('usa o dia no horário de Brasília, não em UTC', () => {
    // 21/11 às 22h em Brasília já é 22/11 em UTC, mas ainda é "hoje" para quem joga.
    expect(quandoRelativo(deHorarioLocal('2026-11-21', '22:00')!, new Date('2026-11-21T20:00:00Z'))).toBe('hoje, 22:00');
  });
  it('mais longe, mostra a data', () => {
    expect(quandoRelativo(sessao, new Date('2026-11-18T12:00:00Z'))).toBe('sáb, 21/nov · 20:00');
  });
});

describe('precisaRenovar', () => {
  const agora = new Date('2026-11-16T12:00:00Z');
  it('sem nada criado ainda, precisa', () => expect(precisaRenovar(null, agora)).toBe(true));
  it('faltando menos de quatro semanas, renova', () => {
    expect(precisaRenovar(new Date('2026-12-05T00:00:00Z'), agora)).toBe(true);
  });
  it('com mais de quatro semanas criadas, não', () => {
    expect(precisaRenovar(new Date('2026-12-20T00:00:00Z'), agora)).toBe(false);
  });
});

describe('textoDoLembrete', () => {
  const base = {
    campanha: 'Sombras sobre Seattle',
    titulo: '',
    iniciaEm: deHorarioLocal('2026-11-21', '20:00')!,
    local: 'Discord',
    pauta: 'Invadir o galpão',
    presencas: [
      { nome: '@ana', resposta: 'vou' as const },
      { nome: '@beto', resposta: 'vou' as const },
      { nome: '@caio', resposta: 'talvez' as const },
      { nome: '@duda', resposta: 'nao' as const },
      { nome: '@eva', resposta: null },
    ],
    url: 'https://exemplo.com/mesa/1/sessoes/2',
  };

  it('junta quando, onde, pauta e quem respondeu o quê', () => {
    expect(textoDoLembrete(base, new Date('2026-11-19T12:00:00Z'))).toBe(
      [
        '🎲 *Sessão de Sombras sobre Seattle*',
        '📅 sáb, 21/nov às 20:00',
        '📍 Discord',
        '📝 Pauta: Invadir o galpão',
        '✅ Vão: @ana, @beto',
        '🤔 Talvez: @caio',
        '❌ Não vão: @duda',
        '⏳ Falta responder: @eva',
        '🔗 https://exemplo.com/mesa/1/sessoes/2',
      ].join('\n'),
    );
  });

  it('avisa "amanhã" e "hoje"', () => {
    expect(textoDoLembrete(base, new Date('2026-11-20T15:00:00Z'))).toContain('📅 sáb, 21/nov às 20:00 (amanhã)');
    expect(textoDoLembrete(base, new Date('2026-11-21T15:00:00Z'))).toContain('(hoje)');
  });

  it('põe o título e pula o que está vazio', () => {
    const t = textoDoLembrete({ ...base, titulo: 'Ato 2', local: '', pauta: '', presencas: [] }, new Date('2026-11-10T12:00:00Z'));
    expect(t.split('\n')).toEqual([
      '🎲 *Sessão de Sombras sobre Seattle* — Ato 2',
      '📅 sáb, 21/nov às 20:00',
      '🔗 https://exemplo.com/mesa/1/sessoes/2',
    ]);
  });

  it('encurta pauta muito longa', () => {
    const t = textoDoLembrete({ ...base, pauta: 'x'.repeat(500) }, new Date('2026-11-10T12:00:00Z'));
    expect(t).toContain(`${'x'.repeat(297)}…`);
    expect(t).not.toContain('x'.repeat(298));
  });
});
