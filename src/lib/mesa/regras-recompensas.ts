/**
 * Regras puras das recompensas da Mesa: o que cada sistema pode dar, validação do que o mestre manda
 * e os textos ("+5 karma, +3.000¥") para a tela e para o WhatsApp. Nada aqui fala com o banco.
 */
import { InputError } from '@/lib/fichas/sr5/play';
import { LIMITES, NOME_SISTEMA, type SistemaCampanha } from './regras';

export const TIPOS_RECOMPENSA = ['karma', 'nuyen', 'po', 'xp', 'item'] as const;
export type TipoRecompensa = (typeof TIPOS_RECOMPENSA)[number];
export const NOME_TIPO_RECOMPENSA: Record<TipoRecompensa, string> = {
  karma: 'Karma',
  nuyen: 'Nuyen',
  po: 'Peças de ouro',
  xp: 'XP',
  item: 'Item',
};

/** O que cabe em cada sistema. XP e item de Shadowrun ficam só registrados; karma, nuyen, ouro e item de Pathfinder vão para a ficha. */
export const TIPOS_DO_SISTEMA: Record<SistemaCampanha, readonly TipoRecompensa[]> = {
  sr5: ['karma', 'nuyen', 'item'],
  pf2e: ['po', 'xp', 'item'],
  outro: ['xp', 'item'],
};

export const STATUS_RECOMPENSA = ['pendente', 'aceita', 'recusada', 'cancelada'] as const;
export type StatusRecompensa = (typeof STATUS_RECOMPENSA)[number];
export const NOME_STATUS_RECOMPENSA: Record<StatusRecompensa, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
};

export const MAX_RECOMPENSA = 10_000_000;
export const MAX_QTD_ITEM = 9999;
export const MAX_DESTINATARIOS = 50;
export const LIMITE_DESCRICAO = 120;

export interface DadosRecompensa {
  tipo: TipoRecompensa;
  quantidade: number;
  descricao: string;
  /** "todos" os jogadores da campanha, ou só estes. */
  para: 'todos' | string[];
}

export function lerRecompensa(raw: Record<string, unknown>, sistema: SistemaCampanha): DadosRecompensa {
  const tipo = (TIPOS_RECOMPENSA as readonly unknown[]).includes(raw.tipo) ? (raw.tipo as TipoRecompensa) : null;
  if (!tipo) throw new InputError('Escolha o que o jogador recebe.');
  if (!TIPOS_DO_SISTEMA[sistema].includes(tipo)) {
    throw new InputError(`${NOME_TIPO_RECOMPENSA[tipo]} não vale em ${NOME_SISTEMA[sistema]}.`);
  }
  const quantidade = typeof raw.quantidade === 'number' ? raw.quantidade : Number(raw.quantidade);
  const max = tipo === 'item' ? MAX_QTD_ITEM : MAX_RECOMPENSA;
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new InputError('Informe uma quantidade inteira, de 1 para cima.');
  if (quantidade > max) throw new InputError('Quantidade alta demais.');
  const descricao = typeof raw.descricao === 'string' ? raw.descricao.trim() : '';
  if (descricao.length > LIMITE_DESCRICAO) throw new InputError(`Descrição com no máximo ${LIMITE_DESCRICAO} letras.`);
  if (tipo === 'item' && !descricao) throw new InputError('Diga qual é o item.');

  let para: DadosRecompensa['para'];
  if (raw.para === 'todos') para = 'todos';
  else if (Array.isArray(raw.para)) {
    const ids = [...new Set(raw.para.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 100))];
    if (!ids.length) throw new InputError('Escolha quem recebe.');
    if (ids.length > MAX_DESTINATARIOS) throw new InputError('Gente demais de uma vez.');
    para = ids;
  } else throw new InputError('Escolha quem recebe.');
  return { tipo, quantidade, descricao, para };
}

/** 3000 → "3.000". Feito à mão para o texto sair igual no servidor e no navegador. */
export const milhar = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export interface RecompensaTexto {
  tipo: TipoRecompensa;
  quantidade: number;
  descricao: string;
}

/** "+5 karma" · "+3.000¥" · "+15 PO" · "+300 XP" · "Espada longa ×2". Com `comMotivo`, junta a descrição. */
export function descreverRecompensa(r: RecompensaTexto, comMotivo = false): string {
  const base =
    r.tipo === 'karma'
      ? `+${milhar(r.quantidade)} karma`
      : r.tipo === 'nuyen'
        ? `+${milhar(r.quantidade)}¥`
        : r.tipo === 'po'
          ? `+${milhar(r.quantidade)} PO`
          : r.tipo === 'xp'
            ? `+${milhar(r.quantidade)} XP`
            : `${r.descricao}${r.quantidade > 1 ? ` ×${r.quantidade}` : ''}`;
  return comMotivo && r.tipo !== 'item' && r.descricao ? `${base} (${r.descricao})` : base;
}

/** O motivo que vai para o histórico da ficha (limite de 200 letras do lançamento). */
export const motivoNoHistorico = (campanha: string, descricao: string) =>
  `Mesa ${campanha}${descricao ? `: ${descricao}` : ''}`.slice(0, 200);

/** Lista pronta para o grupo do WhatsApp: uma linha por jogador, sem o que foi recusado ou cancelado. */
export function textoDasRecompensas(d: {
  campanha: string;
  url: string;
  recompensas: (RecompensaTexto & { nome: string; status: StatusRecompensa })[];
}): string {
  const porJogador = new Map<string, string[]>();
  for (const r of d.recompensas) {
    if (r.status === 'recusada' || r.status === 'cancelada') continue;
    porJogador.set(r.nome, [...(porJogador.get(r.nome) ?? []), descreverRecompensa(r, true)]);
  }
  if (!porJogador.size) return '';
  return [
    `🎁 *Recompensas — ${d.campanha}*`,
    ...[...porJogador].map(([nome, itens]) => `${nome}: ${itens.join(', ')}`),
    `Aceite na Mesa: ${d.url}`,
  ].join('\n');
}

export const LIMITE_DIARIO = LIMITES.texto;
