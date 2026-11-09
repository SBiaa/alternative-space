import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { exportarDados } from "@/lib/perfil";

// "Baixar meus dados" (LGPD): um JSON com tudo o que o site guarda do tripulante, inclusive o Diário de Bordo.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ message: "Entre na sua conta pra baixar seus dados." }, { status: 401 });
  const dados = await exportarDados(user.id);
  const corpo = { gerado_em: new Date().toISOString(), conta: { nome: user.name, email: user.email }, ...dados };
  return new NextResponse(JSON.stringify(corpo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-alternative.json"`,
      "Cache-Control": "no-store",
    },
  });
}
