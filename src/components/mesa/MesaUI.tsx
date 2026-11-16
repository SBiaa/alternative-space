import Link from 'next/link';
import type { ReactNode } from 'react';
import { FichasNav } from '@/components/fichas/FichasNav';
import { cx } from '@/lib/fichas/cx';
import type { Indicador } from '@/lib/mesa/server/fichas';
import { CORES, NOME_RESPOSTA, NOME_STATUS_CAMPANHA, type CorCampanha, type RespostaPresenca, type StatusCampanha } from '@/lib/mesa/regras';

const atalho = 'inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-2 text-sm text-muted no-underline transition hover:bg-surface-2 hover:text-ink';

/** Barra das fichas com os atalhos da Mesa do Mestre à direita. */
export function MesaNav() {
  return (
    <FichasNav>
      <Link href="/mesa/calendario" className={atalho}>
        Calendário
      </Link>
      <Link href="/mesa/nova" className={atalho}>
        + Nova campanha
      </Link>
    </FichasNav>
  );
}

export function Pagina({ children, largura = 'max-w-6xl' }: { children: ReactNode; largura?: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <MesaNav />
      <main className={cx('mx-auto w-full flex-1 px-4 py-8 sm:px-6', largura)}>{children}</main>
    </div>
  );
}

export const Carregando = ({ altura = 'h-64' }: { altura?: string }) => (
  <div className={cx('animate-pulse rounded-xl border border-line bg-surface', altura)} />
);

export const Bolinha = ({ cor, className }: { cor: CorCampanha; className?: string }) => (
  <span aria-hidden className={cx('inline-block h-2.5 w-2.5 shrink-0 rounded-full', CORES[cor]?.bolinha, className)} />
);

export function StatusCampanhaChip({ status }: { status: StatusCampanha }) {
  return (
    <span
      className={cx(
        'shrink-0 rounded-full border px-2 py-0.5 text-xs',
        status === 'andamento' ? 'border-accent/50 text-accent' : 'border-line-strong text-muted',
      )}
    >
      {NOME_STATUS_CAMPANHA[status]}
    </span>
  );
}

export function Indicadores({ itens }: { itens: Indicador[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
      {itens.map((i) => (
        <div key={i.rotulo} className="rounded-md bg-surface-2 px-2 py-1.5">
          <div className="text-faint">{i.rotulo}</div>
          <div className={cx('font-mono text-sm', i.alerta ? 'text-warn' : 'text-ink')}>{i.valor}</div>
        </div>
      ))}
    </div>
  );
}

export function RespostaChip({ resposta }: { resposta: RespostaPresenca | null }) {
  return (
    <span
      className={cx(
        'rounded-full px-2 py-0.5 text-xs',
        resposta === 'vou' && 'bg-accent/15 text-accent',
        resposta === 'talvez' && 'bg-warn/15 text-warn',
        resposta === 'nao' && 'bg-danger/15 text-danger',
        !resposta && 'text-faint',
      )}
    >
      {resposta ? NOME_RESPOSTA[resposta] : 'sem resposta'}
    </span>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">{children}</p>;
}

/** Texto com quebras de linha preservadas. */
export const Texto = ({ children, className }: { children: string; className?: string }) => (
  <p className={cx('whitespace-pre-line text-sm leading-relaxed', className)}>{children}</p>
);
