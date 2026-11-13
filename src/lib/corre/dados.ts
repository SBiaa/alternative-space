import { sql } from "@/lib/db";
import type { Estado } from "./motor";
import { migrar, problemaAoGravar, type ResumoDiaValidado, type ResumoSemanaValidado } from "./save";

// Consultas do O Corre. Toda gravação recebe o user_id da sessão, nunca do navegador.

export async function lerSave(userId: string): Promise<Estado | null> {
  const [r] = await sql`select state from corre_saves where user_id = ${userId}`;
  return r ? migrar(r.state) : null;
}

async function diaGuardado(userId: string): Promise<number | null> {
  const [r] = await sql`select game_day from corre_saves where user_id = ${userId}`;
  return r ? Number(r.game_day) : null;
}

/** Grava (ou troca) o save. Devolve o motivo da recusa, ou null se gravou. */
export async function gravarSave(userId: string, e: Estado, substituir = false): Promise<string | null> {
  const motivo = problemaAoGravar(e, substituir ? null : await diaGuardado(userId));
  if (motivo) return motivo;
  await sql`
    insert into corre_saves (user_id, seed, game_day, game_week, state, state_version)
    values (${userId}, ${e.seed}, ${e.dia}, ${e.semana}, ${JSON.stringify(e)}::jsonb, ${e.versao})
    on conflict (user_id) do update set seed = excluded.seed, game_day = excluded.game_day, game_week = excluded.game_week,
      state = excluded.state, state_version = excluded.state_version, updated_at = now()`;
  return null;
}

async function idDoSave(userId: string): Promise<string | null> {
  const [r] = await sql`select id from corre_saves where user_id = ${userId}`;
  return r ? String(r.id) : null;
}

export async function gravarDia(userId: string, r: ResumoDiaValidado): Promise<boolean> {
  const saveId = await idDoSave(userId);
  if (!saveId) return false;
  const [novo] = await sql`
    insert into corre_days (save_id, game_day, earnings, expenses, deliveries, on_time, late, declined, rating_end)
    values (${saveId}, ${r.dia}, ${r.ganhos}, ${r.gastos}, ${r.entregas}, ${r.noPrazo}, ${r.atrasadas}, ${r.recusadas}, ${r.avaliacao})
    on conflict (save_id, game_day) do nothing returning id`;
  if (novo) {
    await sql`
      insert into events (user_id, kind, payload)
      values (${userId}, 'game_played', ${JSON.stringify({ jogo: "o-corre", dia: r.dia, ganhos: r.ganhos })}::jsonb)`;
  }
  return true;
}

export async function gravarSemana(userId: string, r: ResumoSemanaValidado): Promise<boolean> {
  const saveId = await idDoSave(userId);
  if (!saveId) return false;
  await sql`
    insert into corre_weeks (save_id, game_week, bills_paid, balance_end, goal_progress)
    values (${saveId}, ${r.semana}, ${r.contasPagas}, ${r.saldo}, ${r.progressoObjetivo})
    on conflict (save_id, game_week) do nothing`;
  return true;
}

export type SeloCorre = { diasJogados: number; semanasNoAzul: number; moto: string | null };

/** Dados do selo da cabine. Sem save, null (o bloco não aparece). */
export async function seloDe(userId: string): Promise<SeloCorre | null> {
  const [s] = await sql`
    select s.state->>'modeloMoto' as moto,
      (select count(*) from corre_days d where d.save_id = s.id)::int as dias,
      (select count(*) from corre_weeks w where w.save_id = s.id and w.bills_paid)::int as semanas
    from corre_saves s where s.user_id = ${userId}`;
  if (!s || Number(s.dias) === 0) return null;
  return { diasJogados: Number(s.dias), semanasNoAzul: Number(s.semanas), moto: s.moto ? String(s.moto) : null };
}

// LGPD
export async function exportarCorre(userId: string) {
  const [save] = await sql`select seed, game_day, game_week, state, state_version, created_at, updated_at from corre_saves where user_id = ${userId}`;
  if (!save) return { save: null, dias: [], semanas: [] };
  const [dias, semanas] = await Promise.all([
    sql`select d.game_day, d.earnings, d.expenses, d.deliveries, d.on_time, d.late, d.declined, d.rating_end, d.created_at
        from corre_days d join corre_saves s on s.id = d.save_id where s.user_id = ${userId} order by d.game_day`,
    sql`select w.game_week, w.bills_paid, w.balance_end, w.goal_progress, w.created_at
        from corre_weeks w join corre_saves s on s.id = w.save_id where s.user_id = ${userId} order by w.game_week`,
  ]);
  return { save, dias, semanas };
}

export async function apagarCorre(userId: string) {
  await sql`delete from corre_saves where user_id = ${userId}`; // dias e semanas vão junto (on delete cascade)
}
