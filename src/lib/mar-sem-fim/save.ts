// Save do Mar Sem Fim: schema (zod), migração de versão, checagem de coerência e a escolha entre o save local e o da conta.
// A coerência não é anti-trapaça de ranking (o jogo é solo): é pra não gravar na conta um save local com ouro ou recompensa
// que a história e os eventos jamais dariam.

import { z } from "zod";
import { CATALOGO, EVENTOS, ILHA, MELHORIAS, MUNDO, OFICIOS, marDe } from "./conteudo";
import { limitesDoBarco } from "./estado";
import { cenaAtual } from "./historias";
import { VERSAO_SAVE, type Estado } from "./tipos";

const id = z.string().min(1).max(60);
const ms = z.number().int().min(0).max(8_640_000_000_000_000);

const schemaProgresso = z.object({
  status: z.enum(["travada", "liberada", "visitada", "concluida"]),
  caminho: z.array(id).max(40),
  ganhoOuro: z.number().int().min(0).max(1_000_000),
  ganhoRecompensa: z.number().int().min(0).max(1_000_000_000),
  concluidaEm: ms.optional(),
});

const schemaViagem = z.object({
  numero: z.number().int().min(1),
  de: id,
  para: id,
  partiuEm: ms,
  chegaEm: ms,
  rota: z.array(id).min(2).max(20),
  vento: z.number().min(0.1).max(5),
  mantimentosGastos: z.number().min(0).max(100_000),
  faltouMantimento: z.boolean(),
  chegou: z.boolean(),
  eventos: z.array(z.object({ id, quando: z.number().min(0).max(1), escolha: id.nullable() })).max(10),
  resolvida: z.boolean(),
});

export const schemaEstado = z.object({
  v: z.number().int().min(1),
  versao: z.number().int().min(0),
  seed: z.string().regex(/^[a-z0-9]{6,40}$/),
  nome: z.string().min(1).max(40),
  aparencia: z.object({ silhueta: id, cor: id, chapeu: id, cicatriz: id }),
  mar: id,
  oficio: id,
  recompensa: z.number().int().min(0).max(MUNDO.economia.recompensaMax),
  ouro: z.number().int().min(0).max(MUNDO.economia.ouroMax),
  barco: z.object({
    nome: z.string().min(1).max(40),
    bandeira: z.object({ fundo: id, fundoCor: id, forma: id, formaCor: id }),
    casco: z.number().int().min(0).max(10_000),
    mantimentos: z.number().int().min(0).max(10_000),
    melhorias: z.array(id).max(20),
    ilhaAtual: id,
  }),
  agulha: z.object({ ilha: id.nullable(), carregada: z.boolean(), desde: ms }),
  ilhas: z.record(id, schemaProgresso),
  itens: z.array(id).max(100),
  aliados: z.array(id).max(100),
  viagens: z.number().int().min(0).max(1_000_000),
  viagem: schemaViagem.nullable(),
  criadoEm: ms,
});

/**
 * Leva um save de qualquer versão até a atual. Devolve null se não for um save válido.
 * Quando o formato mudar: some um `if (v < N)` aqui, sem apagar os anteriores, e suba VERSAO_SAVE.
 */
export function migrar(bruto: unknown): Estado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  const v = typeof dado.v === "number" ? dado.v : 1;
  if (v > VERSAO_SAVE) return null; // save de uma versão que este código ainda não conhece
  // v1 é a primeira versão: nada a converter ainda.
  dado.v = VERSAO_SAVE;
  const r = schemaEstado.safeParse(dado);
  return r.success ? (r.data as Estado) : null;
}

/** Maior ouro de uma opção de evento (com o bônus de ofício), pra estimar o que as viagens podem render. */
const ouroMaxPorEvento = () => {
  const base = Math.max(...EVENTOS.eventos.flatMap((e) => e.opcoes.map((o) => o.efeitos.ouro ?? 0)), 0);
  const extra = Math.max(...OFICIOS.map((o) => o.vantagem.evento?.efeitos.ouro ?? 0), 0);
  return base + extra;
};
const recompensaMaxPorEvento = MUNDO.economia.eventoRecompensaMax;

/** Sanidade do save: tudo referencia conteúdo que existe, histórias fazem sentido e ouro e recompensa cabem no que o jogo dá. */
export function saveCoerente(e: Estado): boolean {
  if (!marDe(e.mar) || !OFICIOS.some((o) => o.id === e.oficio)) return false;
  if (!ILHA[e.barco.ilhaAtual]) return false;
  if (e.barco.melhorias.some((m, i) => !MELHORIAS.some((x) => x.id === m && !x.emBreve) || e.barco.melhorias.indexOf(m) !== i)) return false;
  if (e.itens.some((i) => !CATALOGO.itens[i]) || e.aliados.some((a) => !CATALOGO.aliados[a])) return false;
  const lim = limitesDoBarco(e);
  if (e.barco.casco > lim.casco || e.barco.mantimentos > lim.mantimentos) return false;

  let ganhoOuro = 0;
  let ganhoRec = 0;
  for (const [slug, p] of Object.entries(e.ilhas)) {
    const ilha = ILHA[slug];
    if (!ilha) return false;
    const pos = cenaAtual(ilha, p.caminho);
    if (!pos) return false;
    if (p.status === "concluida" && !pos.terminou) return false;
    if (p.status !== "concluida" && pos.terminou && p.caminho.length > 0) return false;
    if (p.ganhoOuro > ilha.recompensaMax.ouro || p.ganhoRecompensa > ilha.recompensaMax.recompensa) return false;
    ganhoOuro += p.ganhoOuro;
    ganhoRec += p.ganhoRecompensa;
  }
  const eventos = e.viagens * MUNDO.navegacao.eventosMax;
  if (e.recompensa > ganhoRec + eventos * recompensaMaxPorEvento) return false;
  const ouroMax = MUNDO.barco.ouroInicial + (marDe(e.mar)?.bonus.ouroInicial ?? 0) + ganhoOuro + eventos * ouroMaxPorEvento();
  if (e.ouro > ouroMax) return false;
  return true;
}

/** Pontos de avanço, pra decidir qual save ganha: ilhas concluídas pesam mais, depois viagens, depois recompensa. */
export const avanco = (e: Estado) =>
  Object.values(e.ilhas).filter((p) => p.status === "concluida").length * 1e12 + e.viagens * 1e9 + Math.min(e.recompensa, 1e9 - 1);

/** Entre o save do aparelho e o da conta, o mais avançado vence. */
export function escolherSave(local: Estado | null, remoto: Estado | null): { save: Estado | null; origem: "local" | "remoto" | "nenhum" } {
  if (!local && !remoto) return { save: null, origem: "nenhum" };
  if (!remoto) return { save: local, origem: "local" };
  if (!local) return { save: remoto, origem: "remoto" };
  return avanco(local) > avanco(remoto) ? { save: local, origem: "local" } : { save: remoto, origem: "remoto" };
}

/**
 * Prepara o save do navegador pra ir pra conta: migra, confere a coerência e solta uma viagem que estava no meio
 * (o relógio do aparelho não vale no servidor). Devolve null se o save não passar.
 */
export function prepararMigracaoLocal(bruto: unknown): Estado | null {
  const e = migrar(bruto);
  if (!e || !saveCoerente(e)) return null;
  return { ...e, viagem: null, versao: 1 };
}
