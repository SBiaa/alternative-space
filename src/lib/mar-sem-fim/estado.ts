// Estado do pirata e as contas que não dependem de tela: limites do barco, efeitos com teto e criação do pirata.
// Tudo aqui é puro: (estado, entrada) -> novo estado. Nada de relógio, rede ou banco.

import { APARENCIA, CATALOGO, ILHA, MUNDO, OFICIOS, marDe, melhoriaDe, oficioDe } from "./conteudo";
import { VERSAO_SAVE, type Aparencia, type Bandeira, type Efeitos, type Estado, type ProgressoIlha } from "./tipos";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function limitesDoBarco(e: Estado) {
  let casco = MUNDO.barco.cascoBase;
  let mantimentos = MUNDO.barco.mantimentosBase;
  for (const id of e.barco.melhorias) {
    const ef = melhoriaDe(id)?.efeito;
    casco += ef?.cascoMax ?? 0;
    mantimentos += ef?.mantimentosMax ?? 0;
  }
  return { casco, mantimentos };
}

/** Multiplicador de tempo vindo das melhorias (velas). */
export const tempoDasMelhorias = (e: Estado) => e.barco.melhorias.reduce((m, id) => m * (melhoriaDe(id)?.efeito.tempo ?? 1), 1);

export const emViagem = (e: Estado) => e.viagem !== null && !e.viagem.resolvida;

export const ordemDaAgulha = MUNDO.agulha.ordem;

/** Ouro e recompensa que a ilha ainda pode dar. */
export const restanteDaIlha = (slug: string, p: ProgressoIlha | undefined) => {
  const teto = ILHA[slug]?.recompensaMax ?? { ouro: 0, recompensa: 0 };
  return { ouro: Math.max(0, teto.ouro - (p?.ganhoOuro ?? 0)), recompensa: Math.max(0, teto.recompensa - (p?.ganhoRecompensa ?? 0)) };
};

export type TetoDeGanho = { ouro: number; recompensa: number };

/**
 * Aplica efeitos ao estado. `teto` limita quanto ouro e recompensa POSITIVOS entram (teto da ilha ou do evento);
 * o que entrou de fato é devolvido em `ganho`, pra quem chama registrar. Perdas nunca passam de zero.
 */
export function aplicarEfeitos(e: Estado, ef: Efeitos | undefined, teto?: TetoDeGanho): { estado: Estado; ganho: { ouro: number; recompensa: number } } {
  const ganho = { ouro: 0, recompensa: 0 };
  if (!ef) return { estado: e, ganho };
  const lim = limitesDoBarco(e);
  const n: Estado = { ...e, barco: { ...e.barco }, agulha: { ...e.agulha }, itens: [...e.itens], aliados: [...e.aliados] };
  if (ef.ouro) {
    const d = ef.ouro > 0 ? Math.min(ef.ouro, teto?.ouro ?? ef.ouro) : ef.ouro;
    n.ouro = clamp(n.ouro + d, 0, MUNDO.economia.ouroMax);
    if (d > 0) ganho.ouro = d;
  }
  if (ef.recompensa) {
    const d = ef.recompensa > 0 ? Math.min(ef.recompensa, teto?.recompensa ?? ef.recompensa) : ef.recompensa;
    n.recompensa = clamp(n.recompensa + d, 0, MUNDO.economia.recompensaMax);
    if (d > 0) ganho.recompensa = d;
  }
  if (ef.casco) n.barco.casco = clamp(n.barco.casco + ef.casco, 0, lim.casco);
  if (ef.mantimentos) n.barco.mantimentos = clamp(n.barco.mantimentos + ef.mantimentos, 0, lim.mantimentos);
  if (ef.item && CATALOGO.itens[ef.item] && !n.itens.includes(ef.item)) n.itens.push(ef.item);
  if (ef.aliado && CATALOGO.aliados[ef.aliado] && !n.aliados.includes(ef.aliado)) n.aliados.push(ef.aliado);
  if (ef.agulha && ordemDaAgulha.includes(n.barco.ilhaAtual)) {
    n.agulha = { ilha: n.barco.ilhaAtual, carregada: true, desde: n.agulha.ilha === n.barco.ilhaAtual ? n.agulha.desde : 0 };
  }
  return { estado: n, ganho };
}

/** Garante que a próxima ilha da ordem da Agulha esteja liberada quando a Agulha está carregada. */
export function liberarPelaAgulha(e: Estado): Estado {
  const { ilha, carregada } = e.agulha;
  if (!carregada || !ilha) return e;
  const prox = ordemDaAgulha[ordemDaAgulha.indexOf(ilha) + 1];
  if (!prox || e.ilhas[prox]?.status !== "travada") return e;
  return { ...e, ilhas: { ...e.ilhas, [prox]: { ...e.ilhas[prox], status: "liberada" } } };
}

/** Ilha que a Agulha aponta agora (null = ainda carregando, ou o fim do Lado Manso). */
export function proximaDaAgulha(e: Estado): string | null {
  if (!e.agulha.carregada || !e.agulha.ilha) return null;
  return ordemDaAgulha[ordemDaAgulha.indexOf(e.agulha.ilha) + 1] ?? null;
}

export const progressoVazio = (status: ProgressoIlha["status"]): ProgressoIlha => ({ status, caminho: [], ganhoOuro: 0, ganhoRecompensa: 0 });

// ---------- criação ----------

const limpar = (s: unknown) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim() : "");
const idDe = (lista: { id: string }[], v: unknown) => (typeof v === "string" && lista.some((x) => x.id === v) ? v : null);

export type EntradaPirata = { nome: string; aparencia: Aparencia; mar: string; oficio: string; barco: string; bandeira: Bandeira; seed: string };
export type ErroCriacao = "nome" | "barco" | "aparencia" | "mar" | "oficio" | "bandeira" | "seed";

/** Valida o que veio do formulário (nada é confiável) e monta o pirata inicial. */
export function criarPirata(entrada: unknown, agora: number): { ok: true; estado: Estado } | { ok: false; erro: ErroCriacao } {
  const x = (entrada ?? {}) as Record<string, unknown>;
  const nome = limpar(x.nome);
  if (nome.length < APARENCIA.nome.min || nome.length > APARENCIA.nome.max) return { ok: false, erro: "nome" };
  const barcoNome = limpar(x.barco);
  if (barcoNome.length < APARENCIA.barco.min || barcoNome.length > APARENCIA.barco.max) return { ok: false, erro: "barco" };
  const a = (x.aparencia ?? {}) as Record<string, unknown>;
  const silhueta = idDe(APARENCIA.silhuetas, a.silhueta);
  const cor = idDe(APARENCIA.cores, a.cor);
  const chapeu = idDe(APARENCIA.chapeus, a.chapeu);
  const cicatriz = idDe(APARENCIA.cicatrizes, a.cicatriz);
  if (!silhueta || !cor || !chapeu || !cicatriz) return { ok: false, erro: "aparencia" };
  const mar = typeof x.mar === "string" ? marDe(x.mar) : undefined;
  if (!mar) return { ok: false, erro: "mar" };
  const oficio = idDe(OFICIOS, x.oficio);
  if (!oficio) return { ok: false, erro: "oficio" };
  const b = (x.bandeira ?? {}) as Record<string, unknown>;
  const fundo = idDe(APARENCIA.bandeira.fundos, b.fundo);
  const fundoCor = idDe(APARENCIA.bandeira.cores, b.fundoCor);
  const forma = idDe(APARENCIA.bandeira.formas, b.forma);
  const formaCor = idDe(APARENCIA.bandeira.cores, b.formaCor);
  if (!fundo || !fundoCor || !forma || !formaCor || fundoCor === formaCor) return { ok: false, erro: "bandeira" };
  const seed = typeof x.seed === "string" && /^[a-z0-9]{6,40}$/.test(x.seed) ? x.seed : null;
  if (!seed) return { ok: false, erro: "seed" };

  const lim = { casco: MUNDO.barco.cascoBase, mantimentos: MUNDO.barco.mantimentosBase };
  const ilhas: Estado["ilhas"] = {};
  for (const slug of Object.keys(ILHA)) ilhas[slug] = progressoVazio("travada");
  ilhas[mar.ilhaOrigem] = progressoVazio("visitada");
  ilhas[MUNDO.monte] = progressoVazio("liberada");

  return {
    ok: true,
    estado: {
      v: VERSAO_SAVE,
      versao: 1,
      seed,
      nome,
      aparencia: { silhueta, cor, chapeu, cicatriz },
      mar: mar.id,
      oficio,
      recompensa: 0,
      ouro: MUNDO.barco.ouroInicial + (mar.bonus.ouroInicial ?? 0),
      barco: {
        nome: barcoNome,
        bandeira: { fundo, fundoCor, forma, formaCor },
        casco: Math.round(lim.casco * MUNDO.barco.cascoInicialFracao),
        mantimentos: Math.round(lim.mantimentos * MUNDO.barco.mantimentosInicialFracao),
        melhorias: [],
        ilhaAtual: mar.ilhaOrigem,
      },
      agulha: { ilha: null, carregada: false, desde: 0 },
      ilhas,
      itens: [],
      aliados: [],
      viagens: 0,
      viagem: null,
      criadoEm: agora,
    },
  };
}

export const oficioDoEstado = (e: Estado) => oficioDe(e.oficio);
