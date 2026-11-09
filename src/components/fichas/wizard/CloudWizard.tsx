'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { saveCharacterAction } from '@/app/fichas/actions';
import { createCloudPersistence, hasUnsavedChanges, useSaveStatus } from '@/lib/fichas/cloudPersistence';
import { bindStore, flushStore, unbindStore, type WizardState } from '@/lib/fichas/store';
import { cx } from '../ui';
import { FinalizePanel } from './FinalizePanel';
import { Wizard } from './Wizard';
import { WizardExtrasProvider } from './WizardExtras';

/** Assistente de uma ficha da conta: salva no banco sozinho. */
export function CloudWizard({ id, initial, account }: { id: string; initial: WizardState; account?: ReactNode }) {
  const key = `cloud:${id}`;
  const make = () => createCloudPersistence({ id, initial, save: saveCharacterAction });
  // Na renderização, para o assistente já nascer lendo a ficha certa.
  bindStore(key, make);

  useEffect(() => {
    bindStore(key, make); // de novo após o desmonte simulado do Strict Mode
    const warn = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      void flushStore();
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      void flushStore(); // saiu da página pelo app (ex.: "Minhas fichas")
      unbindStore(key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `initial` só vale na montagem
  }, [key]);

  return (
    <WizardExtrasProvider value={{ savedIn: 'account', reviewActions: <FinalizePanel id={id} /> }}>
      <Wizard
        account={account}
        actions={
          <>
            <SaveIndicator />
            <Link
              href="/fichas"
              className="inline-flex items-center whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink sm:px-3.5"
            >
              Minhas fichas
            </Link>
          </>
        }
      />
    </WizardExtrasProvider>
  );
}

function SaveIndicator() {
  const s = useSaveStatus();
  const label =
    s.kind === 'saved' ? 'Salvo' : s.kind === 'error' ? 'Erro ao salvar' : 'Salvando…';
  return (
    <span
      role="status"
      title={s.kind === 'error' ? s.message : undefined}
      className={cx(
        'hidden whitespace-nowrap px-2 text-xs sm:inline',
        s.kind === 'saved' && 'text-faint',
        (s.kind === 'pending' || s.kind === 'saving') && 'text-muted',
        s.kind === 'error' && 'text-danger',
      )}
    >
      {label}
    </span>
  );
}
