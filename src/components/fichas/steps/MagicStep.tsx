'use client';

import { useState } from 'react';
import { COMPLEX_FORM_HELP, POWER_HELP, SKILL_GROUP_HELP, SKILL_HELP, SPELL_CATEGORY_HELP, STREAM_HELP, TALENT_HELP, TRADITION_HELP } from '@/lib/fichas/sr5/help';
import { updateDraft } from '@/lib/fichas/store';
import { createEmptyDraft } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import type { Skill, TalentOption } from '@/lib/fichas/sr5/types';
import type { StepProps } from '../wizard/Wizard';
import { BudgetMeter, Button, Card, cx, HelpTip, inputClass, matches, OptionCard, SearchInput, StepIntro, Stepper } from '../ui';
import { talentAt, talentKinds } from './shared';

function talentPerks(t: TalentOption): string[] {
  const out: string[] = [];
  if (t.magic) out.push(`Magia ${t.magic}`);
  if (t.resonance) out.push(`Ressonância ${t.resonance}`);
  if (t.freeSpells) out.push(`${t.freeSpells} magias grátis`);
  if (t.freeComplexForms) out.push(`${t.freeComplexForms} formas complexas grátis`);
  if (t.freeSkills) out.push(`${t.freeSkills.count} perícia${t.freeSkills.count > 1 ? 's' : ''} grátis no nível ${t.freeSkills.rating}`);
  if (t.freeSkillGroup) out.push(`1 grupo grátis no nível ${t.freeSkillGroup.rating}`);
  if (t.key === 'adept' && t.magic) out.push(`${t.magic} pontos de poder`);
  return out;
}

function freeSkillChoices(t: TalentOption): Skill[] {
  const g = t.freeSkills;
  if (!g) return [];
  const active = sr5Data.skills.skills.filter((s) => sr5Data.skills.categories.find((c) => c.name === s.category)?.kind === 'active');
  switch (g.kind) {
    case 'magic': return active.filter((s) => s.category === 'Magical Active');
    case 'resonance': return active.filter((s) => s.category === 'Resonance Active');
    case 'nonMagicActive': return active.filter((s) => s.category !== 'Magical Active' && s.category !== 'Resonance Active');
    case 'specific': return active.filter((s) => g.choices?.includes(s.id));
    default: return active;
  }
}

export function MagicStep({ draft, result }: StepProps) {
  const letter = draft.priorities.talent;
  const talent = talentAt(letter, draft.talent);
  const k = talent?.key;
  const m = draft.magic;
  const isCaster = k === 'magician' || k === 'mysticAdept' || (k === 'aspectedMagician' && m.freeSkillGroupId === 'sorcery');
  const hasMentor = draft.qualities.some((q) => sr5Data.qualities.find((x) => x.id === q.id)?.name === 'Mentor Spirit');

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Magia e Ressonância">
        {letter
          ? `Com prioridade ${letter}, escolha o talento do personagem. Depois, conforme o talento, escolha tradição, magias, poderes ou formas complexas.`
          : 'Escolha antes a prioridade de Magia/Ressonância.'}
      </StepIntro>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {talentKinds().map(({ key, name }) => {
          const a = result.availability.talents[key];
          const t = talentAt(letter, key);
          return (
            <OptionCard
              key={key}
              title={name}
              subtitle={t ? undefined : a ? `Prioridade ${a.letters.join(', ')}` : undefined}
              help={TALENT_HELP[key]}
              selected={draft.talent === key}
              disabled={!a?.ok}
              reason={a?.reason}
              onSelect={() =>
                updateDraft((d) => {
                  if (d.talent !== key) {
                    d.magic = createEmptyDraft().magic;
                    d.special.MAG = { points: 0, karma: 0 };
                    d.special.RES = { points: 0, karma: 0 };
                  }
                  d.talent = key;
                })
              }
            >
              {t && talentPerks(t).length > 0 && <p>{talentPerks(t).join(' · ')}</p>}
              {t && key === 'mundane' && <p>Sem magia; implantes não custam nada mágico.</p>}
            </OptionCard>
          );
        })}
      </div>

      {talent && (k === 'magician' || k === 'mysticAdept' || k === 'aspectedMagician') && (
        <Card title="Tradição" help={{ text: 'A visão de mundo do mago. Define quais atributos resistem ao dreno e que espíritos ele invoca.' }}>
          <div className="grid gap-3 sm:grid-cols-2">
            {sr5Data.traditions.map((t) => (
              <OptionCard key={t.id} title={label(t)} help={TRADITION_HELP[t.name]} selected={m.traditionId === t.id}
                onSelect={() => updateDraft((d) => { d.magic.traditionId = t.id; })}>
                Dreno: {t.drain.replace(/\{(\w+)\}/g, (_, a) => ({ WIL: 'Vontade', LOG: 'Lógica', CHA: 'Carisma', INT: 'Intuição' } as Record<string, string>)[a] ?? a)}
              </OptionCard>
            ))}
          </div>
          <div className="mt-4 text-sm">
            {hasMentor ? (
              <label className="flex flex-wrap items-center gap-3">
                <span className="text-muted">Espírito mentor</span>
                <select className={cx(inputClass, 'max-w-xs')} value={m.mentorId ?? ''}
                  onChange={(e) => updateDraft((d) => { d.magic.mentorId = e.target.value || undefined; })}>
                  <option value="">Escolha…</option>
                  {sr5Data.mentors.map((x) => <option key={x.id} value={x.id}>{label(x)}</option>)}
                </select>
              </label>
            ) : (
              <p className="text-faint">Quer um espírito mentor? Compre a qualidade Espírito Mentor no passo Qualidades.</p>
            )}
          </div>
        </Card>
      )}

      {k === 'adept' && hasMentor && (
        <Card title="Espírito mentor">
          <select className={cx(inputClass, 'max-w-xs')} value={m.mentorId ?? ''}
            onChange={(e) => updateDraft((d) => { d.magic.mentorId = e.target.value || undefined; })}>
            <option value="">Escolha…</option>
            {sr5Data.mentors.map((x) => <option key={x.id} value={x.id}>{label(x)}</option>)}
          </select>
        </Card>
      )}

      {k === 'technomancer' && (
        <Card title="Corrente">
          <div className="grid gap-3 sm:grid-cols-2">
            {sr5Data.streams.map((t) => (
              <OptionCard key={t.id} title={label(t)} help={STREAM_HELP[t.name]} selected={m.streamId === t.id}
                onSelect={() => updateDraft((d) => { d.magic.streamId = t.id; })} />
            ))}
          </div>
        </Card>
      )}

      {talent?.freeSkillGroup && (
        <Card title="Aspecto" help={{ text: 'O Mago de Aspecto domina só um campo da magia. Escolha qual: o grupo vem de graça.' }}>
          <div className="grid gap-3 sm:grid-cols-3">
            {talent.freeSkillGroup.choices.map((gid) => {
              const g = sr5Data.skills.groups.find((x) => x.id === gid);
              return (
                <OptionCard key={gid} title={g ? label(g) : gid} help={SKILL_GROUP_HELP[gid]}
                  subtitle={`Grupo no nível ${talent.freeSkillGroup!.rating}`}
                  selected={m.freeSkillGroupId === gid}
                  onSelect={() => updateDraft((d) => { d.magic.freeSkillGroupId = gid; })} />
              );
            })}
          </div>
        </Card>
      )}

      {talent?.freeSkills && <FreeSkills talent={talent} picks={m.freeSkillIds} />}

      {talent && isCaster && <Spells draft={draft} result={result} />}
      {talent && (k === 'adept' || k === 'mysticAdept') && <Powers draft={draft} result={result} />}
      {k === 'technomancer' && <ComplexForms draft={draft} result={result} />}
    </div>
  );
}

function FreeSkills({ talent, picks }: { talent: TalentOption; picks: string[] }) {
  const g = talent.freeSkills!;
  const choices = freeSkillChoices(talent);
  return (
    <Card title="Perícias gratuitas" help={{ text: 'O talento já vem com algumas perícias treinadas, sem gastar pontos. Você pode subir mais com pontos ou karma no passo Perícias.' }}>
      <p className="mb-3 text-sm text-muted">Escolha {g.count} perícia{g.count > 1 ? 's' : ''}: cada uma começa no nível {g.rating}.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {Array.from({ length: g.count }, (_, i) => (
          <select key={i} aria-label={`Perícia gratuita ${i + 1}`} className={cx(inputClass, 'sm:max-w-64')} value={picks[i] ?? ''}
            onChange={(e) => updateDraft((d) => {
              const next = [...d.magic.freeSkillIds];
              next[i] = e.target.value;
              d.magic.freeSkillIds = next.filter(Boolean);
            })}>
            <option value="">Escolha…</option>
            {choices.map((s) => (
              <option key={s.id} value={s.id} disabled={picks.includes(s.id) && picks[i] !== s.id}>{label(s)}</option>
            ))}
          </select>
        ))}
      </div>
      {picks.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
          {picks.map((id) => {
            const s = sr5Data.skills.skills.find((x) => x.id === id);
            return s ? <li key={id}><span className="text-ink">{label(s)}:</span> {SKILL_HELP[s.name]?.text}</li> : null;
          })}
        </ul>
      )}
    </Card>
  );
}

function Spells({ draft, result }: Omit<StepProps, 'goTo'>) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const chosen = new Set(draft.magic.spellIds);
  const free = result.budgets.freeSpells.total;
  const cats = [...new Map(sr5Data.spells.map((s) => [s.category, s.categoryPt ?? s.category])).entries()];
  const list = sr5Data.spells.filter((s) => (!cat || s.category === cat) && (!q || matches(`${label(s)} ${s.name}`, q)));
  const toggle = (id: string) => updateDraft((d) => {
    d.magic.spellIds = d.magic.spellIds.includes(id) ? d.magic.spellIds.filter((x) => x !== id) : [...d.magic.spellIds, id];
  });
  return (
    <Card title="Magias" help={{ text: 'Feitiços que o personagem sabe lançar. As primeiras são grátis; as demais custam 5 de karma cada. Limite na criação: Magia × 2.' }}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <BudgetMeter label="Magias gratuitas" budget={result.budgets.freeSpells} />
        <div className="text-sm text-muted">
          Escolhidas: <span className="font-mono text-ink">{chosen.size}</span> · limite{' '}
          <span className="font-mono text-ink">{result.attributes.MAG.value * 2}</span>
        </div>
      </div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar magia…" />
        <select aria-label="Categoria de magia" className={cx(inputClass, 'sm:max-w-52')} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {cats.map(([c, pt]) => <option key={c} value={c}>{pt}</option>)}
        </select>
      </div>
      {cat && SPELL_CATEGORY_HELP[cat] && <p className="mb-3 text-sm text-muted">{SPELL_CATEGORY_HELP[cat].text}</p>}
      <ul className="grid max-h-[28rem] grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
        {list.map((s) => {
          const on = chosen.has(s.id);
          const idx = draft.magic.spellIds.indexOf(s.id);
          return (
            <li key={s.id}>
              <label className={cx('flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition',
                on ? 'border-accent/60 bg-accent/[0.06]' : 'border-line hover:border-line-strong')}>
                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="mt-0.5 accent-[var(--color-accent)]" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    {label(s)}
                    <HelpTip help={SPELL_CATEGORY_HELP[s.category]} title={s.categoryPt ?? s.category} />
                  </span>
                  <span className="block text-xs text-faint">{s.categoryPt ?? s.category} · dreno {s.dv}</span>
                </span>
                {on && <span className="shrink-0 text-xs text-muted">{idx < free ? 'grátis' : '5 karma'}</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Powers({ draft, result }: Omit<StepProps, 'goTo'>) {
  const [q, setQ] = useState('');
  const chosen = draft.magic.powers;
  const isMystic = draft.talent === 'mysticAdept';
  const MAG = result.attributes.MAG.value;
  const list = sr5Data.powers.filter((p) => !q || matches(`${label(p)} ${p.name}`, q));
  return (
    <Card title="Poderes de adepto" help={{ text: 'Habilidades que a magia dá ao corpo. Cada uma custa pontos de poder; algumas têm níveis.' }}>
      <div className="mb-4 grid items-center gap-4 sm:grid-cols-2">
        <BudgetMeter label="Pontos de poder" budget={result.budgets.powerPoints} format={(n) => n.toString().replace('.', ',')} />
        {isMystic && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">Comprar pontos (5 karma cada, até {MAG})</span>
            <Stepper label="pontos de poder comprados" value={draft.magic.powerPointsBought} max={MAG}
              onChange={(v) => updateDraft((d) => { d.magic.powerPointsBought = v; })} />
          </div>
        )}
      </div>

      {chosen.length > 0 && (
        <ul className="mb-4 flex flex-col divide-y divide-line rounded-lg border border-line">
          {chosen.map((dp, i) => {
            const p = sr5Data.powers.find((x) => x.id === dp.id);
            if (!p) return null;
            const cost = p.points * (p.levels ? dp.level : 1) + (p.extraPointCost ?? 0);
            return (
              <li key={dp.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">{label(p)}</span>
                {p.levels && (
                  <Stepper size="sm" label={`nível de ${label(p)}`} value={dp.level} min={1} max={p.maxLevels ?? MAG}
                    onChange={(v) => updateDraft((d) => { d.magic.powers[i].level = v; })} />
                )}
                <span className="w-16 text-right font-mono text-muted">{cost.toString().replace('.', ',')} PP</span>
                <Button variant="ghost" className="!px-2 !py-1" aria-label={`Remover ${label(p)}`}
                  onClick={() => updateDraft((d) => { d.magic.powers.splice(i, 1); })}>✕</Button>
              </li>
            );
          })}
        </ul>
      )}

      <SearchInput value={q} onChange={setQ} placeholder="Buscar poder…" />
      <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {list.map((p) => {
          const has = chosen.some((c) => c.id === p.id);
          return (
            <li key={p.id} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">{label(p)} <HelpTip help={POWER_HELP[p.name]} title={label(p)} /></span>
                <span className="block text-xs text-faint">
                  {p.points.toString().replace('.', ',')} PP{p.levels ? ' por nível' : ''}{p.extraPointCost ? ` + ${String(p.extraPointCost).replace('.', ',')}` : ''}
                </span>
              </span>
              <Button className="!px-2 !py-1 text-xs" disabled={has}
                onClick={() => updateDraft((d) => { d.magic.powers.push({ id: p.id, level: 1 }); })}>
                {has ? 'Escolhido' : 'Adicionar'}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ComplexForms({ draft, result }: Omit<StepProps, 'goTo'>) {
  const chosen = new Set(draft.magic.complexFormIds);
  const free = result.budgets.freeComplexForms.total;
  return (
    <Card title="Formas complexas" help={{ text: 'Os “feitiços” do tecnomante na Matriz. As primeiras são grátis; as demais custam 4 de karma. Limite: Ressonância × 2.' }}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <BudgetMeter label="Formas gratuitas" budget={result.budgets.freeComplexForms} />
        <div className="text-sm text-muted">Limite: <span className="font-mono text-ink">{result.attributes.RES.value * 2}</span></div>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {sr5Data.complexForms.map((c) => {
          const on = chosen.has(c.id);
          const idx = draft.magic.complexFormIds.indexOf(c.id);
          return (
            <li key={c.id}>
              <label className={cx('flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm',
                on ? 'border-accent/60 bg-accent/[0.06]' : 'border-line hover:border-line-strong')}>
                <input type="checkbox" checked={on} className="accent-[var(--color-accent)]"
                  onChange={() => updateDraft((d) => {
                    d.magic.complexFormIds = on ? d.magic.complexFormIds.filter((x) => x !== c.id) : [...d.magic.complexFormIds, c.id];
                  })} />
                <span className="flex flex-1 items-center gap-2">{label(c)} <HelpTip help={COMPLEX_FORM_HELP[c.name]} title={label(c)} /></span>
                {on && <span className="text-xs text-muted">{idx < free ? 'grátis' : '4 karma'}</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
