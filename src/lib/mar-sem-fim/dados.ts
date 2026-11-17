// Acesso ao banco do Mar Sem Fim. Só roda no servidor.
// Toda gravação é uma transação que confere state_version: se dois pedidos chegam juntos, só um passa (o outro recebe "conflito").
// O estado vem da função pura (aplicarAcao); aqui só se lê e se grava, sem regra de jogo.

import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { ILHA } from "./conteudo";
import { progressoVazio } from "./estado";
import { migrar } from "./save";
import type { Estado, ProgressoIlha, StatusIlha, Viagem } from "./tipos";

const JOGO = "mar-sem-fim";
type Linha = Record<string, unknown>;

const ts = (ms: number) => new Date(ms).toISOString();
const msDe = (v: unknown) => (v ? new Date(v as string | Date).getTime() : 0);

export type EventoJogo = { kind: "voyage_started" | "voyage_arrived" | "game_played"; payload: Record<string, unknown> };

function viagemDaLinha(v: Linha): Viagem {
  const x = v.events as { eventos: Viagem["eventos"]; rota: string[]; vento: number; mantimentosGastos: number; faltouMantimento: boolean; chegou: boolean };
  return {
    numero: Number(v.number),
    de: String(v.from_island),
    para: String(v.to_island),
    partiuEm: msDe(v.departed_at),
    chegaEm: msDe(v.arrives_at),
    rota: x.rota,
    vento: x.vento,
    mantimentosGastos: x.mantimentosGastos,
    faltouMantimento: x.faltouMantimento,
    chegou: x.chegou,
    eventos: x.eventos,
    resolvida: Boolean(v.resolved),
  };
}

const eventosDaViagem = (v: Viagem) => ({ eventos: v.eventos, rota: v.rota, vento: v.vento, mantimentosGastos: v.mantimentosGastos, faltouMantimento: v.faltouMantimento, chegou: v.chegou });

export async function lerEstado(userId: string): Promise<Estado | null> {
  const [p] = await sql`select * from pirates where user_id = ${userId}`;
  if (!p) return null;
  const [[n], prog, [v]] = await Promise.all([
    sql`select * from ships where pirate_id = ${p.id}`,
    sql`select island_slug, status, choices, completed_at from island_progress where pirate_id = ${p.id}`,
    sql`select * from voyages where pirate_id = ${p.id} order by number desc limit 1`,
  ]).then(([a, b, c]) => [a, b, c] as const);
  if (!n) return null;
  const ilhas: Record<string, ProgressoIlha> = {};
  for (const slug of Object.keys(ILHA)) ilhas[slug] = progressoVazio("travada");
  for (const r of prog) {
    const c = r.choices as { caminho?: string[]; ganhoOuro?: number; ganhoRecompensa?: number };
    ilhas[String(r.island_slug)] = {
      status: r.status as StatusIlha,
      caminho: c.caminho ?? [],
      ganhoOuro: Number(c.ganhoOuro ?? 0),
      ganhoRecompensa: Number(c.ganhoRecompensa ?? 0),
      ...(r.completed_at ? { concluidaEm: msDe(r.completed_at) } : {}),
    };
  }
  return migrar({
    v: Number(p.save_format),
    versao: Number(p.state_version),
    seed: String(p.seed),
    nome: String(p.name),
    aparencia: p.appearance,
    mar: String(p.origin_sea),
    oficio: String(p.profession),
    recompensa: Number(p.bounty),
    ouro: Number(p.gold),
    barco: { nome: String(n.name), bandeira: n.flag, casco: Number(n.hull), mantimentos: Number(n.supplies), melhorias: n.upgrades, ilhaAtual: String(n.current_island) },
    agulha: { ilha: (p.needle_island as string | null) ?? null, carregada: Boolean(p.needle_charged), desde: msDe(p.needle_since) },
    ilhas,
    itens: p.items,
    aliados: p.allies,
    viagens: Number(p.voyages_count),
    viagem: v ? viagemDaLinha(v) : null,
    criadoEm: msDe(p.created_at),
  });
}

const J = (x: unknown) => JSON.stringify(x);

/** Cria o pirata (ou refaz tudo, no caso da migração do save local). Uma transação só. */
export async function gravarPirataInteiro(userId: string, e: Estado, substituir: boolean): Promise<void> {
  const id = randomUUID();
  const consultas = [
    ...(substituir ? [sql`delete from pirates where user_id = ${userId}`] : []),
    sql`
      insert into pirates (id, user_id, name, appearance, origin_sea, profession, bounty, gold, seed, state_version, needle_island, needle_charged, needle_since, items, allies, voyages_count, save_format)
      values (${id}, ${userId}, ${e.nome}, ${J(e.aparencia)}::jsonb, ${e.mar}, ${e.oficio}, ${e.recompensa}, ${e.ouro}, ${e.seed}, 1, ${e.agulha.ilha}, ${e.agulha.carregada},
        ${e.agulha.desde ? ts(e.agulha.desde) : null}, ${J(e.itens)}::jsonb, ${J(e.aliados)}::jsonb, ${e.viagens}, ${e.v})`,
    sql`
      insert into ships (pirate_id, name, flag, hull, supplies, upgrades, current_island)
      values (${id}, ${e.barco.nome}, ${J(e.barco.bandeira)}::jsonb, ${e.barco.casco}, ${e.barco.mantimentos}, ${J(e.barco.melhorias)}::jsonb, ${e.barco.ilhaAtual})`,
    ...Object.entries(e.ilhas)
      .filter(([, p]) => p.status !== "travada" || p.caminho.length > 0)
      .map(
        ([slug, p]) => sql`
        insert into island_progress (pirate_id, island_slug, status, choices, completed_at)
        values (${id}, ${slug}, ${p.status}, ${J({ caminho: p.caminho, ganhoOuro: p.ganhoOuro, ganhoRecompensa: p.ganhoRecompensa })}::jsonb, ${p.concluidaEm ? ts(p.concluidaEm) : null})`,
      ),
  ];
  await sql.transaction(consultas);
}

/**
 * Grava o novo estado se (e só se) o banco ainda está na versão `antes.versao`. Devolve false em caso de conflito.
 * Cada comando depois do primeiro só age se o primeiro passou (confere a versão nova), então a transação é tudo ou nada.
 */
export async function gravarEstado(userId: string, antes: Estado, depois: Estado, eventos: EventoJogo[]): Promise<boolean> {
  const nova = antes.versao + 1;
  const consultas = [
    sql`
      update pirates set name = name, bounty = ${depois.recompensa}, gold = ${depois.ouro}, state_version = ${nova},
        needle_island = ${depois.agulha.ilha}, needle_charged = ${depois.agulha.carregada}, needle_since = ${depois.agulha.desde ? ts(depois.agulha.desde) : null},
        items = ${J(depois.itens)}::jsonb, allies = ${J(depois.aliados)}::jsonb, voyages_count = ${depois.viagens}, updated_at = now()
      where user_id = ${userId} and state_version = ${antes.versao}
      returning id`,
    sql`
      update ships set hull = ${depois.barco.casco}, supplies = ${depois.barco.mantimentos}, upgrades = ${J(depois.barco.melhorias)}::jsonb,
        current_island = ${depois.barco.ilhaAtual}, updated_at = now()
      where pirate_id = (select id from pirates where user_id = ${userId} and state_version = ${nova})`,
  ];

  for (const [slug, p] of Object.entries(depois.ilhas)) {
    if (J(p) === J(antes.ilhas[slug])) continue;
    consultas.push(sql`
      insert into island_progress (pirate_id, island_slug, status, choices, completed_at)
      select id, ${slug}, ${p.status}, ${J({ caminho: p.caminho, ganhoOuro: p.ganhoOuro, ganhoRecompensa: p.ganhoRecompensa })}::jsonb, ${p.concluidaEm ? ts(p.concluidaEm) : null}
      from pirates where user_id = ${userId} and state_version = ${nova}
      on conflict (pirate_id, island_slug) do update set status = excluded.status, choices = excluded.choices, completed_at = excluded.completed_at`);
  }

  const v = depois.viagem;
  if (v && J(v) !== J(antes.viagem)) {
    consultas.push(sql`
      insert into voyages (pirate_id, number, from_island, to_island, departed_at, arrives_at, events, resolved)
      select id, ${v.numero}, ${v.de}, ${v.para}, ${ts(v.partiuEm)}, ${ts(v.chegaEm)}, ${J(eventosDaViagem(v))}::jsonb, ${v.resolvida}
      from pirates where user_id = ${userId} and state_version = ${nova}
      on conflict (pirate_id, number) do update set events = excluded.events, resolved = excluded.resolved`);
  }

  for (const ev of eventos) {
    consultas.push(sql`
      insert into events (user_id, kind, payload)
      select ${userId}, ${ev.kind}, ${J({ jogo: JOGO, ...ev.payload })}::jsonb
      from pirates where user_id = ${userId} and state_version = ${nova}`);
  }

  const r = await sql.transaction(consultas);
  return (r[0] as unknown[]).length > 0;
}

/** Baixar meus dados (LGPD). */
export async function exportarMarSemFim(userId: string) {
  const [p] = await sql`select id, name, appearance, origin_sea, profession, bounty, gold, seed, state_version, needle_island, needle_charged, needle_since, items, allies, voyages_count, created_at, updated_at from pirates where user_id = ${userId}`;
  if (!p) return { pirata: null, barco: null, viagens: [], ilhas: [] };
  const [barco, viagens, ilhas] = await Promise.all([
    sql`select name, flag, hull, supplies, upgrades, current_island, created_at, updated_at from ships where pirate_id = ${p.id}`,
    sql`select number, from_island, to_island, departed_at, arrives_at, events, resolved, created_at from voyages where pirate_id = ${p.id} order by number`,
    sql`select island_slug, status, choices, completed_at from island_progress where pirate_id = ${p.id} order by island_slug`,
  ]);
  const { id: _id, ...pirata } = p;
  void _id;
  return { pirata, barco: barco[0] ?? null, viagens, ilhas };
}

/** Excluir conta (LGPD): navio, viagens e progresso vão junto (on delete cascade). */
export async function apagarMarSemFim(userId: string) {
  await sql`delete from pirates where user_id = ${userId}`;
  await sql`delete from events where user_id = ${userId} and payload->>'jogo' = ${JOGO}`;
}

/** Cartaz público: só o que aparece nele. Null se o usuário não tem pirata. */
export async function lerCartaz(userId: string) {
  const [r] = await sql`
    select p.name, p.appearance, p.bounty, s.name as ship, s.flag
    from pirates p join ships s on s.pirate_id = p.id where p.user_id = ${userId}`;
  if (!r) return null;
  return { nome: String(r.name), aparencia: r.appearance as Estado["aparencia"], recompensa: Number(r.bounty), barco: String(r.ship), bandeira: r.flag as Estado["barco"]["bandeira"] };
}
