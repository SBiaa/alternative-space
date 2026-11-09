'use client';

import { useState } from 'react';
import { GLOSSARY } from '@/lib/fichas/sr5/help';
import { matches, SearchInput } from '../ui';

export function Glossary() {
  const [q, setQ] = useState('');
  const items = GLOSSARY.filter((g) => !q || matches(`${g.term} ${g.text}`, q));
  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={q} onChange={setQ} placeholder="Buscar termo…" />
      <dl className="flex flex-col gap-3">
        {items.map((g) => (
          <div key={g.term} className="rounded-lg border border-line bg-surface-2 p-3">
            <dt className="font-display font-semibold text-accent">{g.term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-ink">{g.text}</dd>
          </div>
        ))}
        {!items.length && <p className="text-sm text-muted">Nenhum termo encontrado.</p>}
      </dl>
    </div>
  );
}
