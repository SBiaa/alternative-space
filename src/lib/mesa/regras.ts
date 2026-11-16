/**
 * Regras puras da Mesa do Mestre: textos, validação do que vem do navegador,
 * quem vê o quê e as contas de data/hora. Nada aqui fala com o banco.
 */
import { InputError } from '@/lib/fichas/sr5/play';
import { diaDaSemana, diasDoMes, MESES, somaDias } from '@/lib/diario/calendario';

export const SISTEMAS = ['sr5', 'pf2e', 'outro'] as const;
export type SistemaCampanha = (typeof SISTEMAS)[number];
export const NOME_SISTEMA: Record<SistemaCampanha, string> = {
  sr5: 'Shadowrun 5',
  pf2e: 'Pathfinder 2e',
  outro: 'Outro sistema',
};

export const STATUS_CAMPANHA = ['planejando', 'andamento', 'pausada', 'encerrada'] as const;
export type StatusCampanha = (typeof STATUS_CAMPANHA)[number];
export const NOME_STATUS_CAMPANHA: Record<StatusCampanha, string> = {
  planejando: 'Planejando',
  andamento: 'Em andamento',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
};

export const STATUS_SESSAO = ['marcada', 'realizada', 'cancelada'] as const;
export type StatusSessao = (typeof STATUS_SESSAO)[number];
export const NOME_STATUS_SESSAO: Record<StatusSessao, string> = {
  marcada: 'Marcada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
};

export const RESPOSTAS = ['vou', 'talvez', 'nao'] as const;
export type RespostaPresenca = (typeof RESPOSTAS)[number];
export const NOME_RESPOSTA: Record<RespostaPresenca, string> = { vou: 'Vou', talvez: 'Talvez', nao: 'Não vou' };

/** Cores das campanhas no calendário. Classes completas para o Tailwind achar. */
export const CORES = {
  laranja: { nome: 'Laranja', bolinha: 'bg-orange-400', chip: 'bg-orange-400/15 text-orange-300 border-orange-400/40' },
  azul: { nome: 'Azul', bolinha: 'bg-sky-400', chip: 'bg-sky-400/15 text-sky-300 border-sky-400/40' },
  verde: { nome: 'Verde', bolinha: 'bg-emerald-400', chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40' },
  roxo: { nome: 'Roxo', bolinha: 'bg-violet-400', chip: 'bg-violet-400/15 text-violet-300 border-violet-400/40' },
  rosa: { nome: 'Rosa', bolinha: 'bg-pink-400', chip: 'bg-pink-400/15 text-pink-300 border-pink-400/40' },
  amarelo: { nome: 'Amarelo', bolinha: 'bg-amber-300', chip: 'bg-amber-300/15 text-amber-200 border-amber-300/40' },
} as const;
export type CorCampanha = keyof typeof CORES;
export const corValida = (c: unknown): c is CorCampanha => typeof c === 'string' && c in CORES;

export const LIMITES = { nome: 80, sinopse: 2000, rotina: 80, titulo: 120, local: 200, pauta: 2000, texto: 8000, gancho: 300 };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CODIGO = /^[A-Za-z0-9_-]{8,32}$/;

// ---------------------------------------------------------------------------
// Validação

function texto(raw: unknown, max: number, campo: string, obrigatorio = false): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (obrigatorio && !t) throw new InputError(`Preencha ${campo}.`);
  if (t.length > max) throw new InputError(`${campo[0].toUpperCase()}${campo.slice(1)} com no máximo ${max} letras.`);
  return t;
}

function umDe<T extends string>(raw: unknown, opcoes: readonly T[], erro: string): T {
  if (typeof raw === 'string' && (opcoes as readonly string[]).includes(raw)) return raw as T;
  throw new InputError(erro);
}

export interface DadosCampanha {
  nome: string;
  sistema: SistemaCampanha;
  sinopse: string;
  status: StatusCampanha;
  rotina: string;
  cor: CorCampanha;
}

export function lerCampanha(raw: Record<string, unknown>): DadosCampanha {
  return {
    nome: texto(raw.nome, LIMITES.nome, 'o nome da campanha', true),
    sistema: umDe(raw.sistema, SISTEMAS, 'Escolha o sistema.'),
    sinopse: texto(raw.sinopse, LIMITES.sinopse, 'a sinopse'),
    status: raw.status === undefined ? 'planejando' : umDe(raw.status, STATUS_CAMPANHA, 'Status inválido.'),
    rotina: texto(raw.rotina, LIMITES.rotina, 'o dia e horário'),
    cor: corValida(raw.cor) ? raw.cor : 'laranja',
  };
}

export interface DadosSessao {
  titulo: string;
  iniciaEm: Date;
  duracaoMin: number;
  local: string;
  pauta: string;
}

export function lerSessao(raw: Record<string, unknown>): DadosSessao {
  const data = typeof raw.data === 'string' ? raw.data : '';
  const hora = typeof raw.hora === 'string' ? raw.hora : '';
  const iniciaEm = deHorarioLocal(data, hora);
  if (!iniciaEm) throw new InputError('Escolha a data e a hora da sessão.');
  const duracao = Number(raw.duracaoMin ?? 240);
  if (!Number.isFinite(duracao) || duracao < 15 || duracao > 24 * 60) throw new InputError('Duração entre 15 minutos e 24 horas.');
  return {
    titulo: texto(raw.titulo, LIMITES.titulo, 'o título'),
    iniciaEm,
    duracaoMin: Math.round(duracao),
    local: texto(raw.local, LIMITES.local, 'o local'),
    pauta: texto(raw.pauta, LIMITES.pauta, 'a pauta'),
  };
}

export interface DadosDiario {
  status: StatusSessao;
  resumo: string;
  recompensas: string;
  notasMestre: string;
}

export function lerDiario(raw: Record<string, unknown>): DadosDiario {
  return {
    status: umDe(raw.status, STATUS_SESSAO, 'Status inválido.'),
    resumo: texto(raw.resumo, LIMITES.texto, 'o resumo'),
    recompensas: texto(raw.recompensas, LIMITES.texto, 'as recompensas'),
    notasMestre: texto(raw.notasMestre, LIMITES.texto, 'as notas'),
  };
}

export const lerGancho = (raw: unknown) => texto(raw, LIMITES.gancho, 'o gancho', true);
export const lerResposta = (raw: unknown) => umDe(raw, RESPOSTAS, 'Responda vou, talvez ou não vou.');

/** "@Bia.Lua" → "bia.lua". */
export function lerApelido(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.trim().replace(/^@/, '') : '';
  if (!t) throw new InputError('Digite o @apelido do jogador.');
  if (t.length > 40) throw new InputError('Apelido longo demais.');
  return t;
}

// ---------------------------------------------------------------------------
// Quem vê o quê

export type Papel = 'mestre' | 'jogador';

/** Papel do usuário na campanha, ou null se ele não tem nada a ver com ela. */
export function papelNaCampanha(userId: string, mestreId: string, jogadores: readonly string[]): Papel | null {
  if (userId === mestreId) return 'mestre';
  return jogadores.includes(userId) ? 'jogador' : null;
}

/** A ficha vinculada é vista pelo mestre e pelo próprio dono; colegas de mesa não abrem. */
export const podeVerFicha = (papel: Papel, userId: string, donoDaFicha: string) => papel === 'mestre' || userId === donoDaFicha;

/** Tira da sessão o que é só do mestre. */
export function sessaoVisivel<S extends { notasMestre: string }>(s: S, papel: Papel): S {
  return papel === 'mestre' ? s : { ...s, notasMestre: '' };
}

/**
 * Ficha de Pathfinder para o mestre: tudo menos as anotações pessoais do jogador.
 * (No Shadowrun as anotações ficam fora do draft, em `play_notes`, e nem são lidas.)
 */
export function semNotasPessoais<F extends { notas: string }>(f: F): F {
  return { ...f, notas: '' };
}

// ---------------------------------------------------------------------------
// Data e hora. As sessões são gravadas em UTC e mostradas no horário de Brasília.

export const FUSO = 'America/Sao_Paulo';

const partes = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)!.value;
  return { data: `${v('year')}-${v('month')}-${v('day')}`, hora: `${v('hour')}:${v('minute')}` };
};

/** Data (AAAA-MM-DD) no horário de Brasília. */
export const dataLocal = (d: Date) => partes(d).data;
/** Hora (HH:MM) no horário de Brasília. */
export const horaLocal = (d: Date) => partes(d).hora;

/** "2026-11-21" + "19:30" em Brasília → instante. null se inválido. */
export function deHorarioLocal(data: string, hora: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const h = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!m || !h) return null;
  const [ano, mes, dia, hh, mm] = [m[1], m[2], m[3], h[1], h[2]].map(Number);
  if (hh > 23 || mm > 59) return null;
  const alvo = Date.UTC(ano, mes - 1, dia, hh, mm);
  if (new Date(alvo).toISOString().slice(0, 10) !== data) return null;
  // Chuta como se fosse UTC e corrige pela diferença do fuso naquele instante.
  let t = alvo;
  for (let i = 0; i < 2; i++) {
    const p = partes(new Date(t));
    const visto = Date.UTC(+p.data.slice(0, 4), +p.data.slice(5, 7) - 1, +p.data.slice(8, 10), +p.hora.slice(0, 2), +p.hora.slice(3, 5));
    t += alvo - visto;
  }
  return new Date(t);
}

const DIAS_CURTOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/** "sáb, 21/nov · 19:30" */
export function quando(d: Date): string {
  const { data, hora } = partes(d);
  return `${DIAS_CURTOS[diaDaSemana(data)]}, ${data.slice(8, 10)}/${MESES[Number(data.slice(5, 7)) - 1].curto} · ${hora}`;
}

/** "2026-11" → { ano, mes }. Inválido ou vazio: o mês de `hoje`. */
export function lerMes(raw: unknown, hoje: string): { ano: number; mes: number } {
  const m = typeof raw === 'string' ? /^(\d{4})-(\d{2})$/.exec(raw) : null;
  if (m) {
    const ano = Number(m[1]);
    const mes = Number(m[2]);
    if (ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12) return { ano, mes };
  }
  return { ano: Number(hoje.slice(0, 4)), mes: Number(hoje.slice(5, 7)) };
}

export const chaveMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`;
export const mesVizinho = (ano: number, mes: number, delta: -1 | 1) => {
  const i = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(i / 12), mes: (i % 12) + 1 };
};

/**
 * Semanas (segunda a domingo) que cobrem o mês, com os dias de fora em `foraDoMes`.
 * Serve para desenhar a grade do calendário.
 */
export function gradeDoMes(ano: number, mes: number): { data: string; foraDoMes: boolean }[][] {
  const dias = diasDoMes(mes, ano);
  const inicio = somaDias(dias[0], -diaDaSemana(dias[0]));
  const ultimo = dias[dias.length - 1];
  const fim = somaDias(ultimo, 6 - diaDaSemana(ultimo));
  const semanas: { data: string; foraDoMes: boolean }[][] = [];
  for (let d = inicio; d <= fim; d = somaDias(d, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => {
      const data = somaDias(d, i);
      return { data, foraDoMes: Number(data.slice(5, 7)) !== mes };
    }));
  }
  return semanas;
}

/** Intervalo UTC que cobre a grade inteira (com folga de um dia para o fuso). */
export function intervaloDaGrade(ano: number, mes: number): { de: Date; ate: Date } {
  const grade = gradeDoMes(ano, mes);
  const primeiro = grade[0][0].data;
  const ultimo = grade[grade.length - 1][6].data;
  return { de: new Date(`${somaDias(primeiro, -1)}T00:00:00Z`), ate: new Date(`${somaDias(ultimo, 2)}T00:00:00Z`) };
}
