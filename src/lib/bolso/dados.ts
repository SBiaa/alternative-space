import { sql } from "@/lib/db";
import { BOLSO_SLUG, REGRAS } from "./config";
import type { Recompensas } from "./motor";
import { personagemSchema, type Personagem, type PersonagemSalva } from "./personagem";
import { migrar, VERSAO_ESTADO, type Estado } from "./save";

// Consultas da Mesa de Bolso. Toda gravação recebe o user_id da sessão, nunca do navegador.
// Itens, rolagens e entradas do diário só nascem aqui, a partir de estado que o servidor calculou.

type Linha = Record<string, unknown>;

function lerPersonagem(r: Linha): PersonagemSalva | null {
  const p = personagemSchema.safeParse({ nome: r.name, attrs: r.attrs, talentos: r.talents, retrato: r.portrait });
  return p.success ? { id: String(r.id), ...p.data } : null;
}

export async function listarPersonagens(userId: string): Promise<PersonagemSalva[]> {
  const rs = await sql`select id, name, attrs, talents, portrait from solo_characters where user_id = ${userId} order by created_at`;
  return rs.flatMap((r) => lerPersonagem(r) ?? []);
}

export async function personagemDoDono(userId: string, id: string): Promise<PersonagemSalva | null> {
  if (!UUID.test(id)) return null;
  const [r] = await sql`select id, name, attrs, talents, portrait from solo_characters where id = ${id} and user_id = ${userId}`;
  return r ? lerPersonagem(r) : null;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cria a personagem. Devolve o id, ou null se a conta já está no limite. */
export async function criarPersonagem(userId: string, p: Personagem): Promise<string | null> {
  const [r] = await sql`
    insert into solo_characters (user_id, name, attrs, talents, portrait)
    select ${userId}, ${p.nome}, ${JSON.stringify(p.attrs)}::jsonb, ${JSON.stringify(p.talentos)}::jsonb, ${JSON.stringify(p.retrato)}::jsonb
    where (select count(*) from solo_characters where user_id = ${userId}) < ${REGRAS.personagensPorConta}
    returning id`;
  return r ? String(r.id) : null;
}

export type RunGuardada = { id: string; characterId: string; estado: Estado };

const lerRun = (r: Linha): RunGuardada | null => {
  const estado = migrar(r.state);
  return estado ? { id: String(r.id), characterId: String(r.character_id), estado } : null;
};

export async function runAtiva(userId: string, aventura: string): Promise<RunGuardada | null> {
  const [r] = await sql`select id, character_id, state from solo_runs where user_id = ${userId} and adventure_slug = ${aventura} and not finished`;
  return r ? lerRun(r) : null;
}

/** A última partida terminada dessa aventura, pra tela de final depois do fim. */
export async function ultimaRunTerminada(userId: string, aventura: string): Promise<RunGuardada | null> {
  const [r] = await sql`
    select id, character_id, state from solo_runs
    where user_id = ${userId} and adventure_slug = ${aventura} and finished order by updated_at desc limit 1`;
  return r ? lerRun(r) : null;
}

export type RunResumo = { aventura: string; personagem: string; atualizada: string };

export async function runsAtivas(userId: string): Promise<RunResumo[]> {
  const rs = await sql`
    select r.adventure_slug, c.name, r.updated_at from solo_runs r join solo_characters c on c.id = r.character_id
    where r.user_id = ${userId} and not r.finished order by r.updated_at desc`;
  return rs.map((r) => ({ aventura: String(r.adventure_slug), personagem: String(r.name), atualizada: new Date(r.updated_at as string).toISOString() }));
}

/** Abre uma partida. Devolve null se essa aventura já tem uma em andamento. */
export async function criarRun(userId: string, characterId: string, e: Estado): Promise<string | null> {
  const [r] = await sql`
    insert into solo_runs (user_id, character_id, adventure_slug, seed, state, state_version, roll_count)
    values (${userId}, ${characterId}, ${e.aventura}, ${e.seed}, ${JSON.stringify(e)}::jsonb, ${VERSAO_ESTADO}, ${e.rolagens})
    on conflict (user_id, adventure_slug) where not finished do nothing returning id`;
  return r ? String(r.id) : null;
}

/**
 * Grava um passo da partida. Só vale se o banco ainda está no passo anterior (`passosAntes`):
 * dois pedidos com o mesmo estado não gastam a mesma rolagem duas vezes. Devolve false se perdeu a corrida.
 */
export async function gravarPasso(userId: string, runId: string, passosAntes: number, e: Estado): Promise<boolean> {
  const rs = await sql`
    update solo_runs set state = ${JSON.stringify(e)}::jsonb, state_version = ${VERSAO_ESTADO}, roll_count = ${e.rolagens}, updated_at = now()
    where id = ${runId} and user_id = ${userId} and not finished and (state->>'passos')::int = ${passosAntes}
    returning id`;
  return rs.length > 0;
}

/** Larga a partida em andamento dessa aventura (a terminada e o diário ficam). */
export async function abandonarRun(userId: string, aventura: string) {
  await sql`delete from solo_runs where user_id = ${userId} and adventure_slug = ${aventura} and not finished`;
}

export type Fechamento = { finalId: string; resumo: string; recompensas: Recompensas };

const eventos = (e: Estado) => ({
  jogada: { jogo: BOLSO_SLUG, aventura: e.aventura, final: e.final?.id, folego: e.folego },
  rolagens: { jogo: BOLSO_SLUG, aventura: e.aventura, total: e.rolagens, ...e.porFaixa },
});

/**
 * Fecha a partida: marca terminada, cria a entrada do diário e os eventos `game_played` e `solo_roll`,
 * tudo num comando só. Devolve false se a partida já não estava nesse passo (nada é gravado).
 */
export async function fecharRun(userId: string, runId: string, passosAntes: number, e: Estado, f: Fechamento): Promise<boolean> {
  const ev = eventos(e);
  const rs = await sql`
    with up as (
      update solo_runs set state = ${JSON.stringify(e)}::jsonb, state_version = ${VERSAO_ESTADO}, roll_count = ${e.rolagens},
        finished = true, ending = ${f.finalId}, updated_at = now()
      where id = ${runId} and user_id = ${userId} and not finished and (state->>'passos')::int = ${passosAntes}
      returning character_id
    ), j as (
      insert into solo_journal (user_id, character_id, adventure_slug, ending, summary, rewards)
      select ${userId}, up.character_id, ${e.aventura}, ${f.finalId}, ${f.resumo}, ${JSON.stringify(f.recompensas)}::jsonb from up
      returning id
    ), e1 as (
      insert into events (user_id, kind, payload) select ${userId}, 'game_played', ${JSON.stringify(ev.jogada)}::jsonb from up returning id
    ), e2 as (
      insert into events (user_id, kind, payload) select ${userId}, 'solo_roll', ${JSON.stringify(ev.rolagens)}::jsonb from up returning id
    )
    select (select count(*) from up)::int as n`;
  return Number(rs[0]?.n ?? 0) > 0;
}

/**
 * Leva pra conta o que foi jogado sem login. A personagem e as partidas vêm de cookie assinado (o servidor
 * já conferiu a assinatura). Partida terminada vira entrada no diário agora; em andamento só retoma.
 */
export async function importarLocal(
  userId: string,
  p: Personagem,
  partidas: { estado: Estado; fechamento?: Fechamento }[],
): Promise<{ personagemId: string | null; importadas: number }> {
  const personagemId = await criarPersonagem(userId, p);
  if (!personagemId) return { personagemId: null, importadas: 0 };
  let importadas = 0;
  for (const { estado, fechamento } of partidas) {
    const runId = await criarRun(userId, personagemId, { ...estado, final: undefined });
    if (!runId) continue;
    if (estado.final && fechamento) {
      // Reusa o fechamento normal: grava o estado terminado, o diário e os eventos.
      await fecharRun(userId, runId, estado.passos, estado, fechamento).catch(() => false);
      // O estado gravado acima tinha `passos` do fim; o `criarRun` guardou o mesmo passo, então a condição bate.
    }
    importadas += 1;
  }
  return { personagemId, importadas };
}

export type EntradaDiario = { id: string; aventura: string; final: string; resumo: string; recompensas: Recompensas; quando: string };

export async function diarioDaPersonagem(userId: string, characterId: string): Promise<EntradaDiario[]> {
  if (!UUID.test(characterId)) return [];
  const rs = await sql`
    select id, adventure_slug, ending, summary, rewards, created_at from solo_journal
    where user_id = ${userId} and character_id = ${characterId} order by created_at desc`;
  return rs.map((r) => ({
    id: String(r.id),
    aventura: String(r.adventure_slug),
    final: String(r.ending),
    resumo: String(r.summary),
    recompensas: { itens: [], marcas: [], ...(r.rewards as object) } as Recompensas,
    quando: new Date(r.created_at as string).toISOString(),
  }));
}

export async function exportarBolso(userId: string) {
  const [personagens, partidas, diario] = await Promise.all([
    sql`select id, name, attrs, talents, portrait, ficha_id, created_at from solo_characters where user_id = ${userId} order by created_at`,
    sql`select id, character_id, adventure_slug, seed, state, state_version, roll_count, finished, ending, created_at, updated_at from solo_runs where user_id = ${userId} order by created_at`,
    sql`select id, character_id, adventure_slug, ending, summary, rewards, created_at from solo_journal where user_id = ${userId} order by created_at`,
  ]);
  return { personagens, partidas, diario };
}

export async function apagarBolso(userId: string) {
  // As partidas e o diário caem junto com a personagem (on delete cascade); apaga na ordem mesmo assim, por clareza.
  await sql`delete from solo_journal where user_id = ${userId}`;
  await sql`delete from solo_runs where user_id = ${userId}`;
  await sql`delete from solo_characters where user_id = ${userId}`;
}
