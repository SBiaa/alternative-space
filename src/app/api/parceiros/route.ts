import { NextResponse } from "next/server";
import { emailOk, text } from "@/lib/forms";

// Envia o interesse para um webhook (Google Apps Script de planilha, Zapier, Make, etc.).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || body.website) return NextResponse.json({ message: "Pedido inválido." }, { status: 400 }); // honeypot

  const lead = {
    nome: text(body.nome, 120),
    email: body.email,
    tipo: text(body.tipo, 60),
    canal: text(body.canal, 200),
    mensagem: text(body.mensagem, 2000),
    enviadoEm: new Date().toISOString(),
  };
  if (!lead.nome || !emailOk(lead.email) || !lead.tipo) {
    return NextResponse.json({ message: "Preenche nome, e-mail e tipo de parceria." }, { status: 400 });
  }

  const url = process.env.PARTNERS_WEBHOOK_URL;
  if (!url) return NextResponse.json({ message: "Formulário ainda não configurado." }, { status: 503 });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });
  if (!res.ok) return NextResponse.json({ message: "Não deu pra enviar agora. Tenta de novo." }, { status: 502 });
  return NextResponse.json({ message: "Recebemos! A gente te responde em breve." });
}
