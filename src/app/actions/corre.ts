"use server";

import { getUser } from "@/lib/auth/server";
import { apagarCorre, gravarDia, gravarSave, gravarSemana, lerSave } from "@/lib/corre/dados";
import type { Estado } from "@/lib/corre/motor";
import { escolherSave, migrar, schemaEstado } from "@/lib/corre/save";

export type RespostaCorre = { ok: true } | { ok: false; erro: string; semConta?: boolean };

// Salva em pausa e no fim do dia/semana. O servidor valida o JSON e confere a integridade.
export async function salvarCorre(bruto: unknown): Promise<RespostaCorre> {
  const user = await getUser();
  if (!user) return { ok: false, erro: "Entre na sua conta pra guardar o corre.", semConta: true };
  const e = migrar(bruto);
  if (!e) return { ok: false, erro: "Save inválido." };
  try {
    const motivo = await gravarSave(user.id, e);
    if (motivo) return { ok: false, erro: motivo };
    if (e.fase === "resumoDia" && e.resumoDia) {
      const r = schemaEstado.shape.resumoDia.unwrap().safeParse(e.resumoDia);
      if (r.success) await gravarDia(user.id, r.data);
    }
    if (e.fase === "resumoSemana" && e.resumoSemana) {
      const r = schemaEstado.shape.resumoSemana.unwrap().safeParse(e.resumoSemana);
      if (r.success) {
        await gravarSemana(user.id, r.data);
      }
    }
    return { ok: true };
  } catch (err) {
    console.error("Não deu pra salvar o corre:", err);
    return { ok: false, erro: "Não deu pra salvar agora. Tenta de novo em instantes." };
  }
}

// Logo depois de criar a conta: leva o save do navegador pra conta (o mais avançado vence).
export async function migrarSaveLocal(bruto: unknown): Promise<{ ok: boolean; save: Estado | null }> {
  const user = await getUser();
  if (!user) return { ok: false, save: null };
  const local = bruto ? migrar(bruto) : null;
  try {
    const remoto = await lerSave(user.id);
    const { save, origem } = escolherSave(local, remoto);
    if (origem === "local" && save) {
      const erro = await gravarSave(user.id, save, true);
      if (erro) return { ok: false, save: remoto };
    }
    return { ok: true, save };
  } catch (err) {
    console.error("Não deu pra migrar o save:", err);
    return { ok: false, save: null };
  }
}

export async function carregarSave(): Promise<{ logado: boolean; save: Estado | null }> {
  const user = await getUser();
  if (!user) return { logado: false, save: null };
  try {
    return { logado: true, save: await lerSave(user.id) };
  } catch {
    return { logado: true, save: null };
  }
}

export async function apagarSave(): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };
  await apagarCorre(user.id);
  return { ok: true };
}
