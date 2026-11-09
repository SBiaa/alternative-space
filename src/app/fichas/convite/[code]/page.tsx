import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FichasNav } from '@/components/fichas/FichasNav';
import { JoinTeamForm } from '@/components/fichas/teams/TeamForms';
import { Card } from '@/components/fichas/ui';
import { NotFoundError } from '@/lib/fichas/server/characters';
import { getInvite } from '@/lib/fichas/server/teams';

export const metadata: Metadata = { title: 'Convite para time' };

export default function InvitePage({ params }: PageProps<'/fichas/convite/[code]'>) {
  return (
    <div className="flex flex-1 flex-col">
      <FichasNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl border border-line bg-surface" />}>
          <Invite params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Invite({ params }: { params: PageProps<'/fichas/convite/[code]'>['params'] }) {
  const { code } = await params;
  let invite;
  try {
    invite = await getInvite(code);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <Card>
      <p className="text-sm text-muted">Você foi chamado para o time</p>
      <h1 className="font-display text-3xl font-semibold">{invite.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {invite.memberNames.length
          ? `Já estão no time: ${invite.memberNames.join(', ')}.`
          : 'Ninguém entrou ainda.'}
      </p>

      <div className="mt-5">
        {invite.available.length > 0 ? (
          <>
            <p className="mb-2 text-sm">Com qual ficha você vai entrar?</p>
            <JoinTeamForm code={code} characters={invite.available.map((c) => ({ id: c.id, name: c.name }))} />
          </>
        ) : (
          <p className="text-sm text-muted">
            {invite.alreadyIn ? 'Todas as suas fichas já estão nesse time. ' : 'Você ainda não tem fichas. '}
            <Link href={invite.alreadyIn ? `/fichas/times/${invite.teamId}` : '/fichas'} className="text-accent hover:underline">
              {invite.alreadyIn ? 'Abrir o time' : 'Criar uma ficha'}
            </Link>
          </p>
        )}
      </div>
    </Card>
  );
}
