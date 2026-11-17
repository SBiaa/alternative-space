/**
 * Contador de iniciativa. Puro: recebe o combate, devolve o combate novo.
 *
 * Shadowrun 5e tem passes: cada passe é uma volta na ordem; depois dela todo mundo perde 10 de
 * iniciativa e quem fica com 0 ou menos sai da rodada. Quando ninguém mais age, começa a rodada
 * seguinte. Pathfinder e os outros sistemas têm uma volta por rodada.
 */
import { InputError } from '@/lib/fichas/sr5/play';
import type { SistemaCampanha } from './regras';

export const MAX_PARTICIPANTES = 40;
export const LIMITE_NOME = 80;
export const LIMITE_CONDICOES = 120;
export const INICIATIVA = { min: -99, max: 999 } as const;

export type TipoParticipante = 'jogador' | 'npc' | 'avulso';

export interface Participante {
  id: string;
  tipo: TipoParticipante;
  /** user id do jogador ou id do NPC; nulo para avulso. */
  refId: string | null;
  nome: string;
  iniciativa: number;
  /** Dano físico (SR5) ou PV perdidos. Só controlado aqui para NPCs; o do jogador vem da ficha. */
  dano: number;
  max: number;
  atordoamento: number;
  maxAtord: number;
  condicoes: string;
  fora: boolean;
}

export interface Combate {
  ativo: boolean;
  rodada: number;
  passe: number;
  turnoId: string | null;
  participantes: Participante[];
}

export const COMBATE_VAZIO: Combate = { ativo: false, rodada: 1, passe: 1, turnoId: null, participantes: [] };

const tipoOk = (t: unknown): t is TipoParticipante => t === 'jogador' || t === 'npc' || t === 'avulso';
const num = (v: unknown, min: number, max: number, padrao = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.trunc(v))) : padrao;

/** Lê o jsonb do banco sem confiar nele. */
export function lerParticipantes(raw: unknown): Participante[] {
  if (!Array.isArray(raw)) return [];
  const out: Participante[] = [];
  for (const x of raw.slice(0, MAX_PARTICIPANTES)) {
    if (!x || typeof x !== 'object') continue;
    const p = x as Record<string, unknown>;
    if (typeof p.id !== 'string' || !p.id || !tipoOk(p.tipo)) continue;
    out.push({
      id: p.id,
      tipo: p.tipo,
      refId: typeof p.refId === 'string' ? p.refId : null,
      nome: typeof p.nome === 'string' ? p.nome.slice(0, LIMITE_NOME) : '',
      iniciativa: num(p.iniciativa, INICIATIVA.min, INICIATIVA.max),
      dano: num(p.dano, 0, 99999),
      max: num(p.max, 0, 99999),
      atordoamento: num(p.atordoamento, 0, 99999),
      maxAtord: num(p.maxAtord, 0, 99999),
      condicoes: typeof p.condicoes === 'string' ? p.condicoes.slice(0, LIMITE_CONDICOES) : '',
      fora: p.fora === true,
    });
  }
  return out;
}

/** Maior iniciativa primeiro; empate fica na ordem em que entraram. */
export const ordenar = (ps: readonly Participante[]): Participante[] =>
  ps
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.iniciativa - a.p.iniciativa || a.i - b.i)
    .map((x) => x.p);

export const pontuacaoNoPasse = (p: Participante, passe: number, sistema: SistemaCampanha) =>
  sistema === 'sr5' ? p.iniciativa - 10 * (passe - 1) : p.iniciativa;

/** Quem age nesse passe, na ordem. */
export function agemNoPasse(c: Combate, passe: number, sistema: SistemaCampanha): Participante[] {
  return ordenar(c.participantes).filter((p) => !p.fora && (sistema !== 'sr5' || pontuacaoNoPasse(p, passe, sistema) > 0));
}

export function iniciar(c: Combate, sistema: SistemaCampanha): Combate {
  if (!c.participantes.length) throw new InputError('Adicione alguém ao combate antes de começar.');
  const turno = agemNoPasse(c, 1, sistema)[0]?.id ?? null;
  return { ...c, ativo: true, rodada: 1, passe: 1, turnoId: turno };
}

export const encerrar = (c: Combate): Combate => ({ ...c, ativo: false, rodada: 1, passe: 1, turnoId: null });

/** Rodada nova: volta ao passe 1 e a vez é de quem tem a maior iniciativa. */
export function novaRodada(c: Combate, sistema: SistemaCampanha): Combate {
  return { ...c, rodada: c.rodada + 1, passe: 1, turnoId: agemNoPasse(c, 1, sistema)[0]?.id ?? null };
}

export function proximoTurno(c: Combate, sistema: SistemaCampanha): Combate {
  if (!c.ativo) throw new InputError('O combate não começou.');
  const lista = ordenar(c.participantes);
  const idx = lista.findIndex((p) => p.id === c.turnoId);
  const noPasse = (passe: number) => agemNoPasse(c, passe, sistema);
  // Ainda falta alguém depois de quem agiu, neste passe.
  const agindo = noPasse(c.passe);
  const resto = lista.slice(idx + 1).find((p) => agindo.some((a) => a.id === p.id));
  if (resto) return { ...c, turnoId: resto.id };
  if (sistema === 'sr5') {
    const seguinte = noPasse(c.passe + 1)[0];
    if (seguinte) return { ...c, passe: c.passe + 1, turnoId: seguinte.id };
  }
  if (!noPasse(1).length) return { ...c, turnoId: null };
  return novaRodada(c, sistema);
}

// ---------------------------------------------------------------------------
// Participantes

export function lerIniciativa(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < INICIATIVA.min || n > INICIATIVA.max) {
    throw new InputError(`Iniciativa de ${INICIATIVA.min} a ${INICIATIVA.max}.`);
  }
  return n;
}

/** Se já tem alguém com o nome, vira "Nome 2", "Nome 3"... */
export function nomeUnico(nome: string, existentes: readonly string[]): string {
  if (!existentes.includes(nome)) return nome;
  const base = nome.replace(/\s+\d+$/, '');
  for (let i = 2; ; i++) {
    const candidato = `${base} ${i}`.slice(0, LIMITE_NOME);
    if (!existentes.includes(candidato)) return candidato;
  }
}

export function adicionar(c: Combate, novo: Participante): Combate {
  if (c.participantes.length >= MAX_PARTICIPANTES) throw new InputError(`No máximo ${MAX_PARTICIPANTES} participantes.`);
  if (novo.tipo === 'jogador' && c.participantes.some((p) => p.tipo === 'jogador' && p.refId === novo.refId)) {
    throw new InputError('Esse jogador já está no combate.');
  }
  const nome = nomeUnico(novo.nome, c.participantes.map((p) => p.nome));
  return { ...c, participantes: [...c.participantes, { ...novo, nome }] };
}

export function remover(c: Combate, id: string, sistema: SistemaCampanha): Combate {
  if (!c.participantes.some((p) => p.id === id)) return c;
  // Tirou quem estava na vez: a vez passa para o seguinte antes dele sair.
  const base = c.ativo && c.turnoId === id ? proximoTurno(c, sistema) : c;
  const participantes = base.participantes.filter((p) => p.id !== id);
  const turnoId = base.turnoId === id ? null : base.turnoId;
  return { ...base, participantes, turnoId };
}

export interface MudancaParticipante {
  iniciativa?: unknown;
  dano?: unknown;
  atordoamento?: unknown;
  condicoes?: unknown;
  fora?: unknown;
}

const inteiroEm = (raw: unknown, max: number, campo: string) => {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > max) throw new InputError(`${campo} de 0 a ${max}.`);
  return n;
};

export function atualizar(c: Combate, id: string, m: MudancaParticipante): Combate {
  if (!c.participantes.some((p) => p.id === id)) throw new InputError('Esse participante não está mais no combate.');
  return {
    ...c,
    participantes: c.participantes.map((p) => {
      if (p.id !== id) return p;
      const n = { ...p };
      if (m.iniciativa !== undefined) n.iniciativa = lerIniciativa(m.iniciativa);
      if (m.dano !== undefined) n.dano = inteiroEm(m.dano, 99999, 'Dano');
      if (m.atordoamento !== undefined) n.atordoamento = inteiroEm(m.atordoamento, 99999, 'Atordoamento');
      if (m.condicoes !== undefined) {
        const t = typeof m.condicoes === 'string' ? m.condicoes.trim() : '';
        if (t.length > LIMITE_CONDICOES) throw new InputError(`Condições com no máximo ${LIMITE_CONDICOES} letras.`);
        n.condicoes = t;
      }
      if (m.fora !== undefined) n.fora = m.fora === true;
      return n;
    }),
  };
}

// ---------------------------------------------------------------------------
// Dados

export type Rng = () => number;
const d = (lados: number, rng: Rng) => 1 + Math.floor(rng() * lados);

/** SR5: base + Xd6. Pathfinder e outros: d20 + bônus. */
export function rolarIniciativa(sistema: SistemaCampanha, base: number, dados: number, rng: Rng = Math.random): number {
  if (sistema === 'sr5') {
    let total = base;
    for (let i = 0; i < Math.max(1, Math.min(5, dados)); i++) total += d(6, rng);
    return total;
  }
  return base + d(20, rng);
}

/** O que o jogador pode ver: NPCs e avulsos só aparecem com o nome e a posição, sem números. A lista já sai na ordem de ação. */
export function visaoDoJogador(c: Combate): Combate {
  const zero = { dano: 0, max: 0, atordoamento: 0, maxAtord: 0 };
  return {
    ...c,
    participantes: ordenar(c.participantes).map((p) => (p.tipo === 'jogador' ? { ...p, ...zero } : { ...p, ...zero, iniciativa: 0, condicoes: '' })),
  };
}
