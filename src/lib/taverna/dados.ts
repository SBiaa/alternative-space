// Acesso ao banco da taverna. Toda mudança de saldo é um comando só (CTE) que confere saldo e nível no próprio UPDATE,
// então duas compras ao mesmo tempo não passam as duas. Só roda no servidor.

import { sql } from "@/lib/db";
import { CATALOGO_ARQUETIPOS, CATALOGO_ITENS } from "./catalogo";
import { TAVERNA } from "./config";
import type { FechamentoNoite } from "./economia";
import { migrar } from "./save";
import type { Arquetipo, Catalogo, Efeito, ItemCatalogo, MesaLayout, Membro, Papel, Progresso, TipoItem } from "./tipos";

const JOGO = "taverna";
type Linha = Record<string, unknown>;

export async function lerCatalogo(): Promise<Catalogo> {
  try {
    const [itens, arqs] = await Promise.all([sql`select * from tavern_catalog order by position`, sql`select * from archetypes order by unlock->>'reputacao'`]);
    if (itens.length === 0 || arqs.length === 0) return { itens: CATALOGO_ITENS, arquetipos: CATALOGO_ARQUETIPOS };
    return {
      itens: itens.map((r: Linha): ItemCatalogo => ({
        id: String(r.id), slug: String(r.slug), kind: r.kind as TipoItem, name: String(r.name), description: String(r.description),
        maxLevel: Number(r.max_level), prices: (r.prices as number[]).map(Number), effects: r.effects as Efeito[],
        minTavernLevel: Number(r.min_tavern_level), position: Number(r.position),
      })),
      arquetipos: arqs.map((r: Linha): Arquetipo => ({
        slug: String(r.slug), name: String(r.name), icone: String(r.icon), orders: r.orders as string[], patience: Number(r.patience),
        spend: Number(r.spend), tip: Number(r.tip), quirk: r.quirk as Arquetipo["quirk"], unlock: r.unlock as Arquetipo["unlock"],
      })),
    };
  } catch (e) {
    console.error("Catálogo da taverna indisponível, usando o embutido:", e);
    return { itens: CATALOGO_ITENS, arquetipos: CATALOGO_ARQUETIPOS };
  }
}

export type TavernaSalva = { id: string; prog: Progresso };

export async function lerTaverna(userId: string): Promise<TavernaSalva | null> {
  const [t] = await sql`select * from taverns where user_id = ${userId}`;
  if (!t) return null;
  const [ups, staff] = await Promise.all([
    sql`select c.slug, u.level from tavern_upgrades u join tavern_catalog c on c.id = u.catalog_id where u.tavern_id = ${t.id}`,
    sql`select role, level, hired_night from tavern_staff where tavern_id = ${t.id} order by hired_night, role`,
  ]);
  const prog = migrar({
    v: Number(t.state_version),
    cidade: String(t.city),
    nivel: Number(t.level),
    ouro: Number(t.gold),
    reputacao: Number(t.reputation),
    noite: Number(t.night),
    seed: String(t.seed),
    layout: t.layout as MesaLayout[],
    melhorias: Object.fromEntries(ups.map((u) => [String(u.slug), Number(u.level)])),
    equipe: staff.map((s): Membro => ({ papel: s.role as Papel, nivel: Number(s.level), contratadaNoite: Number(s.hired_night) })),
    tranquila: false,
  });
  return prog ? { id: String(t.id), prog } : null;
}

/** Cria a taverna (ou a refaz inteira, no caso da migração do save local). Tudo numa transação. */
export async function gravarTavernaInteira(userId: string, p: Progresso, cat: Catalogo): Promise<void> {
  const ids = new Map(cat.itens.map((i) => [i.slug, i.id]));
  const [t] = await sql`
    insert into taverns (user_id, city, level, gold, reputation, night, seed, layout, state_version)
    values (${userId}, ${p.cidade}, ${p.nivel}, ${p.ouro}, ${p.reputacao}, ${p.noite}, ${p.seed}, ${JSON.stringify(p.layout)}::jsonb, ${TAVERNA.versaoSave})
    on conflict (user_id) do update set city = excluded.city, level = excluded.level, gold = excluded.gold, reputation = excluded.reputation,
      night = excluded.night, seed = excluded.seed, layout = excluded.layout, state_version = excluded.state_version, updated_at = now()
    returning id`;
  const ups = Object.entries(p.melhorias).filter(([slug]) => ids.get(slug));
  await sql.transaction([
    sql`delete from tavern_upgrades where tavern_id = ${t.id}`,
    sql`delete from tavern_staff where tavern_id = ${t.id}`,
    ...ups.map(([slug, level]) => sql`insert into tavern_upgrades (tavern_id, catalog_id, level) values (${t.id}, ${ids.get(slug)!}, ${level})`),
    ...p.equipe.map((m) => sql`insert into tavern_staff (tavern_id, role, level, hired_night) values (${t.id}, ${m.papel}, ${m.nivel}, ${m.contratadaNoite})`),
  ]);
}

/** Compra o próximo nível: só debita se o saldo cobre e se o nível ainda é o que o servidor leu. Devolve o saldo novo, ou null. */
export async function comprarMelhoriaDb(userId: string, tid: string, item: ItemCatalogo, nivelAtual: number, preco: number, layout: MesaLayout[]): Promise<number | null> {
  if (!item.id) return null;
  const [r] = await sql`
    with deb as (
      update taverns set gold = gold - ${preco}, layout = ${JSON.stringify(layout)}::jsonb, updated_at = now()
      where id = ${tid} and user_id = ${userId} and gold >= ${preco}
        and coalesce((select level from tavern_upgrades where tavern_id = ${tid} and catalog_id = ${item.id}), 0) = ${nivelAtual}
      returning gold
    ), up as (
      insert into tavern_upgrades (tavern_id, catalog_id, level) select ${tid}, ${item.id}, ${nivelAtual + 1} from deb
      on conflict (tavern_id, catalog_id) do update set level = excluded.level returning level
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'tavern_upgrade_purchased', ${JSON.stringify({ jogo: JOGO, melhoria: item.slug, nivel: nivelAtual + 1, preco })}::jsonb from deb
    )
    select (select gold from deb) as saldo`;
  return r?.saldo === null || r?.saldo === undefined ? null : Number(r.saldo);
}

export async function contratarDb(userId: string, tid: string, papel: Papel, preco: number, noite: number, vagas: number): Promise<number | null> {
  const [r] = await sql`
    with deb as (
      update taverns set gold = gold - ${preco}, updated_at = now()
      where id = ${tid} and user_id = ${userId} and gold >= ${preco}
        and not exists (select 1 from tavern_staff where tavern_id = ${tid} and role = ${papel})
        and (select count(*) from tavern_staff where tavern_id = ${tid}) < ${vagas}
      returning gold
    ), ins as (
      insert into tavern_staff (tavern_id, role, level, hired_night) select ${tid}, ${papel}, 1, ${noite} from deb
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'tavern_staff_hired', ${JSON.stringify({ jogo: JOGO, papel, nivel: 1, preco })}::jsonb from deb
    )
    select (select gold from deb) as saldo`;
  return r?.saldo === null || r?.saldo === undefined ? null : Number(r.saldo);
}

export async function melhorarFuncionarioDb(userId: string, tid: string, papel: Papel, nivelAtual: number, preco: number): Promise<number | null> {
  const [r] = await sql`
    with deb as (
      update taverns set gold = gold - ${preco}, updated_at = now()
      where id = ${tid} and user_id = ${userId} and gold >= ${preco}
        and (select level from tavern_staff where tavern_id = ${tid} and role = ${papel}) = ${nivelAtual}
      returning gold
    ), up as (
      update tavern_staff set level = ${nivelAtual + 1} where tavern_id = ${tid} and role = ${papel} and exists (select 1 from deb) returning level
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'tavern_staff_hired', ${JSON.stringify({ jogo: JOGO, papel, nivel: nivelAtual + 1, preco })}::jsonb from deb
    )
    select (select gold from deb) as saldo`;
  return r?.saldo === null || r?.saldo === undefined ? null : Number(r.saldo);
}

export async function salvarLayoutDb(userId: string, tid: string, layout: MesaLayout[]): Promise<void> {
  await sql`update taverns set layout = ${JSON.stringify(layout)}::jsonb, updated_at = now() where id = ${tid} and user_id = ${userId}`;
}

/** Grava a noite fechada, a semana (se fechou uma) e o evento, só se a noite do banco ainda é a anterior. */
export async function gravarNoiteDb(userId: string, tid: string, anterior: Progresso, f: FechamentoNoite): Promise<boolean> {
  const r = f.registro;
  const s = f.semana;
  const [res] = await sql`
    with up as (
      update taverns set gold = ${f.prog.ouro}, reputation = ${f.prog.reputacao}, night = ${f.prog.noite}, level = ${f.prog.nivel}, updated_at = now()
      where id = ${tid} and user_id = ${userId} and night = ${anterior.noite}
      returning id
    ), n as (
      insert into tavern_nights (tavern_id, night, served, left_angry, gold_earned, tips, expenses, reputation_end, best_archetype, relaxed)
      select ${tid}, ${r.noite}, ${r.servidos}, ${r.foram}, ${r.ganhos}, ${r.gorjetas}, ${JSON.stringify(r.gastos)}::jsonb, ${r.reputacaoFim}, ${r.melhorArquetipo}, ${r.tranquila} from up
    ), w as (
      insert into tavern_weeks (tavern_id, week, guild_fee_paid, balance_end)
      select ${tid}, ${s?.semana ?? 0}, ${s?.paga ?? false}, ${s?.saldoFim ?? 0} from up where ${s !== null}
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'game_played', ${JSON.stringify({ jogo: JOGO, noite: r.noite, ouro: r.saldo })}::jsonb from up
    )
    select count(*)::int as ok from up`;
  return Number(res?.ok ?? 0) === 1;
}

export async function seloDe(userId: string): Promise<{ noites: number; reputacao: number; nivel: number; cidade: string } | null> {
  const [t] = await sql`select night, reputation, level, city from taverns where user_id = ${userId}`;
  return t ? { noites: Number(t.night), reputacao: Number(t.reputation), nivel: Number(t.level), cidade: String(t.city) } : null;
}

// LGPD
export async function exportarTaverna(userId: string) {
  const [t] = await sql`select id, city, level, gold, reputation, night, seed, layout, state_version, created_at, updated_at from taverns where user_id = ${userId}`;
  if (!t) return { taverna: null, noites: [], semanas: [], melhorias: [], equipe: [] };
  const [noites, semanas, melhorias, equipe] = await Promise.all([
    sql`select night, served, left_angry, gold_earned, tips, expenses, reputation_end, best_archetype, relaxed, created_at from tavern_nights where tavern_id = ${t.id} order by night`,
    sql`select week, guild_fee_paid, balance_end, created_at from tavern_weeks where tavern_id = ${t.id} order by week`,
    sql`select c.slug, u.level from tavern_upgrades u join tavern_catalog c on c.id = u.catalog_id where u.tavern_id = ${t.id}`,
    sql`select role, level, hired_night from tavern_staff where tavern_id = ${t.id}`,
  ]);
  const { id: _id, ...taverna } = t;
  void _id;
  return { taverna, noites, semanas, melhorias, equipe };
}

export async function apagarTaverna(userId: string) {
  await sql`delete from taverns where user_id = ${userId}`; // noites, semanas, melhorias e equipe vão junto (on delete cascade)
}
