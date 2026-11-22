"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/auth/server";
import { getPost } from "@/lib/blog";
import { MECANICA, TEXTOS } from "@/lib/bichinho/config";
import * as d from "@/lib/bichinho/dados";
import type { PetView } from "@/lib/bichinho/dados";
import { entradas } from "@/lib/bichinho/regras";

// Nenhuma ação recebe valor de barra, XP ou fase. O navegador só pede ("dar petisco", "usar acessório"),
// e o servidor decide pelo que está no banco. O dono é sempre o usuário da sessão.
export type Resposta = { error?: string; pet?: PetView; mensagem?: string };

const E = TEXTOS.erros;

async function quem() {
  const user = await getUser();
  return user?.id ?? null;
}

async function protegida(acao: keyof typeof MECANICA.limites, fn: (userId: string) => Promise<Resposta>): Promise<Resposta> {
  const userId = await quem();
  if (!userId) return { error: E.semLogin };
  if (!(await d.dentroDoLimitePet(userId, acao))) return { error: E.muitos };
  try {
    const r = await fn(userId);
    if (!r.error) refresh();
    return r;
  } catch (e) {
    console.error("bichinho:", e);
    return { error: E.falhou };
  }
}

export async function escolherOvo(entrada: unknown): Promise<Resposta> {
  const p = entradas.ovo.safeParse(entrada);
  if (!p.success) return { error: E.invalido };
  return protegida("ovo", async (userId) => {
    if (!(await d.criarPet(userId, p.data.especie))) return { error: E.jaTem };
    return { pet: (await d.abrirBase(userId)) ?? undefined };
  });
}

export async function darPetisco(): Promise<Resposta> {
  return protegida("petisco", async (userId) => {
    const r = await d.darPetisco(userId);
    if (!r.ok) return { error: r.erro === "jaDeu" ? TEXTOS.petisco.feito : E.semPet };
    return { pet: r.pet, mensagem: TEXTOS.petisco.ok };
  });
}

export async function usarAcessorio(entrada: unknown): Promise<Resposta> {
  const p = entradas.equipar.safeParse(entrada);
  if (!p.success) return { error: E.invalido };
  return protegida("acessorio", async (userId) => {
    const r = await d.equipar(userId, p.data.slot, p.data.slug);
    if (r === "bloqueado") return { error: E.bloqueado };
    return r ? { pet: r } : { error: E.semPet };
  });
}

export async function renomearBichinho(entrada: unknown): Promise<Resposta> {
  const p = entradas.renomear.safeParse(entrada);
  if (!p.success) return { error: E.nome(MECANICA.nomeMin, MECANICA.nomeMax) };
  return protegida("nome", async (userId) => ((await d.renomear(userId, p.data.nome)) ? { mensagem: TEXTOS.renomear.ok } : { error: E.semPet }));
}

/** Chamada pela página de post depois que a pessoa abre. Visitante sem login não grava nada. */
export async function registrarLeitura(entrada: unknown): Promise<void> {
  const p = entradas.leitura.safeParse(entrada);
  if (!p.success || !getPost(p.data.slug)) return;
  const userId = await quem();
  if (!userId || !(await d.dentroDoLimitePet(userId, "leitura"))) return;
  try {
    await d.registrarLeitura(userId, p.data.slug);
  } catch (e) {
    console.error("bichinho (leitura):", e);
  }
}
