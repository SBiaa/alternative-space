import { describe, expect, it } from 'vitest';
import { calendarioIcs, dataHoraUtc, dobrar, escaparTexto, eventoDeSessao, uidDaSessao } from './ics';
import { deHorarioLocal } from './regras';

const sessao = {
  id: 'abc',
  titulo: 'Ato 2',
  iniciaEm: deHorarioLocal('2026-11-21', '19:30')!, // 22:30 UTC
  duracaoMin: 240,
  local: 'Casa da Ana, sala 2',
  pauta: 'Invadir o galpão; achar o contato',
  status: 'marcada',
};

const octetos = (s: string) => new TextEncoder().encode(s).length;

describe('escaparTexto', () => {
  it('escapa barra, ponto e vírgula, vírgula e quebra de linha', () => {
    expect(escaparTexto('a\\b; c, d\ne\r\nf')).toBe('a\\\\b\\; c\\, d\\ne\\nf');
  });
});

describe('dataHoraUtc', () => {
  it('escreve em UTC, sem separadores', () => {
    expect(dataHoraUtc(new Date('2026-11-21T22:30:00.000Z'))).toBe('20261121T223000Z');
  });
});

describe('dobrar', () => {
  it('não mexe em linha curta', () => {
    expect(dobrar('SUMMARY:oi')).toBe('SUMMARY:oi');
  });

  it('quebra linhas longas em pedaços de no máximo 75 bytes e desfaz igual', () => {
    const linha = `DESCRIPTION:${'palavra '.repeat(40)}`;
    const dobrada = dobrar(linha);
    const fisicas = dobrada.split('\r\n');
    expect(fisicas.length).toBeGreaterThan(1);
    for (const f of fisicas) expect(octetos(f)).toBeLessThanOrEqual(75);
    expect(fisicas.map((f, i) => (i ? f.slice(1) : f)).join('')).toBe(linha);
  });

  it('não parte um caractere acentuado no meio', () => {
    const linha = `SUMMARY:${'ação '.repeat(60)}`;
    const dobrada = dobrar(linha);
    for (const f of dobrada.split('\r\n')) expect(octetos(f)).toBeLessThanOrEqual(75);
    expect(dobrada.split('\r\n').map((f, i) => (i ? f.slice(1) : f)).join('')).toBe(linha);
  });
});

describe('calendarioIcs', () => {
  const ev = eventoDeSessao(sessao, 'Sombras sobre Seattle', 'https://exemplo.com/mesa/1/sessoes/abc');
  const texto = calendarioIcs([ev], 'Mesa do Mestre', new Date('2026-11-16T12:00:00Z'));
  const linhas = texto.split('\r\n');

  it('abre e fecha o calendário e termina com quebra de linha', () => {
    expect(linhas[0]).toBe('BEGIN:VCALENDAR');
    expect(linhas.at(-2)).toBe('END:VCALENDAR');
    expect(linhas.at(-1)).toBe('');
  });

  it('usa só CRLF e nenhuma linha passa de 75 bytes', () => {
    expect(texto.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const l of linhas) expect(octetos(l)).toBeLessThanOrEqual(75);
  });

  it('põe um evento com início e fim em UTC e um UID estável', () => {
    expect(texto).toContain('BEGIN:VEVENT');
    expect(texto).toContain(`UID:${uidDaSessao('abc')}`);
    expect(texto).toContain('DTSTART:20261121T223000Z');
    expect(texto).toContain('DTEND:20261122T023000Z');
    expect(texto).toContain('STATUS:CONFIRMED');
  });

  it('escapa o texto do mestre', () => {
    const desdobrado = texto.replace(/\r\n /g, '');
    expect(desdobrado).toContain('SUMMARY:Sombras sobre Seattle — Ato 2');
    expect(desdobrado).toContain('LOCATION:Casa da Ana\\, sala 2');
    expect(desdobrado).toContain('Pauta: Invadir o galpão\\; achar o contato');
  });

  it('marca sessão cancelada como cancelada', () => {
    const cancelada = calendarioIcs([eventoDeSessao({ ...sessao, status: 'cancelada' }, 'X', 'https://e.com')], 'X');
    expect(cancelada).toContain('STATUS:CANCELLED');
  });

  it('sem eventos ainda é um calendário válido', () => {
    const vazio = calendarioIcs([], 'Mesa do Mestre');
    expect(vazio).toContain('BEGIN:VCALENDAR');
    expect(vazio).not.toContain('VEVENT');
  });
});
