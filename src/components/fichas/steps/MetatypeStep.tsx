'use client';

import { METATYPE_HELP } from '@/lib/fichas/sr5/help';
import { updateDraft } from '@/lib/fichas/store';
import { CORE_ATTRS } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { ATTR_LABEL } from '@/lib/fichas/sr5/rules';
import type { StepProps } from '../wizard/Wizard';
import { OptionCard, StepIntro } from '../ui';

export function MetatypeStep({ draft, result }: StepProps) {
  const avail = result.availability.metatypes;
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Metatipo">
        A metaraça define os limites dos atributos e traz algumas habilidades naturais.
        {draft.priorities.metatype
          ? ` Com prioridade ${draft.priorities.metatype} em Metatipo, estas são as opções.`
          : ' Escolha antes a prioridade de Metatipo.'}
      </StepIntro>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sr5Data.metatypes.map((m) => {
          const a = avail[m.id];
          const notable = [...CORE_ATTRS, 'EDG' as const].filter(
            (k) => m.attributes[k].min !== 1 || m.attributes[k].max !== 6,
          );
          const racial = m.racialQualityIds
            .map((id) => sr5Data.qualities.find((q) => q.id === id))
            .filter(Boolean)
            .map((q) => label(q!));
          return (
            <OptionCard
              key={m.id}
              title={label(m)}
              subtitle={a.ok ? `${a.specialPoints} pontos especiais` : `Prioridade ${a.letters.join(', ')}`}
              help={METATYPE_HELP[m.name]}
              selected={draft.metatypeId === m.id}
              disabled={!a.ok}
              reason={a.reason}
              onSelect={() => updateDraft((d) => { d.metatypeId = m.id; })}
            >
              <ul className="flex flex-col gap-1">
                {notable.length ? (
                  notable.map((k) => (
                    <li key={k} className="flex justify-between">
                      <span>{ATTR_LABEL[k]}</span>
                      <span className="font-mono text-ink">{m.attributes[k].min}–{m.attributes[k].max}</span>
                    </li>
                  ))
                ) : (
                  <li>Todos os atributos de 1 a 6</li>
                )}
              </ul>
              {(racial.length > 0 || m.bonus.reach) && (
                <p className="mt-2 text-xs">
                  {[...racial, m.bonus.reach ? `+${m.bonus.reach} de alcance` : null, m.bonus.armor ? `+${m.bonus.armor} de armadura natural` : null]
                    .filter(Boolean).join(' · ')}
                </p>
              )}
              {m.bonus.lifestyleCostPct ? (
                <p className="mt-1 text-xs text-faint">Estilo de vida custa {m.bonus.lifestyleCostPct}% a mais.</p>
              ) : null}
            </OptionCard>
          );
        })}
      </div>
    </div>
  );
}
