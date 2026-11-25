"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { dentroDoLimite } from "@/lib/limite";
import { aplicarAcao, lerAcao } from "@/lib/mar-sem-fim/acoes";
import { MUNDO } from "@/lib/mar-sem-fim/conteudo";
import { gravarEstado, gravarPirataInteiro, lerEstado, type EventoJogo } from "@/lib/mar-sem-fim/dados";
import { criarPirata, type ErroCriacao } from "@/lib/mar-sem-fim/estado";
import { escolherSave, prepararMigracaoLocal } from "@/lib/mar-sem-fim/save";
import type { ErroJogo, Estado } from "@/lib/mar-sem-fim/tipos";

// Os textos de erro ficam em content/mar-sem-fim/textos.json; aqui só vão os códigos.
export type ErroMar = ErroJogo | ErroCriacao | "sem-conta" | "limite" | "conflito" | "generico" | "ja-existe";
export type RespostaMar = { ok: true; estado: Estado; agora: number } | { ok: false; erro: ErroMar; estado?: Estado; agora?: number };

/** Estado inicial da tela. `agora` é a hora do servidor, pro cliente acertar o relógio de exibição. */
export async function carregarMar(): Promise<{ logado: boolean; estado: Estado | null; agora: number }> {
  const user = await getUser();
  const agora = Date.now();
  if (!user) return { logado: false, estado: null, agora };
  try {
    return { logado: true, estado: await lerEstado(user.id), agora };
  } catch (e) {
    console.error("Não deu pra carregar o Mar Sem Fim:", e);
    return { logado: true, estado: null, agora };
  }
}

async function limiteOk(userId: string) {
  const req = { headers: await headers() } as Request;
  return dentroDoLimite(`mar-sem-fim:${userId}`, req, MUNDO.limiteAcoes.max, MUNDO.limiteAcoes.janelaSeg);
}

/** Cria o pirata da conta. Um por usuário. */
export async function criarPirataConta(entrada: unknown): Promise<RespostaMar> {
  const user = await getUser();
  if (!user) return { ok: false, erro: "sem-conta" };
  if (!(await limiteOk(user.id))) return { ok: false, erro: "limite" };
  try {
    if (await lerEstado(user.id)) return { ok: false, erro: "ja-existe" };
    const r = criarPirata(entrada, Date.now());
    if (!r.ok) return { ok: false, erro: r.erro };
    await gravarPirataInteiro(user.id, r.estado, false);
    return { ok: true, estado: (await lerEstado(user.id)) ?? r.estado, agora: Date.now() };
  } catch (e) {
    console.error("Não deu pra criar o pirata:", e);
    return { ok: false, erro: "generico" };
  }
}

/** Eventos de produto que cada ação deixa na tabela events (viagem começou, chegou, ilha concluída). */
function eventosDaAcao(antes: Estado, depois: Estado): EventoJogo[] {
  const out: EventoJogo[] = [];
  if (depois.viagem && depois.viagens > antes.viagens) out.push({ kind: "voyage_started", payload: { de: depois.viagem.de, para: depois.viagem.para, numero: depois.viagem.numero } });
  if (depois.viagem?.chegou && !antes.viagem?.chegou) out.push({ kind: "voyage_arrived", payload: { ilha: depois.viagem.para, numero: depois.viagem.numero } });
  for (const [slug, p] of Object.entries(depois.ilhas)) {
    if (p.status === "concluida" && antes.ilhas[slug]?.status !== "concluida") {
      out.push({ kind: "game_played", payload: { ilha: slug, recompensa: p.ganhoRecompensa, ouro: p.ganhoOuro } });
    }
  }
  return out;
}

/**
 * Qualquer ação do jogo (zarpar, chegar, escolher, comprar...). O servidor lê o estado, roda a regra com o relógio dele
 * e grava. O cliente só diz o que quer fazer: nunca manda saldo, recompensa nem hora.
 */
export async function executarAcaoMar(bruta: unknown): Promise<RespostaMar> {
  const acao = lerAcao(bruta);
  if (!acao) return { ok: false, erro: "invalido" };
  const user = await getUser();
  if (!user) return { ok: false, erro: "sem-conta" };
  if (!(await limiteOk(user.id))) return { ok: false, erro: "limite" };
  try {
    const antes = await lerEstado(user.id);
    if (!antes) return { ok: false, erro: "sem-ilha" };
    const agora = Date.now();
    const r = aplicarAcao(antes, acao, agora);
    if (!r.ok) return { ok: false, erro: r.erro, estado: antes, agora };
    const gravou = await gravarEstado(user.id, antes, r.estado, eventosDaAcao(antes, r.estado));
    if (!gravou) {
      const atual = await lerEstado(user.id);
      return { ok: false, erro: "conflito", estado: atual ?? antes, agora: Date.now() };
    }
    return { ok: true, estado: { ...r.estado, versao: antes.versao + 1 }, agora };
  } catch (e) {
    console.error("Não deu pra gravar a ação do Mar Sem Fim:", e);
    return { ok: false, erro: "generico" };
  }
}

/** Logo depois de criar a conta: leva o pirata do navegador pra conta (o mais avançado vence). */
export async function migrarSaveLocalMar(bruto: unknown): Promise<RespostaMar> {
  const user = await getUser();
  if (!user) return { ok: false, erro: "sem-conta" };
  if (!(await limiteOk(user.id))) return { ok: false, erro: "limite" };
  try {
    const local = prepararMigracaoLocal(bruto);
    const remoto = await lerEstado(user.id);
    const { save, origem } = escolherSave(local, remoto);
    if (!save) return { ok: false, erro: "invalido" };
    if (origem === "local") await gravarPirataInteiro(user.id, { ...save, viagem: null, versao: 1 }, remoto !== null);
    return { ok: true, estado: (await lerEstado(user.id)) ?? save, agora: Date.now() };
  } catch (e) {
    console.error("Não deu pra migrar o save local do Mar Sem Fim:", e);
    return { ok: false, erro: "generico" };
  }
}
