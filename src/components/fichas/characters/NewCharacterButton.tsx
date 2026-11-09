'use client';

import { useFormStatus } from 'react-dom';
import { createCharacterAction, createPf2eAction } from '@/app/fichas/actions';
import { Button } from '../ui';

export function NewCharacterButton() {
  return (
    <form action={createCharacterAction}>
      <Submit label="Nova ficha de Shadowrun" />
    </form>
  );
}

export function NewPathfinderButton() {
  return (
    <form action={createPf2eAction}>
      <Submit label="Nova ficha de Pathfinder" />
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? 'Criando…' : label}
    </Button>
  );
}
