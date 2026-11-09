'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { importLocalDraftAction } from '@/app/fichas/actions';
import { characterDisplayName, isBlankDraft, type CharacterDraft } from '@/lib/fichas/sr5/character';
import { clearLocalState, readLocalState } from '@/lib/fichas/store';
import { Button } from '../ui';

const DISMISSED = 'fixer:import-dismissed';

/** Se há uma ficha feita sem login neste navegador, oferece salvar na conta. */
export function LocalImportBanner() {
  const [draft, setDraft] = useState<CharacterDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED) === '1';
    } catch {
      /* storage bloqueado */
    }
    const local = readLocalState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    if (!dismissed && local && !isBlankDraft(local.draft)) setDraft(local.draft);
  }, []);

  if (!draft) return null;

  const save = () =>
    start(async () => {
      setError(null);
      try {
        const id = await importLocalDraftAction(draft);
        clearLocalState();
        router.push(`/fichas/${id}`);
      } catch {
        setError('Não deu para salvar a ficha. Tente de novo.');
      }
    });

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED, '1');
    } catch {
      /* storage bloqueado */
    }
    setDraft(null);
  };

  return (
    <div role="region" aria-label="Ficha deste navegador" className="mb-6 rounded-xl border border-accent/40 bg-accent/5 p-4">
      <p className="text-sm">
        Você tem a ficha <strong>{characterDisplayName(draft)}</strong> salva neste navegador, feita sem login.
        Quer guardar ela na sua conta?
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="primary" disabled={pending} onClick={save}>
          {pending ? 'Salvando…' : 'Salvar na minha conta'}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={dismiss}>
          Agora não
        </Button>
      </div>
    </div>
  );
}
