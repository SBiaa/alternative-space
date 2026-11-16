import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CopiarLembrete } from '@/components/mesa/AgendaForms';
import { ApagarSessao, DiarioForm, EditarSessao, Ganchos, Presenca } from '@/components/mesa/MesaForms';
import { Bolinha, Carregando, Pagina, RespostaChip, Texto } from '@/components/mesa/MesaUI';
import { Card } from '@/components/fichas/ui';
import { dataLocal, horaLocal, NOME_STATUS_SESSAO, quando } from '@/lib/mesa/regras';
import { CampanhaNaoEncontrada } from '@/lib/mesa/server/acesso';
import { getSessao } from '@/lib/mesa/server/sessoes';

export const metadata: Metadata = { title: 'Sessão' };

type Params = PageProps<'/mesa/[id]/sessoes/[sessaoId]'>['params'];

export default function SessaoPage({ params }: PageProps<'/mesa/[id]/sessoes/[sessaoId]'>) {
  return (
    <Pagina largura="max-w-5xl">
      <Suspense fallback={<Carregando />}>
        <SessaoView params={params} />
      </Suspense>
    </Pagina>
  );
}

async function SessaoView({ params }: { params: Params }) {
  const { id, sessaoId } = await params;
  let d: Awaited<ReturnType<typeof getSessao>>;
  try {
    d = await getSessao(id, sessaoId);
  } catch (e) {
    if (e instanceof CampanhaNaoEncontrada) notFound();
    throw e;
  }
  const { sessao: s, campanha } = d;
  const ehMestre = d.papel === 'mestre';
  const futura = s.status === 'marcada' && s.iniciaEm > new Date();
  const horas = s.duracaoMin % 60 ? `${Math.floor(s.duracaoMin / 60)}h${s.duracaoMin % 60}` : `${s.duracaoMin / 60}h`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href={`/mesa/${campanha.id}?aba=sessoes`} className="flex items-center gap-2 text-sm text-muted hover:text-ink">
          ← <Bolinha cor={campanha.cor} /> {campanha.nome}
        </Link>
        <h1 className="font-display text-3xl font-semibold">{s.titulo || quando(s.iniciaEm)}</h1>
        <p className="text-sm text-muted">
          {s.titulo && `${quando(s.iniciaEm)} · `}
          {horas} · {NOME_STATUS_SESSAO[s.status]}
          {s.local && ` · ${s.local}`}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-4">
          {s.pauta && (
            <Card title="Pauta">
              <Texto>{s.pauta}</Texto>
            </Card>
          )}

          {ehMestre ? (
            <Card title="Diário da sessão">
              <DiarioForm
                campanhaId={campanha.id}
                sessaoId={s.id}
                inicial={{ status: s.status, resumo: s.resumo, recompensas: s.recompensas, notasMestre: s.notasMestre }}
              />
            </Card>
          ) : (
            (s.resumo || s.recompensas) && (
              <Card title="Diário da sessão">
                {s.resumo && <Texto>{s.resumo}</Texto>}
                {s.recompensas && (
                  <div className="mt-3">
                    <h3 className="text-xs uppercase tracking-wider text-faint">Recompensas</h3>
                    <Texto className="text-muted">{s.recompensas}</Texto>
                  </div>
                )}
              </Card>
            )
          )}

          {ehMestre && (
            <Card title="Sessão">
              <div className="flex flex-col gap-3">
                <EditarSessao
                  campanhaId={campanha.id}
                  sessaoId={s.id}
                  inicial={{
                    titulo: s.titulo,
                    data: dataLocal(s.iniciaEm),
                    hora: horaLocal(s.iniciaEm),
                    duracaoMin: s.duracaoMin,
                    local: s.local,
                    pauta: s.pauta,
                  }}
                />
                <ApagarSessao campanhaId={campanha.id} sessaoId={s.id} />
              </div>
            </Card>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <Card title="Presença">
            {!ehMestre && futura && (
              <div className="mb-3">
                <Presenca campanhaId={campanha.id} sessaoId={s.id} atual={d.minhaResposta} />
              </div>
            )}
            {d.presencas.length === 0 ? (
              <p className="text-sm text-muted">Ninguém na mesa ainda.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {d.presencas.map((p) => (
                  <li key={p.userId} className="flex items-center justify-between gap-2">
                    {p.nome}
                    <RespostaChip resposta={p.resposta} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Agenda">
            <div className="flex flex-col gap-3">
              <a
                href={`/mesa/${campanha.id}/sessoes/${s.id}/agenda.ics`}
                download
                className="inline-flex items-center self-start rounded-md border border-line-strong px-3 py-1.5 text-sm text-muted no-underline transition hover:border-accent/60 hover:text-ink"
              >
                Adicionar à minha agenda (.ics)
              </a>
              {ehMestre && futura && (
                <div>
                  <p className="mb-2 text-xs text-faint">Para avisar o grupo:</p>
                  <CopiarLembrete
                    campanhaId={campanha.id}
                    sessaoId={s.id}
                    campanha={campanha.nome}
                    titulo={s.titulo}
                    iniciaEm={s.iniciaEm.toISOString()}
                    local={s.local}
                    pauta={s.pauta}
                    presencas={d.presencas.map(({ nome, resposta }) => ({ nome, resposta }))}
                  />
                </div>
              )}
            </div>
          </Card>
          {ehMestre && (
            <Card title="Ganchos em aberto">
              <p className="mb-3 text-xs text-faint">Da campanha inteira. Só você vê.</p>
              <Ganchos campanhaId={campanha.id} sessaoId={s.id} ganchos={d.ganchos} />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
