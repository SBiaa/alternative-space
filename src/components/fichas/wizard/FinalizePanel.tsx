'use client';

import { useMemo, useState, useTransition } from 'react';
import { finalizeCharacterAction } from '@/app/fichas/play-actions';
import { startingBalances } from '@/lib/fichas/sr5/play';
import { evaluate, fmtNuyen, isComplete } from '@/lib/fichas/sr5/rules';
import { flushStore, useWizard } from '@/lib/fichas/store';
import { Button } from '../ui';

/** Na Revisão da ficha da conta: trava a criação e leva para a ficha em jogo. */
export function FinalizePanel({ id }: { id: string }) {
  const w = useWizard();
  const result = useMemo(() => (w ? evaluate(w.draft) : null), [w]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  if (!result) return null;

  const complete = isComplete(result);
  const start0 = startingBalances(result);

  const finalize = () => {
    if (!confirm('Finalizar a criação? Depois disso a ficha não volta para o assistente.')) return;
    start(async () => {
      setError(undefined);
      if (!(await flushStore())) {
        setError('A última mudança ainda não foi salva. Espere aparecer "Salvo" e tente de novo.');
        return;
      }
      const r = await finalizeCharacterAction(id);
      if (!r.ok) setError(r.error);
      // Deu certo: a página recarrega sozinha e abre a ficha em jogo.
    });
  };

  return (
    <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-4">
      <h3 className="font-display text-lg font-semibold">Pronto para jogar?</h3>
      <p className="mt-1 text-sm text-muted">
        Finalizar trava a criação e abre a ficha em jogo, onde você controla nuyen, karma, dano e missões. Passam para o
        jogo <strong className="text-ink">{fmtNuyen(start0.nuyen)}</strong> e{' '}
        <strong className="text-ink">{start0.karma} de karma</strong>.
      </p>
      {!complete && <p className="mt-2 text-sm text-warn">Corrija os erros acima antes de finalizar.</p>}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <Button variant="primary" className="mt-3" disabled={!complete || pending} onClick={finalize}>
        {pending ? 'Finalizando…' : 'Finalizar criação'}
      </Button>
    </div>
  );
}
