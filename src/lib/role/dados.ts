import { sql } from "@/lib/db";
import { PICOS, TEXTOS } from "./config";
import type { Pista } from "./pista";
import { hashDaPista, type Corrida } from "./pontuacao";

// Consultas do Rolê Noturno. Toda gravação recebe o user_id da sessão, nunca do navegador.

export type Status = "draft" | "published" | "hidden";

export type Pico = {
  id: string;
  userId: string;
  slug: string | null;
  title: string;
  description: string;
  layout: Pista;
  layoutHash: string;
  status: Status;
  verifiedRunId: string | null;
  playsCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  criador: string;
  apelido: string | null;
};

export type ResumoPico = Omit<Pico, "layout"> & { layout: Pista; recordeCriador: number | null };

export type Linha = { userId: string; nome: string; apelido: string | null; score: number; durationMs: number; maxCombo: number; createdAt: string };

const pico = (r: Record<string, unknown>): Pico => ({
  id: String(r.id),
  userId: String(r.user_id),
  slug: r.slug ? String(r.slug) : null,
  title: String(r.title ?? ""),
  description: String(r.description ?? ""),
  layout: r.layout as Pista,
  layoutHash: String(r.layout_hash),
  status: r.status as Status,
  verifiedRunId: r.verified_run_id ? String(r.verified_run_id) : null,
  playsCount: Number(r.plays_count ?? 0),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
  publishedAt: r.published_at ? String(r.published_at) : null,
  // Conta sem nome (ou dono do seed): mostra o nome genérico da config.
  criador: String(r.criador || TEXTOS.pico.semCriador),
  apelido: r.apelido ? String(r.apelido) : null,
});

export async function acharPorId(id: string): Promise<Pico | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sql`
    select p.*, coalesce(u.name, '') as criador, pf.apelido from skate_parks p
    left join neon_auth."user" u on u.id::text = p.user_id
    left join perfis pf on pf.user_id = p.user_id
    where p.id = ${id}`;
  return r ? pico(r) : null;
}

export async function acharPorSlug(slug: string): Promise<Pico | null> {
  const [r] = await sql`
    select p.*, coalesce(u.name, '') as criador, pf.apelido from skate_parks p
    left join neon_auth."user" u on u.id::text = p.user_id
    left join perfis pf on pf.user_id = p.user_id
    where p.slug = ${slug} and p.status <> 'draft'`;
  return r ? pico(r) : null;
}

async function listar(where: "recentes" | "jogados" | "usuario", userId?: string): Promise<ResumoPico[]> {
  const rows =
    where === "usuario"
      ? await sql`
          select p.*, coalesce(u.name, '') as criador, pf.apelido,
            (select max(score)::int from skate_runs r where r.park_id = p.id and r.user_id = p.user_id) as recorde_criador
          from skate_parks p left join neon_auth."user" u on u.id::text = p.user_id left join perfis pf on pf.user_id = p.user_id
          where p.user_id = ${userId!} order by p.updated_at desc limit 100`
      : where === "recentes"
        ? await sql`
          select p.*, coalesce(u.name, '') as criador, pf.apelido,
            (select max(score)::int from skate_runs r where r.park_id = p.id and r.user_id = p.user_id) as recorde_criador
          from skate_parks p left join neon_auth."user" u on u.id::text = p.user_id left join perfis pf on pf.user_id = p.user_id
          where p.status = 'published' order by p.published_at desc limit ${PICOS.listaTamanho}`
        : await sql`
          select p.*, coalesce(u.name, '') as criador, pf.apelido,
            (select max(score)::int from skate_runs r where r.park_id = p.id and r.user_id = p.user_id) as recorde_criador
          from skate_parks p left join neon_auth."user" u on u.id::text = p.user_id left join perfis pf on pf.user_id = p.user_id
          where p.status = 'published' and p.plays_count > 0 order by p.plays_count desc, p.published_at desc limit ${PICOS.listaTamanho}`;
  return rows.map((r) => ({ ...pico(r), recordeCriador: r.recorde_criador === null ? null : Number(r.recorde_criador) }));
}

export const picosRecentes = () => listar("recentes");
export const picosMaisJogados = () => listar("jogados");
export const picosDe = (userId: string) => listar("usuario", userId);

export async function ranking(parkId: string, limite: number = PICOS.rankingTamanho): Promise<Linha[]> {
  const rows = await sql`
    select * from (
      select distinct on (r.user_id) r.user_id, r.score, r.duration_ms, r.max_combo, r.created_at
      from skate_runs r where r.park_id = ${parkId} and r.finished
      order by r.user_id, r.score desc, r.created_at
    ) melhores
    left join neon_auth."user" u on u.id::text = melhores.user_id
    left join perfis pf on pf.user_id = melhores.user_id
    order by melhores.score desc, melhores.created_at
    limit ${limite}`;
  return rows.map((r) => ({
    userId: String(r.user_id),
    nome: String(r.name || TEXTOS.pico.semCriador),
    apelido: r.apelido ? String(r.apelido) : null,
    score: Number(r.score),
    durationMs: Number(r.duration_ms),
    maxCombo: Number(r.max_combo),
    createdAt: String(r.created_at),
  }));
}

export async function melhorDe(parkId: string, userId: string): Promise<number | null> {
  const [r] = await sql`select max(score)::int as m from skate_runs where park_id = ${parkId} and user_id = ${userId} and finished`;
  return r?.m === null || r?.m === undefined ? null : Number(r.m);
}

export async function contarRascunhos(userId: string): Promise<number> {
  const [r] = await sql`select count(*)::int as n from skate_parks where user_id = ${userId} and status = 'draft'`;
  return Number(r?.n ?? 0);
}

export async function criarRascunho(userId: string, layout: Pista, title = "", description = ""): Promise<string> {
  const [r] = await sql`
    insert into skate_parks (user_id, layout, layout_version, layout_hash, title, description)
    values (${userId}, ${JSON.stringify(layout)}::jsonb, ${layout.version}, ${hashDaPista(layout)}, ${title}, ${description})
    returning id`;
  return String(r.id);
}

// Só atualiza se ainda for rascunho do mesmo dono (a checagem fica também no SQL).
export async function atualizarRascunho(id: string, userId: string, layout: Pista, title: string, description: string): Promise<boolean> {
  const rows = await sql`
    update skate_parks set layout = ${JSON.stringify(layout)}::jsonb, layout_version = ${layout.version}, layout_hash = ${hashDaPista(layout)},
      title = ${title}, description = ${description}, updated_at = now()
    where id = ${id} and user_id = ${userId} and status = 'draft'
    returning id`;
  return rows.length > 0;
}

export async function gravarCorrida(userId: string, parkId: string, layoutHash: string, c: Corrida): Promise<string> {
  const [r] = await sql`
    insert into skate_runs (user_id, park_id, score, duration_ms, tricks, max_combo, finished, layout_hash)
    values (${userId}, ${parkId}, ${c.score}, ${c.durationMs}, ${JSON.stringify(c.tricks)}::jsonb, ${c.maxCombo}, ${c.finished}, ${layoutHash})
    returning id`;
  return String(r.id);
}

export async function corridaPorId(id: string) {
  const [r] = await sql`select user_id, park_id, finished, layout_hash from skate_runs where id = ${id}`;
  return r ? { userId: String(r.user_id), parkId: String(r.park_id), finished: Boolean(r.finished), layoutHash: String(r.layout_hash) } : null;
}

export async function marcarVerificada(parkId: string, userId: string, runId: string) {
  await sql`update skate_parks set verified_run_id = ${runId} where id = ${parkId} and user_id = ${userId} and status = 'draft'`;
}

export async function publicar(parkId: string, userId: string, slug: string, title: string, description: string): Promise<boolean> {
  const rows = await sql`
    update skate_parks set status = 'published', slug = ${slug}, title = ${title}, description = ${description},
      published_at = now(), updated_at = now()
    where id = ${parkId} and user_id = ${userId} and status = 'draft'
    returning id`;
  if (rows.length === 0) return false;
  // Corridas de teste de versões antigas do rascunho não entram no ranking: fica só a de verificação.
  await sql`delete from skate_runs where park_id = ${parkId} and id <> (select verified_run_id from skate_parks where id = ${parkId})`;
  await sql`insert into events (user_id, kind, payload) values (${userId}, 'park_published', ${JSON.stringify({ park_id: parkId, slug })}::jsonb)`;
  return true;
}

export async function apagarPico(parkId: string, userId: string): Promise<boolean> {
  const rows = await sql`delete from skate_parks where id = ${parkId} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

export async function duplicar(p: Pico, userId: string): Promise<string> {
  return criarRascunho(userId, p.layout, p.title, p.description);
}

export async function somarJogada(parkId: string) {
  await sql`update skate_parks set plays_count = plays_count + 1 where id = ${parkId} and status = 'published'`;
}

// Corrida de pico publicado: grava, conta jogada, registra evento e guarda as entradas se virou top 1.
export async function registrarCorrida(userId: string, p: Pico, c: Corrida, contarJogada = true): Promise<{ recorde: boolean; top1: boolean }> {
  const antes = await melhorDe(p.id, userId);
  const [topo] = await sql`select max(score)::int as m from skate_runs where park_id = ${p.id} and finished`;
  const runId = await gravarCorrida(userId, p.id, p.layoutHash, c);
  if (contarJogada) await somarJogada(p.id);
  await sql`insert into events (user_id, kind, payload) values (${userId}, 'park_played', ${JSON.stringify({ park_id: p.id, pontuacao: c.score })}::jsonb)`;
  const top1 = c.finished && (topo?.m === null || topo?.m === undefined || c.score > Number(topo.m));
  if (top1) {
    await sql`
      insert into skate_run_inputs (park_id, run_id, inputs) values (${p.id}, ${runId}, ${JSON.stringify(c.inputs)}::jsonb)
      on conflict (park_id) do update set run_id = excluded.run_id, inputs = excluded.inputs, created_at = now()`;
  }
  return { recorde: c.finished && (antes === null || c.score > antes), top1 };
}

// Corrida de verificação de rascunho: vira o primeiro recorde quando o pico for publicado.
export async function registrarVerificacao(userId: string, p: Pico, c: Corrida): Promise<string> {
  const runId = await gravarCorrida(userId, p.id, p.layoutHash, c);
  await marcarVerificada(p.id, userId, runId);
  await sql`
    insert into skate_run_inputs (park_id, run_id, inputs) values (${p.id}, ${runId}, ${JSON.stringify(c.inputs)}::jsonb)
    on conflict (park_id) do update set run_id = excluded.run_id, inputs = excluded.inputs, created_at = now()`;
  return runId;
}

// ---------- Cabine ----------

export async function acharPorApelido(apelido: string): Promise<{ userId: string; nome: string; apelido: string } | null> {
  const [r] = await sql`
    select pf.user_id, pf.apelido, coalesce(u.name, '') as nome from perfis pf
    left join neon_auth."user" u on u.id::text = pf.user_id
    where lower(pf.apelido) = lower(${apelido})`;
  return r ? { userId: String(r.user_id), nome: String(r.nome), apelido: String(r.apelido) } : null;
}

// Picos publicados do tripulante com o melhor recorde dele em cada um. Escondidos só aparecem pro dono.
export async function picosDaCabine(userId: string, incluirEscondidos: boolean) {
  const rows = await sql`
    select p.id, p.slug, p.title, p.status, p.plays_count, p.layout, p.published_at,
      (select max(score)::int from skate_runs r where r.park_id = p.id and r.user_id = p.user_id and r.finished) as recorde
    from skate_parks p
    where p.user_id = ${userId} and (p.status = 'published' or (${incluirEscondidos} and p.status = 'hidden'))
    order by p.published_at desc`;
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    status: r.status as Status,
    playsCount: Number(r.plays_count),
    layout: r.layout as Pista,
    recorde: r.recorde === null ? null : Number(r.recorde),
  }));
}

// ---------- Moderação ----------

export async function denunciar(parkId: string, userId: string, motivo: string): Promise<boolean> {
  const rows = await sql`
    insert into park_reports (park_id, user_id, reason) values (${parkId}, ${userId}, ${motivo})
    on conflict (park_id, user_id) do nothing returning id`;
  return rows.length > 0;
}

export async function picosDenunciados() {
  const rows = await sql`
    select p.id, p.slug, p.title, p.status, p.layout, p.user_id, coalesce(u.name, '') as criador, pf.apelido,
      count(r.id)::int as total, json_agg(json_build_object('reason', r.reason, 'created_at', r.created_at) order by r.created_at desc) as motivos,
      (select jsonb_array_length(i.inputs) from skate_run_inputs i where i.park_id = p.id) as entradas_top1
    from park_reports r join skate_parks p on p.id = r.park_id
    left join neon_auth."user" u on u.id::text = p.user_id left join perfis pf on pf.user_id = p.user_id
    group by p.id, u.name, pf.apelido
    order by max(r.created_at) desc
    limit 100`;
  return rows.map((r) => ({
    id: String(r.id),
    slug: r.slug ? String(r.slug) : null,
    title: String(r.title),
    status: r.status as Status,
    layout: r.layout as Pista,
    criador: r.apelido ? `@${r.apelido}` : String(r.criador),
    total: Number(r.total),
    motivos: r.motivos as { reason: string; created_at: string }[],
    entradasTop1: r.entradas_top1 === null ? null : Number(r.entradas_top1),
  }));
}

export async function entradasTop1(parkId: string) {
  const [r] = await sql`
    select i.inputs, s.score, s.duration_ms, s.user_id from skate_run_inputs i join skate_runs s on s.id = i.run_id where i.park_id = ${parkId}`;
  return r ? { inputs: r.inputs as { t: number; a: string }[], score: Number(r.score), durationMs: Number(r.duration_ms), userId: String(r.user_id) } : null;
}

// Esconder tira das listas e da cabine; liberar volta a publicar e limpa as denúncias.
export async function moderar(parkId: string, acao: "esconder" | "liberar"): Promise<boolean> {
  if (acao === "esconder") {
    const rows = await sql`update skate_parks set status = 'hidden', updated_at = now() where id = ${parkId} and status = 'published' returning id`;
    return rows.length > 0;
  }
  const rows = await sql`update skate_parks set status = 'published', updated_at = now() where id = ${parkId} and status in ('hidden', 'published') and slug is not null returning id`;
  if (rows.length > 0) await sql`delete from park_reports where park_id = ${parkId}`;
  return rows.length > 0;
}

// ---------- LGPD ----------

export async function exportarRole(userId: string) {
  const [picos, corridas, denuncias] = await Promise.all([
    sql`select id, slug, title, description, layout, status, plays_count, created_at, updated_at, published_at from skate_parks where user_id = ${userId} order by created_at`,
    sql`select r.park_id, p.slug, r.score, r.duration_ms, r.tricks, r.max_combo, r.finished, r.created_at
        from skate_runs r left join skate_parks p on p.id = r.park_id where r.user_id = ${userId} order by r.created_at`,
    sql`select park_id, reason, created_at from park_reports where user_id = ${userId} order by created_at`,
  ]);
  return { picos, corridas, denuncias };
}

// Excluir conta: os picos do tripulante saem do ar junto (com ranking e denúncias deles, em cascata).
export async function apagarRole(userId: string) {
  await sql`delete from skate_parks where user_id = ${userId}`;
  await sql`delete from skate_runs where user_id = ${userId}`;
  await sql`delete from park_reports where user_id = ${userId}`;
}
