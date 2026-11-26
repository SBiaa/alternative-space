'use client';

import { useMemo } from 'react';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import type { InventoryItemLike } from '@/lib/fichas/sr5/inventory';
import { evaluate } from '@/lib/fichas/sr5/rules';
import { Consulta } from './Consulta';

/** A ficha como quem abre o link público vê: a visão de Consulta, só leitura. */
export function PublicSheet({
  name,
  draft,
  inventory,
  physical,
  stun,
}: {
  name: string;
  draft: CharacterDraft;
  inventory: InventoryItemLike[];
  physical: number;
  stun: number;
}) {
  const result = useMemo(() => evaluate(draft), [draft]);
  const metatype = sr5Data.metatypes.find((m) => m.id === draft.metatypeId);
  const summary = [draft.concept.role, metatype ? label(metatype) : ''].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        {draft.portrait?.startsWith('data:image/') && (
          // eslint-disable-next-line @next/next/no-img-element -- retrato é um data URL pequeno
          <img src={draft.portrait} alt="" className="size-16 shrink-0 rounded-lg border border-line object-cover" />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold">{name || 'Sem nome'}</h1>
          <p className="text-sm text-muted">
            {summary ? `${summary} · ` : ''}Ficha compartilhada · só leitura
          </p>
        </div>
      </header>
      <Consulta draft={draft} result={result} inventory={inventory} physical={physical} stun={stun} readOnly />
    </div>
  );
}
