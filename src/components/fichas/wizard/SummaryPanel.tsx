'use client';

import { ATTR_HELP } from '@/lib/fichas/sr5/help';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { ATTR_LABEL, fmtNuyen, type RulesResult } from '@/lib/fichas/sr5/rules';
import type { AttrKey } from '@/lib/fichas/sr5/types';
import { BudgetMeter, cx } from '../ui';

const SHOWN: AttrKey[] = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES', 'ESS'];

export function SummaryPanel({ draft, result }: { draft: CharacterDraft; result: RulesResult }) {
  const b = result.budgets;
  const d = result.derived;
  const metatype = sr5Data.metatypes.find((m) => m.id === draft.metatypeId);
  const talent = draft.talent
    ? Object.values(sr5Data.priorities.rows).flatMap((r) => r.talents).find((t) => t.key === draft.talent)
    : undefined;
  const k = draft.talent;
  const errors = result.issues.filter((i) => i.severity === 'error').length;
  const warnings = result.issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div>
        <div className="font-display text-xl font-semibold leading-tight">
          {draft.concept.alias || draft.concept.name || 'Sem nome'}
        </div>
        <div className="text-muted">
          {[...new Set([metatype && label(metatype), talent && label(talent).replace(/\s*-.*$/, ''), draft.concept.role])]
            .filter(Boolean)
            .join(' · ') || 'Comece pelo conceito'}
        </div>
        <div className="mt-2 flex gap-3 text-xs">
          <span className={cx(errors ? 'text-danger' : 'text-ok')}>
            {errors ? `${errors} ${errors === 1 ? 'erro' : 'erros'}` : 'sem erros'}
          </span>
          {warnings > 0 && <span className="text-warn">{warnings} {warnings === 1 ? 'aviso' : 'avisos'}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Orçamentos</h4>
        <BudgetMeter label="Karma" budget={b.karma} />
        <BudgetMeter label="Nuyen" budget={b.nuyen} format={fmtNuyen} />
        <BudgetMeter label="Pontos de atributo" budget={b.attributes} />
        <BudgetMeter label="Pontos especiais" budget={b.special} />
        <BudgetMeter label="Pontos de perícia" budget={b.skills} />
        {b.skillGroups.total > 0 && <BudgetMeter label="Grupos de perícia" budget={b.skillGroups} />}
        <BudgetMeter label="Conhecimento" budget={b.knowledge} />
        <BudgetMeter label="Contatos" budget={b.contacts} />
        {(k === 'adept' || k === 'mysticAdept') && <BudgetMeter label="Pontos de poder" budget={b.powerPoints} />}
        {b.freeSpells.total > 0 && <BudgetMeter label="Magias gratuitas" budget={b.freeSpells} />}
        {b.freeComplexForms.total > 0 && <BudgetMeter label="Formas complexas gratuitas" budget={b.freeComplexForms} />}
      </div>

      {metatype && (
        <>
          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Atributos</h4>
            <div className="grid grid-cols-4 gap-1.5">
              {SHOWN.filter((a) => (a !== 'MAG' || d.astralInitiative || result.attributes.MAG.value) && (a !== 'RES' || result.attributes.RES.value))
                .map((a) => (
                  <div key={a} className="rounded-md border border-line bg-surface-2 px-2 py-1 text-center" title={ATTR_HELP[a].text}>
                    <div className="text-[10px] uppercase tracking-wider text-faint">{ATTR_LABEL[a].slice(0, 3)}</div>
                    <div className={cx('font-mono text-base tabular-nums', result.attributes[a].atMax && 'text-accent')}>
                      {a === 'ESS' ? result.attributes.ESS.value.toFixed(2).replace('.', ',') : result.attributes[a].value}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Em jogo</h4>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
              <Stat label="Limites (F/M/S)" value={`${d.limits.physical} / ${d.limits.mental} / ${d.limits.social}`} />
              <Stat label="Iniciativa" value={`${d.initiative.base} + ${d.initiative.dice}D6`} />
              {d.astralInitiative && <Stat label="Iniciativa astral" value={`${d.astralInitiative.base} + ${d.astralInitiative.dice}D6`} />}
              {d.matrixInitiative && <Stat label="Iniciativa na Matriz (quente)" value={`${d.matrixInitiative.hotSim.base} + ${d.matrixInitiative.hotSim.dice}D6`} />}
              <Stat label="Monitor físico" value={`${d.monitors.physical} caixas`} />
              <Stat label="Monitor de atordoamento" value={`${d.monitors.stun} caixas`} />
              <Stat label="Compostura" value={d.composure} />
              <Stat label="Julgar intenções" value={d.judgeIntentions} />
              <Stat label="Memória" value={d.memory} />
              {d.drainResist !== undefined && <Stat label="Resistir a dreno" value={d.drainResist} />}
            </dl>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label: l, value }: { label: string; value: string | number }) {
  return (
    <>
      <dt className="text-muted">{l}</dt>
      <dd className="text-right font-mono tabular-nums">{value}</dd>
    </>
  );
}

