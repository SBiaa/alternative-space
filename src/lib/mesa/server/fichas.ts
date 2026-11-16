/**
 * As fichas dos jogadores vistas de dentro da campanha.
 * Nada aqui confere acesso: quem chama já passou por `acesso()` e decidiu quem vê o estado.
 */
import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { characters, goals, ledger, missions } from '@/lib/fichas/db/schema';
import { normalizeDraft } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { conditionLimits, InputError } from '@/lib/fichas/sr5/play';
import { evaluate } from '@/lib/fichas/sr5/rules';
import { FICHA_VAZIA, normalizarFicha, resumoFicha, type Ficha } from '@/lib/pathfinder';
import { emJogo } from '@/lib/pathfinder-jogo';
import { NOME_SISTEMA, semNotasPessoais, UUID, type SistemaCampanha } from '../regras';

export interface Indicador {
  rotulo: string;
  valor: string;
  alerta?: boolean;
}

export interface FichaResumo {
  id: string;
  nome: string;
  sistema: string;
  /** "Faceman · Elfo" ou "Humano · Guerreiro 3". */
  resumo: string;
  status: 'draft' | 'active' | 'retired';
  /** Só para quem pode ver a ficha (mestre e dono). */
  indicadores?: Indicador[];
}

const nomeSistema = (s: string) => NOME_SISTEMA[s as SistemaCampanha] ?? s;

function resumoSr5(draftRaw: unknown) {
  const draft = normalizeDraft(draftRaw);
  const metatype = sr5Data.metatypes.find((m) => m.id === draft.metatypeId);
  return { draft, texto: [draft.concept.role, metatype ? label(metatype) : ''].filter(Boolean).join(' · ') };
}

const pf2e = (raw: unknown): Ficha => normalizarFicha(raw) ?? FICHA_VAZIA;

/** Resumo das fichas para os cards de jogador. `comEstado`: ids cujo dano/recursos aparecem. */
export async function resumirFichas(ids: string[], comEstado: Set<string>): Promise<Map<string, FichaResumo>> {
  const out = new Map<string, FichaResumo>();
  if (!ids.length) return out;
  const [rows, saldos] = await Promise.all([
    db()
      .select({
        id: characters.id,
        nome: characters.name,
        sistema: characters.system,
        status: characters.status,
        draft: characters.draft,
        fisico: characters.physicalDamage,
        atordoamento: characters.stunDamage,
      })
      .from(characters)
      .where(inArray(characters.id, ids)),
    db()
      .select({ id: ledger.characterId, kind: ledger.kind, total: sql<number>`sum(${ledger.amount})::int` })
      .from(ledger)
      .where(inArray(ledger.characterId, ids))
      .groupBy(ledger.characterId, ledger.kind),
  ]);
  const saldo = (id: string, kind: 'nuyen' | 'karma') => saldos.find((s) => s.id === id && s.kind === kind)?.total ?? 0;

  for (const r of rows) {
    const verEstado = comEstado.has(r.id);
    if (r.sistema === 'sr5') {
      const { draft, texto } = resumoSr5(r.draft);
      let indicadores: Indicador[] | undefined;
      if (verEstado && r.status === 'active') {
        const lim = conditionLimits(evaluate(draft));
        indicadores = [
          { rotulo: 'Físico', valor: `${r.fisico}/${lim.physical}`, alerta: r.fisico > 0 },
          { rotulo: 'Atordoam.', valor: `${r.atordoamento}/${lim.stun}`, alerta: r.atordoamento > 0 },
          { rotulo: 'Karma', valor: String(saldo(r.id, 'karma')) },
          { rotulo: 'Nuyen', valor: `${saldo(r.id, 'nuyen').toLocaleString('pt-BR')}¥` },
        ];
      }
      out.set(r.id, { id: r.id, nome: r.nome || 'Sem nome', sistema: r.sistema, resumo: texto, status: r.status, indicadores });
    } else if (r.sistema === 'pf2e') {
      const f = pf2e(r.draft);
      let indicadores: Indicador[] | undefined;
      if (verEstado) {
        const j = emJogo(f);
        const condicoes = Object.keys(f.jogo.condicoes).length;
        indicadores = [
          { rotulo: 'PV', valor: `${j.pv}/${j.pvMax}${j.pvTemp ? ` +${j.pvTemp}` : ''}`, alerta: j.pv < j.pvMax },
          { rotulo: 'CA', valor: String(j.ca) },
          { rotulo: 'Herói', valor: String(f.jogo.heroi) },
          { rotulo: 'Condições', valor: String(condicoes), alerta: condicoes > 0 },
        ];
      }
      out.set(r.id, {
        id: r.id,
        nome: f.nome.trim() || r.nome || 'Sem nome',
        sistema: r.sistema,
        resumo: resumoFicha(f) || 'Pathfinder 2e',
        status: r.status,
        indicadores,
      });
    } else {
      out.set(r.id, { id: r.id, nome: r.nome || 'Sem nome', sistema: r.sistema, resumo: nomeSistema(r.sistema), status: r.status });
    }
  }
  return out;
}

/** Fichas do usuário que podem entrar numa campanha desse sistema ("outro" aceita qualquer uma). */
export async function fichasParaCampanha(userId: string, sistema: SistemaCampanha) {
  const rows = await db()
    .select({ id: characters.id, nome: characters.name, sistema: characters.system })
    .from(characters)
    .where(sistema === 'outro' ? eq(characters.ownerId, userId) : and(eq(characters.ownerId, userId), eq(characters.system, sistema)))
    .orderBy(asc(characters.name));
  return rows.map((r) => ({ id: r.id, nome: `${r.nome || 'Sem nome'}${sistema === 'outro' ? ` (${nomeSistema(r.sistema)})` : ''}` }));
}

/** Confere que a ficha é do usuário e serve para a campanha. null = entrar sem ficha. */
export async function fichaValida(userId: string, characterId: unknown, sistema: SistemaCampanha): Promise<string | null> {
  if (characterId === null || characterId === undefined || characterId === '') return null;
  if (typeof characterId !== 'string' || !UUID.test(characterId)) throw new InputError('Escolha uma ficha.');
  const [c] = await db()
    .select({ id: characters.id, sistema: characters.system })
    .from(characters)
    .where(and(eq(characters.id, characterId), eq(characters.ownerId, userId)));
  if (!c) throw new InputError('Escolha uma das suas fichas.');
  if (sistema !== 'outro' && c.sistema !== sistema) throw new InputError(`Essa campanha é de ${nomeSistema(sistema)}: escolha uma ficha desse sistema.`);
  return c.id;
}

/** Ficha completa para o mestre (ou o dono), sem as anotações pessoais. */
export async function fichaCompleta(characterId: string) {
  const [r] = await db()
    .select({
      id: characters.id,
      ownerId: characters.ownerId,
      nome: characters.name,
      sistema: characters.system,
      status: characters.status,
      draft: characters.draft,
      fisico: characters.physicalDamage,
      atordoamento: characters.stunDamage,
    })
    .from(characters)
    .where(eq(characters.id, characterId));
  if (!r) return null;

  if (r.sistema === 'pf2e') {
    return { tipo: 'pf2e' as const, id: r.id, ownerId: r.ownerId, nome: r.nome, ficha: semNotasPessoais(pf2e(r.draft)) };
  }
  if (r.sistema === 'sr5') {
    const [lancamentos, saldos, metas, missoes] = await Promise.all([
      db().select().from(ledger).where(eq(ledger.characterId, r.id)).orderBy(desc(ledger.createdAt)).limit(50),
      db()
        .select({ kind: ledger.kind, total: sql<number>`sum(${ledger.amount})::int` })
        .from(ledger)
        .where(eq(ledger.characterId, r.id))
        .groupBy(ledger.kind),
      db().select().from(goals).where(and(eq(goals.characterId, r.id), eq(goals.status, 'active'))).orderBy(asc(goals.position)),
      db().select().from(missions).where(eq(missions.characterId, r.id)).orderBy(desc(missions.createdAt)).limit(20),
    ]);
    const nuyen = saldos.find((s) => s.kind === 'nuyen')?.total ?? 0;
    const karma = saldos.find((s) => s.kind === 'karma')?.total ?? 0;
    return {
      tipo: 'sr5' as const,
      id: r.id,
      ownerId: r.ownerId,
      nome: r.nome,
      status: r.status,
      draft: normalizeDraft(r.draft),
      fisico: r.fisico,
      atordoamento: r.atordoamento,
      nuyen,
      karma,
      lancamentos: lancamentos.map((l) => ({ id: l.id, kind: l.kind, amount: l.amount, reason: l.reason, createdAt: l.createdAt })),
      metas: metas.map((g) => ({ id: g.id, title: g.title })),
      missoes: missoes.map((m) => ({ id: m.id, title: m.title, status: m.status, playedOn: m.playedOn })),
    };
  }
  return { tipo: 'outro' as const, id: r.id, ownerId: r.ownerId, nome: r.nome, sistema: r.sistema };
}
