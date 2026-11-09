'use client';

import { useTransition } from 'react';
import { deleteCharacterAction, duplicateCharacterAction } from '@/app/fichas/actions';
import { Button } from '../ui';

export function CharacterCardActions({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 flex gap-2 border-t border-line pt-3">
      <Button
        className="!px-2.5 !py-1.5 text-xs"
        disabled={pending}
        onClick={() => start(() => duplicateCharacterAction(id))}
      >
        Duplicar
      </Button>
      <Button
        variant="danger"
        className="!px-2.5 !py-1.5 text-xs"
        disabled={pending}
        onClick={() => {
          if (confirm(`Apagar a ficha "${name}"? Não dá para desfazer.`)) start(() => deleteCharacterAction(id));
        }}
      >
        Apagar
      </Button>
    </div>
  );
}
