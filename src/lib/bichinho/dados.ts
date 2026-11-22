import { sql } from "@/lib/db";
import { EVENTOS_DE_JOGO, FASES, MECANICA, type Fase, type Humor, type Slot, type Stats } from "./config";
import {
  acessorioDe,
  avancar,
  equipadosValidos,
  especieDe,
  fraseDoDia,
  guardarStats,
  hojeSP,
  humorDe,
  lerStats,
  marcosAtingidos,
  podeDarPetisco,
  statsIniciais,
  type EventoPet,
  type Resumo,
} from "./regras";

// Consultas do bichinho. Toda gravação recebe o user_id da sessão, nunca do navegador, e nenhuma
// função aqui aceita valor de barra de fora: as barras só mudam em tick(), a partir de events.

export type PetView = {
  especie: string;
  nome: string;
  fase: Fase;
  fraseFase: string;
  stats: Stats;
  xp: number;
  /** XP que falta pra próxima fase (null na última). */
  proximaFaseXp: number | null;
  humor: Humor;
  frase: string;
  voltou: boolean;
  equipados: Partial<Record<Slot, string>>;
  liberados: string[];
  petiscoDisponivel: boolean;
};

type Linha = {
  id: string;
  species: string;
  name: string;
  stage: number;
  stats: unknown;
  xp: number;
  accessories_equipped: unknown;
  tick_txt: string;
  agora_txt: string;
  treat_txt: string | null;
};

async function linhaDe(userId: string): Promise<Linha | null> {
  const [r] = await sql`
    select id, species, name, stage, stats, xp, accessories_equipped,
           last_tick_at::text as tick_txt, now()::text as agora_txt, last_treat_date::text as treat_txt
    from pets where user_id = ${userId}`;
  return (r as Linha | undefined) ?? null;
}

async function liberadosDe(userId: string): Promise<string[]> {
  const rows = await sql`select accessory_slug from pet_unlocks where user_id = ${userId} order by unlocked_at`;
  return rows.map((r) => String(r.accessory_slug)).filter((s) => acessorioDe(s));
}

function vista(l: Linha, o: { stats: Stats; xp: number; stage: Fase; voltou: boolean; liberados: string[]; agora: string; userId: string }): PetView {
  const humor = humorDe(o.stats, o.voltou);
  const proxima = FASES.find((f) => f.fase === o.stage + 1);
  return {
    especie: l.species,
    nome: l.name,
    fase: o.stage,
    fraseFase: FASES[o.stage].nome,
    stats: o.stats,
    xp: o.xp,
    proximaFaseXp: proxima ? proxima.xp : null,
    humor,
    frase: fraseDoDia(humor, o.userId, hojeSP(o.agora)),
    voltou: o.voltou,
    equipados: equipadosValidos(l.accessories_equipped, o.liberados),
    liberados: o.liberados,
    petiscoDisponivel: podeDarPetisco(l.treat_txt, o.agora),
  };
}

const estagio = (n: number): Fase => (n >= 2 ? 2 : n <= 0 ? 0 : 1);

async function resumoDe(userId: string): Promise<Resumo> {
  const [r] = await sql`
    select
      (select count(*) from events where user_id = ${userId} and kind = 'quiz_completed') as quizzes,
      (select count(*) from events where user_id = ${userId} and kind = any(${[...EVENTOS_DE_JOGO]}::text[])) as jogos`;
  let fichas = 0;
  try {
    const [f] = await sql`select count(*) as n from fichas where user_id = ${userId}`;
    fichas = Number(f?.n ?? 0);
  } catch {
    // A tabela de fichas pode não existir num banco novo; o marco fica fechado.
  }
  return { quizzes: Number(r?.quizzes ?? 0), jogos: Number(r?.jogos ?? 0), fichas };
}

async function sincronizarMarcos(userId: string): Promise<string[]> {
  const slugs = marcosAtingidos(await resumoDe(userId));
  if (slugs.length) {
    await sql`
      insert into pet_unlocks (user_id, accessory_slug)
      select ${userId}, unnest(${slugs}::text[]) on conflict do nothing`;
  }
  return liberadosDe(userId);
}

/** Leva o bichinho até agora: queda do tempo + ganhos dos eventos novos. Seguro rodar várias vezes e em paralelo. */
export async function tick(userId: string): Promise<PetView | null> {
  const l = await linhaDe(userId);
  if (!l) return null;
  const eventos = (await sql`
    select kind, created_at from events
    where user_id = ${userId} and created_at > ${l.tick_txt}::timestamptz and created_at <= ${l.agora_txt}::timestamptz`) as EventoPet[];
  const a = avancar({ stats: lerStats(l.stats), xp: Number(l.xp), stage: estagio(Number(l.stage)), lastTickAt: l.tick_txt }, eventos, l.agora_txt);

  // Só grava se ninguém avançou o relógio antes de nós (last_tick_at igual ao que lemos).
  const gravou = await sql`
    update pets set stats = ${JSON.stringify(guardarStats(a.stats))}::jsonb, xp = ${a.xp}, stage = ${a.stage},
      last_tick_at = ${l.agora_txt}::timestamptz, updated_at = now()
    where user_id = ${userId} and last_tick_at = ${l.tick_txt}::timestamptz returning id`;

  if (!gravou.length) {
    // Outra aba ganhou a corrida: devolve o estado já gravado por ela.
    const atual = await linhaDe(userId);
    if (!atual) return null;
    return vista(atual, { stats: lerStats(atual.stats), xp: Number(atual.xp), stage: estagio(Number(atual.stage)), voltou: false, liberados: await liberadosDe(userId), agora: atual.agora_txt, userId });
  }

  for (const e of a.evolucoes) {
    if (e.de === 0) await sql`insert into events (user_id, kind, payload) values (${userId}, 'pet_hatched', ${JSON.stringify({ especie: l.species })}::jsonb)`;
    if (e.para === 2) await sql`insert into events (user_id, kind, payload) values (${userId}, 'pet_evolved', ${JSON.stringify({ de: Math.max(e.de, 1), para: 2 })}::jsonb)`;
  }
  const liberados = await sincronizarMarcos(userId);
  return vista(l, { stats: a.stats, xp: a.xp, stage: a.stage, voltou: a.voltou, liberados, agora: l.agora_txt, userId });
}

/** Abrir a base ou a página do bichinho: conta a visita do dia (uma por dia) e atualiza. Sem bichinho, devolve null. */
export async function abrirBase(userId: string): Promise<PetView | null> {
  const [tem] = await sql`select 1 as ok from pets where user_id = ${userId}`;
  if (!tem) return null;
  await sql`
    insert into events (user_id, kind, payload)
    select ${userId}, 'pet_visit', '{}'::jsonb
    where not exists (
      select 1 from events where user_id = ${userId} and kind = 'pet_visit'
        and (created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date)`;
  return tick(userId);
}

/** Vista pública da cabine: só lê, não conta visita nem avança o relógio do dono. */
export async function verPublico(userId: string): Promise<PetView | null> {
  const l = await linhaDe(userId);
  if (!l) return null;
  return vista(l, { stats: lerStats(l.stats), xp: Number(l.xp), stage: estagio(Number(l.stage)), voltou: false, liberados: await liberadosDe(userId), agora: l.agora_txt, userId });
}

export async function criarPet(userId: string, especie: string): Promise<boolean> {
  const e = especieDe(especie);
  if (!e) return false;
  const r = await sql`
    insert into pets (user_id, species, name, stage, stats, xp)
    values (${userId}, ${e.slug}, ${e.nomePadrao}, 0, ${JSON.stringify(guardarStats(statsIniciais()))}::jsonb, 0)
    on conflict (user_id) do nothing returning id`;
  return r.length > 0;
}

export type ResultadoPetisco = { ok: true; pet: PetView } | { ok: false; erro: "semPet" | "jaDeu" };

/** 1 por dia (fuso de São Paulo). A trava é um update condicional: duas abas juntas só dão um petisco. */
export async function darPetisco(userId: string): Promise<ResultadoPetisco> {
  const [tem] = await sql`select 1 as ok from pets where user_id = ${userId}`;
  if (!tem) return { ok: false, erro: "semPet" };
  const ganhou = await sql`
    update pets set last_treat_date = (now() at time zone 'America/Sao_Paulo')::date, updated_at = now()
    where user_id = ${userId}
      and (last_treat_date is null or last_treat_date < (now() at time zone 'America/Sao_Paulo')::date)
    returning id`;
  if (!ganhou.length) return { ok: false, erro: "jaDeu" };
  await sql`insert into events (user_id, kind, payload) values (${userId}, 'pet_treat', '{}'::jsonb)`;
  // O tick seguinte lê o pet_treat e sobe carinho e XP, pelo mesmo caminho de qualquer evento.
  const pet = await tick(userId);
  return pet ? { ok: true, pet } : { ok: false, erro: "semPet" };
}

export async function equipar(userId: string, slot: Slot, slug: string | null): Promise<PetView | null | "bloqueado"> {
  const l = await linhaDe(userId);
  if (!l) return null;
  const liberados = await liberadosDe(userId);
  const atuais = equipadosValidos(l.accessories_equipped, liberados);
  if (slug) {
    const a = acessorioDe(slug);
    if (!a || a.slot !== slot || !liberados.includes(slug)) return "bloqueado";
    atuais[slot] = slug;
  } else {
    delete atuais[slot];
  }
  await sql`update pets set accessories_equipped = ${JSON.stringify(atuais)}::jsonb, updated_at = now() where user_id = ${userId}`;
  return vista({ ...l, accessories_equipped: atuais }, { stats: lerStats(l.stats), xp: Number(l.xp), stage: estagio(Number(l.stage)), voltou: false, liberados, agora: l.agora_txt, userId });
}

export async function renomear(userId: string, nome: string): Promise<boolean> {
  const r = await sql`update pets set name = ${nome}, updated_at = now() where user_id = ${userId} returning id`;
  return r.length > 0;
}

/** Leitura de post: uma por post por dia. O tick seguinte soma curiosidade e XP. */
export async function registrarLeitura(userId: string, slug: string): Promise<void> {
  const [tem] = await sql`select 1 as ok from pets where user_id = ${userId}`;
  if (!tem) return;
  await sql`
    insert into events (user_id, kind, payload)
    select ${userId}, 'post_view', ${JSON.stringify({ slug })}::jsonb
    where not exists (
      select 1 from events where user_id = ${userId} and kind = 'post_view' and payload->>'slug' = ${slug}
        and (created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date)`;
}

/** Conta mais uma ação da pessoa e diz se ainda está dentro do limite. Se o banco falhar, deixa passar. */
export async function dentroDoLimitePet(userId: string, acao: keyof typeof MECANICA.limites): Promise<boolean> {
  const { max, janelaSeg } = MECANICA.limites[acao];
  try {
    const [r] = await sql`
      insert into pet_limites (user_id, acao, janela, total)
      values (${userId}, ${acao}, to_timestamp(floor(extract(epoch from now()) / ${janelaSeg}) * ${janelaSeg}), 1)
      on conflict (user_id, acao, janela) do update set total = pet_limites.total + 1
      returning total`;
    if (Math.random() < 0.02) await sql`delete from pet_limites where janela < now() - interval '1 day'`;
    return Number(r?.total ?? 0) <= max;
  } catch (e) {
    console.error("Limite do bichinho indisponível:", e);
    return true;
  }
}

export async function exportarBichinho(userId: string) {
  const [pet, desbloqueios] = await Promise.all([
    sql`select species, name, stage, stats, xp, accessories_equipped, last_tick_at, last_treat_date, created_at, updated_at from pets where user_id = ${userId}`,
    sql`select accessory_slug, unlocked_at from pet_unlocks where user_id = ${userId} order by unlocked_at`,
  ]);
  return { bichinho: pet[0] ?? null, acessorios_liberados: desbloqueios };
}

export async function apagarBichinho(userId: string) {
  await sql`delete from pets where user_id = ${userId}`;
  await sql`delete from pet_unlocks where user_id = ${userId}`;
  await sql`delete from pet_limites where user_id = ${userId}`;
}
