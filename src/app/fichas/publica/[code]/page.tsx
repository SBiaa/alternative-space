import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { FichasNav } from '@/components/fichas/FichasNav';
import { PublicSheet } from '@/components/fichas/play/PublicSheet';
import { NotFoundError } from '@/lib/fichas/server/characters';
import { getPublicSheet } from '@/lib/fichas/server/share';

/** Sem login (fica fora do proxy) e fora dos buscadores: só chega quem recebeu o link. */
export const metadata: Metadata = { title: 'Ficha compartilhada', robots: { index: false, follow: false } };

export default function PublicSheetPage({ params }: PageProps<'/fichas/publica/[code]'>) {
  return (
    <div className="flex flex-1 flex-col">
      <FichasNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Suspense fallback={<p className="animate-pulse py-10 text-center text-muted">Carregando ficha…</p>}>
          <Sheet params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Sheet({ params }: { params: PageProps<'/fichas/publica/[code]'>['params'] }) {
  const { code } = await params;
  await connection(); // sempre do banco: desligar o link e o dano da sessão valem na hora
  let sheet: Awaited<ReturnType<typeof getPublicSheet>>;
  try {
    sheet = await getPublicSheet(code);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  return <PublicSheet {...sheet} />;
}
