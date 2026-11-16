import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  ApagarCampanha,
  CampanhaForm,
  CancelarConvite,
  ConvidarPorApelido,
  EscolherFicha,
  Ganchos,
  LinkDeConvite,
  Presenca,
  RemoverJogador,
  SairDaCampanha,
  SessaoForm,
} from '@/components/mesa/MesaForms';
import { Bolinha, Carregando, Indicadores, Pagina, RespostaChip, StatusCampanhaChip, Texto, Vazio } from '@/components/mesa/MesaUI';
import { Card } from '@/components/fichas/ui';
import { cx } from '@/lib/fichas/cx';
import { hoje, somaDias } from '@/lib/diario/calendario';
import { NOME_SISTEMA, NOME_STATUS_SESSAO, quando } from '@/lib/mesa/regras';
import { CampanhaNaoEncontrada } from '@/lib/mesa/server/acesso';
import { getCampanha } from '@/lib/mesa/server/campanhas';

export const metadata: Metadata = { title: 'Campanha' };

const ABAS = { jogadores: 'Jogadores', sessoes: 'Sessões', diario: 'Diário', ajustes: 'Ajustes' } as const;
type Aba = keyof typeof ABAS;
type Campanha = Awaited<ReturnType<typeof getCampanha>>;

export default function CampanhaPage({ params, searchParams }: PageProps<'/mesa/[id]'>) {
  return (
    <Pagina>
      <Suspense fallback={<Carregando />}>
        <CampanhaView params={params} searchParams={searchParams} />
      </Suspense>
    </Pagina>
  );
}

async function CampanhaView({
  params,
  searchParams,
}: {
  params: PageProps<'/mesa/[id]'>['params'];
  searchParams: PageProps<'/mesa/[id]'>['searchParams'];
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  let c: Campanha;
  try {
    c = await getCampanha(id);
  } catch (e) {
    if (e instanceof CampanhaNaoEncontrada) notFound();
    throw e;
  }
  const ehMestre = c.papel === 'mestre';
  const abas = (Object.keys(ABAS) as Aba[]).filter((a) => a !== 'ajustes' || ehMestre);
  const aba: Aba = abas.includes(sp.aba as Aba) ? (sp.aba as Aba) : 'jogadores';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/mesa" className="text-sm text-muted hover:text-ink">
          ← Mesa do Mestre
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-3 font-display text-3xl font-semibold">
            <Bolinha cor={c.cor} className="h-3.5 w-3.5" />
            {c.nome}
          </h1>
          <StatusCampanhaChip status={c.status} />
        </div>
        <p className="text-sm text-muted">
          {NOME_SISTEMA[c.sistema]}
          {c.rotina && ` · ${c.rotina}`}
          {ehMestre ? ' · você mestra' : ` · mestre ${c.mestre}`}
        </p>
        {c.sinopse && <Texto className="max-w-3xl text-muted">{c.sinopse}</Texto>}
      </header>

      <nav aria-label="Seções da campanha" className="flex gap-1 overflow-x-auto border-b border-line">
        {abas.map((a) => (
          <Link
            key={a}
            href={a === 'jogadores' ? `/mesa/${c.id}` : `/mesa/${c.id}?aba=${a}`}
            aria-current={a === aba ? 'page' : undefined}
            className={cx(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
              a === aba ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {ABAS[a]}
            {a === 'sessoes' && c.proximas.length > 0 && <span className="ml-1.5 text-xs text-accent">{c.proximas.length}</span>}
          </Link>
        ))}
      </nav>

      {aba === 'jogadores' && <AbaJogadores c={c} />}
      {aba === 'sessoes' && <AbaSessoes c={c} />}
      {aba === 'diario' && <AbaDiario c={c} />}
      {aba === 'ajustes' && ehMestre && <AbaAjustes c={c} />}
    </div>
  );
}

function AbaJogadores({ c }: { c: Campanha }) {
  const ehMestre = c.papel === 'mestre';
  const eu = c.jogadores.find((j) => j.eu);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Jogadores" className="flex flex-col gap-4">
        {c.jogadores.length === 0 ? (
          <Vazio>Ninguém na mesa ainda. Mande o link de convite ou chame pelo @apelido.</Vazio>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {c.jogadores.map((j) => (
              <li key={j.userId} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {j.ficha ? (
                      j.podeAbrir ? (
                        <Link href={`/mesa/${c.id}/jogadores/${j.ficha.id}`} className="font-display text-xl font-semibold hover:text-accent">
                          {j.ficha.nome}
                        </Link>
                      ) : (
                        <span className="font-display text-xl font-semibold">{j.ficha.nome}</span>
                      )
                    ) : (
                      <span className="font-display text-xl font-semibold text-faint">Sem ficha</span>
                    )}
                    {j.ficha?.resumo && <p className="text-sm text-muted">{j.ficha.resumo}</p>}
                    <p className="text-xs text-faint">
                      {j.eu ? 'Você' : j.nome}
                      {j.ficha?.status === 'draft' && c.sistema === 'sr5' && ' · ficha em criação'}
                    </p>
                  </div>
                </div>
                {j.ficha?.indicadores && <Indicadores itens={j.ficha.indicadores} />}
                <div className="mt-auto flex items-center justify-between gap-2">
                  {j.podeAbrir && j.ficha ? (
                    <Link href={`/mesa/${c.id}/jogadores/${j.ficha.id}`} className="text-sm text-accent hover:underline">
                      Ver ficha completa
                    </Link>
                  ) : (
                    <span />
                  )}
                  {ehMestre && <RemoverJogador campanhaId={c.id} userId={j.userId} nome={j.nome} />}
                </div>
              </li>
            ))}
          </ul>
        )}

        {eu && (
          <Card title="Sua ficha nesta campanha">
            {c.minhasFichas.length ? (
              <EscolherFicha modo="vincular" campanhaId={c.id} fichas={c.minhasFichas} atual={c.minhaFichaId} />
            ) : (
              <p className="text-sm text-muted">
                Você não tem fichas {c.sistema === 'outro' ? '' : `de ${NOME_SISTEMA[c.sistema]} `}ainda.{' '}
                <Link href="/fichas" className="text-accent hover:underline">
                  Criar uma ficha
                </Link>
              </p>
            )}
            <p className="mt-2 text-xs text-faint">O mestre vê a ficha toda, menos as suas anotações pessoais. Os colegas veem só o nome e o resumo.</p>
            <div className="mt-3">
              <SairDaCampanha campanhaId={c.id} />
            </div>
          </Card>
        )}
      </section>

      {ehMestre && c.inviteCode && (
        <aside className="flex flex-col gap-4">
          <Card title="Link de convite">
            <LinkDeConvite campanhaId={c.id} code={c.inviteCode} />
          </Card>
          <Card title="Chamar pelo @apelido">
            <ConvidarPorApelido campanhaId={c.id} />
            {c.convites.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs uppercase tracking-wider text-faint">Esperando resposta</h4>
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {c.convites.map((cv) => (
                    <li key={cv.userId} className="flex items-center justify-between gap-2">
                      {cv.nome}
                      <CancelarConvite campanhaId={c.id} userId={cv.userId} nome={cv.nome} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </aside>
      )}
    </div>
  );
}

function AbaSessoes({ c }: { c: Campanha }) {
  const ehMestre = c.papel === 'mestre';
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Sessões" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Próximas</h2>
          {c.proximas.length === 0 ? (
            <Vazio>{ehMestre ? 'Nenhuma sessão marcada. Marque a próxima ao lado.' : 'Nenhuma sessão marcada ainda.'}</Vazio>
          ) : (
            <ul className="flex flex-col gap-3">
              {c.proximas.map((s) => (
                <li key={s.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/mesa/${c.id}/sessoes/${s.id}`} className="font-display text-lg font-semibold hover:text-accent">
                      {quando(s.iniciaEm)}
                    </Link>
                    {s.titulo && <span className="text-sm text-muted">{s.titulo}</span>}
                  </div>
                  {s.local && <p className="text-sm text-muted">{s.local}</p>}
                  {s.pauta && <Texto className="mt-2 text-muted">{s.pauta}</Texto>}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {c.papel === 'jogador' && <Presenca campanhaId={c.id} sessaoId={s.id} atual={s.minhaResposta} />}
                    {s.presencas.length > 0 && (
                      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                        {s.presencas.map((p) => (
                          <li key={p.userId} className="flex items-center gap-1">
                            {p.nome} <RespostaChip resposta={p.resposta} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {c.passadas.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold">Anteriores</h2>
            <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
              {c.passadas.map((s) => (
                <li key={s.id}>
                  <Link href={`/mesa/${c.id}/sessoes/${s.id}`} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 hover:bg-surface-2">
                    <span>
                      {quando(s.iniciaEm)}
                      {s.titulo && <span className="text-muted"> · {s.titulo}</span>}
                    </span>
                    <span className={cx('text-xs', s.status === 'cancelada' ? 'text-danger' : 'text-faint')}>
                      {s.status === 'marcada' ? 'sem diário' : NOME_STATUS_SESSAO[s.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {ehMestre && (
        <aside>
          <Card title="Marcar sessão">
            <SessaoForm
              campanhaId={c.id}
              inicial={{ titulo: '', data: somaDias(hoje(), 7), hora: '19:00', duracaoMin: 240, local: '', pauta: '' }}
            />
          </Card>
        </aside>
      )}
    </div>
  );
}

function AbaDiario({ c }: { c: Campanha }) {
  const ehMestre = c.papel === 'mestre';
  const comDiario = c.passadas.filter((s) => s.resumo || s.recompensas || (ehMestre && s.notasMestre));
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Diário da campanha" className="flex flex-col gap-4">
        {comDiario.length === 0 ? (
          <Vazio>
            {ehMestre
              ? 'O diário ainda está vazio. Depois de cada sessão, abra-a em Sessões e escreva o resumo.'
              : 'O mestre ainda não escreveu nenhum resumo.'}
          </Vazio>
        ) : (
          comDiario.map((s) => (
            <article key={s.id} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/mesa/${c.id}/sessoes/${s.id}`} className="font-display text-lg font-semibold hover:text-accent">
                  {s.titulo || quando(s.iniciaEm)}
                </Link>
                {s.titulo && <span className="text-xs text-faint">{quando(s.iniciaEm)}</span>}
              </header>
              {s.resumo && <Texto>{s.resumo}</Texto>}
              {s.recompensas && (
                <div className="mt-3">
                  <h3 className="text-xs uppercase tracking-wider text-faint">Recompensas</h3>
                  <Texto className="text-muted">{s.recompensas}</Texto>
                </div>
              )}
              {ehMestre && s.notasMestre && (
                <div className="mt-3 rounded-md border border-dashed border-line-strong p-3">
                  <h3 className="text-xs uppercase tracking-wider text-faint">Só você vê</h3>
                  <Texto className="text-muted">{s.notasMestre}</Texto>
                </div>
              )}
            </article>
          ))
        )}
      </section>
      {ehMestre && (
        <aside>
          <Card title="Ganchos em aberto">
            <p className="mb-3 text-xs text-faint">Pontas soltas da história. Só você vê.</p>
            <Ganchos campanhaId={c.id} ganchos={c.ganchos} />
          </Card>
        </aside>
      )}
    </div>
  );
}

function AbaAjustes({ c }: { c: Campanha }) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card title="Campanha">
        <CampanhaForm
          campanhaId={c.id}
          inicial={{ nome: c.nome, sistema: c.sistema, sinopse: c.sinopse, status: c.status, rotina: c.rotina, cor: c.cor }}
        />
      </Card>
      <Card title="Apagar">
        <ApagarCampanha campanhaId={c.id} nome={c.nome} />
      </Card>
    </div>
  );
}
