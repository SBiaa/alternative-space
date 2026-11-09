'use client';

import { useFormStatus } from 'react-dom';
import { createCharacterAction } from '@/app/fichas/actions';
import { Button } from '../ui';

export function NewCharacterButton() {
  return (
    <form action={createCharacterAction}>
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? 'Criando…' : 'Nova ficha'}
    </Button>
  );
}
