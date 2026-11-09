import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FichasNav } from '@/components/fichas/FichasNav';
import { TeammateSheet } from '@/components/fichas/teams/TeammateSheet';
import { NotFoundError } from '@/lib/fichas/server/characters';
import { getTeammateSheet } from '@/lib/fichas/server/teams';

export const metadata: Metadata = { title: 'Ficha do time' };

export default function TeammatePage({ params }: PageProps<'/fichas/times/[id]/fichas/[characterId]'>) {
  return (
    <div className="flex flex-1 flex-col">
      <FichasNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />}>
          <Teammate params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Teammate({ params }: { params: PageProps<'/fichas/times/[id]/fichas/[characterId]'>['params'] }) {
  const { id, characterId } = await params;
  let sheet;
  try {
    sheet = await getTeammateSheet(id, characterId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print">
        <Link href={`/fichas/times/${id}`} className="text-sm text-muted hover:text-ink">
          ← {sheet.teamName}
        </Link>
        <h1 className="font-display text-3xl font-semibold">{sheet.name}</h1>
        <p className="text-sm text-muted">
          {sheet.mine ? 'Sua ficha' : `Jogador: ${sheet.player}`}
          {sheet.status === 'draft' && ' · em criação'}
        </p>
      </div>
      <TeammateSheet draft={sheet.draft} physical={sheet.physical} stun={sheet.stun} active={sheet.status === 'active'} />
    </div>
  );
}
