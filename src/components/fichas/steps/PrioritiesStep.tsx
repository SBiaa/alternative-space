'use client';

import { PRIORITY_HELP } from '@/lib/fichas/sr5/help';
import { updateDraft } from '@/lib/fichas/store';
import { PRIORITY_CATEGORIES } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { PRIORITY_LABEL } from '@/lib/fichas/sr5/rules';
import type { PriorityCategory, PriorityLetter } from '@/lib/fichas/sr5/types';
import type { StepProps } from '../wizard/Wizard';
import { cx, HelpTip, StepIntro } from '../ui';
import { assignPriority, LETTERS, nf, shortTalent } from './shared';

function cellText(cat: PriorityCategory, l: PriorityLetter): string[] {
  const row = sr5Data.priorities.rows[l];
  switch (cat) {
    case 'metatype':
      return row.metatypes.map((m) => {
        const mt = sr5Data.metatypes.find((x) => x.id === m.metatypeId);
        return `${mt ? label(mt) : '?'} (${m.specialPoints})`;
      });
    case 'talent':
      return row.talents.map((t) => {
        const v = t.magic ?? t.resonance;
        return v ? `${shortTalent(t)} ${v}` : shortTalent(t);
      });
    case 'attributes':
      return [`${row.attributePoints} pontos`];
    case 'skills':
      return [`${row.skillPoints} pontos`, row.skillGroupPoints ? `${row.skillGroupPoints} em grupos` : 'sem grupos'];
    case 'resources':
      return [`${nf(row.resources.standard)}¥`];
  }
}

export function PrioritiesStep({ draft }: StepProps) {
  const p = draft.priorities;
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Prioridades">
        Coloque as cinco áreas em ordem de importância. <strong className="text-ink">A</strong> é a mais forte,{' '}
        <strong className="text-ink">E</strong> a mais fraca, e cada letra só pode ser usada uma vez. Clique numa
        célula para escolher; se a letra já estiver em outra linha, as duas trocam de lugar.
      </StepIntro>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-44 p-3 text-left text-xs font-medium uppercase tracking-wider text-faint">Área</th>
              {LETTERS.map((l) => (
                <th key={l} className="p-3 text-center font-display text-lg text-muted">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRIORITY_CATEGORIES.map((cat) => (
              <tr key={cat} className="border-t border-line">
                <th scope="row" className="p-3 text-left align-top font-normal">
                  <span className="flex items-center gap-2 font-display font-semibold">
                    {PRIORITY_LABEL[cat]}
                    <HelpTip help={PRIORITY_HELP[cat]} title={PRIORITY_LABEL[cat]} />
                  </span>
                  <span className="text-xs text-muted">{p[cat] ? `Prioridade ${p[cat]}` : 'Escolha uma letra'}</span>
                </th>
                {LETTERS.map((l) => {
                  const selected = p[cat] === l;
                  const takenBy = !selected && (Object.keys(p) as PriorityCategory[]).find((c) => p[c] === l);
                  return (
                    <td key={l} className="p-1.5 align-top">
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${PRIORITY_LABEL[cat]}: prioridade ${l}`}
                        onClick={() => updateDraft((d) => { d.priorities = assignPriority(d.priorities, cat, l); })}
                        className={cx(
                          'flex h-full min-h-16 w-full flex-col items-start gap-0.5 rounded-lg border p-2 text-left text-xs transition',
                          selected
                            ? 'border-accent bg-accent/10 text-ink'
                            : takenBy
                              ? 'border-transparent text-faint hover:border-line-strong'
                              : 'border-transparent text-muted hover:border-line-strong hover:bg-surface-2',
                        )}
                      >
                        {cellText(cat, l).map((t) => <span key={t}>{t}</span>)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 text-sm text-muted sm:grid-cols-2">
        <p>
          <span className="text-ink">Metatipo:</span> o número entre parênteses são os pontos especiais, que vão para
          Trunfo, Magia ou Ressonância.
        </p>
        <p>
          <span className="text-ink">Magia/Ressonância:</span> o número é o valor inicial de Magia (ou Ressonância). Na
          letra E só existe Mundano.
        </p>
      </div>
    </div>
  );
}
