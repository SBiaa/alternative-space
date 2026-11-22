// Acesso ao banco da banca. Toda mudança de saldo é um comando só (CTE) que confere saldo e o estado que o servidor leu
// no próprio UPDATE, então duas gravações ao mesmo tempo não passam as duas. Só roda no servidor.

import { sql } from "@/lib/db";
import { BANCA } from "./config";
import { migrar } from "./save";
import type { Layout, Progresso, RegistroEvento } from "./tipos";

const JOGO = "banca-na-feira";
const json = (v: unknown) => JSON.stringify(v);

export type BancaSalva = { id: string; prog: Progresso };

export async function lerBanca(userId: string): Promise<BancaSalva | null> {
  const [t] = await sql`select * from stall_saves where user_id = ${userId}`;
  if (!t) return null;
  const prog = migrar({
    v: Number(t.state_version), dinheiro: Number(t.money), reputacao: Number(t.reputation), semana: Number(t.week), seed: String(t.seed),
    estoque: t.stock, layout: t.layout, melhorias: t.upgrades, tranquilo: false,
  });
  return prog ? { id: String(t.id), prog } : null;
}

/** Cria a banca (ou a refaz inteira, no caso da migração do save local). */
export async function gravarBancaInteira(userId: string, p: Progresso): Promise<void> {
  await sql`
    insert into stall_saves (user_id, money, reputation, week, seed, stock, layout, upgrades, state_version)
    values (${userId}, ${p.dinheiro}, ${p.reputacao}, ${p.semana}, ${p.seed}, ${json(p.estoque)}::jsonb, ${json(p.layout)}::jsonb,
      ${json(p.melhorias)}::jsonb, ${BANCA.versaoSave})
    on conflict (user_id) do update set money = excluded.money, reputation = excluded.reputation, week = excluded.week, seed = excluded.seed,
      stock = excluded.stock, layout = excluded.layout, upgrades = excluded.upgrades, state_version = excluded.state_version, updated_at = now()`;
}

/** Produção: só debita se o saldo cobre e se os dias e o material gastos ainda são os que o servidor leu. */
export async function produzirDb(userId: string, saveId: string, antes: Progresso, depois: Progresso): Promise<number | null> {
  const material = antes.dinheiro - depois.dinheiro;
  const [r] = await sql`
    update stall_saves set money = money - ${material}, stock = ${json(depois.estoque)}::jsonb, updated_at = now()
    where id = ${saveId} and user_id = ${userId} and money >= ${material}
      and (stock->>'diasUsados')::int = ${antes.estoque.diasUsados} and (stock->>'gastoMaterial')::int = ${antes.estoque.gastoMaterial}
    returning money`;
  return r ? Number(r.money) : null;
}

/** Compra o próximo nível: só debita se o saldo cobre e se as melhorias ainda são as que o servidor leu. */
export async function comprarMelhoriaDb(userId: string, saveId: string, slug: string, antes: Progresso, depois: Progresso, preco: number): Promise<number | null> {
  const [r] = await sql`
    with deb as (
      update stall_saves set money = money - ${preco}, upgrades = ${json(depois.melhorias)}::jsonb, layout = ${json(depois.layout)}::jsonb, updated_at = now()
      where id = ${saveId} and user_id = ${userId} and money >= ${preco} and upgrades = ${json(antes.melhorias)}::jsonb
      returning money
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'stall_upgrade_purchased', ${json({ jogo: JOGO, melhoria: slug, nivel: depois.melhorias[slug], preco })}::jsonb from deb
    )
    select (select money from deb) as saldo`;
  return r?.saldo === null || r?.saldo === undefined ? null : Number(r.saldo);
}

export async function salvarLayoutDb(userId: string, saveId: string, layout: Layout): Promise<void> {
  await sql`update stall_saves set layout = ${json(layout)}::jsonb, updated_at = now() where id = ${saveId} and user_id = ${userId}`;
}

/** Grava o evento fechado e o `game_played`, só se a semana do banco ainda é a anterior. */
export async function fecharEventoDb(userId: string, saveId: string, anterior: Progresso, depois: Progresso, r: RegistroEvento): Promise<boolean> {
  const [res] = await sql`
    with up as (
      update stall_saves set money = ${depois.dinheiro}, reputation = ${depois.reputacao}, week = ${depois.semana},
        stock = ${json(depois.estoque)}::jsonb, layout = ${json(depois.layout)}::jsonb, updated_at = now()
      where id = ${saveId} and user_id = ${userId} and week = ${anterior.semana}
      returning id
    ), ins as (
      insert into stall_events (save_id, event_slug, sales, revenue, costs, visitors, gave_up, reputation_end)
      select ${saveId}, ${r.evento}, ${json(r.vendas)}::jsonb, ${r.receita}, ${json(r.custos)}::jsonb, ${r.visitantes}, ${r.desistiram}, ${r.reputacaoFim} from up
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'game_played', ${json({ jogo: JOGO, evento: r.evento, semana: r.semana, receita: r.receita, lucro: r.lucro })}::jsonb from up
    )
    select count(*)::int as ok from up`;
  return Number(res?.ok ?? 0) === 1;
}

/** Selo da cabine: eventos feitos e reputação. */
export async function seloDe(userId: string): Promise<{ eventos: number; reputacao: number; semana: number } | null> {
  const [t] = await sql`
    select s.reputation, s.week, (select count(*)::int from stall_events e where e.save_id = s.id) as eventos
    from stall_saves s where s.user_id = ${userId}`;
  if (!t) return null;
  return { eventos: Number(t.eventos), reputacao: Number(t.reputation), semana: Number(t.week) };
}

// LGPD
export async function exportarBanca(userId: string) {
  const [t] = await sql`select id, money, reputation, week, seed, stock, layout, upgrades, state_version, created_at, updated_at from stall_saves where user_id = ${userId}`;
  if (!t) return { banca: null, eventos: [] };
  const eventos = await sql`select event_slug, sales, revenue, costs, visitors, gave_up, reputation_end, created_at from stall_events where save_id = ${t.id} order by created_at`;
  const { id: _id, ...banca } = t;
  void _id;
  return { banca, eventos };
}

export async function apagarBanca(userId: string) {
  await sql`delete from stall_saves where user_id = ${userId}`; // stall_events vai junto (on delete cascade)
}
