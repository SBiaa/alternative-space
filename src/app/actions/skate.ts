"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/admin";
import { getUser } from "@/lib/auth/server";
import { dentroDoLimite } from "@/lib/limite";
import * as dados from "@/lib/skate/dados";
import { LIMITES, UUID, validarSpot } from "@/lib/skate/regras";

// Ações do Skate Universe. Login e admin conferidos no servidor em toda chamada.

export type Resultado = { ok: true; id: string } | { ok: false; erro: string; semConta?: boolean };

export async function cadastrarSpot(entrada: unknown): Promise<Resultado> {
  const user = await getUser();
  if (!user) return { ok: false, erro: "Entre na sua conta pra cadastrar um pico.", semConta: true };
  const v = validarSpot(entrada);
  if (!v.ok) return v;
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite("skate-spot", req, LIMITES.envios.max, LIMITES.envios.janelaS))) {
    return { ok: false, erro: "Muitos cadastros seguidos. Tenta de novo daqui a pouco." };
  }
  try {
    if ((await dados.contarPendentes(user.id)) >= LIMITES.maxPendentesPorUsuario) {
      return { ok: false, erro: "Você já tem muitos picos esperando aprovação. Aguarda a moderação dar uma olhada." };
    }
    const id = await dados.criarSpot(user.id, v.spot);
    revalidatePath("/admin/skate");
    return { ok: true, id };
  } catch (e) {
    console.error("Skate Universe: erro ao cadastrar pico:", e);
    return { ok: false, erro: "Não deu pra salvar agora. Tenta de novo em instantes." };
  }
}

export async function moderarSpot(id: string, decisao: "aprovado" | "recusado"): Promise<{ ok: boolean }> {
  await assertAdmin();
  if (!UUID.test(id) || (decisao !== "aprovado" && decisao !== "recusado")) return { ok: false };
  await dados.moderarSpot(id, decisao);
  revalidatePath("/admin/skate");
  revalidatePath(`/skate/picos/${id}`);
  return { ok: true };
}
