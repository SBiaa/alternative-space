import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Card } from '@/components/fichas/ui';
import { EscolherFicha } from '@/components/mesa/MesaForms';
import { Carregando, Pagina, Texto } from '@/components/mesa/MesaUI';
import { NOME_SISTEMA } from '@/lib/mesa/regras';
import { CampanhaNaoEncontrada } from '@/lib/mesa/server/acesso';
import { getConvitePorLink } from '@/lib/mesa/server/campanhas';

export const metadata: Metadata = { title: 'Convite para campanha' };

export default function ConvitePage({ params }: PageProps<'/mesa/convite/[code]'>) {
  return (
    <Pagina largura="max-w-xl">
      <Suspense fallback={<Carregando altura="h-48" />}>
        <Convite params={params} />
      </Suspense>
    </Pagina>
  );
}

async function Convite({ params }: { params: PageProps<'/mesa/convite/[code]'>['params'] }) {
  const { code } = await params;
  let c: Awaited<ReturnType<typeof getConvitePorLink>>;
  try {
    c = await getConvitePorLink(code);
  } catch (e) {
    if (e instanceof CampanhaNaoEncontrada) notFound();
    throw e;
  }

  return (
    <Card>
      <p className="text-sm text-muted">
        {c.mestre} chamou você para uma campanha de {NOME_SISTEMA[c.sistema]}
      </p>
      <h1 className="font-display text-3xl font-semibold">{c.nome}</h1>
      {c.sinopse && <Texto className="mt-2 text-muted">{c.sinopse}</Texto>}
      <p className="mt-2 text-sm text-muted">
        {c.jogadores.length ? `Já estão na mesa: ${c.jogadores.join(', ')}.` : 'Ninguém entrou ainda.'}
      </p>

      <div className="mt-5">
        {c.souMestre || c.jaEstou ? (
          <p className="text-sm text-muted">
            {c.souMestre ? 'Você é o mestre dessa campanha. ' : 'Você já está nessa campanha. '}
            <Link href={`/mesa/${c.campanhaId}`} className="text-accent hover:underline">
              Abrir a campanha
            </Link>
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm">Com qual ficha você vai jogar? Dá para escolher depois também.</p>
            <EscolherFicha modo="link" code={code} fichas={c.fichas} />
            <p className="mt-3 text-xs text-faint">
              O mestre vê a sua ficha toda, menos as anotações pessoais.{' '}
              {c.fichas.length === 0 && (
                <Link href="/fichas" className="text-accent hover:underline">
                  Criar uma ficha
                </Link>
              )}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
