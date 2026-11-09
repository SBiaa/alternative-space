import { sql } from "@/lib/db";
import { ANO } from "./calendario";
import {
  type AlvoQuest,
  type Status,
  type StatusItem,
  type TipoItem,
  MAX_HABITOS,
  XP_MAX,
  deltaXP,
  destinoMovida,
  mesDoXP,
} from "./regras";

// Toda consulta recebe o userId de quem está logado e filtra por ele. Nada aqui confia em id vindo do cliente
// sem conferir o dono no próprio SQL.

export type Quest = { id: string; scope: "day" | "month"; date: string | null; year: number | null; month: number | null; text: string; status: Status; position: number };
export type Habito = { id: string; name: string; position: number };
export type Legenda = { slot: number; color: string; label: string };
export type Item = { id: string; type: TipoItem; title: string; rating: number | null; status: StatusItem };

const QUEST_COLS = sql`id, scope, date::text as date, year, month, text, status, position`;

// ---------- leitura ----------

export async function questsDosDias(userId: string, inicio: string, fim: string) {
  return (await sql`
    select ${QUEST_COLS} from quests
    where user_id = ${userId} and scope = 'day' and date between ${inicio} and ${fim}
    order by date, position, created_at`) as Quest[];
}

export async function questsDoMes(userId: string, month: number, year = ANO) {
  return (await sql`
    select ${QUEST_COLS} from quests
    where user_id = ${userId} and scope = 'month' and year = ${year} and month = ${month}
    order by position, created_at`) as Quest[];
}

export async function notaDaSemana(userId: string, week: number, year = ANO) {
  const [r] = await sql`select buff, debuff from week_notes where user_id = ${userId} and year = ${year} and week = ${week}`;
  return { buff: (r?.buff as string) ?? "", debuff: (r?.debuff as string) ?? "" };
}

export async function xpDoAno(userId: string, year = ANO) {
  const rows = await sql`select month, points from month_xp where user_id = ${userId} and year = ${year}`;
  return Object.fromEntries(rows.map((r) => [r.month as number, r.points as number])) as Record<number, number>;
}

export async function xpDoMes(userId: string, month: number, year = ANO) {
  const [r] = await sql`select points from month_xp where user_id = ${userId} and year = ${year} and month = ${month}`;
  return (r?.points as number) ?? 0;
}

export async function habitosDoMes(userId: string, month: number, year = ANO) {
  const habitos = (await sql`
    select id, name, position from habits
    where user_id = ${userId} and year = ${year} and month = ${month}
    order by position, name`) as Habito[];
  const logs = await sql`
    select l.habit_id, l.date::text as date from habit_logs l join habits h on h.id = l.habit_id
    where h.user_id = ${userId} and h.year = ${year} and h.month = ${month} and l.done`;
  return { habitos, feitos: logs.map((l) => `${l.habit_id}|${l.date}`) };
}

export async function humorDoMes(userId: string, month: number, year = ANO) {
  const legenda = (await sql`
    select slot, color, label from mood_legend
    where user_id = ${userId} and year = ${year} and month = ${month} order by slot`) as Legenda[];
  const logs = await sql`
    select date::text as date, slot from mood_logs
    where user_id = ${userId} and extract(year from date) = ${year} and extract(month from date) = ${month}`;
  return { legenda, dias: Object.fromEntries(logs.map((l) => [l.date as string, l.slot as number])) as Record<string, number> };
}

export async function inventarioDoMes(userId: string, month: number, year = ANO) {
  return (await sql`
    select id, type, title, rating, status from inventory_items
    where user_id = ${userId} and year = ${year} and month = ${month}
    order by created_at`) as Item[];
}

// ---------- quests ----------

const alvoSql = (a: AlvoQuest) =>
  a.scope === "day"
    ? sql`scope = 'day' and date = ${a.date}`
    : sql`scope = 'month' and year = ${a.year} and month = ${a.month}`;

export async function criarQuest(userId: string, alvo: AlvoQuest, text: string, status: Status = "open") {
  const date = alvo.scope === "day" ? alvo.date : null;
  const year = alvo.scope === "month" ? alvo.year : null;
  const month = alvo.scope === "month" ? alvo.month : null;
  const [r] = await sql`
    insert into quests (user_id, scope, date, year, month, text, status, position)
    values (${userId}, ${alvo.scope}, ${date}, ${year}, ${month}, ${text}, ${status},
      (select coalesce(max(position), -1) + 1 from quests where user_id = ${userId} and ${alvoSql(alvo)}))
    returning id`;
  return r.id as string;
}

export async function editarQuest(userId: string, id: string, text: string) {
  const r = await sql`update quests set text = ${text} where id = ${id} and user_id = ${userId} returning id`;
  return r.length > 0;
}

export async function apagarQuest(userId: string, id: string) {
  const [q] = await sql`delete from quests where id = ${id} and user_id = ${userId} returning scope, date::text as date, year, month, status`;
  if (q?.status === "done") await somarXP(userId, alvoDe(q), -1);
  return Boolean(q);
}

const alvoDe = (q: Record<string, unknown>): AlvoQuest =>
  q.scope === "day" ? { scope: "day", date: q.date as string } : { scope: "month", year: q.year as number, month: q.month as number };

function xpQuery(userId: string, alvo: AlvoQuest, delta: number) {
  const { year, month } = mesDoXP(alvo);
  return sql`
    insert into month_xp (user_id, year, month, points) values (${userId}, ${year}, ${month}, ${Math.max(0, Math.min(XP_MAX, delta))})
    on conflict (user_id, year, month) do update set points = greatest(0, least(${XP_MAX}, month_xp.points + ${delta}))`;
}

async function somarXP(userId: string, alvo: AlvoQuest, delta: number) {
  if (delta !== 0) await xpQuery(userId, alvo, delta);
}

export type ResultadoStatus = "ok" | "nao-achou" | "sem-destino";

/** Troca o status, ajusta o XP do mês e, se "moved", cria a cópia aberta na semana (ou mês) seguinte. */
export async function mudarStatusQuest(userId: string, id: string, status: Status): Promise<ResultadoStatus> {
  const [q] = await sql`select scope, date::text as date, year, month, text, status from quests where id = ${id} and user_id = ${userId}`;
  if (!q) return "nao-achou";
  const antes = q.status as Status;
  if (antes === status) return "ok";
  const alvo = alvoDe(q);

  const destino = status === "moved" ? destinoMovida(alvo) : null;
  if (status === "moved" && !destino) return "sem-destino";

  // Só troca se ninguém mudou o status no meio do caminho (dois cliques rápidos não somam XP duas vezes).
  const [trocou] = await sql`update quests set status = ${status} where id = ${id} and user_id = ${userId} and status = ${antes} returning id`;
  if (!trocou) return "ok";

  const extras = [];
  const delta = deltaXP(antes, status);
  if (delta !== 0) extras.push(xpQuery(userId, alvo, delta));
  if (destino) {
    const date = destino.scope === "day" ? destino.date : null;
    const year = destino.scope === "month" ? destino.year : null;
    const month = destino.scope === "month" ? destino.month : null;
    extras.push(sql`
      insert into quests (user_id, scope, date, year, month, text, status, position)
      values (${userId}, ${destino.scope}, ${date}, ${year}, ${month}, ${q.text as string}, 'open',
        (select coalesce(max(position), -1) + 1 from quests where user_id = ${userId} and ${alvoSql(destino)}))`);
  }
  if (extras.length) await sql.transaction(extras);
  return "ok";
}

// ---------- semana ----------

export async function salvarNotaSemana(userId: string, week: number, buff: string, debuff: string, year = ANO) {
  await sql`
    insert into week_notes (user_id, year, week, buff, debuff) values (${userId}, ${year}, ${week}, ${buff}, ${debuff})
    on conflict (user_id, year, week) do update set buff = excluded.buff, debuff = excluded.debuff`;
}

// ---------- hábitos e humor ----------

export async function criarHabito(userId: string, month: number, name: string, year = ANO) {
  const r = await sql`
    insert into habits (user_id, year, month, name, position)
    select ${userId}, ${year}, ${month}, ${name}, coalesce(max(position), -1) + 1
    from habits where user_id = ${userId} and year = ${year} and month = ${month}
    having count(*) < ${MAX_HABITOS}
    returning id`;
  return (r[0]?.id as string) ?? null;
}

export async function apagarHabito(userId: string, id: string) {
  const r = await sql`delete from habits where id = ${id} and user_id = ${userId} returning id`;
  return r.length > 0;
}

/** Marca/desmarca um dia. O dia precisa estar no mês do hábito, e o hábito precisa ser do usuário. */
export async function marcarHabito(userId: string, habitId: string, date: string, done: boolean) {
  const r = await sql`
    insert into habit_logs (habit_id, date, done)
    select h.id, ${date}::date, ${done} from habits h
    where h.id = ${habitId} and h.user_id = ${userId}
      and extract(year from ${date}::date) = h.year and extract(month from ${date}::date) = h.month
    on conflict (habit_id, date) do update set done = excluded.done
    returning habit_id`;
  return r.length > 0;
}

export async function salvarLegenda(userId: string, month: number, itens: Legenda[], year = ANO) {
  await sql.transaction(
    itens.map(
      (l) => sql`
        insert into mood_legend (user_id, year, month, slot, color, label) values (${userId}, ${year}, ${month}, ${l.slot}, ${l.color}, ${l.label})
        on conflict (user_id, year, month, slot) do update set color = excluded.color, label = excluded.label`,
    ),
  );
}

export async function marcarHumor(userId: string, date: string, slot: number | null) {
  if (slot === null) await sql`delete from mood_logs where user_id = ${userId} and date = ${date}`;
  else
    await sql`
      insert into mood_logs (user_id, date, slot) values (${userId}, ${date}, ${slot})
      on conflict (user_id, date) do update set slot = excluded.slot`;
}

// ---------- inventário ----------

export async function criarItem(userId: string, month: number, item: Omit<Item, "id">, year = ANO) {
  const [r] = await sql.transaction([
    sql`insert into inventory_items (user_id, year, month, type, title, rating, status)
        values (${userId}, ${year}, ${month}, ${item.type}, ${item.title}, ${item.rating}, ${item.status}) returning id`,
    sql`insert into events (user_id, kind, payload)
        values (${userId}, 'inventory_added', ${JSON.stringify({ type: item.type, title: item.title })}::jsonb)`,
  ]);
  return r[0].id as string;
}

export async function mudarItem(userId: string, id: string, campos: { status?: StatusItem; rating?: number | null }) {
  const r =
    campos.status !== undefined
      ? await sql`update inventory_items set status = ${campos.status} where id = ${id} and user_id = ${userId} returning id`
      : await sql`update inventory_items set rating = ${campos.rating ?? null} where id = ${id} and user_id = ${userId} returning id`;
  return r.length > 0;
}

export async function apagarItem(userId: string, id: string) {
  const r = await sql`delete from inventory_items where id = ${id} and user_id = ${userId} returning id`;
  return r.length > 0;
}

// ---------- LGPD ----------

export async function exportarDiario(userId: string) {
  const [quests, notas, habitos, logs, legenda, humor, inventario, xp, eventos] = await Promise.all([
    sql`select id, scope, date::text as date, year, month, text, status, position, created_at from quests where user_id = ${userId} order by created_at`,
    sql`select year, week, buff, debuff from week_notes where user_id = ${userId} order by year, week`,
    sql`select id, year, month, name, position from habits where user_id = ${userId} order by year, month, position`,
    sql`select l.habit_id, l.date::text as date, l.done from habit_logs l join habits h on h.id = l.habit_id where h.user_id = ${userId} order by l.date`,
    sql`select year, month, slot, color, label from mood_legend where user_id = ${userId} order by year, month, slot`,
    sql`select date::text as date, slot from mood_logs where user_id = ${userId} order by date`,
    sql`select id, year, month, type, title, rating, status, created_at from inventory_items where user_id = ${userId} order by created_at`,
    sql`select year, month, points from month_xp where user_id = ${userId} order by year, month`,
    sql`select kind, payload, created_at from events where user_id = ${userId} order by created_at`,
  ]);
  return { quests, notas_da_semana: notas, habitos, marcacoes_de_habitos: logs, legenda_de_humor: legenda, humor, inventario, xp_do_mes: xp, eventos };
}

export async function apagarDiario(userId: string) {
  await sql.transaction([
    sql`delete from quests where user_id = ${userId}`,
    sql`delete from week_notes where user_id = ${userId}`,
    sql`delete from habits where user_id = ${userId}`, // habit_logs vão junto (on delete cascade)
    sql`delete from mood_legend where user_id = ${userId}`,
    sql`delete from mood_logs where user_id = ${userId}`,
    sql`delete from inventory_items where user_id = ${userId}`,
    sql`delete from month_xp where user_id = ${userId}`,
    sql`delete from events where user_id = ${userId}`,
  ]);
}
