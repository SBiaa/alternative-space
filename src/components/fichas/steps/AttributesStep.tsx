'use client';

import { ATTR_HELP } from '@/lib/fichas/sr5/help';
import { updateDraft } from '@/lib/fichas/store';
import type { CoreAttr, SpecialAttr } from '@/lib/fichas/sr5/character';
import { ATTR_LABEL, type AttributeState } from '@/lib/fichas/sr5/rules';
import type { StepProps } from '../wizard/Wizard';
import { BudgetMeter, Card, cx, HelpTip, StepIntro, Stepper } from '../ui';

const PHYS: CoreAttr[] = ['BOD', 'AGI', 'REA', 'STR'];
const MENT: CoreAttr[] = ['CHA', 'INT', 'LOG', 'WIL'];

export function AttributesStep({ draft, result }: StepProps) {
  if (!draft.metatypeId) {
    return (
      <StepIntro title="Atributos">Escolha um metatipo primeiro: é ele que define os limites de cada atributo.</StepIntro>
    );
  }
  const k = draft.talent;
  const specials: SpecialAttr[] = ['EDG'];
  if (result.attributes.MAG.min > 0) specials.push('MAG');
  if (result.attributes.RES.min > 0) specials.push('RES');

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Atributos">
        Cada atributo começa no mínimo do seu metatipo. Use os <strong className="text-ink">pontos</strong> da prioridade
        para subir; se faltar, dá para usar <strong className="text-ink">karma</strong> (custa novo nível × 5). Só um
        atributo físico ou mental pode chegar ao máximo na criação.
      </StepIntro>

      <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3">
        <BudgetMeter label="Pontos de atributo" budget={result.budgets.attributes} />
        <BudgetMeter label="Pontos especiais" budget={result.budgets.special} />
        <BudgetMeter label="Karma" budget={result.budgets.karma} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Físicos">
          <AttrTable keys={PHYS} draft={draft} states={result.attributes} />
        </Card>
        <Card title="Mentais">
          <AttrTable keys={MENT} draft={draft} states={result.attributes} />
        </Card>
      </div>

      <Card title="Especiais">
        <p className="mb-3 text-sm text-muted">
          Estes usam os <strong className="text-ink">pontos especiais</strong> do metatipo.
          {k === 'mundane' || !k ? ' Personagens mundanos só têm Trunfo.' : ''}
          {result.attributes.MAG.min > 0 && ` Magia começa em ${result.attributes.MAG.min} pelo seu talento.`}
          {result.attributes.RES.min > 0 && ` Ressonância começa em ${result.attributes.RES.min} pelo seu talento.`}
        </p>
        <AttrTable keys={specials} draft={draft} states={result.attributes} special />
      </Card>
    </div>
  );
}

function AttrTable({
  keys,
  draft,
  states,
  special,
}: {
  keys: (CoreAttr | SpecialAttr)[];
  draft: StepProps['draft'];
  states: Record<string, AttributeState>;
  special?: boolean;
}) {
  return (
    <div className="flex flex-col divide-y divide-line">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_2rem] items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wider text-faint">
        <span>Atributo</span>
        <span className="w-[5.75rem] text-center">{special ? 'Pts. especiais' : 'Pontos'}</span>
        <span className="w-[5.75rem] text-center">Karma</span>
        <span className="text-right">Valor</span>
      </div>
      {keys.map((key) => {
        const st = states[key];
        const alloc = special ? draft.special[key as SpecialAttr] : draft.attributes[key as CoreAttr];
        const set = (field: 'points' | 'karma', v: number) =>
          updateDraft((d) => {
            const target = special ? d.special[key as SpecialAttr] : d.attributes[key as CoreAttr];
            target[field] = v;
          });
        const room = st.max - st.min;
        return (
          <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto_auto_2rem] items-center gap-2 sm:gap-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                {ATTR_LABEL[key]}
                <HelpTip help={ATTR_HELP[key]} title={ATTR_LABEL[key]} />
              </div>
              <div className="text-xs text-faint">
                {st.min} a {st.max}
                {st.karma > 0 && <span className="text-accent-2"> · {st.karma} de karma</span>}
              </div>
            </div>
            <Stepper size="sm" label={`pontos em ${ATTR_LABEL[key]}`} value={alloc.points} max={room} onChange={(v) => set('points', v)} />
            <Stepper size="sm" label={`karma em ${ATTR_LABEL[key]}`} value={alloc.karma} max={room} onChange={(v) => set('karma', v)} />
            <div className="text-right">
              <span className={cx(
                'font-mono text-xl tabular-nums',
                st.value > st.max ? 'text-danger' : st.atMax ? 'text-accent' : 'text-ink',
              )}>
                {st.value}
              </span>
              {st.atMax && st.value <= st.max && <div className="text-[10px] uppercase tracking-wider text-accent">máx.</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

