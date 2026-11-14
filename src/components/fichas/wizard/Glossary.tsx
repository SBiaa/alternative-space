'use client';

import { useState } from 'react';
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryCategory } from '@/lib/fichas/sr5/help';
import { cx, matches, SearchInput } from '../ui';

export function Glossary() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<GlossaryCategory | null>(null);
  const items = GLOSSARY.filter((g) => (!cat || g.category === cat) && (!q || matches(`${g.term} ${g.text}`, q)));
  const groups = GLOSSARY_CATEGORIES.map((c) => [c, items.filter((g) => g.category === c)] as const).filter(([, list]) => list.length);

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={q} onChange={setQ} placeholder={`Buscar entre ${GLOSSARY.length} termos…`} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tema">
        {[null, ...GLOSSARY_CATEGORIES].map((c) => (
          <button
            key={c ?? 'todos'}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={cx(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              cat === c ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink',
            )}
          >
            {c ?? 'Todos'}
          </button>
        ))}
      </div>
      {groups.map(([category, list]) => (
        <section key={category} className="flex flex-col gap-3">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted">{category}</h3>
          <dl className="flex flex-col gap-3">
            {list.map((g) => (
              <div key={g.term} className="rounded-lg border border-line bg-surface-2 p-3">
                <dt className="font-display font-semibold text-accent">{g.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink">{g.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {!items.length && <p className="text-sm text-muted">Nenhum termo encontrado.</p>}
    </div>
  );
}
