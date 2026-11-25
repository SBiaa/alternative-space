/**
 * Regras puras da agenda da Mesa: a rotina das sessões ("toda sexta às 20h"), as datas que ela gera
 * e o texto do lembrete para mandar no WhatsApp. Nada aqui fala com o banco.
 */
import { InputError } from '@/lib/fichas/sr5/play';
import { diaDaSemana, somaDias } from '@/lib/diario/calendario';
import { dataLocal, deHorarioLocal, horaLocal, LIMITES, quando, type RespostaPresenca } from './regras';

/** Dia da semana como no calendário do Diário: 0 = segunda ... 6 = domingo. */
export const DIAS_PLURAL = ['segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados', 'domingos'] as const;

export interface Rotina {
  /** 0 = segunda ... 6 = domingo. */
  dia: number;
  /** HH:MM no horário de Brasília. */
  hora: string;
  /** 1 = toda semana, 2 = de quinze em quinze dias. */
  intervalo: 1 | 2;
  duracaoMin: number;
  local: string;
}

export const ROTINA_PADRAO: Rotina = { dia: 4, hora: '20:00', intervalo: 1, duracaoMin: 240, local: '' };

/** A rotina mantém sessões criadas até 6 semanas à frente e renova quando faltam menos de 4. */
export const HORIZONTE_DIAS = 42;
export const RENOVAR_COM_MENOS_DE_DIAS = 28;

/** Lê o formulário da rotina. `ativa` falso = campanha sem rotina (devolve null). */
export function lerRotina(raw: Record<string, unknown>): Rotina | null {
  if (!raw.ativa) return null;
  const dia = Number(raw.dia);
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) throw new InputError('Escolha o dia da semana.');
  const hora = typeof raw.hora === 'string' ? raw.hora : '';
  if (!deHorarioLocal('2000-01-01', hora)) throw new InputError('Escolha o horário da sessão.');
  const intervalo = Number(raw.intervalo);
  if (intervalo !== 1 && intervalo !== 2) throw new InputError('Escolha toda semana ou quinzenal.');
  const duracao = Number(raw.duracaoMin ?? 240);
  if (!Number.isFinite(duracao) || duracao < 15 || duracao > 24 * 60) throw new InputError('Duração entre 15 minutos e 24 horas.');
  const local = typeof raw.local === 'string' ? raw.local.trim() : '';
  if (local.length > LIMITES.local) throw new InputError(`Local com no máximo ${LIMITES.local} letras.`);
  return { dia, hora, intervalo, duracaoMin: Math.round(duracao), local };
}

const horaCurta = (h: string) => {
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
};

/** "sextas, 20h" · "sábados, 19h30 · quinzenal". Vai para o campo de texto da campanha. */
export const textoDaRotina = (r: Pick<Rotina, 'dia' | 'hora' | 'intervalo'>) =>
  `${DIAS_PLURAL[r.dia]}, ${horaCurta(r.hora)}${r.intervalo === 2 ? ' · quinzenal' : ''}`;

/**
 * Datas (AAAA-MM-DD, horário de Brasília) em que a rotina marca sessão, de `de` até `ate`.
 * `ultima` é a data da última sessão que a rotina já criou: o ritmo continua a partir dela
 * (importa na quinzenal, para não trocar de semana) e nada antes dela é criado de novo.
 */
export function datasDaRotina(r: Pick<Rotina, 'dia' | 'intervalo'>, de: string, ate: string, ultima: string | null): string[] {
  const passo = 7 * r.intervalo;
  let d = ultima ? somaDias(ultima, passo) : somaDias(de, (r.dia - diaDaSemana(de) + 7) % 7);
  const datas: string[] = [];
  while (d <= ate) {
    if (d >= de) datas.push(d);
    d = somaDias(d, passo);
  }
  return datas;
}

/** Início (instante) das próximas sessões da rotina que ainda vão acontecer, até o horizonte. */
export function iniciosDaRotina(r: Rotina, hojeLocal: string, ultima: string | null, agora: Date): Date[] {
  return datasDaRotina(r, hojeLocal, somaDias(hojeLocal, HORIZONTE_DIAS), ultima)
    .map((d) => deHorarioLocal(d, r.hora)!)
    .filter((t) => t.getTime() > agora.getTime());
}

/** Já passou da hora de criar mais sessões? */
export const precisaRenovar = (geradaAte: Date | null, agora: Date) =>
  !geradaAte || geradaAte.getTime() < agora.getTime() + RENOVAR_COM_MENOS_DE_DIAS * 86_400_000;

/** "hoje, 20:00" · "amanhã, 20:00" · "sáb, 21/nov · 20:00". Para os avisos de sessão chegando. */
export function quandoRelativo(iniciaEm: Date, agora: Date): string {
  const dia = dataLocal(iniciaEm);
  const hojeLocal = dataLocal(agora);
  if (dia === hojeLocal) return `hoje, ${horaLocal(iniciaEm)}`;
  if (dia === somaDias(hojeLocal, 1)) return `amanhã, ${horaLocal(iniciaEm)}`;
  return quando(iniciaEm);
}

// ---------------------------------------------------------------------------
// Lembrete para o WhatsApp

export interface DadosLembrete {
  campanha: string;
  titulo: string;
  iniciaEm: Date;
  local: string;
  pauta: string;
  presencas: { nome: string; resposta: RespostaPresenca | null }[];
  /** Link da sessão na Mesa. */
  url: string;
}

/** Texto pronto para colar no grupo: quando, onde, pauta e quem já respondeu o quê. */
export function textoDoLembrete(d: DadosLembrete, agora: Date): string {
  const dia = dataLocal(d.iniciaEm);
  const hojeLocal = dataLocal(agora);
  const relativo = dia === hojeLocal ? ' (hoje)' : dia === somaDias(hojeLocal, 1) ? ' (amanhã)' : '';
  const linhas = [`🎲 *Sessão de ${d.campanha}*${d.titulo ? ` — ${d.titulo}` : ''}`, `📅 ${quando(d.iniciaEm).replace(' · ', ' às ')}${relativo}`];
  if (d.local) linhas.push(`📍 ${d.local}`);
  const pauta = d.pauta.trim();
  if (pauta) linhas.push(`📝 Pauta: ${pauta.length > 300 ? `${pauta.slice(0, 297)}…` : pauta}`);
  const grupo = (rotulo: string, r: RespostaPresenca | null) => {
    const nomes = d.presencas.filter((p) => p.resposta === r).map((p) => p.nome);
    if (nomes.length) linhas.push(`${rotulo} ${nomes.join(', ')}`);
  };
  grupo('✅ Vão:', 'vou');
  grupo('🤔 Talvez:', 'talvez');
  grupo('❌ Não vão:', 'nao');
  grupo('⏳ Falta responder:', null);
  linhas.push(`🔗 ${d.url}`);
  return linhas.join('\n');
}
