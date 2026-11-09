"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/auth/server";
import { recordeValido } from "@/lib/jogos";
import { registrarRecorde } from "@/lib/ranking";

// Chamado pelos jogos ao bater recorde. Sem conta, não faz nada (o recorde fica só no navegador).
export async function enviarRecorde(jogo: string, valor: number): Promise<void> {
  if (!recordeValido(jogo, valor)) return;
  const user = await getUser();
  if (!user) return;
  try {
    if (await registrarRecorde(user.id, jogo, valor)) refresh();
  } catch (e) {
    console.error("Não deu pra salvar o recorde:", e);
  }
}
