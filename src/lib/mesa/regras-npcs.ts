/** NPCs e inimigos: campos por sistema e validação. Puro, sem acesso ao banco. */
import { InputError } from '@/lib/fichas/sr5/play';
import type { SistemaCampanha } from './regras';

export const TIPOS_NPC = ['npc', 'inimigo'] as const;
export type TipoNpc = (typeof TIPOS_NPC)[number];
export const NOME_TIPO_NPC: Record<TipoNpc, string> = { npc: 'NPC', inimigo: 'Inimigo' };

export const LIMITE_NOME_NPC = 80;
export const LIMITE_NOTAS_NPC = 2000;
export const LIMITE_ATAQUES = 600;
export const MAX_NPCS = 200;
export const MAX_COPIAS = 20;

export interface CampoNpc {
  chave: string;
  rotulo: string;
  min: number;
  max: number;
  padrao: number;
}

/** Os números de cada sistema. A tela monta o formulário a partir daqui. */
export const CAMPOS_NPC: Record<SistemaCampanha, CampoNpc[]> = {
  sr5: [
    { chave: 'iniciativaBase', rotulo: 'Iniciativa base', min: 0, max: 99, padrao: 8 },
    { chave: 'dados', rotulo: 'Dados de iniciativa', min: 1, max: 5, padrao: 1 },
    { chave: 'fisico', rotulo: 'Monitor físico', min: 1, max: 30, padrao: 10 },
    { chave: 'atordoamento', rotulo: 'Monitor de atordoamento', min: 1, max: 30, padrao: 10 },
    { chave: 'armadura', rotulo: 'Armadura', min: 0, max: 99, padrao: 0 },
    { chave: 'defesa', rotulo: 'Parada de defesa', min: 0, max: 99, padrao: 0 },
  ],
  pf2e: [
    { chave: 'pvMax', rotulo: 'PV', min: 1, max: 9999, padrao: 20 },
    { chave: 'ca', rotulo: 'CA', min: 0, max: 99, padrao: 15 },
    { chave: 'percepcao', rotulo: 'Percepção (iniciativa)', min: -5, max: 60, padrao: 5 },
    { chave: 'fortitude', rotulo: 'Fortitude', min: -5, max: 60, padrao: 5 },
    { chave: 'reflexos', rotulo: 'Reflexos', min: -5, max: 60, padrao: 5 },
    { chave: 'vontade', rotulo: 'Vontade', min: -5, max: 60, padrao: 5 },
  ],
  outro: [
    { chave: 'pvMax', rotulo: 'Vida', min: 0, max: 9999, padrao: 10 },
    { chave: 'iniciativaMod', rotulo: 'Bônus de iniciativa', min: -20, max: 99, padrao: 0 },
  ],
};

export type DadosNpc = Record<string, number | string>;

export interface NpcLido {
  nome: string;
  tipo: TipoNpc;
  dados: DadosNpc;
  notas: string;
}

function inteiro(raw: unknown, c: CampoNpc): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : c.padrao;
  if (!Number.isInteger(n) || n < c.min || n > c.max) throw new InputError(`${c.rotulo} vai de ${c.min} a ${c.max}.`);
  return n;
}

export function lerNpc(raw: Record<string, unknown>, sistema: SistemaCampanha): NpcLido {
  const nome = typeof raw.nome === 'string' ? raw.nome.trim() : '';
  if (!nome) throw new InputError('Dê um nome ao NPC.');
  if (nome.length > LIMITE_NOME_NPC) throw new InputError(`Nome com no máximo ${LIMITE_NOME_NPC} letras.`);
  const tipo = (TIPOS_NPC as readonly string[]).includes(raw.tipo as string) ? (raw.tipo as TipoNpc) : 'npc';
  const entrada = raw.dados && typeof raw.dados === 'object' ? (raw.dados as Record<string, unknown>) : {};
  const dados: DadosNpc = {};
  for (const c of CAMPOS_NPC[sistema]) dados[c.chave] = inteiro(entrada[c.chave], c);
  const ataques = typeof entrada.ataques === 'string' ? entrada.ataques.trim() : '';
  if (ataques.length > LIMITE_ATAQUES) throw new InputError(`Ataques com no máximo ${LIMITE_ATAQUES} letras.`);
  dados.ataques = ataques;
  const notas = typeof raw.notas === 'string' ? raw.notas.trim() : '';
  if (notas.length > LIMITE_NOTAS_NPC) throw new InputError(`Notas com no máximo ${LIMITE_NOTAS_NPC} letras.`);
  return { nome, tipo, dados, notas };
}

/** Os dados guardados voltam ao formato do sistema atual, com padrão no que faltar (a campanha pode trocar de sistema). */
export function dadosDoSistema(dados: unknown, sistema: SistemaCampanha): DadosNpc {
  const d = dados && typeof dados === 'object' ? (dados as Record<string, unknown>) : {};
  const out: DadosNpc = {};
  for (const c of CAMPOS_NPC[sistema]) {
    const n = Number(d[c.chave]);
    out[c.chave] = Number.isInteger(n) && n >= c.min && n <= c.max ? n : c.padrao;
  }
  out.ataques = typeof d.ataques === 'string' ? d.ataques : '';
  return out;
}

/** "Segurança" + 3 cópias → Segurança 1, Segurança 2, Segurança 3. */
export function nomesDasCopias(nome: string, copias: number): string[] {
  const base = nome.replace(/\s+\d+$/, '').trim() || nome;
  return Array.from({ length: copias }, (_, i) => `${base} ${i + 1}`.slice(0, LIMITE_NOME_NPC));
}

export function lerCopias(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_COPIAS) throw new InputError(`Faça de 1 a ${MAX_COPIAS} cópias.`);
  return n;
}
