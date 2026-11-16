import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Bolinha, Carregando, Pagina } from '@/components/mesa/MesaUI';
import { cx } from '@/lib/fichas/cx';
import { DIAS_SEMANA, hoje, MESES } from '@/lib/diario/calendario';
import { chaveMes, CORES, dataLocal, gradeDoMes, horaLocal, lerMes, mesVizinho, quando } from '@/lib/mesa/regras';
import { sessoesDoMes, type SessaoNoCalendario } from '@/lib/mesa/server/sessoes';

export const metadata: Metadata = { title: 'Calendário de sessões' };

export default function CalendarioPage({ searchParams }: PageProps<'/mesa/calendario'>) {
  return (
    <Pagina>
      <Suspense fallback={<Carregando altura="h-96" />}>
        <Calendario searchParams={searchParams} />
      </Suspense>
    </Pagina>
  );
}

async function Calendario({ searchParams }: { searchParams: PageProps<'/mesa/calendario'>['searchParams'] }) {
  const sp = await searchParams;
  await connection();
  const hojeIso = hoje();
  const { ano, mes } = lerMes(sp.mes, hojeIso);
  const sessoes = await sessoesDoMes(ano, mes);
  const grade = gradeDoMes(ano, mes);
  const porDia = new Map<string, SessaoNoCalendario[]>();
  for (const s of sessoes) {
    const d = dataLocal(s.iniciaEm);
    porDia.set(d, [...(porDia.get(d) ?? []), s]);
  }
  const anterior = mesVizinho(ano, mes, -1);
  const proximo = mesVizinho(ano, mes, 1);
  const doMes = sessoes.filter((s) => Number(dataLocal(s.iniciaEm).slice(5, 7)) === mes);
  const navLink = 'rounded-md border border-line-strong px-3 py-1.5 text-sm text-muted transition hover:border-accent/60 hover:text-ink';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/mesa" className="text-sm text-muted hover:text-ink">
            ← Mesa do Mestre
          </Link>
          <h1 className="font-display text-3xl font-semibold">
            {MESES[mes - 1].nome} <span className="text-muted">{ano}</span>
          </h1>
        </div>
        <nav aria-label="Trocar de mês" className="flex gap-2">
          <Link href={`/mesa/calendario?mes=${chaveMes(anterior.ano, anterior.mes)}`} className={navLink} aria-label="Mês anterior">
            ←
          </Link>
          <Link href="/mesa/calendario" className={navLink}>
            Hoje
          </Link>
          <Link href={`/mesa/calendario?mes=${chaveMes(proximo.ano, proximo.mes)}`} className={navLink} aria-label="Próximo mês">
            →
          </Link>
        </nav>
      </div>

      {/* Grade: telas médias para cima. */}
      <div className="hidden overflow-hidden rounded-xl border border-line md:block">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs text-faint">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {grade.map((semana) => (
          <div key={semana[0].data} className="grid grid-cols-7 border-b border-line last:border-b-0">
            {semana.map((dia) => (
              <div
                key={dia.data}
                className={cx('min-h-28 border-r border-line p-1.5 last:border-r-0', dia.foraDoMes ? 'bg-bg/40' : 'bg-surface')}
              >
                <div
                  className={cx(
                    'mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    dia.data === hojeIso ? 'bg-accent font-semibold text-accent-ink' : dia.foraDoMes ? 'text-faint' : 'text-muted',
                  )}
                >
                  {Number(dia.data.slice(8, 10))}
                </div>
                <ul className="flex flex-col gap-1">
                  {(porDia.get(dia.data) ?? []).map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/mesa/${s.campanhaId}/sessoes/${s.id}`}
                        title={`${s.campanha}${s.titulo ? ` · ${s.titulo}` : ''}`}
                        className={cx(
                          'block truncate rounded border px-1.5 py-0.5 text-xs transition hover:brightness-125',
                          CORES[s.cor].chip,
                          s.status === 'cancelada' && 'line-through opacity-50',
                        )}
                      >
                        <span className="font-mono">{horaLocal(s.iniciaEm)}</span> {s.campanha}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Lista: no celular, e como resumo do mês. */}
      <section aria-label="Sessões do mês" className="flex flex-col gap-2 md:mt-4">
        <h2 className="font-display text-xl font-semibold md:text-lg">Sessões do mês</h2>
        {doMes.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma sessão em {MESES[mes - 1].nome.toLowerCase()}.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
            {doMes.map((s) => (
              <li key={s.id}>
                <Link href={`/mesa/${s.campanhaId}/sessoes/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <Bolinha cor={s.cor} />
                  <span className={cx('flex-1', s.status === 'cancelada' && 'text-faint line-through')}>
                    {quando(s.iniciaEm)} · {s.campanha}
                    {s.titulo && <span className="text-muted"> · {s.titulo}</span>}
                  </span>
                  <span className="text-xs text-faint">{s.souMestre ? 'você mestra' : 'você joga'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
