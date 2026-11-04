import { connection } from "next/server";
import { createNeonAuth } from "@neon/auth/next/server";

// Cadastro de tripulantes (Neon Auth). Os usuários ficam no schema neon_auth do banco.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

// Sessão depende do pedido: connection() tira a chamada do pré-render (o SDK usa Date internamente).
export async function getUser() {
  await connection();
  const { data } = await auth.getSession();
  return data?.user ?? null;
}
