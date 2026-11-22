// Banco da Laje Verde (Postgres/Neon). A regra fica em motor.ts; aqui só lê, grava e confere a versão.

import { sql } from "@/lib/db";
import type { AcaoLog } from "./acoes";
import { JOGO, LAJE } from "./config";
import { inicioDoDia, diaDe } from "./tempo";
import { migrar } from "./save";
import type { Save, Vaso } from "./tipos";

export type SaveSalvo = { id: string; versao: number; save: Save };

const json = (v: unknown) => JSON.stringify(v);
const ms = (v: unknown) => (v instanceof Date ? v.getTime() : new Date(v as string).getTime());

type LinhaVaso = { slot: number; plant_slug: string | null; planted_at: Date | string | null; water_level: string | number; water_updated_at: Date | string; pot_level: number; growth_ms: string | number };

function vasoDe(r: LinhaVaso): Vaso {
  return {
    slot: Number(r.slot),
    planta: r.plant_slug,
    plantadoEm: r.planted_at ? ms(r.planted_at) : null,
    agua: Number(r.water_level),
    aguaEm: ms(r.water_updated_at),
    nivel: Number(r.pot_level),
    crescimentoMs: Number(r.growth_ms),
  };
}

export async function lerLaje(userId: string): Promise<SaveSalvo | null> {
  const [s] = await sql`select id, coins, seed, inventory, decorations, state_version, created_at from garden_saves where user_id = ${userId}`;
  if (!s) return null;
  const vasos = (await sql`select slot, plant_slug, planted_at, water_level, water_updated_at, pot_level, growth_ms from garden_pots where save_id = ${s.id} order by slot`) as LinhaVaso[];
  const save = migrar({
    v: LAJE.versaoSave,
    seed: s.seed,
    moedas: Number(s.coins),
    criadoEm: ms(s.created_at),
    inventario: s.inventory,
    decoracoes: s.decorations,
    vasos: vasos.map(vasoDe),
  });
  return save ? { id: s.id as string, versao: Number(s.state_version), save } : null;
}

/** Abre uma laje (ou devolve a que já existe, se duas abas pediram juntas). */
export async function criarLaje(userId: string, save: Save): Promise<SaveSalvo | null> {
  await sql.transaction([
    sql`
      insert into garden_saves (user_id, coins, seed, inventory, decorations, created_at)
      values (${userId}, ${save.moedas}, ${save.seed}, ${json(save.inventario)}::jsonb, ${json(save.decoracoes)}::jsonb, ${new Date(save.criadoEm).toISOString()})
      on conflict (user_id) do nothing`,
    sql`
      insert into garden_pots (save_id, slot, plant_slug, planted_at, water_level, water_updated_at, pot_level, growth_ms)
      select s.id, (p->>'slot')::int, p->>'planta', to_timestamp((p->>'plantadoEm')::double precision / 1000), (p->>'agua')::numeric,
             to_timestamp((p->>'aguaEm')::double precision / 1000), (p->>'nivel')::int, (p->>'crescimentoMs')::bigint
      from garden_saves s, jsonb_array_elements(${json(save.vasos)}::jsonb) p
      where s.user_id = ${userId} and s.state_version = 1 and not exists (select 1 from garden_pots where save_id = s.id)
      on conflict do nothing`,
  ]);
  return lerLaje(userId);
}

/**
 * Grava o resultado de uma ação se ninguém mexeu na laje desde a leitura (state_version).
 * Devolve false quando outra aba chegou antes: a tela relê e tenta de novo.
 */
export async function gravarAcao(userId: string, antes: SaveSalvo, depois: Save, agora: number, acao: AcaoLog, payload: Record<string, unknown>, evento?: { kind: string; payload: Record<string, unknown> }): Promise<boolean> {
  const stamp = new Date(agora).toISOString();
  const novaVersao = antes.versao + 1;
  const resultados = await sql.transaction([
    sql`
      update garden_saves set coins = ${depois.moedas}, inventory = ${json(depois.inventario)}::jsonb, decorations = ${json(depois.decoracoes)}::jsonb,
        state_version = ${novaVersao}, updated_at = ${stamp}
      where id = ${antes.id} and state_version = ${antes.versao}
      returning id`,
    sql`
      insert into garden_pots (save_id, slot, plant_slug, planted_at, water_level, water_updated_at, pot_level, growth_ms)
      select ${antes.id}::uuid, (p->>'slot')::int, p->>'planta', to_timestamp((p->>'plantadoEm')::double precision / 1000), (p->>'agua')::numeric,
             to_timestamp((p->>'aguaEm')::double precision / 1000), (p->>'nivel')::int, (p->>'crescimentoMs')::bigint
      from jsonb_array_elements(${json(depois.vasos)}::jsonb) p
      where exists (select 1 from garden_saves where id = ${antes.id} and state_version = ${novaVersao} and updated_at = ${stamp})
      on conflict (save_id, slot) do update set plant_slug = excluded.plant_slug, planted_at = excluded.planted_at, water_level = excluded.water_level,
        water_updated_at = excluded.water_updated_at, pot_level = excluded.pot_level, growth_ms = excluded.growth_ms`,
    sql`
      insert into garden_log (save_id, action, payload)
      select ${antes.id}::uuid, ${acao}, ${json(payload)}::jsonb
      where exists (select 1 from garden_saves where id = ${antes.id} and state_version = ${novaVersao} and updated_at = ${stamp})`,
    sql`
      insert into events (user_id, kind, payload)
      select ${userId}, ${evento?.kind ?? "garden_noop"}, ${json({ jogo: JOGO, ...(evento?.payload ?? {}) })}::jsonb
      where ${Boolean(evento)} and exists (select 1 from garden_saves where id = ${antes.id} and state_version = ${novaVersao} and updated_at = ${stamp})`,
  ]);
  return (resultados[0] as unknown[]).length > 0;
}

/** Grava a primeira visita do dia (uma por dia do jogo). */
export async function registrarVisitaDoDia(userId: string, agora: number) {
  await sql`
    insert into events (user_id, kind, payload)
    select ${userId}, 'game_played', ${json({ jogo: JOGO, dia: diaDe(agora) })}::jsonb
    where not exists (
      select 1 from events where user_id = ${userId} and kind = 'game_played' and payload->>'jogo' = ${JOGO}
        and created_at >= ${new Date(inicioDoDia(diaDe(agora))).toISOString()}
    )`;
}

/** Planta mais colhida, pra cabine do tripulante. */
export async function plantaFavorita(userId: string): Promise<{ planta: string; colheitas: number } | null> {
  const [r] = await sql`
    select l.payload->>'planta' as planta, count(*)::int as colheitas
    from garden_log l join garden_saves s on s.id = l.save_id
    where s.user_id = ${userId} and l.action = 'harvest' and l.payload->>'planta' is not null
    group by 1 order by 2 desc, 1 limit 1`;
  return r ? { planta: r.planta as string, colheitas: Number(r.colheitas) } : null;
}

export async function exportarLaje(userId: string) {
  const [s] = await sql`select id, coins, seed, inventory, decorations, state_version, created_at, updated_at from garden_saves where user_id = ${userId}`;
  if (!s) return { laje: null, vasos: [], diario: [] };
  const [vasos, diario] = await Promise.all([
    sql`select slot, plant_slug, planted_at, water_level, water_updated_at, pot_level, growth_ms from garden_pots where save_id = ${s.id} order by slot`,
    sql`select action, payload, created_at from garden_log where save_id = ${s.id} order by created_at`,
  ]);
  const { id: _id, ...laje } = s;
  void _id;
  return { laje, vasos, diario };
}

export async function apagarLaje(userId: string) {
  await sql`delete from garden_saves where user_id = ${userId}`; // vasos e diário vão junto (on delete cascade)
}
