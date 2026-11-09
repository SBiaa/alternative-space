import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FichasNav } from '@/components/fichas/FichasNav';
import { PlayView } from '@/components/fichas/play/PlayView';
import { CloudWizard } from '@/components/fichas/wizard/CloudWizard';
import { getCharacter, NotFoundError } from '@/lib/fichas/server/characters';
import { getPlayData } from '@/lib/fichas/server/play';
import { getPf2e, sistemaDaFicha } from '@/lib/fichas/server/pf2e';
import { FichaPathfinder } from '@/components/FichaPathfinder';

export const metadata: Metadata = { title: 'Ficha' };

export default function CharacterPage({ params }: PageProps<'/fichas/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Character params={params} />
    </Suspense>
  );
}

async function Character({ params }: { params: PageProps<'/fichas/[id]'>['params'] }) {
  const { id } = await params;
  if ((await sistemaDaFicha(id, `/fichas/${id}`)) === 'pf2e') {
    const pf = await getPf2e(id);
    return (
      <>
        <FichasNav />
        <section className="secao !pt-8">
          <div className="miolo">
            <FichaPathfinder nuvem={{ id: pf.id, inicial: pf.ficha }} />
          </div>
        </section>
      </>
    );
  }
  let character;
  try {
    character = await getCharacter(id, `/fichas/${id}`);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  // Em criação: o assistente, salvando na conta.
  if (character.status === 'draft') {
    return (
      <CloudWizard
        id={character.id}
        initial={{ draft: character.draft, step: character.step }}
      />
    );
  }

  // Finalizada: a ficha em jogo.
  const play = await getPlayData(id);
  return (
    <PlayView
      character={{
        id: play.character.id,
        name: play.character.name,
        draft: play.character.draft,
        physicalDamage: play.character.physicalDamage,
        stunDamage: play.character.stunDamage,
        playNotes: play.character.playNotes,
      }}
      entries={play.entries}
      missions={play.missions}
      goals={play.goals}
      header={<FichasNav />}
    />
  );
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center text-muted">
      <span className="animate-pulse font-display tracking-widest">CARREGANDO FICHA…</span>
    </div>
  );
}
