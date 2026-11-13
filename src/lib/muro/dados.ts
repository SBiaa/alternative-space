// Acesso ao banco do Muro Livre. Só roda no servidor.
// A economia (compra, contratação, dia) é sempre refeita no servidor: o cliente nunca manda preço nem saldo.

import { sql } from "@/lib/db";
import { ARQUETIPOS, DIALOGOS, ITENS } from "./catalogo";
import { MURO } from "./config";
import type { FechamentoDia } from "./economia";
import { migrar } from "./save";
import { TEMPLATES } from "./templates";
import type { Artista, ArquetipoArtista, Catalogo, Dialogo, Efeito, Estoque, Gastos, Job, ItemCatalogo, Progresso, Template, TipoItem } from "./tipos";
import { CATALOGO_PADRAO } from "./catalogo";

type Linha = Record<string, unknown>;
const json = (v: unknown) => JSON.stringify(v);
const num = (v: unknown) => Number(v);

export async function lerCatalogo(): Promise<Catalogo> {
  try {
    const [itens, arqs, tpls, dls] = await Promise.all([
      sql`select * from mural_catalog order by position`,
      sql`select * from mural_archetypes order by min_crew_level, slug`,
      sql`select * from mural_templates order by slug`,
      sql`select * from mural_dialogues order by slug`,
    ]);
    if (itens.length === 0 || arqs.length === 0 || tpls.length === 0 || dls.length === 0) return CATALOGO_PADRAO;
    return {
      itens: itens.map((r: Linha): ItemCatalogo => ({
        id: String(r.id), slug: String(r.slug), kind: r.kind as TipoItem, name: String(r.name), description: String(r.description), maxLevel: num(r.max_level),
        prices: (r.prices as number[]).map(Number), effects: r.effects as Efeito[], minCrewLevel: num(r.min_crew_level), position: num(r.position),
      })),
      arquetipos: arqs.map((r: Linha): ArquetipoArtista => ({
        slug: String(r.slug), nome: String(r.name), descricao: String(r.description), especialidade: (r.specialty as ArquetipoArtista["especialidade"]) ?? null,
        hab: r.skills as ArquetipoArtista["hab"], salario: num(r.salary), contratacao: num(r.hire_fee), nivelMin: num(r.min_crew_level), negociacao: num(r.negotiation), desperdicio: num(r.waste),
      })),
      templates: tpls.map((r: Linha): Template => ({ slug: String(r.slug), nome: String(r.name), size: r.size as Template["size"], layers: r.layers as Template["layers"], slots: r.slots as Template["slots"], tolerance: num(r.tolerance) })),
      dialogos: dls.map((r: Linha): Dialogo => ({ id: String(r.id), slug: String(r.slug), kind: String(r.kind), steps: r.steps as Dialogo["steps"], requirements: r.requirements as Dialogo["requirements"] })),
    };
  } catch (e) {
    console.error("Catálogo do Muro Livre indisponível, usando o embutido:", e);
    return CATALOGO_PADRAO;
  }
}

export type CrewSalva = { id: string; prog: Progresso };

type Estado = {
  minuto: number; estoque: Estoque; gastosDia: Gastos; ganhosDia: number; dinheiroIniDia: number; entreguesDia: string[];
  encontro: Progresso["encontro"]; tranquilo: boolean; entregues: number; maiorMuro: Progresso["maiorMuro"]; tagPropria: boolean;
};

export async function lerCrew(userId: string): Promise<CrewSalva | null> {
  const [c] = await sql`select * from mural_crews where user_id = ${userId}`;
  if (!c) return null;
  const [ups, arts, jobs, camadas] = await Promise.all([
    sql`select k.slug, u.level from mural_upgrades u join mural_catalog k on k.id = u.catalog_id where u.crew_id = ${c.id}`,
    sql`select * from mural_artists where crew_id = ${c.id} order by hired_day, archetype`,
    sql`select * from mural_jobs where crew_id = ${c.id} order by created_at, job_key`,
    sql`select l.* , j.job_key from mural_layers l join mural_jobs j on j.id = l.job_id where j.crew_id = ${c.id}`,
  ]);
  const st = c.state as Estado;
  const prog = migrar({
    v: num(c.state_version), bairro: String(c.neighborhood), nivel: num(c.level), dinheiro: num(c.money), repQuebrada: num(c.rep_quebrada), repClientes: num(c.rep_clientes),
    dia: num(c.day), minuto: st.minuto ?? 0, seed: String(c.seed), entregues: st.entregues ?? 0, maiorMuro: st.maiorMuro ?? null, estoque: st.estoque,
    melhorias: Object.fromEntries(ups.map((u: Linha) => [String(u.slug), num(u.level)])),
    equipe: arts.map((a: Linha): Artista => ({
      id: String(a.id), arquetipo: String(a.archetype), nivel: num(a.level), hab: a.skills as Artista["hab"], cansaco: num(a.fatigue), contratadoDia: num(a.hired_day),
      escala: (a.assignment as Artista["escala"]) ?? null, folga: Boolean(a.resting), minTrabalhados: 0,
    })),
    jobs: jobs.map((j: Linha): Job => {
      const x = (j.extra ?? {}) as Partial<Job>;
      const ls = camadas.filter((l: Linha) => l.job_key === j.job_key);
      const get = (n: string) => {
        const l = ls.find((r: Linha) => r.layer === n);
        return { progresso: l ? num(l.progress) : 0, qualidade: l ? num(l.quality) : 0, fidelidade: l ? num(l.fidelity) : 0, secaAte: l ? num(l.wet_until) : 0 };
      };
      return {
        id: String(j.job_key), modelo: String(j.template_id), cliente: String(j.client_archetype), nomeCliente: x.nomeCliente ?? "", tamanho: j.size as Job["tamanho"],
        briefing: j.briefing as Job["briefing"], pagamento: num(j.pay), prazo: num(j.deadline_day), prazoDias: x.prazoDias ?? 0, auth: j.auth_status as Job["auth"],
        revisao: x.revisao ?? false, aceita: x.aceita ?? false, status: j.status as Job["status"], comunitario: x.comunitario ?? false, encontro: x.encontro ?? false,
        exige: x.exige ?? { clientes: 0, quebrada: 0 }, croqui: x.croqui ?? 0.5,
        camadas: { fundo: get("fundo"), contorno: get("contorno"), preenchimento: get("preenchimento"), detalhe: get("detalhe") },
        coberto: x.coberto ?? false, ruinas: x.ruinas ?? 0, ruinasHoje: x.ruinasHoje ?? 0, montado: x.montado ?? false, tintaMax: x.tintaMax ?? 0,
        negociacao: x.negociacao ?? { respostas: [], resultado: null }, criadoDia: x.criadoDia ?? 1, entregueDia: x.entregueDia ?? null,
        qualFinal: j.final_quality === null ? null : num(j.final_quality), pago: x.pago ?? null,
      };
    }),
    gastosDia: st.gastosDia, ganhosDia: st.ganhosDia ?? 0, dinheiroIniDia: st.dinheiroIniDia ?? num(c.money), tagPropria: st.tagPropria ?? false,
    entreguesDia: st.entreguesDia ?? [], encontro: st.encontro, tranquilo: st.tranquilo ?? false,
  });
  return prog ? { id: String(c.id), prog } : null;
}

const estadoDe = (p: Progresso): Estado => ({
  minuto: p.minuto, estoque: p.estoque, gastosDia: p.gastosDia, ganhosDia: p.ganhosDia, dinheiroIniDia: p.dinheiroIniDia, entreguesDia: p.entreguesDia,
  encontro: p.encontro, tranquilo: p.tranquilo, entregues: p.entregues, maiorMuro: p.maiorMuro, tagPropria: p.tagPropria,
});

type Stmt = ReturnType<typeof sql>;
/** Refaz melhorias, artistas, encomendas e camadas da crew a partir do progresso. */
function filhos(crewId: string, p: Progresso, cat: Catalogo): Stmt[] {
  const ids = new Map(cat.itens.map((i) => [i.slug, i.id]));
  const out: Stmt[] = [
    sql`delete from mural_upgrades where crew_id = ${crewId}`,
    sql`delete from mural_artists where crew_id = ${crewId}`,
    sql`delete from mural_jobs where crew_id = ${crewId} and job_key <> all(${p.jobs.map((j) => j.id)}::text[])`,
  ];
  for (const [slug, level] of Object.entries(p.melhorias)) {
    const id = ids.get(slug);
    if (id) out.push(sql`insert into mural_upgrades (crew_id, catalog_id, level) values (${crewId}, ${id}, ${level})`);
  }
  for (const a of p.equipe)
    out.push(sql`insert into mural_artists (crew_id, archetype, level, skills, fatigue, hired_day, assignment, resting)
      values (${crewId}, ${a.arquetipo}, ${a.nivel}, ${json(a.hab)}::jsonb, ${a.cansaco}, ${a.contratadoDia}, ${a.escala ? json(a.escala) : null}::jsonb, ${a.folga})`);
  for (const j of p.jobs) {
    const extra = {
      nomeCliente: j.nomeCliente, prazoDias: j.prazoDias, revisao: j.revisao, aceita: j.aceita, comunitario: j.comunitario, encontro: j.encontro, exige: j.exige, croqui: j.croqui,
      coberto: j.coberto, ruinas: j.ruinas, ruinasHoje: j.ruinasHoje, montado: j.montado, tintaMax: j.tintaMax, negociacao: j.negociacao, criadoDia: j.criadoDia, entregueDia: j.entregueDia, pago: j.pago,
    };
    const camadas = (["fundo", "contorno", "preenchimento", "detalhe"] as const).map((l) => ({ layer: l, progress: j.camadas[l].progresso, quality: j.camadas[l].qualidade, fidelity: j.camadas[l].fidelidade, wet_until: j.camadas[l].secaAte }));
    out.push(sql`
      with j as (
        insert into mural_jobs (crew_id, job_key, template_id, client_archetype, size, briefing, pay, deadline_day, auth_status, status, final_quality, extra)
        values (${crewId}, ${j.id}, ${j.modelo}, ${j.cliente}, ${j.tamanho}, ${json(j.briefing)}::jsonb, ${j.pagamento}, ${j.prazo}, ${j.auth}, ${j.status}, ${j.qualFinal}, ${json(extra)}::jsonb)
        on conflict (crew_id, job_key) do update set template_id = excluded.template_id, size = excluded.size, briefing = excluded.briefing, pay = excluded.pay, deadline_day = excluded.deadline_day,
          auth_status = excluded.auth_status, status = excluded.status, final_quality = excluded.final_quality, extra = excluded.extra
        returning id
      )
      insert into mural_layers (job_id, layer, progress, quality, fidelity, wet_until)
      select j.id, v.layer, v.progress, v.quality, v.fidelity, v.wet_until from j, jsonb_to_recordset(${json(camadas)}::jsonb) as v(layer text, progress numeric, quality numeric, fidelity numeric, wet_until numeric)
      on conflict (job_id, layer) do update set progress = excluded.progress, quality = excluded.quality, fidelity = excluded.fidelity, wet_until = excluded.wet_until`);
  }
  return out;
}

const evento = (userId: string, kind: string, payload: unknown) => sql`insert into events (user_id, kind, payload) values (${userId}, ${kind}, ${json(payload)}::jsonb)`;
export type EventoJogo = { kind: string; payload: Record<string, unknown> };

/** Cria a crew (ou a refaz inteira, no caso da migração do save local). */
export async function gravarCrewInteira(userId: string, p: Progresso, cat: Catalogo): Promise<string> {
  const [c] = await sql`
    insert into mural_crews (user_id, neighborhood, level, money, rep_quebrada, rep_clientes, day, seed, state, state_version)
    values (${userId}, ${p.bairro}, ${p.nivel}, ${p.dinheiro}, ${p.repQuebrada}, ${p.repClientes}, ${p.dia}, ${p.seed}, ${json(estadoDe(p))}::jsonb, ${MURO.versaoSave})
    on conflict (user_id) do update set neighborhood = excluded.neighborhood, level = excluded.level, money = excluded.money, rep_quebrada = excluded.rep_quebrada,
      rep_clientes = excluded.rep_clientes, day = excluded.day, seed = excluded.seed, state = excluded.state, state_version = excluded.state_version, updated_at = now()
    returning id`;
  await sql.transaction(filhos(String(c.id), p, cat));
  return String(c.id);
}

/**
 * Grava o progresso, mas só se o dia (e, nas compras, o saldo) do banco ainda for o que o servidor leu.
 * Duas compras ao mesmo tempo não passam as duas.
 */
export async function salvarProgresso(userId: string, crewId: string, p: Progresso, cat: Catalogo, antes: { dia: number; dinheiro?: number }, eventos: EventoJogo[] = []): Promise<boolean> {
  const [r] = await sql`
    update mural_crews set level = ${p.nivel}, money = ${p.dinheiro}, rep_quebrada = ${p.repQuebrada}, rep_clientes = ${p.repClientes}, day = ${p.dia},
      state = ${json(estadoDe(p))}::jsonb, updated_at = now()
    where id = ${crewId} and user_id = ${userId} and day = ${antes.dia} and (${antes.dinheiro ?? null}::int is null or money = ${antes.dinheiro ?? null}::int)
    returning id`;
  if (!r) return false;
  await sql.transaction([...filhos(crewId, p, cat), ...eventos.map((e) => evento(userId, e.kind, { jogo: "muro-livre", ...e.payload }))]);
  return true;
}

/** Fim do dia: grava o dia, a semana (se fechou), o encontro (se teve) e o evento game_played. */
export async function gravarDiaDb(userId: string, crewId: string, antes: Progresso, f: FechamentoDia, cat: Catalogo, eventos: EventoJogo[]): Promise<boolean> {
  const r = f.registro;
  const p = f.prog;
  const [ok] = await sql`
    update mural_crews set level = ${p.nivel}, money = ${p.dinheiro}, rep_quebrada = ${p.repQuebrada}, rep_clientes = ${p.repClientes}, day = ${p.dia},
      state = ${json(estadoDe(p))}::jsonb, updated_at = now()
    where id = ${crewId} and user_id = ${userId} and day = ${antes.dia}
    returning id`;
  if (!ok) return false;
  const stmts: Stmt[] = [
    ...filhos(crewId, p, cat),
    sql`insert into mural_days (crew_id, day, delivered, ruined_by_rain, earnings, expenses, rep_quebrada_end, rep_clientes_end, relaxed)
      values (${crewId}, ${r.dia}, ${r.entregues}, ${r.ruinasChuva}, ${r.ganhos}, ${json(r.gastos)}::jsonb, ${r.repQuebradaFim}, ${r.repClientesFim}, ${r.tranquilo}) on conflict (crew_id, day) do nothing`,
    evento(userId, "game_played", { jogo: "muro-livre", dia: r.dia, ganhos: r.ganhos, saldo: r.saldo }),
    ...eventos.map((e) => evento(userId, e.kind, { jogo: "muro-livre", ...e.payload })),
  ];
  if (f.semana) stmts.push(sql`insert into mural_weeks (crew_id, week, bills_paid, balance_end) values (${crewId}, ${f.semana.semana}, ${f.semana.paga}, ${f.semana.saldoFim}) on conflict (crew_id, week) do nothing`);
  if (f.julgamento && r.evento)
    stmts.push(sql`insert into mural_events (crew_id, week, theme, result, score) values (${crewId}, ${antes.encontro.semana}, ${antes.jobs.find((j) => j.id === antes.encontro.jobId)?.briefing.tema ?? ""}, ${r.evento.resultado}, ${json(r.evento.score)}::jsonb) on conflict (crew_id, week) do nothing`);
  await sql.transaction(stmts);
  return true;
}

const ORDEM_TAMANHO = { porta: 0, fachada: 1, quadra: 2, longo: 3, empena: 4 } as const;
/** Selo da cabine: murais entregues, reputação e o maior muro pintado. Sem crew (ou sem entregas), o bloco não aparece. */
export async function seloDe(userId: string): Promise<{ entregues: number; repQuebrada: number; repClientes: number; maiorMuro: keyof typeof ORDEM_TAMANHO | null; bairro: string } | null> {
  const [c] = await sql`select neighborhood, rep_quebrada, rep_clientes, state from mural_crews where user_id = ${userId}`;
  if (!c) return null;
  const st = c.state as Partial<Estado>;
  const m = st.maiorMuro ?? null;
  return { entregues: st.entregues ?? 0, repQuebrada: num(c.rep_quebrada), repClientes: num(c.rep_clientes), maiorMuro: m && m in ORDEM_TAMANHO ? m : null, bairro: String(c.neighborhood) };
}

// LGPD: tudo o que guardamos da crew, para "baixar meus dados". A tag do usuário segue as regras do Caderno de Letra.
export async function exportarMural(userId: string) {
  const [c] = await sql`select id, neighborhood, level, money, rep_quebrada, rep_clientes, day, seed, state, state_version, created_at, updated_at from mural_crews where user_id = ${userId}`;
  if (!c) return { crew: null, encomendas: [], camadas: [], dias: [], semanas: [], encontros: [], melhorias: [], artistas: [] };
  const [encomendas, camadas, dias, semanas, encontros, melhorias, artistas] = await Promise.all([
    sql`select job_key, template_id, client_archetype, size, briefing, pay, deadline_day, auth_status, status, final_quality, extra, created_at from mural_jobs where crew_id = ${c.id} order by created_at`,
    sql`select j.job_key, l.layer, l.progress, l.quality, l.fidelity, l.wet_until from mural_layers l join mural_jobs j on j.id = l.job_id where j.crew_id = ${c.id}`,
    sql`select day, delivered, ruined_by_rain, earnings, expenses, rep_quebrada_end, rep_clientes_end, relaxed, created_at from mural_days where crew_id = ${c.id} order by day`,
    sql`select week, bills_paid, balance_end, created_at from mural_weeks where crew_id = ${c.id} order by week`,
    sql`select week, theme, result, score, created_at from mural_events where crew_id = ${c.id} order by week`,
    sql`select k.slug, u.level from mural_upgrades u join mural_catalog k on k.id = u.catalog_id where u.crew_id = ${c.id}`,
    sql`select archetype, level, skills, fatigue, hired_day, assignment, resting from mural_artists where crew_id = ${c.id}`,
  ]);
  const { id: _id, ...crew } = c;
  void _id;
  return { crew, encomendas, camadas, dias, semanas, encontros, melhorias, artistas };
}

export async function apagarMural(userId: string) {
  await sql`delete from mural_crews where user_id = ${userId}`; // encomendas, camadas, dias, semanas, encontros, melhorias e artistas vão junto (on delete cascade)
}

export const _semente = { ITENS, ARQUETIPOS, TEMPLATES, DIALOGOS };
