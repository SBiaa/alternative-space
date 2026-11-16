import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Lembretes } from '@/components/mesa/Lembretes';
import { EscolherFicha } from '@/components/mesa/MesaForms';
import { Bolinha, Carregando, Pagina, StatusCampanhaChip, Vazio } from '@/components/mesa/MesaUI';
import { Card } from '@/components/fichas/ui';
import { NOME_SISTEMA, quando } from '@/lib/mesa/regras';
import { listarMesa, type CampanhaResumo } from '@/lib/mesa/server/campanhas';
import { fichasParaCampanha } from '@/lib/mesa/server/fichas';
import { usuarioDaMesa } from '@/lib/mesa/server/acesso';
import { lembretesDeSessao } from '@/lib/mesa/server/agenda';

export const metadata: Metadata = { title: 'Mesa do Mestre' };

export default function MesaPage() {
  return (
    <Pagina largura="max-w-5xl">
      <h1 className="mb-2 font-display text-3xl font-semibold">Mesa do Mestre</h1>
      <p className="mb-6 text-sm text-muted">
        Suas campanhas num lugar só: quem está na mesa, as fichas de cada um, as próximas sessões e o diário do que já
        aconteceu.
      </p>
      <Suspense fallback={<Carregando altura="h-40" />}>
        <Mesa />
      </Suspense>
    </Pagina>
  );
}

async function Mesa() {
  // A rotina das campanhas é posta em dia dentro de listarMesa, então os lembretes vêm depois.
  const { comoMestre, comoJogador, convites } = await listarMesa();
  const [userId, lembretes] = await Promise.all([usuarioDaMesa(), lembretesDeSessao()]);
  const agora = new Date();
  const fichasDosConvites = await Promise.all(convites.map((c) => fichasParaCampanha(userId, c.sistema)));

  return (
    <div className="flex flex-col gap-8">
      <Lembretes itens={lembretes} agora={agora} />

      {convites.length > 0 && (
        <section aria-label="Convites" className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Convites para você</h2>
          {convites.map((c, i) => (
            <Card key={c.campanhaId} className="border-accent/50">
              <p className="text-sm text-muted">
                {c.mestre} chamou você para <span className="text-ink">{NOME_SISTEMA[c.sistema]}</span>
              </p>
              <h3 className="mb-3 font-display text-xl font-semibold">{c.nome}</h3>
              <EscolherFicha modo="convite" campanhaId={c.campanhaId} fichas={fichasDosConvites[i]} />
            </Card>
          ))}
        </section>
      )}

      <section aria-label="Campanhas que você mestra" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Você mestra</h2>
          <Link href="/mesa/nova" className="text-sm text-accent hover:underline">
            + Nova campanha
          </Link>
        </div>
        {comoMestre.length ? (
          <Lista campanhas={comoMestre} />
        ) : (
          <Vazio>
            Nenhuma campanha ainda.{' '}
            <Link href="/mesa/nova" className="text-accent hover:underline">
              Crie a primeira
            </Link>{' '}
            e mande o link para os jogadores.
          </Vazio>
        )}
      </section>

      {comoJogador.length > 0 && (
        <section aria-label="Campanhas em que você joga" className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Você joga</h2>
          <Lista campanhas={comoJogador} />
        </section>
      )}
    </div>
  );
}

function Lista({ campanhas }: { campanhas: CampanhaResumo[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {campanhas.map((c) => (
        <li key={c.id}>
          <Link href={`/mesa/${c.id}`} className="block h-full rounded-xl border border-line bg-surface p-4 transition hover:border-accent/50">
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
                <Bolinha cor={c.cor} />
                {c.nome}
              </h3>
              <StatusCampanhaChip status={c.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {NOME_SISTEMA[c.sistema]} · {c.jogadores} {c.jogadores === 1 ? 'jogador' : 'jogadores'}
              {c.papel === 'jogador' && ` · mestre ${c.mestre}`}
            </p>
            <p className="mt-2 text-sm">
              {c.proximaSessao ? (
                <>
                  <span className="text-faint">Próxima sessão:</span> {quando(c.proximaSessao)}
                </>
              ) : (
                <span className="text-faint">{c.rotina || 'Sem sessão marcada'}</span>
              )}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
