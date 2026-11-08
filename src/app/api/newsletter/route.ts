import { NextResponse } from "next/server";
import { emailOk } from "@/lib/forms";
import { MUITOS_ENVIOS, dentroDoLimite } from "@/lib/limite";

// MailerLite: https://developers.mailerlite.com/docs/subscribers.html
// Para Beehiiv ou outra ferramenta, troque só o bloco do fetch.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || body.website) return NextResponse.json({ message: "Pedido inválido." }, { status: 400 }); // honeypot
  if (!emailOk(body.email)) return NextResponse.json({ message: "Confere o e-mail e tenta de novo." }, { status: 400 });

  const key = process.env.MAILERLITE_API_KEY;
  if (!key) return NextResponse.json({ message: "Newsletter ainda não configurada." }, { status: 503 });

  // Até 5 inscrições a cada 10 minutos por pessoa.
  if (!(await dentroDoLimite("newsletter", req, 5, 600))) return NextResponse.json({ message: MUITOS_ENVIOS }, { status: 429 });

  const group = process.env.MAILERLITE_GROUP_ID;
  const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: body.email, ...(group ? { groups: [group] } : {}) }),
  });

  if (!res.ok) return NextResponse.json({ message: "Não deu pra cadastrar agora. Tenta de novo." }, { status: 502 });
  return NextResponse.json({ message: "Pronto! Confere seu e-mail." });
}
