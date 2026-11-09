'use client';

import { useState } from 'react';
import { KNOWLEDGE_CATEGORY_HELP, SKILL_CATEGORY_HELP, SKILL_GROUP_HELP, SKILL_HELP } from '@/lib/fichas/sr5/help';
import { uid, updateDraft } from '@/lib/fichas/store';
import type { DraftSkill, KnowledgeCategory } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { ATTR_LABEL } from '@/lib/fichas/sr5/rules';
import type { Skill } from '@/lib/fichas/sr5/types';
import type { StepProps } from '../wizard/Wizard';
import { BudgetMeter, Button, Card, cx, HelpTip, inputClass, matches, SearchInput, StepIntro, Stepper } from '../ui';

const ACTIVE_CATS = sr5Data.skills.categories.filter((c) => c.kind === 'active');
const KNOW_CATS = sr5Data.skills.categories.filter((c) => c.kind === 'knowledge');

function patchSkill(id: string, patch: Partial<DraftSkill>) {
  updateDraft((d) => {
    let s = d.skills.find((x) => x.id === id);
    if (!s) {
      s = { id, points: 0, karma: 0 };
      d.skills.push(s);
    }
    Object.assign(s, patch);
    if (!s.points && !s.karma && !s.specialization) d.skills = d.skills.filter((x) => x.id !== id);
  });
}

export function SkillsStep({ draft, result }: StepProps) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const b = result.budgets;

  const visible = sr5Data.skills.skills.filter((s) => {
    if (cat && s.category !== cat) return false;
    if (q && !matches(`${label(s)} ${s.name}`, q)) return false;
    if (onlyMine && !(result.skillRatings[s.id] > 0) && !draft.skills.some((x) => x.id === s.id)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Perícias">
        Perícias são o que o personagem sabe fazer. Nível 1 é o básico, 3 é competente, 6 é elite. Grupos compram
        várias perícias relacionadas de uma vez. Conhecimentos (gangues, história, idiomas) têm pontos próprios e de graça.
      </StepIntro>

      <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4">
        <BudgetMeter label="Pontos de perícia" budget={b.skills} />
        <BudgetMeter label="Pontos de grupo" budget={b.skillGroups} />
        <BudgetMeter label="Conhecimento" budget={b.knowledge} />
        <BudgetMeter label="Karma" budget={b.karma} />
      </div>

      {b.skillGroups.total > 0 && <Groups draft={draft} result={result} />}

      <Card title="Perícias ativas">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar perícia…" />
          <select aria-label="Categoria" className={cx(inputClass, 'sm:max-w-56')} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {ACTIVE_CATS.map((c) => <option key={c.name} value={c.name}>{label(c)}</option>)}
          </select>
          <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="accent-[var(--color-accent)]" />
            Só as minhas
          </label>
        </div>
        <p className="mb-3 text-xs text-faint">Em cada linha: pontos de perícia, karma e o nível final. Perícias gratuitas e grupos já entram no nível.</p>
        {ACTIVE_CATS.filter((c) => visible.some((s) => s.category === c.name)).map((c) => (
          <div key={c.name} className="mb-5 last:mb-0">
            <h4 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
              {label(c)} <HelpTip help={SKILL_CATEGORY_HELP[c.name]} title={label(c)} />
            </h4>
            <div className="flex flex-col divide-y divide-line">
              {visible.filter((s) => s.category === c.name).map((s) => (
                <SkillRow key={s.id} skill={s} draft={draft} result={result} />
              ))}
            </div>
          </div>
        ))}
        {!visible.length && <p className="text-sm text-muted">Nenhuma perícia encontrada.</p>}
      </Card>

      <Knowledge draft={draft} />
    </div>
  );
}

function SkillRow({ skill: s, draft, result }: { skill: Skill } & Pick<StepProps, 'draft' | 'result'>) {
  const entry = draft.skills.find((x) => x.id === s.id) ?? { id: s.id, points: 0, karma: 0 };
  const rating = result.skillRatings[s.id] ?? 0;
  const isFree = draft.magic.freeSkillIds.includes(s.id);
  const groupRating = s.groupId ? result.groupRatings[s.groupId] ?? 0 : 0;
  const block = result.availability.skills[s.id];
  const group = s.groupId ? sr5Data.skills.groups.find((g) => g.id === s.groupId) : undefined;
  const [specOpen, setSpecOpen] = useState(!!entry.specialization);
  const touched = rating > 0 || entry.specialization;

  return (
    <div className={cx('py-2', !block.ok && !touched && 'opacity-55')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-48 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
            {label(s)}
            <HelpTip help={SKILL_HELP[s.name]} title={label(s)} />
            <span className="text-xs font-normal text-faint">{ATTR_LABEL[s.attribute]}</span>
            {isFree && <span className="rounded bg-accent/15 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">grátis</span>}
            {groupRating > 0 && group && (
              <span className="rounded bg-surface-3 px-1.5 text-[10px] uppercase tracking-wider text-muted">grupo {label(group)} {groupRating}</span>
            )}
          </div>
          {!block.ok && <div className="text-xs text-warn">⊘ {block.reason}</div>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Stepper size="sm" label={`pontos em ${label(s)}`} value={entry.points} max={7}
            disabled={!block.ok && !entry.points} onChange={(v) => patchSkill(s.id, { points: v })} />
          <Stepper size="sm" label={`karma em ${label(s)}`} value={entry.karma} max={7}
            disabled={!block.ok && !entry.karma} onChange={(v) => patchSkill(s.id, { karma: v })} />
        </div>
        <div className="w-8 text-right font-mono text-lg tabular-nums">
          <span className={rating > 0 ? 'text-ink' : 'text-faint'}>{rating}</span>
        </div>
      </div>
      {rating > 0 && (
        <div className="mt-1.5">
          {!specOpen ? (
            <button type="button" className="text-xs text-muted hover:text-accent" onClick={() => setSpecOpen(true)}>
              + especialização
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted">Especialização</span>
              <input
                list={`specs-${s.id}`}
                aria-label={`Especialização em ${label(s)}`}
                className={cx(inputClass, '!w-48 !py-1 !text-xs')}
                value={entry.specialization?.name ?? ''}
                placeholder="Ex.: uma arma, um lugar…"
                onChange={(e) => patchSkill(s.id, {
                  specialization: e.target.value ? { name: e.target.value, paidWith: entry.specialization?.paidWith ?? 'points' } : undefined,
                })}
              />
              <datalist id={`specs-${s.id}`}>
                {s.specs.map((sp) => <option key={sp.name} value={label(sp)} />)}
              </datalist>
              {entry.specialization && (
                <select aria-label="Pagar com" className={cx(inputClass, '!w-auto !py-1 !text-xs')}
                  value={entry.specialization.paidWith}
                  onChange={(e) => patchSkill(s.id, { specialization: { ...entry.specialization!, paidWith: e.target.value as 'points' | 'karma' } })}>
                  <option value="points">1 ponto de perícia</option>
                  <option value="karma">7 de karma</option>
                </select>
              )}
              <button type="button" className="text-muted hover:text-danger" aria-label="Remover especialização"
                onClick={() => { patchSkill(s.id, { specialization: undefined }); setSpecOpen(false); }}>✕</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Groups({ draft, result }: Pick<StepProps, 'draft' | 'result'>) {
  const set = (id: string, field: 'points' | 'karma', v: number) =>
    updateDraft((d) => {
      let g = d.skillGroups.find((x) => x.id === id);
      if (!g) {
        g = { id, points: 0, karma: 0 };
        d.skillGroups.push(g);
      }
      g[field] = v;
      if (!g.points && !g.karma) d.skillGroups = d.skillGroups.filter((x) => x.id !== id);
    });
  return (
    <Card title="Grupos de perícias" help={{ text: 'Um grupo sobe todas as perícias dele juntas. Bom custo-benefício, mas depois só dá para subir uma delas sozinha com karma, e especializar desfaz o grupo.' }}>
      <div className="grid grid-cols-1 gap-x-8 gap-y-1 2xl:grid-cols-2">
        {sr5Data.skills.groups.map((g) => {
          const e = draft.skillGroups.find((x) => x.id === g.id) ?? { points: 0, karma: 0 };
          const a = result.availability.skills[`group:${g.id}`];
          const rating = result.groupRatings[g.id] ?? 0;
          const members = g.skillIds.map((id) => sr5Data.skills.skills.find((s) => s.id === id)).filter(Boolean).map((s) => label(s!));
          return (
            <div key={g.id} className={cx('flex min-w-0 flex-wrap items-center gap-3 border-b border-line py-2', !a.ok && !rating && 'opacity-50')}>
              <div className="min-w-48 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">{label(g)} <HelpTip help={SKILL_GROUP_HELP[g.id]} title={label(g)} /></div>
                <div className="truncate text-xs text-faint" title={members.join(', ')}>{a.ok ? members.join(', ') : `⊘ ${a.reason}`}</div>
              </div>
              <Stepper size="sm" label={`pontos em ${label(g)}`} value={e.points} max={6} disabled={!a.ok && !e.points} onChange={(v) => set(g.id, 'points', v)} />
              <Stepper size="sm" label={`karma em ${label(g)}`} value={e.karma} max={6} disabled={!a.ok && !e.karma} onChange={(v) => set(g.id, 'karma', v)} />
              <span className="w-6 text-right font-mono tabular-nums">{rating}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Knowledge({ draft }: Pick<StepProps, 'draft'>) {
  const add = (native: boolean) =>
    updateDraft((d) => {
      d.knowledge.push({ key: uid(), name: '', category: native ? 'Language' : 'Street', native, points: native ? 0 : 1, karma: 0 });
    });
  return (
    <Card
      title="Conhecimentos e idiomas"
      help={{ text: 'Coisas que o personagem sabe. Os pontos valem (Intuição + Lógica) × 2 e não competem com as perícias ativas. O idioma nativo é de graça.' }}
      actions={
        <div className="flex gap-2">
          <Button className="!py-1 text-xs" onClick={() => add(true)}>+ Idioma nativo</Button>
          <Button className="!py-1 text-xs" onClick={() => add(false)}>+ Conhecimento</Button>
        </div>
      }
    >
      <datalist id="knowledge-suggestions">
        {sr5Data.skills.knowledgeSuggestions.map((k) => <option key={k.id} value={label(k)} />)}
      </datalist>
      {!draft.knowledge.length && (
        <p className="text-sm text-muted">Comece pelo idioma nativo e por algo que o personagem conhece das ruas.</p>
      )}
      <ul className="flex flex-col divide-y divide-line">
        {draft.knowledge.map((k, i) => (
          <li key={k.key} className="flex flex-wrap items-center gap-2 py-2">
            <input aria-label="Nome do conhecimento" list="knowledge-suggestions" className={cx(inputClass, '!w-56 !py-1.5')}
              value={k.name} placeholder={k.native ? 'Ex.: Português' : 'Ex.: Gangues de Seattle'}
              onChange={(e) => updateDraft((d) => { d.knowledge[i].name = e.target.value; })} />
            {k.native ? (
              <span className="rounded bg-accent/15 px-2 py-1 text-xs text-accent">idioma nativo · grátis</span>
            ) : (
              <>
                <select aria-label="Tipo" className={cx(inputClass, '!w-40 !py-1.5')} value={k.category}
                  onChange={(e) => updateDraft((d) => { d.knowledge[i].category = e.target.value as KnowledgeCategory; })}>
                  {KNOW_CATS.map((c) => <option key={c.name} value={c.name}>{label(c)}</option>)}
                </select>
                <HelpTip help={KNOWLEDGE_CATEGORY_HELP[k.category]} title={label(KNOW_CATS.find((c) => c.name === k.category) ?? { name: k.category })} />
                <Stepper size="sm" label="pontos" value={k.points} max={6} onChange={(v) => updateDraft((d) => { d.knowledge[i].points = v; })} />
                <Stepper size="sm" label="karma" value={k.karma} max={6} onChange={(v) => updateDraft((d) => { d.knowledge[i].karma = v; })} />
                <span className="w-6 text-right font-mono">{k.points + k.karma}</span>
              </>
            )}
            <Button variant="ghost" className="ml-auto !px-2 !py-1" aria-label="Remover"
              onClick={() => updateDraft((d) => { d.knowledge.splice(i, 1); })}>✕</Button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-faint">Colunas: pontos de conhecimento, karma e nível final.</p>
    </Card>
  );
}
