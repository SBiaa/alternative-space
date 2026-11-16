/**
 * Arquivo de calendário (.ics, RFC 5545) das sessões. Puro: recebe os dados e devolve o texto.
 * Os horários vão em UTC, então qualquer agenda mostra no fuso de quem abre.
 */

export interface EventoIcs {
  uid: string;
  inicio: Date;
  fim: Date;
  resumo: string;
  local?: string;
  descricao?: string;
  url?: string;
  cancelado?: boolean;
  atualizadoEm?: Date;
}

const CRLF = '\r\n';
const bytes = (s: string) => new TextEncoder().encode(s).length;

/** Escapa o que tem significado dentro de um valor de texto do iCalendar. */
export const escaparTexto = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');

/** 20261121T223000Z */
export const dataHoraUtc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** Linhas passam de 75 bytes? Quebra e continua na seguinte com um espaço, sem partir um caractere no meio. */
export function dobrar(linha: string): string {
  const partes: string[] = [];
  let atual = '';
  let usados = 0;
  let limite = 75;
  for (const ch of linha) {
    const b = bytes(ch);
    if (usados + b > limite) {
      partes.push(atual);
      atual = '';
      usados = 0;
      limite = 74; // a continuação começa com um espaço
    }
    atual += ch;
    usados += b;
  }
  partes.push(atual);
  return partes.join(CRLF + ' ');
}

export const uidDaSessao = (sessaoId: string) => `sessao-${sessaoId}@alternativespace`;

export function calendarioIcs(eventos: EventoIcs[], nome: string, agora = new Date()): string {
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alternative Space//Mesa do Mestre//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escaparTexto(nome)}`,
    // Quanto tempo as agendas esperam para olhar o link de novo.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  for (const e of eventos) {
    linhas.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${dataHoraUtc(e.atualizadoEm ?? agora)}`,
      `DTSTART:${dataHoraUtc(e.inicio)}`,
      `DTEND:${dataHoraUtc(e.fim)}`,
      `SUMMARY:${escaparTexto(e.resumo)}`,
    );
    if (e.local) linhas.push(`LOCATION:${escaparTexto(e.local)}`);
    if (e.descricao) linhas.push(`DESCRIPTION:${escaparTexto(e.descricao)}`);
    if (e.url) linhas.push(`URL:${e.url}`);
    linhas.push(`STATUS:${e.cancelado ? 'CANCELLED' : 'CONFIRMED'}`);
    if (e.atualizadoEm) linhas.push(`LAST-MODIFIED:${dataHoraUtc(e.atualizadoEm)}`);
    linhas.push('END:VEVENT');
  }
  linhas.push('END:VCALENDAR');
  return linhas.map(dobrar).join(CRLF) + CRLF;
}

/** Evento de uma sessão. Só entra o que os jogadores já veem: a pauta, nunca as notas do mestre. */
export function eventoDeSessao(
  s: { id: string; titulo: string; iniciaEm: Date; duracaoMin: number; local: string; pauta: string; status: string; updatedAt?: Date },
  campanha: string,
  url: string,
): EventoIcs {
  const pauta = s.pauta.trim();
  return {
    uid: uidDaSessao(s.id),
    inicio: s.iniciaEm,
    fim: new Date(s.iniciaEm.getTime() + s.duracaoMin * 60_000),
    resumo: s.titulo ? `${campanha} — ${s.titulo}` : campanha,
    local: s.local || undefined,
    descricao: [pauta && `Pauta: ${pauta}`, `Mesa do Mestre: ${url}`].filter(Boolean).join('\n\n'),
    url,
    cancelado: s.status === 'cancelada',
    atualizadoEm: s.updatedAt,
  };
}
