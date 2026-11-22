import { sql } from "@/lib/db";
import { VILA } from "./config";
import type { EstadoCaso } from "./investigacao";

// Consultas do Assombrações da Vila. Toda gravação recebe o user_id da sessão, nunca do navegador.

export type LinhaProgresso = { caso: string; estado: EstadoCaso; resolvido: boolean };

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const linha = (r: Record<string, unknown>): LinhaProgresso => ({
  caso: String(r.case_slug),
  estado: { sinais: lista(r.signals), depoimentos: lista(r.testimonies), tentativas: Number(r.attempts) },
  resolvido: Boolean(r.solved),
});

export async function lerProgresso(userId: string): Promise<LinhaProgresso[]> {
  const rs = await sql`select case_slug, signals, testimonies, attempts, solved from vila_progress where user_id = ${userId}`;
  return rs.map(linha);
}

export async function lerCaso(userId: string, caso: string): Promise<LinhaProgresso | null> {
  const [r] = await sql`select case_slug, signals, testimonies, attempts, solved from vila_progress where user_id = ${userId} and case_slug = ${caso}`;
  return r ? linha(r) : null;
}

/** Grava sinais, falas e tentativas. Não mexe em `solved`. */
export async function gravarEstado(userId: string, caso: string, e: EstadoCaso): Promise<void> {
  await sql`
    insert into vila_progress (user_id, case_slug, signals, testimonies, attempts, state_version)
    values (${userId}, ${caso}, ${JSON.stringify(e.sinais)}::jsonb, ${JSON.stringify(e.depoimentos)}::jsonb, ${e.tentativas}, ${VILA.versaoSave})
    on conflict (user_id, case_slug) do update set signals = excluded.signals, testimonies = excluded.testimonies,
      attempts = greatest(vila_progress.attempts, excluded.attempts), state_version = excluded.state_version, updated_at = now()`;
}

/** Conta mais uma tentativa errada e devolve o total. */
export async function somarTentativa(userId: string, caso: string): Promise<number> {
  const [r] = await sql`
    insert into vila_progress (user_id, case_slug, attempts, state_version)
    values (${userId}, ${caso}, 1, ${VILA.versaoSave})
    on conflict (user_id, case_slug) do update set attempts = vila_progress.attempts + 1, updated_at = now()
    returning attempts`;
  return Number(r?.attempts ?? 1);
}

/**
 * Marca o caso como resolvido, abre a criatura no Bestiário e grava o evento. Tudo é idempotente:
 * o evento só sai na primeira vez. Devolve true se foi a primeira vez.
 */
export async function marcarResolvido(userId: string, caso: string, criatura: string, tentativas: number): Promise<boolean> {
  await sql`
    insert into vila_progress (user_id, case_slug, state_version) values (${userId}, ${caso}, ${VILA.versaoSave})
    on conflict (user_id, case_slug) do nothing`;
  const [novo] = await sql`
    update vila_progress set solved = true, solved_at = now(), updated_at = now()
    where user_id = ${userId} and case_slug = ${caso} and solved = false returning id`;
  await sql`insert into vila_bestiary (user_id, creature_slug) values (${userId}, ${criatura}) on conflict do nothing`;
  if (novo) {
    await sql`
      insert into events (user_id, kind, payload)
      values (${userId}, 'game_played', ${JSON.stringify({ jogo: VILA.slug, caso, tentativas })}::jsonb)`;
  }
  return Boolean(novo);
}

export async function criaturasConhecidas(userId: string): Promise<string[]> {
  const rs = await sql`select creature_slug from vila_bestiary where user_id = ${userId} order by met_at`;
  return rs.map((r) => String(r.creature_slug));
}

/** Selo da cabine: quantas criaturas conhecidas. Sem nenhuma, null (o bloco não aparece). */
export async function seloDe(userId: string): Promise<{ conhecidas: number } | null> {
  const [r] = await sql`select count(*)::int as n from vila_bestiary where user_id = ${userId}`;
  const n = Number(r?.n ?? 0);
  return n > 0 ? { conhecidas: n } : null;
}

// LGPD
export async function exportarAssombracoes(userId: string) {
  const [progresso, bestiario] = await Promise.all([
    sql`select case_slug, signals, testimonies, attempts, solved, solved_at, state_version, created_at, updated_at
        from vila_progress where user_id = ${userId} order by case_slug`,
    sql`select creature_slug, met_at from vila_bestiary where user_id = ${userId} order by met_at`,
  ]);
  return { progresso, bestiario };
}

export async function apagarAssombracoes(userId: string) {
  await sql`delete from vila_progress where user_id = ${userId}`;
  await sql`delete from vila_bestiary where user_id = ${userId}`;
}
