"use server";

import { getUser } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { DILEMAS, dilemaValido, type Placar } from "@/lib/dilemas";

export type RespostaVoto = { placar: Placar | null; contou: boolean; jaVotou?: number };

async function placarDe(dilema: string): Promise<Placar> {
  const n = DILEMAS.find((d) => d.id === dilema)!.opcoes.length;
  const rows = await sql`select opcao, count(*)::int as n from dilema_votos where dilema = ${dilema} group by opcao`;
  const contagem = Array.from({ length: n }, () => 0);
  for (const r of rows) if (Number(r.opcao) < n) contagem[Number(r.opcao)] = Number(r.n);
  return { total: contagem.reduce((a, b) => a + b, 0), contagem };
}

// Vota e devolve o placar. Só conta voto de quem tem conta, um por dilema (o primeiro fica).
// Sem conta, a pessoa vê o placar dos outros, mas o voto dela não entra.
export async function votarDilema(dilema: string, opcao: number): Promise<RespostaVoto> {
  if (!dilemaValido(dilema, opcao)) return { placar: null, contou: false };
  try {
    const user = await getUser();
    let contou = false;
    let jaVotou: number | undefined;
    if (user) {
      const r = await sql`
        insert into dilema_votos (dilema, user_id, opcao) values (${dilema}, ${user.id}, ${opcao})
        on conflict (dilema, user_id) do nothing returning opcao`;
      if (r.length > 0) contou = true;
      else {
        const [v] = await sql`select opcao from dilema_votos where dilema = ${dilema} and user_id = ${user.id}`;
        jaVotou = v ? Number(v.opcao) : undefined;
        contou = jaVotou !== undefined;
      }
    }
    return { placar: await placarDe(dilema), contou, jaVotou };
  } catch (e) {
    console.error("Não deu pra registrar o voto:", e);
    return { placar: null, contou: false };
  }
}

// Votos que a pessoa logada já deu, pra a página abrir com os resultados dela.
export async function meusVotos(): Promise<Record<string, number>> {
  try {
    const user = await getUser();
    if (!user) return {};
    const rows = await sql`select dilema, opcao from dilema_votos where user_id = ${user.id}`;
    return Object.fromEntries(rows.map((r) => [String(r.dilema), Number(r.opcao)]));
  } catch {
    return {};
  }
}
