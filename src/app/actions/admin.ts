"use server";

import { refresh } from "next/cache";
import { auth } from "@/lib/auth/server";
import { assertAdmin } from "@/lib/auth/admin";

// O SDK tem auth.admin em tempo de execução (rotas /admin/* do Neon Auth), mas a tipagem dele sai como unknown.
// O Neon Auth também confere no servidor dele se quem chama é admin.
type Resposta = Promise<{ error?: unknown }>;
const adminApi = auth.admin as {
  banUser(body: { userId: string; banReason?: string }): Resposta;
  unbanUser(body: { userId: string }): Resposta;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function alvo(f: FormData) {
  const userId = String(f.get("userId") ?? "");
  if (!UUID.test(userId)) throw new Error("Tripulante inválido");
  return userId;
}

// Banir encerra as sessões da pessoa e impede novo login (regra do próprio Neon Auth).
export async function banir(f: FormData) {
  const admin = await assertAdmin();
  const userId = alvo(f);
  if (userId === admin.id) throw new Error("Você não pode banir a própria conta");
  const motivo = String(f.get("motivo") ?? "").trim().slice(0, 200) || undefined;
  const { error } = await adminApi.banUser({ userId, banReason: motivo });
  if (error) throw new Error("Não deu pra banir agora");
  refresh();
}

export async function desbanir(f: FormData) {
  await assertAdmin();
  const { error } = await adminApi.unbanUser({ userId: alvo(f) });
  if (error) throw new Error("Não deu pra desbanir agora");
  refresh();
}
