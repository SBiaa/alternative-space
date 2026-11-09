"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/auth/server";
import { ANO, noDiario, semana } from "@/lib/diario/calendario";
import * as d from "@/lib/diario/dados";
import type { Legenda } from "@/lib/diario/dados";
import {
  type AlvoQuest,
  COR_HEX,
  STATUS_ITEM,
  TIPOS_ITEM,
  type StatusItem,
  type TipoItem,
  statusValido,
  textoValido,
} from "@/lib/diario/regras";

// Cada ação confere quem está logado; as consultas em dados.ts filtram tudo pelo dono.
export type Resposta = { error?: string; id?: string } | undefined;

const SEM_LOGIN = { error: "Sua sessão acabou. Entra de novo pra salvar." };
const FALHOU = { error: "Não deu pra salvar agora. Tenta de novo." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const idOk = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const mesOk = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 12;

async function quem() {
  const user = await getUser();
  return user?.id ?? null;
}

function alvoOk(a: unknown): AlvoQuest | null {
  if (!a || typeof a !== "object") return null;
  const x = a as Record<string, unknown>;
  if (x.scope === "day" && typeof x.date === "string" && noDiario(x.date)) return { scope: "day", date: x.date };
  if (x.scope === "month" && x.year === ANO && mesOk(x.month)) return { scope: "month", year: ANO, month: x.month };
  return null;
}

/** Roda a gravação, atualiza a tela e traduz erro de banco numa mensagem curta. */
async function grava(fn: () => Promise<Resposta | boolean | void>): Promise<Resposta> {
  try {
    const r = await fn();
    if (r === false) return { error: "Não achei esse item no seu diário." };
    refresh();
    return typeof r === "object" ? r : undefined;
  } catch (e) {
    console.error("diario:", e);
    return FALHOU;
  }
}

// ---------- quests ----------

export async function novaQuest(alvo: AlvoQuest, texto: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  const a = alvoOk(alvo);
  const t = textoValido(texto);
  if (!a) return { error: "Data fora do diário." };
  if (!t) return { error: "Escreve a quest (até 200 letras)." };
  return grava(async () => ({ id: await d.criarQuest(userId, a, t) }));
}

export async function editarQuest(id: string, texto: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  const t = textoValido(texto);
  if (!idOk(id) || !t) return { error: "Escreve a quest (até 200 letras)." };
  return grava(() => d.editarQuest(userId, id, t));
}

export async function apagarQuest(id: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!idOk(id)) return { error: "Quest inválida." };
  return grava(() => d.apagarQuest(userId, id));
}

export async function statusQuest(id: string, status: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!idOk(id) || !statusValido(status)) return { error: "Status inválido." };
  return grava(async () => {
    const r = await d.mudarStatusQuest(userId, id, status);
    if (r === "nao-achou") return false;
    if (r === "sem-destino") return { error: "Não tem semana (ou mês) seguinte no diário de 2027." };
  });
}

// ---------- semana ----------

export async function notaSemana(week: number, buff: string, debuff: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!semana(week)) return { error: "Semana inválida." };
  const b = String(buff ?? "").trim();
  const db = String(debuff ?? "").trim();
  if (b.length > 300 || db.length > 300) return { error: "Até 300 letras em cada caixa." };
  return grava(() => d.salvarNotaSemana(userId, week, b, db));
}

// ---------- hábitos e humor ----------

export async function novoHabito(month: number, nome: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  const n = textoValido(nome, 60);
  if (!mesOk(month)) return { error: "Mês inválido." };
  if (!n) return { error: "Dá um nome ao hábito (até 60 letras)." };
  return grava(async () => {
    const id = await d.criarHabito(userId, month, n);
    return id ? { id } : { error: "O mês já tem 12 hábitos." };
  });
}

export async function apagarHabito(id: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!idOk(id)) return { error: "Hábito inválido." };
  return grava(() => d.apagarHabito(userId, id));
}

export async function marcarHabito(id: string, date: string, done: boolean): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!idOk(id) || !noDiario(date) || typeof done !== "boolean") return { error: "Dia inválido." };
  return grava(() => d.marcarHabito(userId, id, date, done));
}

export async function salvarLegenda(month: number, itens: Legenda[]): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!mesOk(month) || !Array.isArray(itens) || itens.length !== 4) return { error: "Legenda inválida." };
  const limpos: Legenda[] = [];
  for (const [i, l] of itens.entries()) {
    const label = String(l?.label ?? "").trim();
    if (l?.slot !== i + 1 || !COR_HEX.test(String(l?.color)) || label.length > 30) return { error: "Cada cor precisa de um nome de até 30 letras." };
    limpos.push({ slot: i + 1, color: String(l.color).toLowerCase(), label });
  }
  return grava(() => d.salvarLegenda(userId, month, limpos));
}

export async function marcarHumor(date: string, slot: number | null): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!noDiario(date) || (slot !== null && !(Number.isInteger(slot) && slot >= 1 && slot <= 4))) return { error: "Humor inválido." };
  return grava(() => d.marcarHumor(userId, date, slot));
}

// ---------- inventário ----------

const tipoOk = (v: unknown): v is TipoItem => TIPOS_ITEM.includes(v as TipoItem);
const statusItemOk = (v: unknown): v is StatusItem => STATUS_ITEM.includes(v as StatusItem);
const notaOk = (v: unknown): v is number | null => v === null || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5);

export async function novoItem(month: number, item: { type: string; title: string; rating: number | null; status: string }): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  const title = textoValido(item?.title);
  if (!mesOk(month) || !tipoOk(item?.type) || !statusItemOk(item?.status) || !notaOk(item?.rating)) return { error: "Confere o tipo, a nota e o status." };
  if (!title) return { error: "Escreve o título (até 200 letras)." };
  return grava(async () => ({ id: await d.criarItem(userId, month, { type: item.type as TipoItem, title, rating: item.rating, status: item.status as StatusItem }) }));
}

export async function statusItem(id: string, status: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!idOk(id) || !statusItemOk(status)) return { error: "Status inválido." };
  return grava(() => d.mudarItem(userId, id, { status }));
}

export async function notaItem(id: string, rating: number | null): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!idOk(id) || !notaOk(rating)) return { error: "A nota vai de 1 a 5." };
  return grava(() => d.mudarItem(userId, id, { rating }));
}

export async function apagarItem(id: string): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return SEM_LOGIN;
  if (!idOk(id)) return { error: "Item inválido." };
  return grava(() => d.apagarItem(userId, id));
}
