'use client';

import { LIFESTYLE_HELP } from '@/lib/fichas/sr5/help';
import { updateDraft } from '@/lib/fichas/store';
import type { CharacterDraft, DraftLifestyle } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import {
  equalShare, lifestyleAdjust, lifestyleMonthly, lifestyleTotal, MAX_ROOMMATES, paidPercentage, PERMANENT_MONTHS, startingNuyenRoll,
} from '@/lib/fichas/sr5/lifestyle';
import { fmtNuyen } from '@/lib/fichas/sr5/rules';
import type { LifestyleQuality } from '@/lib/fichas/sr5/types';
import { Button, Card, cx, Field, HelpTip, inputClass, Stepper } from '../ui';
import { nf } from './shared';

const compact = cx(inputClass, '!py-1.5');

function qualityEffect(q: LifestyleQuality): string {
  const pct = (n: number) => `${n > 0 ? '+' : ''}${n}%`;
  return [
    q.baseMultiplier ? `${pct(q.baseMultiplier)} sobre a base` : '',
    q.multiplier ? pct(q.multiplier) : '',
    q.cost ? `+${nf(Math.round(q.cost))}¥/mês` : '',
  ].filter(Boolean).join(', ');
}

function Place({ title, value, options, onChange }: {
  title: string; value?: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <Field label={title}>
      <select className={compact} value={value ?? ''} disabled={!options.length && !value}
        onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {value && !options.includes(value) && <option value={value}>{value}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function LifestyleForm({ index, l, adjust }: {
  index: number; l: DraftLifestyle; adjust: { metatypePct: number; characterPct: number };
}) {
  const level = sr5Data.lifestyles.find((x) => x.id === l.id);
  const edit = (fn: (x: DraftLifestyle) => void) => updateDraft((d) => { fn(d.lifestyles[index]); });
  const monthly = level ? lifestyleMonthly(level, l, adjust) : 0;
  const city = sr5Data.cities.find((c) => c.name === l.city);
  const district = city?.districts.find((x) => x.name === l.district);
  const chosen = l.qualities ?? [];
  const available = sr5Data.lifestyleQualities.filter(
    (q) => q.allowMultiple || !chosen.some((c) => c.id === q.id),
  );

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <legend className="sr-only">Estilo de vida {index + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Apelido (opcional)">
          <input className={compact} value={l.name ?? ''} maxLength={60} placeholder="Ex.: o apê"
            onChange={(e) => edit((x) => { x.name = e.target.value; })} />
        </Field>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Field label="Nível">
              <select aria-label="Estilo de vida" className={compact} value={l.id}
                onChange={(e) => edit((x) => { x.id = e.target.value; })}>
                {sr5Data.lifestyles.map((x) => <option key={x.id} value={x.id}>{label(x)} — {nf(x.cost)}¥</option>)}
              </select>
            </Field>
          </div>
          {level && <HelpTip help={LIFESTYLE_HELP[level.name]} title={label(level)} className="mb-2" />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <Stepper size="sm" label="meses" value={l.months} min={1} max={PERMANENT_MONTHS} onChange={(v) => edit((x) => { x.months = v; })} />
          <span className="text-muted">{l.months >= PERMANENT_MONTHS ? 'meses (permanente)' : `meses (${PERMANENT_MONTHS} = permanente)`}</span>
        </span>
        <span className="flex items-center gap-2">
          <Stepper size="sm" label="colegas de casa" value={l.roommates ?? 0} max={MAX_ROOMMATES}
            onChange={(v) => edit((x) => {
              // Quem ainda estava na parte igual continua nela.
              if (x.percentage === equalShare(x.roommates ?? 0)) x.percentage = equalShare(v);
              x.roommates = v;
            })} />
          <span className="text-muted">colegas de casa (+10% cada)</span>
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!l.splitCost}
            onChange={(e) => edit((x) => {
              x.splitCost = e.target.checked;
              if (e.target.checked && x.percentage === undefined) x.percentage = equalShare(x.roommates ?? 0);
            })} />
          Dividir os custos
        </label>
        {l.splitCost && (
          <label className="flex items-center gap-2">
            <span className="text-muted">Você paga</span>
            <input type="number" inputMode="decimal" min={0} max={100} step="any" aria-label="Porcentagem que você paga"
              className={cx(compact, '!w-24 font-mono')} value={paidPercentage(l)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) edit((x) => { x.percentage = Math.min(100, Math.max(0, n)); });
              }} />
            <span className="text-muted">%</span>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm">
        {chosen.map((c, i) => {
          const q = sr5Data.lifestyleQualities.find((x) => x.id === c.id);
          if (!q) return null;
          return (
            <div key={`${c.id}-${i}`} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{label(q)}</span>
              <span className="text-xs text-muted">{qualityEffect(q)}</span>
              {q.chooseText && (
                <input className={cx(compact, '!w-48')} value={c.extra ?? ''} maxLength={60} placeholder="Qual?"
                  aria-label={`Detalhe de ${label(q)}`}
                  onChange={(e) => edit((x) => { x.qualities![i].extra = e.target.value; })} />
              )}
              <Button variant="ghost" className="!px-2 !py-1" aria-label={`Remover ${label(q)}`}
                onClick={() => edit((x) => { x.qualities!.splice(i, 1); })}>✕</Button>
            </div>
          );
        })}
        <select aria-label="Adicionar qualidade do estilo de vida" className={cx(compact, 'sm:!w-96')} value=""
          onChange={(e) => {
            const id = e.target.value;
            if (id) edit((x) => { x.qualities = [...(x.qualities ?? []), { id }]; });
          }}>
          <option value="">+ Qualidade ou contrato…</option>
          {available.map((q) => <option key={q.id} value={q.id}>{label(q)} ({qualityEffect(q)})</option>)}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Place title="Cidade" value={l.city} options={sr5Data.cities.map((c) => c.name)}
          onChange={(v) => edit((x) => { x.city = v; x.district = ''; x.borough = ''; })} />
        <Place title="Distrito" value={l.district} options={city?.districts.map((x) => x.name) ?? []}
          onChange={(v) => edit((x) => { x.district = v; x.borough = ''; })} />
        <Place title="Bairro" value={l.borough} options={district?.boroughs ?? []}
          onChange={(v) => edit((x) => { x.borough = v; })} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-sm">
        <span>
          <span className="font-mono">{fmtNuyen(Math.round(monthly))}</span><span className="text-muted">/mês</span>
          <span className="text-muted"> · {l.months} {l.months === 1 ? 'mês' : 'meses'} = </span>
          <span className="font-mono font-semibold">{fmtNuyen(lifestyleTotal(monthly, l.months))}</span>
        </span>
        <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => updateDraft((d) => { d.lifestyles.splice(index, 1); })}>
          Remover estilo de vida
        </Button>
      </div>
    </fieldset>
  );
}

export function LifestyleCard({ draft }: { draft: CharacterDraft }) {
  const adjust = lifestyleAdjust(draft);
  const roll = startingNuyenRoll(draft.lifestyles);
  const add = () => updateDraft((d) => {
    d.lifestyles.push({ id: sr5Data.lifestyles.find((x) => x.name === 'Low')?.id ?? sr5Data.lifestyles[0].id, months: 1 });
  });
  return (
    <Card title="Estilo de vida" help={{ text: 'Onde o personagem mora e como vive. Pago por mês; pague pelo menos o primeiro.' }}>
      <div className="flex flex-col gap-3">
        {draft.lifestyles.map((l, i) => (
          <LifestyleForm key={i} index={i} l={l} adjust={adjust} />
        ))}
        <div>
          <Button className="text-sm" onClick={add}>
            {draft.lifestyles.length ? '+ Outro estilo de vida' : '+ Escolher estilo de vida'}
          </Button>
        </div>
        {roll && (
          <p className="text-sm text-muted">
            Dinheiro inicial: <span className="font-mono text-ink">{roll.dice}D6 × {nf(roll.multiplier)}¥</span> (role ao começar a jogar).
          </p>
        )}
        {adjust.metatypePct > 0 && <p className="text-xs text-faint">Seu metatipo paga {adjust.metatypePct}% a mais (já incluído).</p>}
      </div>
    </Card>
  );
}
