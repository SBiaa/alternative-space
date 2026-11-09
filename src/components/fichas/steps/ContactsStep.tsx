'use client';

import { uid, updateDraft } from '@/lib/fichas/store';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import type { StepProps } from '../wizard/Wizard';
import { BudgetMeter, Button, Card, cx, HelpTip, inputClass, StepIntro, Stepper } from '../ui';

const CONNECTION_HINT = ['', 'só conhece gente do bairro', '', 'tem alcance na cidade', '', '', 'influência regional', '', '', 'gente poderosa', '', '', 'alcance mundial'];

export function ContactsStep({ draft, result }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Contatos">
        Runners vivem de quem conhecem: o fixer que arruma trabalho, o médico que não faz perguntas, o traficante de
        armas. Você tem <strong className="text-ink">Carisma × 3</strong> pontos grátis; passando disso, cada ponto custa 1 de karma.
      </StepIntro>

      <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
        <BudgetMeter label="Pontos de contato" budget={result.budgets.contacts} />
        <BudgetMeter label="Karma" budget={result.budgets.karma} />
      </div>

      <Card
        title="Seus contatos"
        actions={
          <Button className="!py-1 text-sm" onClick={() => updateDraft((d) => {
            d.contacts.push({ key: uid(), name: '', connection: 2, loyalty: 2 });
          })}>
            + Contato
          </Button>
        }
      >
        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-2">
            <span className="text-ink">Conexão</span>
            <HelpTip title="Conexão" help={{ text: 'Quanto poder e alcance o contato tem: de 1 (um conhecido da rua) a 12 (alguém que move corporações).' }} />
          </span>
          <span className="flex items-center gap-2">
            <span className="text-ink">Lealdade</span>
            <HelpTip title="Lealdade" help={{ text: 'Quanto o contato gosta de você: de 1 (só negócios) a 6 (arriscaria a vida por você).' }} />
          </span>
          <span>Cada contato custa Conexão + Lealdade.</span>
        </div>

        {!draft.contacts.length && (
          <p className="text-sm text-muted">Nenhum contato ainda. Um bom começo: um fixer (quem arruma trabalho) e alguém que vende equipamento.</p>
        )}

        <ul className="flex flex-col gap-3">
          {draft.contacts.map((c, i) => (
            <li key={c.key} className="rounded-lg border border-line bg-surface-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label="Nome do contato" className={cx(inputClass, '!w-52 !py-1.5')} value={c.name} placeholder="Nome ou apelido"
                  onChange={(e) => updateDraft((d) => { d.contacts[i].name = e.target.value; })} />
                <select aria-label="Tipo de contato" className={cx(inputClass, '!w-64 !py-1.5')} value={c.archetypeId ?? ''}
                  onChange={(e) => updateDraft((d) => { d.contacts[i].archetypeId = e.target.value || undefined; })}>
                  <option value="">Tipo de contato…</option>
                  {sr5Data.contacts.map((a) => <option key={a.id} value={a.id}>{label(a)}</option>)}
                </select>
                <Button variant="ghost" className="ml-auto !px-2 !py-1" aria-label="Remover contato"
                  onClick={() => updateDraft((d) => { d.contacts.splice(i, 1); })}>✕</Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <span className="text-muted">Conexão</span>
                  <Stepper size="sm" label="conexão" value={c.connection} min={1} max={12} onChange={(v) => updateDraft((d) => { d.contacts[i].connection = v; })} />
                  <span className="text-xs text-faint">{CONNECTION_HINT[c.connection] || ''}</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-muted">Lealdade</span>
                  <Stepper size="sm" label="lealdade" value={c.loyalty} min={1} max={6} onChange={(v) => updateDraft((d) => { d.contacts[i].loyalty = v; })} />
                </label>
                <span className="ml-auto font-mono text-muted">{c.connection + c.loyalty} pts</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
