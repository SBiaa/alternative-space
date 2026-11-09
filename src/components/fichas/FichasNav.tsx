import Link from 'next/link';
import type { ReactNode } from 'react';

const link =
  'inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-muted no-underline transition hover:bg-surface-2 hover:text-ink';

/**
 * Barra das fichas, logo abaixo do cabeçalho do site.
 * O login e a conta ficam no cabeçalho do site; aqui só os atalhos da área de fichas.
 */
export function FichasNav({ children }: { children?: ReactNode }) {
  return (
    <div className="no-print border-b border-line">
      <nav aria-label="Fichas" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-1">
          <span className="etiqueta mr-2 text-[11px] text-accent">Fichas</span>
          <Link href="/fichas" className={link}>
            Minhas fichas
          </Link>
          <Link href="/fichas/times" className={link}>
            Times
          </Link>
        </div>
        {children && <div className="flex items-center gap-1">{children}</div>}
      </nav>
    </div>
  );
}
