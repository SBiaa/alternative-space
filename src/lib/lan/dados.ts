// Acesso ao banco da lan. Toda mudança de saldo é um comando só (CTE) que confere saldo e nível no próprio UPDATE,
// então duas compras ao mesmo tempo não passam as duas. Só roda no servidor.

import { sql } from "@/lib/db";
import { CATALOGO_ARQUETIPOS, CATALOGO_ITENS } from "./catalogo";
import { LAN } from "./config";
import type { FechamentoDia } from "./economia";
import { migrar } from "./save";
import type { Arquetipo, Catalogo, Efeito, ItemCatalogo, Layout, MaquinaSalva, Membro, Papel, Progresso, TipoItem } from "./tipos";

const JOGO = "lan-house";
type Linha = Record<string, unknown>;

export async function lerCatalogo(): Promise<Catalogo> {
  try {
    const [itens, arqs] = await Promise.all([sql`select * from lan_catalog order by position`, sql`select * from lan_archetypes order by unlock->>'reputacao', slug`]);
    if (itens.length === 0 || arqs.length === 0) return { itens: CATALOGO_ITENS, arquetipos: CATALOGO_ARQUETIPOS };
    const icones = new Map(CATALOGO_ARQUETIPOS.map((a) => [a.slug, a.icone]));
    return {
      itens: itens.map((r: Linha): ItemCatalogo => ({
        id: String(r.id), slug: String(r.slug), kind: r.kind as TipoItem, name: String(r.name), description: String(r.description),
        maxLevel: Number(r.max_level), prices: (r.prices as number[]).map(Number), effects: r.effects as Efeito[],
        minLanLevel: Number(r.min_lan_level), position: Number(r.position),
      })),
      arquetipos: arqs.map((r: Linha): Arquetipo => {
        const quirk = r.quirk as Arquetipo["quirk"] & { icone?: string };
        return {
          slug: String(r.slug), name: String(r.name), icone: String(quirk.icone ?? icones.get(String(r.slug)) ?? "🙂"), wants: r.wants as Arquetipo["wants"],
          patience: Number(r.patience), spend: Number(r.spend), tip: Number(r.tip), noiseTolerance: Number(r.noise_tolerance),
          makesNoise: Boolean(r.makes_noise), quirk, unlock: r.unlock as Arquetipo["unlock"],
        };
      }),
    };
  } catch (e) {
    console.error("Catálogo da lan indisponível, usando o embutido:", e);
    return { itens: CATALOGO_ITENS, arquetipos: CATALOGO_ARQUETIPOS };
  }
}

export type LanSalva = { id: string; prog: Progresso };

export async function lerLan(userId: string): Promise<LanSalva | null> {
  const [t] = await sql`select * from lan_houses where user_id = ${userId}`;
  if (!t) return null;
  const [ups, staff] = await Promise.all([
    sql`select c.slug, u.level from lan_upgrades u join lan_catalog c on c.id = u.catalog_id where u.lan_id = ${t.id}`,
    sql`select role, level, hired_day from lan_staff where lan_id = ${t.id} order by hired_day, role`,
  ]);
  const prog = migrar({
    v: Number(t.state_version), local: String(t.location), nivel: Number(t.level), dinheiro: Number(t.money),
    reputacao: Number(t.reputation), dia: Number(t.day), seed: String(t.seed), layout: t.layout as Layout,
    maquinas: t.machines as MaquinaSalva[], estoque: t.stock as Progresso["estoque"], frequentes: t.regulars as Record<string, number>,
    melhorias: Object.fromEntries(ups.map((u) => [String(u.slug), Number(u.level)])),
    equipe: staff.map((s): Membro => ({ papel: s.role as Papel, nivel: Number(s.level), contratadoDia: Number(s.hired_day) })),
    tranquilo: false,
  });
  return prog ? { id: String(t.id), prog } : null;
}

const json = (v: unknown) => JSON.stringify(v);

/** Cria a lan (ou a refaz inteira, no caso da migração do save local). */
export async function gravarLanInteira(userId: string, p: Progresso, cat: Catalogo): Promise<void> {
  const ids = new Map(cat.itens.map((i) => [i.slug, i.id]));
  const [t] = await sql`
    insert into lan_houses (user_id, location, level, money, reputation, day, seed, layout, machines, stock, regulars, state_version)
    values (${userId}, ${p.local}, ${p.nivel}, ${p.dinheiro}, ${p.reputacao}, ${p.dia}, ${p.seed}, ${json(p.layout)}::jsonb, ${json(p.maquinas)}::jsonb,
      ${json(p.estoque)}::jsonb, ${json(p.frequentes)}::jsonb, ${LAN.versaoSave})
    on conflict (user_id) do update set location = excluded.location, level = excluded.level, money = excluded.money, reputation = excluded.reputation,
      day = excluded.day, seed = excluded.seed, layout = excluded.layout, machines = excluded.machines, stock = excluded.stock,
      regulars = excluded.regulars, state_version = excluded.state_version, updated_at = now()
    returning id`;
  const ups = Object.entries(p.melhorias).filter(([slug]) => ids.get(slug));
  await sql.transaction([
    sql`delete from lan_upgrades where lan_id = ${t.id}`,
    sql`delete from lan_staff where lan_id = ${t.id}`,
    ...ups.map(([slug, level]) => sql`insert into lan_upgrades (lan_id, catalog_id, level) values (${t.id}, ${ids.get(slug)!}, ${level})`),
    ...p.equipe.map((m) => sql`insert into lan_staff (lan_id, role, level, hired_day) values (${t.id}, ${m.papel}, ${m.nivel}, ${m.contratadoDia})`),
  ]);
}

/** Compra o próximo nível: só debita se o saldo cobre e se o nível ainda é o que o servidor leu. Devolve o saldo novo, ou null. */
export async function comprarMelhoriaDb(userId: string, lid: string, item: ItemCatalogo, nivelAtual: number, preco: number, novo: Progresso): Promise<number | null> {
  if (!item.id) return null;
  const [r] = await sql`
    with deb as (
      update lan_houses set money = money - ${preco}, layout = ${json(novo.layout)}::jsonb, machines = ${json(novo.maquinas)}::jsonb,
        stock = ${json(novo.estoque)}::jsonb, updated_at = now()
      where id = ${lid} and user_id = ${userId} and money >= ${preco} and level >= ${item.minLanLevel}
        and coalesce((select level from lan_upgrades where lan_id = ${lid} and catalog_id = ${item.id}), 0) = ${nivelAtual}
      returning money
    ), up as (
      insert into lan_upgrades (lan_id, catalog_id, level) select ${lid}, ${item.id}, ${nivelAtual + 1} from deb
      on conflict (lan_id, catalog_id) do update set level = excluded.level returning level
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'lan_upgrade_purchased', ${json({ jogo: JOGO, melhoria: item.slug, nivel: nivelAtual + 1, preco })}::jsonb from deb
    )
    select (select money from deb) as saldo`;
  return r?.saldo === null || r?.saldo === undefined ? null : Number(r.saldo);
}

export async function contratarDb(userId: string, lid: string, papel: Papel, preco: number, dia: number, vagas: number, nivelLan: number): Promise<number | null> {
  const [r] = await sql`
    with deb as (
      update lan_houses set money = money - ${preco}, updated_at = now()
      where id = ${lid} and user_id = ${userId} and money >= ${preco} and level >= ${nivelLan}
        and not exists (select 1 from lan_staff where lan_id = ${lid} and role = ${papel})
        and (select count(*) from lan_staff where lan_id = ${lid}) < ${vagas}
      returning money
    ), ins as (
      insert into lan_staff (lan_id, role, level, hired_day) select ${lid}, ${papel}, 1, ${dia} from deb
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'lan_staff_hired', ${json({ jogo: JOGO, papel, nivel: 1, preco })}::jsonb from deb
    )
    select (select money from deb) as saldo`;
  return r?.saldo === null || r?.saldo === undefined ? null : Number(r.saldo);
}

export async function melhorarFuncionarioDb(userId: string, lid: string, papel: Papel, nivelAtual: number, preco: number): Promise<number | null> {
  const [r] = await sql`
    with deb as (
      update lan_houses set money = money - ${preco}, updated_at = now()
      where id = ${lid} and user_id = ${userId} and money >= ${preco}
        and (select level from lan_staff where lan_id = ${lid} and role = ${papel}) = ${nivelAtual}
      returning money
    ), up as (
      update lan_staff set level = ${nivelAtual + 1} where lan_id = ${lid} and role = ${papel} and exists (select 1 from deb) returning level
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'lan_staff_hired', ${json({ jogo: JOGO, papel, nivel: nivelAtual + 1, preco })}::jsonb from deb
    )
    select (select money from deb) as saldo`;
  return r?.saldo === null || r?.saldo === undefined ? null : Number(r.saldo);
}

export async function salvarLayoutDb(userId: string, lid: string, layout: Layout): Promise<void> {
  await sql`update lan_houses set layout = ${json(layout)}::jsonb, updated_at = now() where id = ${lid} and user_id = ${userId}`;
}

/** Grava o dia fechado, a semana (se fechou uma) e o evento, só se o dia do banco ainda é o anterior. */
export async function gravarDiaDb(userId: string, lid: string, anterior: Progresso, f: FechamentoDia): Promise<boolean> {
  const r = f.registro;
  const s = f.semana;
  const p = f.prog;
  const [res] = await sql`
    with up as (
      update lan_houses set money = ${p.dinheiro}, reputation = ${p.reputacao}, day = ${p.dia}, level = ${p.nivel},
        machines = ${json(p.maquinas)}::jsonb, stock = ${json(p.estoque)}::jsonb, regulars = ${json(p.frequentes)}::jsonb, updated_at = now()
      where id = ${lid} and user_id = ${userId} and day = ${anterior.dia}
      returning id
    ), d as (
      insert into lan_days (lan_id, day, served, left_angry, hours_sold, services, snacks_sold, earnings, expenses, incidents, reputation_end, best_archetype, relaxed)
      select ${lid}, ${r.dia}, ${r.servidos}, ${r.foram}, ${r.horasVendidas}, ${json(r.servicos)}::jsonb, ${r.lanchesVendidos}, ${r.ganhos},
        ${json(r.gastos)}::jsonb, ${json(r.incidentes)}::jsonb, ${r.reputacaoFim}, ${r.melhorArquetipo}, ${r.tranquilo} from up
    ), w as (
      insert into lan_weeks (lan_id, week, bills_paid, balance_end)
      select ${lid}, ${s?.semana ?? 0}, ${s?.paga ?? false}, ${s?.saldoFim ?? 0} from up where ${s !== null}
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, 'game_played', ${json({ jogo: JOGO, dia: r.dia, ganhos: r.ganhos, saldo: r.saldo })}::jsonb from up
    )
    select count(*)::int as ok from up`;
  return Number(res?.ok ?? 0) === 1;
}

const TIER = { basica: 0, media: 1, gamer: 2 } as const;

/** Selo da cabine: dias abertos, reputação, nível e a máquina mais top. */
export async function seloDe(userId: string): Promise<{ dias: number; reputacao: number; nivel: number; local: string; melhorPc: MaquinaSalva["tipo"] | null } | null> {
  const [t] = await sql`select day, reputation, level, location, machines from lan_houses where user_id = ${userId}`;
  if (!t) return null;
  const ms = (t.machines as MaquinaSalva[]) ?? [];
  const melhorPc = ms.reduce<MaquinaSalva["tipo"] | null>((a, m) => (!a || TIER[m.tipo] > TIER[a] ? m.tipo : a), null);
  return { dias: Number(t.day), reputacao: Number(t.reputation), nivel: Number(t.level), local: String(t.location), melhorPc };
}

// LGPD
export async function exportarLan(userId: string) {
  const [t] = await sql`select id, location, level, money, reputation, day, seed, layout, machines, stock, regulars, state_version, created_at, updated_at from lan_houses where user_id = ${userId}`;
  if (!t) return { lan: null, dias: [], semanas: [], melhorias: [], equipe: [] };
  const [dias, semanas, melhorias, equipe] = await Promise.all([
    sql`select day, served, left_angry, hours_sold, services, snacks_sold, earnings, expenses, incidents, reputation_end, best_archetype, relaxed, created_at from lan_days where lan_id = ${t.id} order by day`,
    sql`select week, bills_paid, balance_end, created_at from lan_weeks where lan_id = ${t.id} order by week`,
    sql`select c.slug, u.level from lan_upgrades u join lan_catalog c on c.id = u.catalog_id where u.lan_id = ${t.id}`,
    sql`select role, level, hired_day from lan_staff where lan_id = ${t.id}`,
  ]);
  const { id: _id, ...lan } = t;
  void _id;
  return { lan, dias, semanas, melhorias, equipe };
}

export async function apagarLan(userId: string) {
  await sql`delete from lan_houses where user_id = ${userId}`; // dias, semanas, melhorias e equipe vão junto (on delete cascade)
}
