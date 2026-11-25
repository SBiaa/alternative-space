'use client';

import { useState } from 'react';
import { advanceGradeAction, saveCareerChoicesAction } from '@/app/fichas/play-actions';
import { gradeCost, spiritAttr } from '@/lib/fichas/sr5/career';
import { type Career as CareerData, type Companion, type CharacterDraft, emptyCareer } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { ledgerTotals } from '@/lib/fichas/sr5/play';
import type { RulesResult } from '@/lib/fichas/sr5/rules';
import { Button, Card, cx, inputClass, Stepper } from '../ui';
import type { PlayEntry } from './types';
import { useAction } from './useAction';

const ATTR_ORDER = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES'] as const;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Evolução em jogo: iniciação, submersão, metamagias, ecos, espíritos e sprites. */
export function Career({ id, draft, result, entries }: { id: string; draft: CharacterDraft; result: RulesResult; entries: PlayEntry[] }) {
  const career: CareerData = { ...emptyCareer(), ...draft.career };
  const { karma } = ledgerTotals(entries);
  const { pending, error, run } = useAction();
  const awakened = (result.attributes.MAG?.value ?? 0) > 0;
  const emerged = (result.attributes.RES?.value ?? 0) > 0;
  const adept = draft.talent === 'adept' || draft.talent === 'mysticAdept';

  const save = (patch: Partial<Pick<CareerData, 'metamagicIds' | 'echoIds' | 'companions'>>) =>
    run(() => saveCareerChoicesAction(id, {
      metamagicIds: career.metamagicIds,
      echoIds: career.echoIds,
      companions: career.companions,
      ...patch,
    }));

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const metas = sr5Data.metamagics.filter((m) => (adept ? m.adept : m.magician) || career.metamagicIds.includes(m.id));
  const [spiritId, setSpiritId] = useState('');
  const spirits = sr5Data.spirits.filter((s) => (s.category === 'Sprites' ? emerged : awakened));

  const setCompanion = (key: string, patch: Partial<Companion>) =>
    save({ companions: career.companions.map((c) => (c.key === key ? { ...c, ...patch } : c)) });

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {(awakened || career.initiationGrade > 0) && (
          <Card title="Iniciação" help={{ text: 'Cada grau custa karma e libera uma metamagia. Para atributos e perícias, use a aba Metas.' }}>
            <p className="text-sm">Grau atual: <strong className="font-mono">{career.initiationGrade}</strong></p>
            {awakened && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted">Próximo grau: {gradeCost(career.initiationGrade + 1)} de karma (você tem {karma})</span>
                <Button className="!py-1 text-sm" disabled={pending || karma < gradeCost(career.initiationGrade + 1)}
                  onClick={() => run(() => advanceGradeAction(id, 'initiation'))}>Subir de grau</Button>
              </div>
            )}
            <fieldset className="mt-3">
              <legend className="mb-1 text-xs text-muted">Metamagias ({career.metamagicIds.length}/{career.initiationGrade})</legend>
              <ul className="flex flex-col gap-1">
                {metas.map((m) => {
                  const on = career.metamagicIds.includes(m.id);
                  return (
                    <li key={m.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={on} disabled={pending || (!on && career.metamagicIds.length >= career.initiationGrade)}
                          onChange={() => save({ metamagicIds: toggle(career.metamagicIds, m.id) })} />
                        {label(m)} <span className="text-xs text-faint">{m.source} p.{m.page}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </Card>
        )}

        {(emerged || career.submersionGrade > 0) && (
          <Card title="Submersão" help={{ text: 'Cada grau custa karma e libera um eco.' }}>
            <p className="text-sm">Grau atual: <strong className="font-mono">{career.submersionGrade}</strong></p>
            {emerged && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted">Próximo grau: {gradeCost(career.submersionGrade + 1)} de karma (você tem {karma})</span>
                <Button className="!py-1 text-sm" disabled={pending || karma < gradeCost(career.submersionGrade + 1)}
                  onClick={() => run(() => advanceGradeAction(id, 'submersion'))}>Subir de grau</Button>
              </div>
            )}
            <fieldset className="mt-3">
              <legend className="mb-1 text-xs text-muted">Ecos ({career.echoIds.length}/{career.submersionGrade})</legend>
              <ul className="flex flex-col gap-1">
                {sr5Data.echoes.map((m) => {
                  const on = career.echoIds.includes(m.id);
                  return (
                    <li key={m.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={on} disabled={pending || (!on && career.echoIds.length >= career.submersionGrade)}
                          onChange={() => save({ echoIds: toggle(career.echoIds, m.id) })} />
                        {label(m)} <span className="text-xs text-faint">{m.source} p.{m.page}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </Card>
        )}

        {!awakened && !emerged && career.initiationGrade === 0 && career.submersionGrade === 0 && (
          <Card title="Iniciação e submersão">
            <p className="text-sm text-muted">Só personagens com Magia (iniciação) ou Ressonância (submersão) usam isto.</p>
          </Card>
        )}
      </div>

      {(awakened || emerged || career.companions.length > 0) && (
        <Card title="Espíritos e sprites" help={{ text: 'Registre o que você conjurou ou compilou. Atributos saem da Força/Nível; serviços são os favores que ainda restam.' }}>
          <div className="mb-3 flex flex-wrap gap-2">
            <select aria-label="Espírito ou sprite" className={cx(inputClass, '!w-64')} value={spiritId} onChange={(e) => setSpiritId(e.target.value)}>
              <option value="">Escolher…</option>
              {spirits.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
            </select>
            <Button className="!py-1 text-sm" disabled={!spiritId || pending}
              onClick={() => { save({ companions: [...career.companions, { key: uid(), spiritId, force: Math.max(1, result.attributes.MAG?.value || result.attributes.RES?.value || 1), services: 1, bound: false }] }); setSpiritId(''); }}>
              + Adicionar
            </Button>
          </div>
          {!career.companions.length && <p className="text-sm text-muted">Nenhum por enquanto.</p>}
          <ul className="flex flex-col gap-3">
            {career.companions.map((c) => {
              const sp = sr5Data.spirits.find((s) => s.id === c.spiritId);
              if (!sp) return null;
              return (
                <li key={c.key} className="rounded-md border border-line p-3 text-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <input aria-label="Nome" placeholder={label(sp)} className={cx(inputClass, '!w-44 !py-1')} defaultValue={c.name ?? ''}
                      onBlur={(e) => e.target.value !== (c.name ?? '') && setCompanion(c.key, { name: e.target.value })} />
                    <span className="text-muted">{label(sp)}</span>
                    <label className="flex items-center gap-1.5 text-xs text-muted">{sp.category === 'Sprites' ? 'Nível' : 'Força'}
                      <Stepper size="sm" label="Força ou nível" value={c.force} min={1} max={12} onChange={(v) => setCompanion(c.key, { force: v })} />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted">serviços
                      <Stepper size="sm" label="Serviços restantes" value={c.services} min={0} max={99} onChange={(v) => setCompanion(c.key, { services: v })} />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" checked={c.bound} onChange={(e) => setCompanion(c.key, { bound: e.target.checked })} />
                      {sp.category === 'Sprites' ? 'registrado' : 'vinculado'}
                    </label>
                    <Button variant="ghost" className="!px-2 !py-0.5" aria-label="Remover"
                      onClick={() => save({ companions: career.companions.filter((x) => x.key !== c.key) })}>✕</Button>
                  </div>
                  <p className="font-mono text-xs text-muted">
                    {ATTR_ORDER.map((a) => [a, spiritAttr(sp.attributes[a], c.force)] as const).filter(([, v]) => v !== null && v > 0)
                      .map(([a, v]) => `${a} ${v}`).join(' · ')}
                    {spiritAttr(sp.initiative, c.force) !== null && ` · INI ${spiritAttr(sp.initiative, c.force)}`}
                  </p>
                  {sp.powers.length > 0 && <p className="mt-1 text-xs text-faint">Poderes: {sp.powers.join(', ')}</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card title="Histórico de evolução">
        {career.improvements.length ? (
          <ul className="divide-y divide-line text-sm">
            {[...career.improvements].reverse().map((i) => (
              <li key={i.key} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>{i.label}{i.from !== undefined && i.to !== undefined ? ` · ${i.from} → ${i.to}` : ''}</span>
                <span className="font-mono text-xs text-muted">{i.karma ? `${i.karma} karma · ` : ''}{new Date(i.at).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nada ainda. Conclua metas de atributo ou perícia na aba Metas e elas aparecem aqui já aplicadas à ficha.</p>
        )}
      </Card>
    </div>
  );
}
