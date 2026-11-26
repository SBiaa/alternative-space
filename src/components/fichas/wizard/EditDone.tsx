'use client';

import { useState } from 'react';
import { flushStore } from '@/lib/fichas/store';
import { Button } from '../ui';

/** Grava o que falta e volta para a ficha em jogo, já com os dados novos. */
function useDone(id: string) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const done = async () => {
    setPending(true);
    setError(undefined);
    if (!(await flushStore())) {
      setPending(false);
      setError('A última mudança ainda não foi salva. Espere aparecer "Salvo" e tente de novo.');
      return;
    }
    window.location.assign(`/fichas/${id}`);
  };
  return { done, error, pending };
}

export function EditDoneButton({ id }: { id: string }) {
  const { done, error, pending } = useDone(id);
  return (
    <Button variant="primary" className="whitespace-nowrap" onClick={done} disabled={pending} title={error}>
      {error ? 'Tentar voltar de novo' : 'Voltar ao jogo'}
    </Button>
  );
}

export function EditDonePanel({ id }: { id: string }) {
  const { done, error, pending } = useDone(id);
  return (
    <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-4">
      <h3 className="font-display text-lg font-semibold">Editando uma ficha em jogo</h3>
      <p className="mt-1 text-sm text-muted">
        Tudo é salvo na hora. Equipamento adicionado ou removido aqui também muda no inventário, e a sobra de nuyen e karma
        da criação é recalculada. Dano, anotações, missões, metas e carreira continuam como estão.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <Button variant="primary" className="mt-3" onClick={done} disabled={pending}>
        {pending ? 'Salvando…' : 'Voltar à ficha de jogo'}
      </Button>
    </div>
  );
}
