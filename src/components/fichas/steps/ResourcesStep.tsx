'use client';

import { useState } from 'react';
import { GEAR_KIND_HELP, GRADE_HELP, LIFESTYLE_HELP } from '@/lib/fichas/sr5/help';
import { uid, updateDraft } from '@/lib/fichas/store';
import type { DraftGear, GearKind, WareGrade } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { evalExpr, fmtNuyen, WARE_GRADES } from '@/lib/fichas/sr5/rules';
import type { Augmentation, GearItem } from '@/lib/fichas/sr5/types';
import type { StepProps } from '../wizard/Wizard';
import { BudgetMeter, Button, Card, cx, HelpTip, inputClass, matches, SearchInput, StepIntro, Stepper } from '../ui';
import { fmtEss, nf } from './shared';

const KINDS: { key: GearKind; title: string; list: GearItem[] }[] = [
  { key: 'weapon', title: 'Armas', list: sr5Data.weapons },
  { key: 'armor', title: 'Armaduras', list: sr5Data.armor },
  { key: 'cyberware', title: 'Ciberware', list: sr5Data.cyberware },
  { key: 'bioware', title: 'Bioware', list: sr5Data.bioware },
  { key: 'gear', title: 'Equipamento', list: sr5Data.gear },
];

const isWare = (k: GearKind) => k === 'cyberware' || k === 'bioware';

function maxRating(item: GearItem | Augmentation): number | undefined {
  return ('maxRating' in item && item.maxRating) || item.rating || undefined;
}

/** Preço/disp./Essência para exibir, já com nível e grau. */
function line(g: Pick<DraftGear, 'kind' | 'rating' | 'grade' | 'customCost'>, item: GearItem | Augmentation) {
  const vars = { rating: g.rating ?? 1 };
  const grade = isWare(g.kind) ? WARE_GRADES[g.grade ?? 'standard'] : WARE_GRADES.standard;
  const cost = item.cost.value ?? evalExpr(item.cost.raw, vars) ?? g.customCost ?? null;
  const avail = item.avail.value ?? evalExpr(item.avail.raw.replace(/[RF]$/, ''), vars);
  const restr = item.avail.restriction ?? item.avail.raw.match(/[RF]\)?$/)?.[0]?.replace(')', '') ?? '';
  const ess = 'essence' in item ? (item.essence.value ?? evalExpr(item.essence.raw, vars) ?? 0) * grade.ess : 0;
  return {
    cost: cost === null ? null : Math.round(cost * grade.cost),
    avail: avail === null ? '?' : `${avail + grade.avail}${restr}`,
    ess,
  };
}

export function ResourcesStep({ draft, result }: StepProps) {
  const [kind, setKind] = useState<GearKind>('weapon');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const current = KINDS.find((k) => k.key === kind)!;
  const cats = [...new Map(current.list.map((i) => [i.category, i.categoryPt ?? i.category])).entries()];
  // Itens compráveis primeiro; "Essence Hole" e afins (sem página no livro) são internos do Chummer.
  const items = current.list
    .filter((i) => i.page > 0 && (!cat || i.category === cat) && (!q || matches(`${label(i)} ${i.name}`, q)))
    .map((item) => ({ item, rare: (Number.parseInt(line({ kind, rating: 1 }, item).avail, 10) || 0) > 12 }))
    .sort((a, b) => Number(a.rare) - Number(b.rare))
    .map((x) => x.item)
    .slice(0, 60);
  const lifestylePct = sr5Data.metatypes.find((m) => m.id === draft.metatypeId)?.bonus.lifestyleCostPct ?? 0;

  const add = (item: GearItem) =>
    updateDraft((d) => {
      d.gear.push({
        key: uid(),
        kind,
        itemId: item.id,
        qty: 1,
        ...(maxRating(item) || item.cost.value === null ? { rating: 1 } : {}),
        ...(isWare(kind) ? { grade: 'standard' as WareGrade } : {}),
      });
    });

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Recursos">
        Hora das compras. O dinheiro vem da prioridade de Recursos e você pode trocar até 10 de karma por 2.000¥ cada.
        Itens com disponibilidade acima de 12 não podem ser comprados na criação, e no fim só 5.000¥ sobram para o jogo.
      </StepIntro>

      <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3">
        <BudgetMeter label="Nuyen" budget={result.budgets.nuyen} format={fmtNuyen} />
        <BudgetMeter label="Karma" budget={result.budgets.karma} />
        <div className="text-sm">
          <div className="text-xs text-muted">Essência</div>
          <div className={cx('font-mono text-lg', result.derived.essence < 6 ? 'text-accent-2' : 'text-ink')}>{fmtEss(result.derived.essence)}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Karma em nuyen" help={{ text: 'Cada ponto de karma vira 2.000¥. Útil para quem quer mais equipamento; o karma faz falta depois para evoluir.' }}>
          <div className="flex items-center gap-4 text-sm">
            <Stepper label="karma convertido" value={draft.karmaToNuyen} max={10} onChange={(v) => updateDraft((d) => { d.karmaToNuyen = v; })} />
            <span className="text-muted">= {fmtNuyen(draft.karmaToNuyen * 2000)}</span>
          </div>
        </Card>

        <Card title="Estilo de vida" help={{ text: 'Onde o personagem mora e como vive. Pago por mês; pague pelo menos o primeiro.' }}>
          {draft.lifestyles.map((l, i) => {
            const ls = sr5Data.lifestyles.find((x) => x.id === l.id);
            return (
              <div key={i} className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <select aria-label="Estilo de vida" className={cx(inputClass, '!w-48 !py-1.5')} value={l.id}
                  onChange={(e) => updateDraft((d) => { d.lifestyles[i].id = e.target.value; })}>
                  {sr5Data.lifestyles.map((x) => (
                    <option key={x.id} value={x.id}>{label(x)} — {nf(Math.round(x.cost * (1 + lifestylePct / 100)))}¥/mês</option>
                  ))}
                </select>
                {ls && <HelpTip help={LIFESTYLE_HELP[ls.name]} title={label(ls)} />}
                <Stepper size="sm" label="meses" value={l.months} min={1} max={12} onChange={(v) => updateDraft((d) => { d.lifestyles[i].months = v; })} />
                <span className="text-muted">meses</span>
                <Button variant="ghost" className="!px-2 !py-1" aria-label="Remover estilo de vida"
                  onClick={() => updateDraft((d) => { d.lifestyles.splice(i, 1); })}>✕</Button>
              </div>
            );
          })}
          {!draft.lifestyles.length && (
            <Button className="text-sm" onClick={() => updateDraft((d) => {
              d.lifestyles.push({ id: sr5Data.lifestyles.find((x) => x.name === 'Low')?.id ?? sr5Data.lifestyles[0].id, months: 1 });
            })}>+ Escolher estilo de vida</Button>
          )}
          {lifestylePct > 0 && <p className="mt-2 text-xs text-faint">Seu metatipo paga {lifestylePct}% a mais (já incluído).</p>}
        </Card>
      </div>

      {draft.gear.length > 0 && (
        <Card title="Compras">
          <ul className="flex flex-col divide-y divide-line">
            {draft.gear.map((g, i) => {
              const item = KINDS.find((k) => k.key === g.kind)?.list.find((x) => x.id === g.itemId);
              if (!item) return null;
              const l = line(g, item);
              const mr = maxRating(item);
              return (
                <li key={g.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 text-sm">
                  <span className="min-w-40 flex-1">
                    {label(item)}
                    <span className="block text-xs text-faint">
                      disp. {l.avail}{l.ess ? ` · Essência ${fmtEss(l.ess)}` : ''}
                    </span>
                  </span>
                  {mr && mr > 1 && (
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      nível
                      <Stepper size="sm" label={`nível de ${label(item)}`} value={g.rating ?? 1} min={1} max={mr}
                        onChange={(v) => updateDraft((d) => { d.gear[i].rating = v; })} />
                    </label>
                  )}
                  {isWare(g.kind) && (
                    <span className="flex items-center gap-1">
                      <select aria-label="Grau" className={cx(inputClass, '!w-28 !py-1 !text-xs')} value={g.grade ?? 'standard'}
                        onChange={(e) => updateDraft((d) => { d.gear[i].grade = e.target.value as WareGrade; })}>
                        {(Object.keys(WARE_GRADES) as WareGrade[]).map((k) => <option key={k} value={k}>{WARE_GRADES[k].namePt}</option>)}
                      </select>
                      <HelpTip help={GRADE_HELP[g.grade ?? 'standard']} title="Grau" />
                    </span>
                  )}
                  {!isWare(g.kind) && (
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      qtd.
                      <Stepper size="sm" label={`quantidade de ${label(item)}`} value={g.qty} min={1} max={999}
                        onChange={(v) => updateDraft((d) => { d.gear[i].qty = v; })} />
                    </label>
                  )}
                  {l.cost === null || (item.cost.value === null && evalExpr(item.cost.raw, { rating: g.rating ?? 1 }) === null) ? (
                    <input type="number" aria-label="Preço" placeholder="Preço ¥" className={cx(inputClass, '!w-28 !py-1')}
                      value={g.customCost ?? ''} onChange={(e) => updateDraft((d) => { d.gear[i].customCost = Number(e.target.value) || undefined; })} />
                  ) : (
                    <span className="w-28 text-right font-mono">{fmtNuyen(l.cost * g.qty)}</span>
                  )}
                  <Button variant="ghost" className="!px-2 !py-1" aria-label={`Remover ${label(item)}`}
                    onClick={() => updateDraft((d) => { d.gear.splice(i, 1); })}>✕</Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card title="Catálogo">
        <div className="mb-3 flex flex-wrap gap-1" role="tablist">
          {KINDS.map((k) => (
            <button key={k.key} role="tab" type="button" aria-selected={kind === k.key}
              onClick={() => { setKind(k.key); setCat(''); }}
              className={cx('rounded-md px-3 py-1.5 text-sm transition', kind === k.key ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink')}>
              {k.title}
            </button>
          ))}
          <HelpTip help={GEAR_KIND_HELP[kind]} title={current.title} className="ml-1 self-center" />
        </div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder={`Buscar em ${current.title.toLowerCase()}…`} />
          <select aria-label="Categoria" className={cx(inputClass, 'sm:max-w-60')} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {cats.map(([c, pt]) => <option key={c} value={c}>{pt}</option>)}
          </select>
        </div>
        <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {items.map((item) => {
            const l = line({ kind, rating: 1 }, item);
            const availNum = Number.parseInt(l.avail, 10);
            const tooRare = Number.isFinite(availNum) && availNum > 12;
            return (
              <li key={item.id} className={cx('flex min-w-0 items-center gap-3 rounded-md border border-line px-3 py-2 text-sm', tooRare && 'opacity-50')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{label(item)}</span>
                  <span className="block text-xs text-faint">
                    {l.cost === null ? 'preço variável' : `${fmtNuyen(l.cost)}${maxRating(item) && item.cost.value === null ? ' (nível 1)' : ''}`}
                    {' · '}disp. {l.avail}
                    {'damage' in item ? ` · dano ${(item as { damage: string }).damage}` : ''}
                    {'armor' in item ? ` · armadura ${(item as { armor: string }).armor}` : ''}
                    {l.ess ? ` · Ess ${fmtEss(l.ess)}` : ''}
                  </span>
                  {tooRare && <span className="block text-xs text-warn">⊘ Disponibilidade acima de 12</span>}
                </span>
                <Button className="shrink-0 !px-2.5 !py-1 text-xs" disabled={tooRare} onClick={() => add(item)}>Comprar</Button>
              </li>
            );
          })}
        </ul>
        {items.length === 60 && <p className="mt-2 text-xs text-faint">Mostrando os 60 primeiros. Use a busca ou a categoria para achar outros.</p>}
      </Card>
    </div>
  );
}
