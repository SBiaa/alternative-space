'use client';

import { useState } from 'react';
import { QUALITY_HELP } from '@/lib/fichas/sr5/help';
import { updateDraft } from '@/lib/fichas/store';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { ATTR_LABEL } from '@/lib/fichas/sr5/rules';
import type { AttrKey, Quality } from '@/lib/fichas/sr5/types';
import type { StepProps } from '../wizard/Wizard';
import { BudgetMeter, Button, Card, cx, HelpTip, inputClass, matches, SearchInput, StepIntro, Stepper } from '../ui';

const UNAVAILABLE = 'livros atuais';

export function QualitiesStep({ draft, result }: StepProps) {
  const [tab, setTab] = useState<'positive' | 'negative'>('positive');
  const [q, setQ] = useState('');
  const avail = result.availability.qualities;
  const list = sr5Data.qualities.filter(
    (x) =>
      x.kind === tab &&
      avail[x.id] &&
      !avail[x.id].reason?.includes(UNAVAILABLE) &&
      (!q || matches(`${label(x)} ${x.name}`, q)),
  );

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Qualidades">
        Qualidades são traços marcantes. As <strong className="text-ink">positivas</strong> custam karma; as{' '}
        <strong className="text-ink">negativas</strong> dão karma, mas trazem problemas que o mestre vai usar. No máximo
        25 de karma em cada lado. Opcional: muita gente começa sem nenhuma.
      </StepIntro>

      <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3">
        <BudgetMeter label="Positivas (limite)" budget={result.budgets.positiveQualities} />
        <BudgetMeter label="Negativas (limite)" budget={result.budgets.negativeQualities} />
        <BudgetMeter label="Karma" budget={result.budgets.karma} />
      </div>

      {draft.qualities.length > 0 && (
        <Card title="Escolhidas">
          <ul className="flex flex-col divide-y divide-line">
            {draft.qualities.map((dq, i) => {
              const qq = sr5Data.qualities.find((x) => x.id === dq.id);
              if (!qq) return null;
              return <ChosenQuality key={`${dq.id}-${i}`} quality={qq} index={i} rating={dq.rating} choice={dq.choice} />;
            })}
          </ul>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg border border-line-strong p-0.5" role="tablist">
            {(['positive', 'negative'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)}
                className={cx('rounded-md px-3 py-1.5 text-sm transition', tab === t ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink')}>
                {t === 'positive' ? 'Positivas' : 'Negativas'}
              </button>
            ))}
          </div>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar qualidade…" />
        </div>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {list.map((x) => {
            const a = avail[x.id];
            const taken = x.maxRating !== null && draft.qualities.some((d) => d.id === x.id);
            return (
              <li key={x.id} className={cx('flex items-start gap-3 rounded-lg border border-line p-3', !a.ok && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    {label(x)}
                    <HelpTip help={QUALITY_HELP[x.name]} title={label(x)} />
                  </div>
                  <div className="text-xs text-muted">
                    {x.kind === 'positive' ? 'custa' : 'dá'} {x.karma} karma{x.maxRating && x.maxRating > 1 ? ' por nível' : ''}
                    {x.maxRating === null ? ' · pode repetir' : ''}
                  </div>
                  {QUALITY_HELP[x.name] && <p className="mt-1 text-sm text-muted">{QUALITY_HELP[x.name].text}</p>}
                  {!a.ok && <p className="mt-1 text-xs text-warn">⊘ {a.reason}</p>}
                </div>
                <Button className="shrink-0 !px-2.5 !py-1 text-xs" disabled={!a.ok || taken}
                  onClick={() => updateDraft((d) => { d.qualities.push({ id: x.id, rating: 1 }); })}>
                  {taken ? 'Escolhida' : 'Adicionar'}
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function ChosenQuality({ quality: q, index, rating, choice }: { quality: Quality; index: number; rating: number; choice?: string }) {
  const set = (patch: { rating?: number; choice?: string }) =>
    updateDraft((d) => Object.assign(d.qualities[index], patch));
  const attrChoice = q.effects.find((e) => e.type === 'chooseAttributeMax');
  const skillChoice = q.effects.some((e) => e.type === 'chooseSkillMax');
  const textChoice = q.effects.some((e) => e.type === 'chooseText');
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
      <span className={cx('h-2 w-2 shrink-0 rounded-full', q.kind === 'positive' ? 'bg-accent' : 'bg-accent-2')} aria-hidden />
      <span className="min-w-0 flex-1">
        {label(q)}
        <span className="ml-2 text-xs text-faint">{q.kind === 'positive' ? '−' : '+'}{q.karma * rating} karma</span>
      </span>
      {q.maxRating !== null && q.maxRating > 1 && (
        <Stepper size="sm" label={`nível de ${label(q)}`} value={rating} min={1} max={q.maxRating} onChange={(v) => set({ rating: v })} />
      )}
      {attrChoice && attrChoice.type === 'chooseAttributeMax' && (
        <select aria-label="Atributo" className={cx(inputClass, '!w-40 !py-1')} value={choice ?? ''} onChange={(e) => set({ choice: e.target.value })}>
          <option value="">Qual atributo?</option>
          {(['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'MAG', 'RES'] as AttrKey[])
            .filter((a) => !attrChoice.exclude.includes(a))
            .map((a) => <option key={a} value={a}>{ATTR_LABEL[a]}</option>)}
        </select>
      )}
      {skillChoice && (
        <select aria-label="Perícia" className={cx(inputClass, '!w-52 !py-1')} value={choice ?? ''} onChange={(e) => set({ choice: e.target.value })}>
          <option value="">Qual perícia?</option>
          {sr5Data.skills.skills.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
        </select>
      )}
      {textChoice && (
        <input aria-label="Detalhe" className={cx(inputClass, '!w-52 !py-1')} value={choice ?? ''} placeholder="Detalhe (ex.: qual)"
          onChange={(e) => set({ choice: e.target.value })} />
      )}
      <Button variant="ghost" className="!px-2 !py-1" aria-label={`Remover ${label(q)}`}
        onClick={() => updateDraft((d) => { d.qualities.splice(index, 1); })}>✕</Button>
    </li>
  );
}
