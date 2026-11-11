import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { text } from "@/lib/forms";
import { MUITOS_ENVIOS, dentroDoLimite } from "@/lib/limite";
import { pecaValida } from "@/lib/sugestaoDrop";

// Guarda uma sugestão pro próximo drop. Funciona com ou sem conta.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || body.website) return NextResponse.json({ message: "Pedido inválido." }, { status: 400 }); // honeypot

  const tema = text(body.tema, 120);
  const peca = pecaValida(body.peca) ? body.peca : "";
  const detalhes = text(body.detalhes, 2000);
  const contato = text(body.contato, 200);
  if (tema.length < 2) return NextResponse.json({ message: "Conta qual tema ou fandom você quer ver." }, { status: 400 });

  // Até 5 sugestões a cada 10 minutos por pessoa.
  if (!(await dentroDoLimite("sugestao-drop", req, 5, 600))) return NextResponse.json({ message: MUITOS_ENVIOS }, { status: 429 });

  try {
    const user = await getUser().catch(() => null);
    await sql`
      insert into sugestoes_drop (tema, peca, detalhes, contato, user_id, navegador)
      values (${tema}, ${peca}, ${detalhes}, ${contato}, ${user?.id ?? null}, ${text(req.headers.get("user-agent"), 300)})`;
  } catch (e) {
    console.error("Não deu pra salvar a sugestão de drop:", e);
    return NextResponse.json({ message: "Não deu pra enviar agora. Tenta de novo." }, { status: 502 });
  }
  return NextResponse.json({ message: "Valeu! Sua ideia entrou na lista do próximo drop." });
}
