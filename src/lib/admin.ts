import { sql } from "@/lib/db";

// Consultas do painel de admin. Só são chamadas depois de requireAdmin()/assertAdmin().

export type Overview = { tripulantes: number; novos7d: number; resultados: number; banidos: number };
export type QuizCount = { quiz: string; result: string; total: number };
export type Tripulante = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  admin: boolean;
  banned: boolean;
  quizzes: number;
};

export async function overview(): Promise<Overview> {
  const [u] = await sql`
    select count(*)::int as tripulantes,
           count(*) filter (where "createdAt" > now() - interval '7 days')::int as novos7d,
           count(*) filter (where banned)::int as banidos
    from neon_auth."user"`;
  const [r] = await sql`select count(*)::int as resultados from quiz_results`;
  return { tripulantes: u.tripulantes, novos7d: u.novos7d, banidos: u.banidos, resultados: r.resultados };
}

// Resultado mais recente de cada pessoa em cada quiz, contado por resultado.
export async function quizCounts(): Promise<QuizCount[]> {
  return (await sql`
    select quiz, result, count(*)::int as total from (
      select distinct on (user_id, quiz) quiz, result
      from quiz_results order by user_id, quiz, created_at desc
    ) ultimos
    group by quiz, result
    order by quiz, total desc`) as QuizCount[];
}

export async function listTripulantes(busca = "", limite = 50): Promise<Tripulante[]> {
  const q = `%${busca.trim()}%`;
  const rows = await sql`
    select u.id, u.name, u.email, u."createdAt", u.role, coalesce(u.banned, false) as banned,
           (select count(distinct quiz) from quiz_results r where r.user_id = u.id)::int as quizzes
    from neon_auth."user" u
    where u.name ilike ${q} or u.email ilike ${q}
    order by u."createdAt" desc
    limit ${limite}`;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    createdAt: new Date(r.createdAt).toISOString(),
    admin: String(r.role ?? "").split(",").map((s) => s.trim()).includes("admin"),
    banned: Boolean(r.banned),
    quizzes: Number(r.quizzes),
  }));
}

export type Feedback = {
  id: string;
  jogo: string;
  tipo: string;
  nota: number | null;
  mensagem: string;
  contato: string;
  logado: boolean;
  lido: boolean;
  createdAt: string;
};

export async function listFeedbacks(soNaoLidos = false, limite = 100): Promise<Feedback[]> {
  const rows = await sql`
    select id::text, jogo, tipo, nota, mensagem, contato, user_id is not null as logado, lido, created_at
    from feedbacks
    where (not ${soNaoLidos} or not lido)
    order by created_at desc limit ${limite}`;
  return rows.map((r) => ({
    id: r.id, jogo: r.jogo, tipo: r.tipo, nota: r.nota === null ? null : Number(r.nota),
    mensagem: r.mensagem, contato: r.contato, logado: r.logado, lido: r.lido,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

// Média de estrelas e quantidade de avaliações por jogo.
export async function notasPorJogo(): Promise<{ jogo: string; media: number; total: number }[]> {
  const rows = await sql`
    select jogo, round(avg(nota), 1)::float as media, count(*)::int as total
    from feedbacks where nota is not null group by jogo order by media desc`;
  return rows.map((r) => ({ jogo: r.jogo, media: Number(r.media), total: Number(r.total) }));
}
