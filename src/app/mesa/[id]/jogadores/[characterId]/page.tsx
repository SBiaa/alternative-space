import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TeammateSheet } from '@/components/fichas/teams/TeammateSheet';
import { Card } from '@/components/fichas/ui';
import { FichaPf2eLeitura } from '@/components/mesa/FichaPf2eLeitura';
import { Carregando, Pagina } from '@/components/mesa/MesaUI';
import { cx } from '@/lib/fichas/cx';
import { dataLocal } from '@/lib/mesa/regras';
import { CampanhaNaoEncontrada } from '@/lib/mesa/server/acesso';
import { getFichaDoJogador } from '@/lib/mesa/server/campanhas';

export const metadata: Metadata = { title: 'Ficha do jogador' };

type Params = PageProps<'/mesa/[id]/jogadores/[characterId]'>['params'];

export default function FichaDoJogadorPage({ params }: PageProps<'/mesa/[id]/jogadores/[characterId]'>) {
  return (
    <Pagina largura="max-w-5xl">
      <Suspense fallback={<Carregando />}>
        <FichaView params={params} />
      </Suspense>
    </Pagina>
  );
}

const STATUS_MISSAO = { planned: 'planejada', active: 'em andamento', done: 'concluída' } as const;
const dataCurta = (d: Date | string) => {
  const s = typeof d === 'string' ? d : dataLocal(d);
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
};

async function FichaView({ params }: { params: Params }) {
  const { id, characterId } = await params;
  let d: Awaited<ReturnType<typeof getFichaDoJogador>>;
  try {
    d = await getFichaDoJogador(id, characterId);
  } catch (e) {
    if (e instanceof CampanhaNaoEncontrada) notFound();
    throw e;
  }
  const { ficha } = d;
  const nome = ficha.tipo === 'pf2e' ? ficha.ficha.nome.trim() || ficha.nome : ficha.nome;

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print">
        <Link href={`/mesa/${d.campanha.id}`} className="text-sm text-muted hover:text-ink">
          ← {d.campanha.nome}
        </Link>
        <h1 className="font-display text-3xl font-semibold">{nome || 'Sem nome'}</h1>
        <p className="text-sm text-muted">
          {d.eu ? 'Sua ficha' : `Jogador: ${d.jogador}`} · só leitura
          {!d.eu && ' · as anotações pessoais do jogador não aparecem aqui'}
        </p>
      </div>

      {ficha.tipo === 'pf2e' && <FichaPf2eLeitura ficha={ficha.ficha} />}

      {ficha.tipo === 'sr5' && (
        <>
          {ficha.status === 'active' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Recursos">
                <p className="text-sm">
                  Nuyen <strong className="font-mono">{ficha.nuyen.toLocaleString('pt-BR')}¥</strong> · Karma{' '}
                  <strong className="font-mono">{ficha.karma}</strong>
                </p>
                {ficha.lancamentos.length > 0 && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted">Histórico ({ficha.lancamentos.length} últimos)</summary>
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {ficha.lancamentos.map((l) => (
                        <li key={l.id} className="flex justify-between gap-2">
                          <span className="truncate text-muted">
                            {dataCurta(l.createdAt)} · {l.reason}
                          </span>
                          <span className={cx('shrink-0 font-mono', l.amount < 0 ? 'text-danger' : 'text-ink')}>
                            {l.amount > 0 ? '+' : ''}
                            {l.amount.toLocaleString('pt-BR')}
                            {l.kind === 'nuyen' ? '¥' : ' karma'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </Card>
              <Card title="Metas e missões">
                {ficha.metas.length === 0 && ficha.missoes.length === 0 && <p className="text-sm text-muted">Nada anotado.</p>}
                {ficha.metas.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-sm">
                    {ficha.metas.map((m) => (
                      <li key={m.id}>• {m.title}</li>
                    ))}
                  </ul>
                )}
                {ficha.missoes.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-0.5 text-sm text-muted">
                    {ficha.missoes.map((m) => (
                      <li key={m.id}>
                        {m.title} <span className="text-xs text-faint">({STATUS_MISSAO[m.status]}{m.playedOn ? `, ${dataCurta(m.playedOn)}` : ''})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
          <TeammateSheet draft={ficha.draft} physical={ficha.fisico} stun={ficha.atordoamento} active={ficha.status === 'active'} />
        </>
      )}

      {ficha.tipo === 'outro' && (
        <Card>
          <p className="text-sm text-muted">Essa ficha é de um sistema que a Mesa ainda não sabe mostrar.</p>
        </Card>
      )}
    </div>
  );
}
