"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { CONFIG, ERROS } from "@/lib/cartas-do-conves/config";
import { CONTEUDO } from "@/lib/cartas-do-conves/conteudo";
import { abandonarRun, colecaoDe, concluirRun, criarRun, gravarAndamento, lerRunAtual, registrarRunAndamento, registrarRunTerminada } from "@/lib/cartas-do-conves/dados";
import { conferirEnvio } from "@/lib/cartas-do-conves/envio";
import { novaSeed } from "@/lib/cartas-do-conves/rng";
import { migrar } from "@/lib/cartas-do-conves/save";
import { liberacoes, simular } from "@/lib/cartas-do-conves/simular";
import type { Acao, ResultadoPartida } from "@/lib/cartas-do-conves/tipos";
import { dentroDoLimite } from "@/lib/limite";

export type RunPublica = { seed: string; oficio: string; colecao: string[]; acoes: Acao[] };
export type Carregado = { logado: boolean; colecao: string[]; run: RunPublica | null };
export type Falha = { ok: false; erro: string; semConta?: boolean };
export type Concluida = { resultado: ResultadoPartida; novas: string[]; colecao: string[] };

async function limite(nome: string, max: number, janelaSeg: number) {
  const req = new Request("http://servidor.local", { headers: await headers() });
  return dentroDoLimite(`cdc-${nome}`, req, max, janelaSeg);
}

/** Estado inicial da tela: coleção da conta e travessia em andamento (se houver). */
export async function carregarConves(): Promise<Carregado> {
  const user = await getUser();
  if (!user) return { logado: false, colecao: [], run: null };
  try {
    const [colecao, run] = await Promise.all([colecaoDe(user.id), lerRunAtual(user.id)]);
    return { logado: true, colecao, run: run && { seed: run.seed, oficio: run.oficio, colecao: run.colecao, acoes: run.acoes } };
  } catch (e) {
    console.error("Não deu pra carregar o Cartas do Convés:", e);
    return { logado: true, colecao: [], run: null };
  }
}

/** Começa uma travessia na conta. A seed nasce no servidor, então ninguém escolhe o mapa. */
export async function novaTravessiaConta(oficio: string): Promise<({ ok: true; run: RunPublica } & { colecao: string[] }) | Falha> {
  const user = await getUser();
  if (!user) return { ok: false, erro: ERROS.semConta, semConta: true };
  if (typeof oficio !== "string" || !CONTEUDO.oficios.some((o) => o.id === oficio)) return { ok: false, erro: ERROS.generico };
  if (!(await limite("nova", CONFIG.limites.nova.max, CONFIG.limites.nova.janelaSeg))) return { ok: false, erro: ERROS.limite };
  try {
    const colecao = await colecaoDe(user.id);
    const seed = novaSeed();
    await criarRun(user.id, seed, oficio, colecao);
    return { ok: true, run: { seed, oficio, colecao, acoes: [] }, colecao };
  } catch (e) {
    console.error("Não deu pra começar a travessia:", e);
    return { ok: false, erro: ERROS.generico };
  }
}

export async function abandonarTravessiaConta(): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };
  try {
    await abandonarRun(user.id);
    return { ok: true };
  } catch (e) {
    console.error("Não deu pra abandonar a travessia:", e);
    return { ok: false };
  }
}

/**
 * O cliente manda a lista de ações da travessia. O servidor refaz a partida do zero a partir da seed que ele mesmo guardou:
 * resultado, recompensas e cartas liberadas saem dessa re-simulação, nunca do que o cliente diz.
 */
export async function enviarAcoesConta(acoes: unknown): Promise<({ ok: true; andamento: boolean } & Partial<Concluida>) | Falha> {
  const user = await getUser();
  if (!user) return { ok: false, erro: ERROS.semConta, semConta: true };
  if (!(await limite("envio", CONFIG.limites.envio.max, CONFIG.limites.envio.janelaSeg))) return { ok: false, erro: ERROS.limite };
  try {
    const run = await lerRunAtual(user.id);
    if (!run) return { ok: false, erro: ERROS.generico };
    const c = conferirEnvio(run, acoes);
    if (!c.ok) {
      console.warn(`Cartas do Convés: envio recusado (${c.detalhe ?? c.erro})`);
      return { ok: false, erro: ERROS.invalida };
    }
    if (c.resumo.resultado === "andamento") {
      await gravarAndamento(run.id, user.id, c.acoes, c.estado);
      return { ok: true, andamento: true };
    }
    const antes = await colecaoDe(user.id);
    await concluirRun(run.id, user.id, c.acoes, c.estado, c.resumo, c.liberadas);
    const depois = await colecaoDe(user.id);
    return { ok: true, andamento: false, resultado: c.resumo.resultado, novas: depois.filter((s) => !antes.includes(s)), colecao: depois };
  } catch (e) {
    console.error("Não deu pra guardar a travessia:", e);
    return { ok: false, erro: ERROS.generico };
  }
}

/**
 * Ao criar a conta, a partida jogada sem login sobe pra ela. Também é re-simulada: o que vale é o que o motor reproduz.
 * Partida local sempre usa só as cartas iniciais (coleção vazia), então a re-simulação é igual à que o aparelho fez.
 */
export async function migrarLocalConta(bruto: unknown): Promise<({ ok: true; resultado: ResultadoPartida; novas: string[]; colecao: string[] }) | Falha> {
  const user = await getUser();
  if (!user) return { ok: false, erro: ERROS.semConta, semConta: true };
  if (!(await limite("migra", CONFIG.limites.nova.max, CONFIG.limites.nova.janelaSeg))) return { ok: false, erro: ERROS.limite };
  const save = migrar(bruto);
  if (!save) return { ok: false, erro: ERROS.invalida };
  const s = simular({ seed: save.seed, oficio: save.oficio, colecao: [], acoes: save.acoes });
  if (!s.ok) return { ok: false, erro: ERROS.invalida };
  try {
    const antes = await colecaoDe(user.id);
    if (s.resumo.resultado === "andamento") {
      // Só sobe se a conta não tiver travessia em andamento. A que já está lá não é sobrescrita.
      await registrarRunAndamento(user.id, save.seed, save.oficio, save.acoes, s.estado);
    } else {
      await registrarRunTerminada(user.id, save.seed, save.oficio, save.acoes, s.estado, s.resumo, liberacoes(s.resumo));
    }
    const depois = await colecaoDe(user.id);
    return { ok: true, resultado: s.resumo.resultado, novas: depois.filter((x) => !antes.includes(x)), colecao: depois };
  } catch (e) {
    console.error("Não deu pra migrar a partida local:", e);
    return { ok: false, erro: ERROS.generico };
  }
}
