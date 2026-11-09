'use client';

import { useState } from 'react';
import {
  addLedgerEntryAction,
  createMissionAction,
  deleteMissionAction,
  updateMissionAction,
} from '@/app/fichas/play-actions';
import { ledgerTotals, MAX_TITLE_LENGTH } from '@/lib/fichas/sr5/play';
import { fmtNuyen } from '@/lib/fichas/sr5/rules';
import { Button, Card, cx, inputClass } from '../ui';
import { NotesField } from './NotesField';
import { MISSION_STATUS_LABEL, type PlayEntry, type PlayMission } from './types';
import { useAction } from './useAction';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

export function Missions({ id, missions, entries }: { id: string; missions: PlayMission[]; entries: PlayEntry[] }) {
  return (
    <div className="flex flex-col gap-4">
      <NewMission id={id} />
      {missions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          Nenhuma missão ainda. Registre a primeira acima: o que aconteceu, quem vocês conheceram e o que ficou em
          aberto.
        </p>
      ) : (
        missions.map((m) => (
          <MissionCard key={m.id} id={id} mission={m} entries={entries.filter((e) => e.missionId === m.id)} />
        ))
      )}
    </div>
  );
}

function NewMission({ id }: { id: string }) {
  const [title, setTitle] = useState('');
  const [playedOn, setPlayedOn] = useState('');
  const { pending, error, run } = useAction();

  return (
    <Card title="Nova missão">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => createMissionAction(id, { title, playedOn: playedOn || undefined }),
            () => {
              setTitle('');
              setPlayedOn('');
            },
          );
        }}
      >
        <input
          aria-label="Nome da missão"
          placeholder='Ex.: "Extração na Renraku"'
          maxLength={MAX_TITLE_LENGTH}
          className={cx(inputClass, 'min-w-0 flex-1 basis-56')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          aria-label="Data da sessão"
          type="date"
          className={cx(inputClass, '!w-auto')}
          value={playedOn}
          onChange={(e) => setPlayedOn(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={pending || !title.trim()}>
          {pending ? 'Criando…' : 'Criar'}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

function MissionCard({ id, mission: m, entries }: { id: string; mission: PlayMission; entries: PlayEntry[] }) {
  const status = useAction();
  const remove = useAction();
  const reward = ledgerTotals(entries);

  return (
    <Card
      title={m.title}
      actions={
        <div className="flex items-center gap-2">
          {m.playedOn && <span className="text-xs text-faint">{dateFmt.format(new Date(m.playedOn))}</span>}
          <select
            aria-label={`Situação de ${m.title}`}
            className={cx(inputClass, '!w-auto !py-1 text-xs')}
            value={m.status}
            disabled={status.pending}
            onChange={(e) => status.run(() => updateMissionAction(id, m.id, { status: e.target.value }))}
          >
            {Object.entries(MISSION_STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <NotesField
        label={`Anotações de ${m.title}`}
        initial={m.notes}
        rows={4}
        placeholder="O que aconteceu, NPCs, pistas, ganchos em aberto…"
        save={(notes) => updateMissionAction(id, m.id, { notes })}
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
        <span className="text-muted">
          Recompensas: <strong className="text-ink">{fmtNuyen(reward.nuyen)}</strong> e{' '}
          <strong className="text-ink">{reward.karma} karma</strong>
        </span>
        <RewardForm id={id} mission={m} />
      </div>

      {(status.error || remove.error) && <p className="mt-2 text-sm text-danger">{status.error ?? remove.error}</p>}
      <button
        type="button"
        disabled={remove.pending}
        className="mt-3 text-xs text-faint hover:text-danger"
        onClick={() => {
          if (confirm(`Apagar a missão "${m.title}"? As recompensas já lançadas continuam no histórico.`))
            remove.run(() => deleteMissionAction(id, m.id));
        }}
      >
        Apagar missão
      </button>
    </Card>
  );
}

/** Lança nuyen e/ou karma ganhos na missão de uma vez. */
function RewardForm({ id, mission: m }: { id: string; mission: PlayMission }) {
  const [nuyen, setNuyen] = useState('');
  const [karma, setKarma] = useState('');
  const { pending, error, run } = useAction();
  const digits = (v: string) => v.replace(/[^\d]/g, '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = `Recompensa: ${m.title}`;
    run(
      async () => {
        if (Number(nuyen) > 0) {
          const r = await addLedgerEntryAction(id, { kind: 'nuyen', amount: Number(nuyen), reason, missionId: m.id });
          if (!r.ok) return r;
        }
        if (Number(karma) > 0) {
          return addLedgerEntryAction(id, { kind: 'karma', amount: Number(karma), reason, missionId: m.id });
        }
        return { ok: true };
      },
      () => {
        setNuyen('');
        setKarma('');
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2" aria-label={`Recompensa de ${m.title}`}>
      <input
        aria-label="Nuyen ganho"
        inputMode="numeric"
        placeholder="¥"
        className={cx(inputClass, '!w-24 !py-1')}
        value={nuyen}
        onChange={(e) => setNuyen(digits(e.target.value))}
      />
      <input
        aria-label="Karma ganho"
        inputMode="numeric"
        placeholder="karma"
        className={cx(inputClass, '!w-20 !py-1')}
        value={karma}
        onChange={(e) => setKarma(digits(e.target.value))}
      />
      <Button type="submit" className="!py-1 text-xs" disabled={pending || (!Number(nuyen) && !Number(karma))}>
        {pending ? 'Lançando…' : 'Lançar recompensa'}
      </Button>
      {error && <span className="w-full text-xs text-danger">{error}</span>}
    </form>
  );
}
