'use client';

import { useState } from 'react';
import { addLedgerEntryAction, deleteLedgerEntryAction } from '@/app/fichas/play-actions';
import { ledgerTotals, MAX_REASON_LENGTH } from '@/lib/fichas/sr5/play';
import { fmtNuyen } from '@/lib/fichas/sr5/rules';
import { Button, Card, cx, inputClass } from '../ui';
import type { PlayEntry, PlayMission } from './types';
import { useAction } from './useAction';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });

function fmtAmount(e: Pick<PlayEntry, 'kind' | 'amount'>): string {
  const sign = e.amount > 0 ? '+' : '−';
  const abs = Math.abs(e.amount);
  return e.kind === 'nuyen' ? `${sign}${fmtNuyen(abs)}` : `${sign}${abs} karma`;
}

export function Balances({ id, entries, missions }: { id: string; entries: PlayEntry[]; missions: PlayMission[] }) {
  const totals = ledgerTotals(entries);
  const missionTitle = new Map(missions.map((m) => [m.id, m.title]));

  return (
    <Card title="Nuyen e karma">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Nuyen" value={fmtNuyen(totals.nuyen)} danger={totals.nuyen < 0} />
        <Stat
          label="Karma"
          value={String(totals.karma)}
          hint={`${totals.karmaEarned} ganho no total`}
          danger={totals.karma < 0}
        />
      </div>

      <EntryForm id={id} missions={missions} />

      <h4 className="mt-5 mb-2 text-sm font-semibold text-muted">Histórico</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-faint">Nada lançado ainda.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {entries.map((e) => (
            <EntryRow key={e.id} id={id} entry={e} mission={e.missionId ? missionTitle.get(e.missionId) : undefined} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function Stat({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={cx('font-display text-2xl font-semibold', danger ? 'text-danger' : 'text-ink')}>{value}</div>
      {hint && <div className="text-xs text-faint">{hint}</div>}
    </div>
  );
}

function EntryForm({ id, missions }: { id: string; missions: PlayMission[] }) {
  const [kind, setKind] = useState<'nuyen' | 'karma'>('nuyen');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [missionId, setMissionId] = useState('');
  const { pending, error, run } = useAction();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.abs(Math.trunc(Number(amount)));
    run(
      () =>
        addLedgerEntryAction(id, {
          kind,
          amount: direction === 'in' ? n : -n,
          reason,
          missionId: missionId || undefined,
        }),
      () => {
        setAmount('');
        setReason('');
      },
    );
  };

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2" aria-label="Lançar nuyen ou karma">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Ganhou ou gastou"
          className={cx(inputClass, '!w-auto')}
          value={direction}
          onChange={(e) => setDirection(e.target.value as 'in' | 'out')}
        >
          <option value="in">Ganhou</option>
          <option value="out">Gastou</option>
        </select>
        <input
          aria-label="Valor"
          inputMode="numeric"
          placeholder="Valor"
          className={cx(inputClass, '!w-28')}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
        />
        <select
          aria-label="Nuyen ou karma"
          className={cx(inputClass, '!w-auto')}
          value={kind}
          onChange={(e) => setKind(e.target.value as 'nuyen' | 'karma')}
        >
          <option value="nuyen">¥ nuyen</option>
          <option value="karma">karma</option>
        </select>
      </div>
      <input
        aria-label="Motivo"
        placeholder='Motivo (ex.: "Pagamento do Sr. Johnson", "Munição")'
        maxLength={MAX_REASON_LENGTH}
        className={inputClass}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {missions.length > 0 && (
        <select
          aria-label="Missão"
          className={inputClass}
          value={missionId}
          onChange={(e) => setMissionId(e.target.value)}
        >
          <option value="">Sem missão</option>
          {missions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" disabled={pending || !amount || !reason.trim()} className="self-start">
        {pending ? 'Lançando…' : 'Lançar'}
      </Button>
    </form>
  );
}

function EntryRow({ id, entry: e, mission }: { id: string; entry: PlayEntry; mission?: string }) {
  const { pending, error, run } = useAction();
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="w-16 shrink-0 text-xs text-faint">{dateFmt.format(e.createdAt)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{e.reason}</span>
        {mission && !e.reason.includes(mission) && (
          <span className="block truncate text-xs text-muted">{mission}</span>
        )}
        {error && <span className="block text-xs text-danger">{error}</span>}
      </span>
      <span className={cx('shrink-0 font-mono', e.amount > 0 ? 'text-ok' : 'text-danger')}>{fmtAmount(e)}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`Desfazer "${e.reason}" (${fmtAmount(e)})?`)) run(() => deleteLedgerEntryAction(id, e.id));
        }}
        className="shrink-0 rounded px-1.5 text-xs text-faint hover:bg-surface-2 hover:text-danger disabled:opacity-40"
        aria-label={`Desfazer ${e.reason}`}
      >
        desfazer
      </button>
    </li>
  );
}
