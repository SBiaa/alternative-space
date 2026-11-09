'use client';

import { useMemo } from 'react';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { conditionLimits, conditionState, woundModifier } from '@/lib/fichas/sr5/play';
import { evaluate } from '@/lib/fichas/sr5/rules';
import { CharacterSheet } from '../steps/ReviewStep';
import { Card } from '../ui';

const STATE = { ok: 'Bem', unconscious: 'Inconsciente', dying: 'Morrendo', dead: 'Morto' } as const;

/** Ficha de um colega de time: só leitura, sem nuyen, histórico nem anotações. */
export function TeammateSheet({
  draft,
  physical,
  stun,
  active,
}: {
  draft: CharacterDraft;
  physical: number;
  stun: number;
  active: boolean;
}) {
  const result = useMemo(() => evaluate(draft), [draft]);
  const limits = conditionLimits(result);
  const mod = woundModifier(physical, stun, limits);

  return (
    <div className="flex flex-col gap-4">
      {active && (
        <Card title="Estado">
          <p className="text-sm">
            Físico <strong className="font-mono">{physical}/{limits.physical}</strong> · Atordoamento{' '}
            <strong className="font-mono">{stun}/{limits.stun}</strong> · {STATE[conditionState(physical, stun, limits)]}
            {mod < 0 && <span className="text-warn"> · {mod} nos testes</span>}
          </p>
        </Card>
      )}
      <CharacterSheet draft={draft} result={result} showRemaining={false} />
    </div>
  );
}
