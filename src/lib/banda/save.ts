// Save da banda: schema (zod), migração de versão e checagem de integridade. Não é anti-trapaça (o jogo é solo
// e sem ranking): é pra não gravar um save quebrado ou que anda pra trás.

import { z } from "zod";
import { escolherMaisAvancado } from "../gestao/save";
import { ACOES, BANDA, COMPOR, ESTILOS, MANIAS, PALCOS, PAPEIS } from "./config";
import type { Progresso } from "./tipos";

const inteiro = (max: number) => z.number().int().min(0).max(max);
const cor = z.enum(BANDA.logo.cores as unknown as [string, ...string[]]);
const forma = z.enum(BANDA.logo.formas as unknown as [string, ...string[]]);
const papel = z.enum(PAPEIS as [string, ...string[]]);
const nomeCurto = z.string().min(1).max(BANDA.tituloMax);

const integrante = z.object({
  id: z.string().min(1).max(24),
  nome: z.string().min(1).max(30),
  papel,
  tecnica: inteiro(100),
  presenca: inteiro(100),
  criatividade: inteiro(100),
  humor: inteiro(100),
  cansaco: inteiro(100),
  mania: z.enum(MANIAS.map((m) => m.id) as [string, ...string[]]),
  silhueta: inteiro(BANDA.silhuetas - 1),
  avisoSemana: z.number().int().min(1).max(100_000).nullable(),
});

const musica = z.object({
  slot: z.number().int().min(1).max(COMPOR.maxMusicas),
  titulo: nomeCurto,
  estrutura: z.object({ id: z.string().max(20), secoes: z.array(z.object({ nome: z.string().max(12), compassos: z.number().int().min(1).max(64) })).min(1).max(16) }),
  clima: z.string().max(20),
  bpm: z.number().int().min(40).max(260),
  tema: z.string().max(20),
  nota: inteiro(100),
  semana: z.number().int().min(1).max(100_000),
});

const show = z.object({
  semana: z.number().int().min(1).max(100_000),
  palco: z.enum(PALCOS.map((p) => p.slug) as [string, ...string[]]),
  repertorio: z.array(z.number().int().min(1).max(COMPOR.maxMusicas)).min(1).max(8),
  publico: inteiro(100_000),
  cache: inteiro(1_000_000),
  famaDelta: z.number().int().min(-100).max(100),
  nota: inteiro(100),
  energia: inteiro(100),
  momentos: z.array(z.string().max(40)).max(6),
});

export const schemaProgresso = z.object({
  v: z.number().int().min(1),
  nome: z.string().min(1).max(BANDA.nomeMax),
  estilo: z.enum(ESTILOS.map((e) => e.id) as [string, ...string[]]),
  logo: z.object({ forma, corFundo: cor, corForma: cor }),
  dinheiro: inteiro(100_000_000),
  fama: inteiro(100),
  entrosamento: inteiro(100),
  semana: z.number().int().min(1).max(100_000),
  dia: inteiro(BANDA.diasDeSemana),
  agenda: z.array(z.enum(ACOES as unknown as [string, ...string[]])).max(BANDA.diasDeSemana),
  divulgacao: inteiro(100),
  demo: z.boolean(),
  seed: z.string().min(1).max(40),
  membros: z.array(integrante).length(PAPEIS.length),
  equipamento: z.object({ instrumentos: inteiro(100), amplificador: inteiro(100), cabos: inteiro(100) }),
  musicas: z.array(musica).max(COMPOR.maxMusicas),
  shows: z.array(show).max(BANDA.historicoShowsLocal),
});

/**
 * Leva um save de qualquer versão antiga até a atual. Devolve null se não for um save válido.
 * Quando o formato mudar: some um `if (v < N)` aqui, sem apagar os anteriores, e suba BANDA.versaoSave.
 */
export function migrar(bruto: unknown): Progresso | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  const v = typeof dado.v === "number" ? dado.v : 1;
  if (v > BANDA.versaoSave) return null;
  // v1 é a primeira versão: nada a converter ainda.
  dado.v = BANDA.versaoSave;
  const r = schemaProgresso.safeParse(dado);
  return r.success ? (r.data as Progresso) : null;
}

/** Quanto o save "andou": semanas e dias. Só pra escolher o mais avançado. */
export const passoDe = (p: Progresso) => (p.semana - 1) * (BANDA.diasDeSemana + 1) + p.dia;

/**
 * Sanidade do save: um integrante por papel, agenda do tamanho do dia, músicas e shows que cabem no tempo jogado,
 * demo só com as músicas boas, dinheiro dentro do que o jogo permite ganhar.
 */
export function saveCoerente(p: Progresso): boolean {
  if (PAPEIS.some((r) => p.membros.filter((m) => m.papel === r).length !== 1)) return false;
  if (new Set(p.membros.map((m) => m.nome)).size !== p.membros.length) return false;
  if (p.agenda.length !== p.dia) return false;
  const diasJogados = (p.semana - 1) * BANDA.diasDeSemana + p.dia;
  if (p.musicas.length > diasJogados) return false;
  if (p.musicas.some((m, i) => m.slot !== i + 1 || m.semana > p.semana)) return false;
  if (new Set(p.musicas.map((m) => m.titulo.toLowerCase())).size !== p.musicas.length) return false;
  if (p.shows.some((s) => s.semana >= p.semana || s.repertorio.some((r) => r > p.musicas.length))) return false;
  if (p.demo && p.musicas.filter((m) => m.nota >= COMPOR.notaBoa).length < COMPOR.musicasParaDemo) return false;
  const maxCachePorShow = Math.max(...PALCOS.map((x) => x.cacheBase));
  const tetoPorSemana = 90 * BANDA.diasDeSemana + maxCachePorShow;
  return p.dinheiro <= BANDA.dinheiroInicial + (p.semana - 1) * tetoPorSemana + p.dia * 90;
}

/** Entre o save do aparelho e o da conta, o mais avançado vence. Empate: a conta. */
export const escolherSave = (local: Progresso | null, remoto: Progresso | null) => escolherMaisAvancado(local, remoto, passoDe);
