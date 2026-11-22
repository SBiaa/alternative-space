// Regras da semana: efeito de cada ação, humor, cansaço, briga, composição e conserto.
// TypeScript puro e determinístico: a mesma seed, semana e dia dão sempre o mesmo resultado. Sem Math.random.

import { sortear } from "../gestao/rng";
import { gerarCandidatos, comoIntegrante } from "./candidatos";
import {
  ACOES, BANDA, BRIGA, CLIMAS, COMPOR, CONSERTO, DEMO, ESTILOS, ESTRUTURAS, EFEITOS, HUMOR, MANIAS, PARTES_EQUIP, TEMAS, VARIACAO_TRABALHO,
} from "./config";
import { NOMES_MUSICAS } from "./conteudo";
import type { AcaoDia, Equipamento, Integrante, Musica, ParteEquip, Progresso, ResultadoDia } from "./tipos";

export const limitar = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const mania = (m: Integrante) => MANIAS.find((x) => x.id === m.mania);
/** Rótulo de sorteio do dia: a semana e o dia entram na conta, então cada dia tem a sua sorte. */
export const noiteDe = (p: Progresso) => p.semana * 10 + p.dia;
export const media = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
export const equipamentoMedio = (e: Equipamento) => media(PARTES_EQUIP.map((k) => e[k]));
export const humorMedio = (p: Progresso) => media(p.membros.map((m) => m.humor));
export const ehAcao = (a: unknown): a is AcaoDia => typeof a === "string" && (ACOES as string[]).includes(a);
export const ehParte = (a: unknown): a is ParteEquip => typeof a === "string" && (PARTES_EQUIP as string[]).includes(a);

export const musicasBoas = (p: Progresso) => p.musicas.filter((m) => m.nota >= COMPOR.notaBoa);
export const cansados = (p: Progresso) => p.membros.filter((m) => m.cansaco > HUMOR.limiarCansaco);
export const emRisco = (m: Integrante) => m.humor <= HUMOR.aviso;

/** Aplica o efeito da ação nos integrantes e nos recursos da banda. Não passa o dia. */
function aplicarEfeito(p: Progresso, acao: AcaoDia): Progresso {
  const ef = EFEITOS[acao];
  const r = sortear(p.seed, noiteDe(p), "trabalho");
  const dinheiro = acao === "trabalhar" ? Math.round(ef.dinheiro * (1 + VARIACAO_TRABALHO * (2 * r - 1))) : ef.dinheiro;
  const equipamento = { ...p.equipamento };
  for (const k of PARTES_EQUIP) equipamento[k] = limitar(equipamento[k] - (ef.desgaste[k] ?? 0));
  return {
    ...p,
    dinheiro: p.dinheiro + dinheiro,
    fama: limitar(p.fama + ef.fama),
    entrosamento: limitar(p.entrosamento + ef.entrosamento),
    divulgacao: limitar(p.divulgacao + ef.divulgacao),
    equipamento,
    membros: p.membros.map((m) => ({
      ...m,
      tecnica: limitar(m.tecnica + Math.round(ef.tecnica * (acao === "ensaiar" ? mania(m)?.ensaio ?? 1 : 1))),
      criatividade: limitar(m.criatividade + ef.criatividade),
      humor: limitar(m.humor + ef.humor),
      cansaco: limitar(m.cansaco + ef.cansaco),
    })),
  };
}

/** Fim do dia: o cansaço pesa no humor, pode dar briga, o aviso de humor baixo aparece e o dia passa. */
function passarDia(p: Progresso, acao: AcaoDia): { prog: Progresso; aviso: string[]; briga: { a: string; b: string } | null } {
  let membros = p.membros.map((m) => ({
    ...m,
    humor: limitar(Math.round(m.humor - Math.max(0, m.cansaco - HUMOR.limiarCansaco) * HUMOR.quedaPorCansaco)),
  }));
  let entrosamento = p.entrosamento;
  let briga: { a: string; b: string } | null = null;

  // Briga: só com dois ou mais integrantes cansados. A chance sobe com quantos estão cansados.
  const idx = membros.map((m, i) => (m.cansaco > HUMOR.limiarCansaco ? i : -1)).filter((i) => i >= 0);
  if (idx.length >= 2) {
    const chance = Math.min(BRIGA.maxChance, BRIGA.base + BRIGA.porIntegranteCansado * idx.length);
    if (sortear(p.seed, noiteDe(p), "briga") < chance) {
      const a = idx[Math.floor(sortear(p.seed, noiteDe(p), "briga:a") * idx.length)];
      const resto = idx.filter((i) => i !== a);
      const b = resto[Math.floor(sortear(p.seed, noiteDe(p), "briga:b") * resto.length)];
      entrosamento = limitar(entrosamento - BRIGA.entrosamentoPerde);
      membros = membros.map((m, i) => (i === a || i === b ? { ...m, humor: limitar(m.humor - BRIGA.humorPerde) } : m));
      briga = { a: membros[a].nome, b: membros[b].nome };
    }
  }

  // Aviso: quem chegou ao humor de risco é avisado (uma vez). Quem se recuperou perde o aviso.
  const aviso: string[] = [];
  membros = membros.map((m) => {
    if (m.humor <= HUMOR.aviso && m.avisoSemana === null) {
      aviso.push(m.nome);
      return { ...m, avisoSemana: p.semana };
    }
    if (m.humor > HUMOR.aviso + 15 && m.avisoSemana !== null) return { ...m, avisoSemana: null };
    return m;
  });

  return { prog: { ...p, membros, entrosamento, dia: p.dia + 1, agenda: [...p.agenda, acao] }, aviso, briga };
}

/** Uma ação do dia (menos compor, que tem tela própria e usa compor()). */
export function fazerDia(p: Progresso, acao: unknown): ResultadoDia {
  if (!ehAcao(acao) || acao === "compor") return { ok: false, erro: "invalido" };
  if (p.dia >= BANDA.diasDeSemana) return { ok: false, erro: "semDia" };
  if (p.dinheiro + EFEITOS[acao].dinheiro < 0) return { ok: false, erro: "dinheiro" };
  const r = passarDia(aplicarEfeito(p, acao), acao);
  return { ok: true, ...r };
}

/** Conserto do equipamento: gasta dinheiro, não gasta dia. */
export function consertar(p: Progresso, parte: unknown): { ok: true; prog: Progresso; custo: number } | { ok: false; erro: "invalido" | "equipOk" | "dinheiro" } {
  if (!ehParte(parte)) return { ok: false, erro: "invalido" };
  const ganho = Math.min(CONSERTO.ganho, CONSERTO.max - p.equipamento[parte]);
  if (ganho <= 0) return { ok: false, erro: "equipOk" };
  const custo = ganho * CONSERTO.custoPorPonto;
  if (p.dinheiro < custo) return { ok: false, erro: "dinheiro" };
  return { ok: true, custo, prog: { ...p, dinheiro: p.dinheiro - custo, equipamento: { ...p.equipamento, [parte]: p.equipamento[parte] + ganho } } };
}

// ---------- composição ----------

export type EscolhasComposicao = { estrutura: string; clima: string; tema: string; titulo: string };

/** Três sugestões de nome pro tema, sorteadas pela seed (sem repetir os que a banda já usou). */
export function sugerirTitulos(p: Progresso, tema: string): string[] {
  const usados = new Set(p.musicas.map((m) => m.titulo.toLowerCase()));
  const lista = (NOMES_MUSICAS[tema] ?? []).filter((t) => !usados.has(t.toLowerCase()));
  return lista
    .map((t, i) => ({ t, r: sortear(p.seed, noiteDe(p), `titulo:${tema}:${i}`) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, COMPOR.sugestoes)
    .map((x) => x.t);
}

export function talentoDaBanda(p: Progresso): number {
  return media(p.membros.map((m) => (m.criatividade * COMPOR.pesoCriatividade + m.tecnica * COMPOR.pesoTecnica) / 100));
}

/** Nota (0 a 100) e BPM de uma música. */
export function calcularMusica(p: Progresso, estrutura: string, clima: string): { nota: number; bpm: number } | null {
  const est = ESTRUTURAS.find((e) => e.id === estrutura);
  const cl = CLIMAS.find((c) => c.id === clima);
  const estilo = ESTILOS.find((e) => e.id === p.estilo);
  if (!est || !cl || !estilo) return null;
  const talento = COMPOR.talentoPiso + (1 - COMPOR.talentoPiso) * talentoDaBanda(p);
  const humor = COMPOR.humorFatorMin + (COMPOR.humorFatorMax - COMPOR.humorFatorMin) * (humorMedio(p) / 100);
  const ruido = (2 * sortear(p.seed, noiteDe(p), "compor") - 1) * COMPOR.ruido;
  const nota = limitar(Math.round(est.base * (estilo.afinidade[cl.id] ?? 1) * talento * humor * (1 + ruido)));
  const bpm = limitar(Math.round(estilo.bpm + cl.bpm + (2 * sortear(p.seed, noiteDe(p), "bpm") - 1) * 5), 60, 220);
  return { nota, bpm };
}

export const tituloValido = (t: unknown): t is string => typeof t === "string" && t.trim().length >= 1 && t.trim().length <= BANDA.tituloMax && !/[\u0000-\u001f]/.test(t);

/** Compor gasta o dia. A nota sai do estado da banda antes do efeito do dia. */
export function compor(p: Progresso, esc: EscolhasComposicao): ResultadoDia {
  if (!esc || typeof esc !== "object") return { ok: false, erro: "invalido" };
  if (p.dia >= BANDA.diasDeSemana) return { ok: false, erro: "semDia" };
  if (!TEMAS.includes(esc.tema)) return { ok: false, erro: "invalido" };
  if (!tituloValido(esc.titulo)) return { ok: false, erro: "titulo" };
  const titulo = esc.titulo.trim().replace(/\s+/g, " ");
  if (p.musicas.some((m) => m.titulo.toLowerCase() === titulo.toLowerCase())) return { ok: false, erro: "titulo" };
  if (p.musicas.length >= COMPOR.maxMusicas) return { ok: false, erro: "invalido" };
  const calc = calcularMusica(p, esc.estrutura, esc.clima);
  if (!calc) return { ok: false, erro: "invalido" };
  const est = ESTRUTURAS.find((e) => e.id === esc.estrutura)!;
  const musica: Musica = {
    slot: p.musicas.length + 1,
    titulo,
    estrutura: { id: est.id, secoes: est.secoes.map((s) => ({ ...s })) },
    clima: esc.clima,
    bpm: calc.bpm,
    tema: esc.tema,
    nota: calc.nota,
    semana: p.semana,
  };
  const dia = passarDia(aplicarEfeito(p, "compor"), "compor");
  return { ok: true, ...dia, prog: { ...dia.prog, musicas: [...p.musicas, musica] }, musica };
}

// ---------- demo ----------

export function gravarDemo(p: Progresso): { ok: true; prog: Progresso } | { ok: false; erro: "demoJa" | "demoRequisito" | "dinheiro" } {
  if (p.demo) return { ok: false, erro: "demoJa" };
  if (musicasBoas(p).length < COMPOR.musicasParaDemo) return { ok: false, erro: "demoRequisito" };
  if (p.dinheiro < DEMO.custo) return { ok: false, erro: "dinheiro" };
  return { ok: true, prog: { ...p, demo: true, dinheiro: p.dinheiro - DEMO.custo, fama: limitar(p.fama + DEMO.famaBonus) } };
}

// ---------- substituição ----------

/** Quem entra no lugar de quem saiu: um candidato novo do mesmo papel, com nome que ainda não está na banda. */
export function substituto(p: Progresso, saiu: Integrante): Integrante {
  const nomes = new Set(p.membros.map((m) => m.nome));
  for (let tentativa = 1; tentativa <= 8; tentativa++) {
    const c = gerarCandidatos(p.seed, saiu.papel, BANDA.candidatosPorPapel, p.semana + tentativa).find((x) => !nomes.has(x.nome));
    if (c) return { ...comoIntegrante(c), id: `${saiu.papel}-s${p.semana}`, humor: HUMOR.humorSubstituto };
  }
  const c = gerarCandidatos(p.seed, saiu.papel, 1, p.semana)[0];
  return { ...comoIntegrante(c), id: `${saiu.papel}-s${p.semana}`, humor: HUMOR.humorSubstituto };
}
