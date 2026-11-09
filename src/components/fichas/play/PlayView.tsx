'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { setPlayNotesAction } from '@/app/fichas/play-actions';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { exportFilename, exportJson } from '@/lib/fichas/sr5/io';
import { conditionLimits } from '@/lib/fichas/sr5/play';
import { evaluate } from '@/lib/fichas/sr5/rules';
import { CharacterSheet } from '../steps/ReviewStep';
import { Button, Card, cx } from '../ui';
import { Balances } from './Balances';
import { ConditionMonitor } from './ConditionMonitor';
import { Goals } from './Goals';
import { Missions } from './Missions';
import { NotesField } from './NotesField';
import type { PlayEntry, PlayGoal, PlayMission } from './types';

type Tab = 'play' | 'goals' | 'missions' | 'sheet';
const TABS: { key: Tab; label: string }[] = [
  { key: 'play', label: 'Jogo' },
  { key: 'goals', label: 'Metas' },
  { key: 'missions', label: 'Missões' },
  { key: 'sheet', label: 'Ficha completa' },
];

export interface PlayCharacter {
  id: string;
  name: string;
  draft: CharacterDraft;
  physicalDamage: number;
  stunDamage: number;
  playNotes: string;
}

/** Ficha em jogo: o que muda de sessão para sessão. */
export function PlayView({
  character: c,
  entries,
  missions,
  goals,
  header,
}: {
  character: PlayCharacter;
  entries: PlayEntry[];
  missions: PlayMission[];
  goals: PlayGoal[];
  header: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('play');
  const result = useMemo(() => evaluate(c.draft), [c.draft]);
  const limits = conditionLimits(result);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJson(c.draft)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename(c.draft);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col">
      {header}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold">{c.name}</h1>
            <p className="text-sm text-muted">
              {c.draft.concept.role ? `${c.draft.concept.role} · ` : ''}
              <span className="text-accent">Em jogo</span>
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg border border-line bg-surface p-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  tab === t.key ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'play' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <ConditionMonitor id={c.id} limits={limits} physical={c.physicalDamage} stun={c.stunDamage} />
              <Card title="Anotações">
                <NotesField
                  label="Anotações do personagem"
                  initial={c.playNotes}
                  placeholder="Contatos devendo favor, rivais, pistas, equipamento emprestado…"
                  save={(notes) => setPlayNotesAction(c.id, notes)}
                />
              </Card>
            </div>
            <Balances id={c.id} entries={entries} missions={missions} />
          </div>
        )}

        {tab === 'goals' && <Goals id={c.id} goals={goals} entries={entries} result={result} />}

        {tab === 'missions' && <Missions id={c.id} missions={missions} entries={entries} />}

        {tab === 'sheet' && (
          <div className="flex flex-col gap-4">
            <div className="no-print flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => window.print()}>
                Salvar PDF / imprimir
              </Button>
              <Button onClick={download}>Exportar JSON</Button>
            </div>
            <p className="no-print text-xs text-faint">
              Esta é a ficha como saiu da criação. Metas concluídas e gastos de karma ainda não mudam os atributos aqui.
            </p>
            <CharacterSheet draft={c.draft} result={result} showRemaining={false} />
          </div>
        )}
      </main>
    </div>
  );
}
