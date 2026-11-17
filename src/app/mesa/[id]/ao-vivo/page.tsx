import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AutoAtualizar, CombateMestre } from '@/components/mesa/AoVivo';
import { CombateLeitura } from '@/components/mesa/CombateLeitura';
import { Bolinha, Carregando, Indicadores, Pagina } from '@/components/mesa/MesaUI';
import { Card } from '@/components/fichas/ui';
import { CampanhaNaoEncontrada } from '@/lib/mesa/server/acesso';
import { getAoVivo } from '@/lib/mesa/server/ao-vivo';

export const metadata: Metadata = { title: 'Mesa ao vivo' };

type Params = PageProps<'/mesa/[id]/ao-vivo'>['params'];

export default function AoVivoPage({ params }: PageProps<'/mesa/[id]/ao-vivo'>) {
  return (
    <Pagina>
      <Suspense fallback={<Carregando />}>
        <AoVivoView params={params} />
      </Suspense>
    </Pagina>
  );
}

async function AoVivoView({ params }: { params: Params }) {
  const { id } = await params;
  const d = await getAoVivo(id).catch((e) => {
    if (e instanceof CampanhaNaoEncontrada) notFound();
    throw e;
  });
  const { campanha, papel, jogadores, combate, npcs } = d;
  const ehMestre = papel === 'mestre';
  const eu = jogadores.find((j) => j.eu)?.userId ?? '';

  return (
    <div className="flex flex-col gap-6">
      <AutoAtualizar segundos={5} />
      <header className="flex flex-col gap-1">
        <Link href={`/mesa/${campanha.id}`} className="flex items-center gap-2 text-sm text-muted hover:text-ink">
          ← <Bolinha cor={campanha.cor} /> {campanha.nome}
        </Link>
        <h1 className="font-display text-3xl font-semibold">Mesa ao vivo</h1>
        <p className="text-sm text-muted">A tela se atualiza sozinha a cada poucos segundos.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Iniciativa">
          {ehMestre ? (
            <CombateMestre
              campanhaId={campanha.id}
              sistema={campanha.sistema}
              combate={combate}
              jogadores={jogadores.map(({ userId, nome }) => ({ userId, nome }))}
              npcs={npcs.map(({ id: npcId, nome }) => ({ id: npcId, nome }))}
            />
          ) : (
            <CombateLeitura combate={combate} sistema={campanha.sistema} meuId={eu} />
          )}
        </Card>

        <section aria-label="Jogadores" className="flex flex-col gap-3">
          {jogadores.length === 0 ? (
            <p className="text-sm text-muted">Ninguém na mesa ainda.</p>
          ) : (
            jogadores.map((j) => (
              <div key={j.userId} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-lg font-semibold">
                    {j.ficha?.nome ?? j.nome}
                    {j.eu && <span className="ml-2 text-xs font-normal text-accent">você</span>}
                  </p>
                  <p className="truncate text-xs text-faint">{j.ficha ? `${j.nome} · ${j.ficha.resumo}` : 'sem ficha'}</p>
                </div>
                {j.ficha?.indicadores ? (
                  <Indicadores itens={j.ficha.indicadores} />
                ) : (
                  j.ficha && <p className="text-xs text-faint">O estado da ficha só aparece para o mestre e para o dono.</p>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
