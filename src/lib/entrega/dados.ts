import { sql } from "@/lib/db";
import { JOGO } from "./config";
import type { Efeito, ImplanteEquipado, Resumo } from "./regras";

export type Implante = {
  id: string;
  slug: string;
  name: string;
  description: string;
  maxLevel: number;
  prices: number[];
  effects: Efeito[];
  level: number;
  equipped: boolean;
};

type Linha = Record<string, unknown>;
const implante = (r: Linha): Implante => ({
  id: String(r.id),
  slug: String(r.slug),
  name: String(r.name),
  description: String(r.description),
  maxLevel: Number(r.max_level),
  prices: (r.prices as number[]).map(Number),
  effects: r.effects as Efeito[],
  level: Number(r.level ?? 0),
  equipped: Boolean(r.equipped),
});

/** Catálogo com o nível e o estado de cada implante do tripulante (0 = não comprou). */
export async function implantesDe(userId: string | null): Promise<Implante[]> {
  const rows = await sql`
    select i.*, ui.level, ui.equipped
    from implants i left join user_implants ui on ui.implant_id = i.id and ui.user_id = ${userId ?? ""}
    order by i.position`;
  return rows.map(implante);
}

export async function equipadosDe(userId: string): Promise<ImplanteEquipado[]> {
  const rows = await sql`
    select i.slug, ui.level, i.effects from user_implants ui join implants i on i.id = ui.implant_id
    where ui.user_id = ${userId} and ui.equipped order by i.position`;
  return rows.map((r) => ({ slug: String(r.slug), level: Number(r.level), effects: r.effects as Efeito[] }));
}

export async function saldoDe(userId: string): Promise<number> {
  const [r] = await sql`select credits from game_wallets where user_id = ${userId} and game = ${JOGO}`;
  return Number(r?.credits ?? 0);
}

export type Recorde = { creditsEarned: number; deliveries: number; bestStreak: number; createdAt: string };
export async function recordeDe(userId: string): Promise<Recorde | null> {
  const [r] = await sql`
    select credits_earned, deliveries, best_streak, created_at from delivery_runs
    where user_id = ${userId} and not relaxed order by credits_earned desc, created_at limit 1`;
  return r ? { creditsEarned: Number(r.credits_earned), deliveries: Number(r.deliveries), bestStreak: Number(r.best_streak), createdAt: String(r.created_at) } : null;
}

/** Grava o turno, soma os créditos na carteira e registra o evento, tudo numa transação. Diz se é recorde. */
export async function gravarTurno(userId: string, r: Resumo, snapshot: ImplanteEquipado[]): Promise<boolean> {
  const antes = r.relaxed ? null : await recordeDe(userId);
  await sql.transaction([
    sql`insert into delivery_runs (user_id, deliveries, on_time, late, cancelled, tips_total, credits_earned, best_streak, duration_ms, relaxed, implants_snapshot)
        values (${userId}, ${r.deliveries}, ${r.onTime}, ${r.late}, ${r.cancelled}, ${r.tipsTotal}, ${r.creditsEarned}, ${r.bestStreak}, ${r.durationMs}, ${r.relaxed},
                ${JSON.stringify(snapshot.map(({ slug, level }) => ({ slug, level })))}::jsonb)`,
    sql`insert into game_wallets (user_id, game, credits) values (${userId}, ${JOGO}, ${r.creditsEarned})
        on conflict (user_id, game) do update set credits = game_wallets.credits + excluded.credits`,
    sql`insert into events (user_id, kind, payload)
        values (${userId}, 'game_played', ${JSON.stringify({ jogo: JOGO, entregas: r.deliveries, creditos: r.creditsEarned })}::jsonb)`,
  ]);
  return !r.relaxed && (!antes || r.creditsEarned > antes.creditsEarned);
}

/**
 * Compra o próximo nível num só comando: só debita se o saldo cobre e se o nível ainda é o que o servidor leu
 * (duas compras ao mesmo tempo não passam as duas). Devolve o saldo novo, ou null se não comprou.
 */
export async function comprar(userId: string, implantId: string, slug: string, nivelAtual: number, preco: number): Promise<number | null> {
  const [r] = await sql`
    with deb as (
      update game_wallets set credits = credits - ${preco}
      where user_id = ${userId} and game = ${JOGO} and credits >= ${preco}
        and coalesce((select level from user_implants where user_id = ${userId} and implant_id = ${implantId}), 0) = ${nivelAtual}
      returning credits
    ), up as (
      insert into user_implants (user_id, implant_id, level, equipped)
      select ${userId}, ${implantId}, ${nivelAtual + 1}, false from deb
      on conflict (user_id, implant_id) do update set level = excluded.level
      returning level
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'implant_purchased', ${JSON.stringify({ jogo: JOGO, implante: slug, nivel: nivelAtual + 1, preco })}::jsonb from deb
    )
    select (select credits from deb) as saldo, (select level from up) as nivel`;
  return r?.saldo === null || r?.saldo === undefined ? null : Number(r.saldo);
}

/** Equipa só se ainda couber no limite (conferido no mesmo comando). */
export async function definirEquipado(userId: string, implantId: string, equipar: boolean, max: number): Promise<boolean> {
  const rows = equipar
    ? await sql`
        update user_implants set equipped = true
        where user_id = ${userId} and implant_id = ${implantId}
          and (select count(*) from user_implants where user_id = ${userId} and equipped and implant_id <> ${implantId}) < ${max}
        returning 1`
    : await sql`update user_implants set equipped = false where user_id = ${userId} and implant_id = ${implantId} returning 1`;
  return rows.length > 0;
}

export async function exportarEntrega(userId: string) {
  const [turnos, implantes, carteira] = await Promise.all([
    sql`select deliveries, on_time, late, cancelled, tips_total, credits_earned, best_streak, duration_ms, relaxed, implants_snapshot, created_at
        from delivery_runs where user_id = ${userId} order by created_at`,
    sql`select i.slug, ui.level, ui.equipped from user_implants ui join implants i on i.id = ui.implant_id where ui.user_id = ${userId}`,
    sql`select game, credits from game_wallets where user_id = ${userId}`,
  ]);
  return { turnos, implantes, carteiras: carteira };
}

export async function apagarEntrega(userId: string) {
  await sql`delete from delivery_runs where user_id = ${userId}`;
  await sql`delete from user_implants where user_id = ${userId}`;
  await sql`delete from game_wallets where user_id = ${userId}`;
}
