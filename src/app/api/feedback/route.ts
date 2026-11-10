import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { notaValida, tipoValido } from "@/lib/feedback";
import { text } from "@/lib/forms";
import { acharJogo } from "@/lib/jogos";
import { MUITOS_ENVIOS, dentroDoLimite } from "@/lib/limite";

// Guarda avaliação, sugestão, bug ou ideia de um jogo. Funciona com ou sem conta.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || body.website) return NextResponse.json({ message: "Pedido inválido." }, { status: 400 }); // honeypot

  const jogo = text(body.jogo, 60);
  const tipo = body.tipo;
  const nota = notaValida(body.nota);
  const mensagem = text(body.mensagem, 2000);
  const contato = text(body.contato, 200);

  let jogoExiste = false;
  try { jogoExiste = !!acharJogo(jogo); } catch { jogoExiste = false; }
  if (!jogoExiste || !tipoValido(tipo)) return NextResponse.json({ message: "Pedido inválido." }, { status: 400 });
  if (tipo === "avaliacao" ? !nota : mensagem.length < 3) {
    return NextResponse.json({ message: tipo === "avaliacao" ? "Escolhe de 1 a 5 estrelas." : "Escreve um pouquinho pra gente entender." }, { status: 400 });
  }

  // Até 5 envios a cada 10 minutos por pessoa.
  if (!(await dentroDoLimite("feedback", req, 5, 600))) return NextResponse.json({ message: MUITOS_ENVIOS }, { status: 429 });

  try {
    const user = await getUser().catch(() => null);
    await sql`
      insert into feedbacks (jogo, tipo, nota, mensagem, contato, user_id, pagina, navegador)
      values (${jogo}, ${tipo}, ${nota}, ${mensagem}, ${contato}, ${user?.id ?? null},
              ${text(body.pagina, 300)}, ${text(req.headers.get("user-agent"), 300)})`;
  } catch (e) {
    console.error("Não deu pra salvar o feedback:", e);
    return NextResponse.json({ message: "Não deu pra enviar agora. Tenta de novo." }, { status: 502 });
  }
  return NextResponse.json({ message: tipo === "bug" ? "Valeu! Vamos caçar esse bug." : "Valeu! Chegou aqui." });
}
