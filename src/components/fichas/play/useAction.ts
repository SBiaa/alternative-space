'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/app/fichas/play-actions';

/** Roda uma Server Action e guarda o erro (se houver) para mostrar na tela. */
export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      setError(undefined);
      try {
        const r = await fn();
        if (r.ok) onOk?.();
        else setError(r.error);
      } catch {
        setError('Sem conexão. Tente de novo.');
      }
    });

  return { pending, error, run };
}
