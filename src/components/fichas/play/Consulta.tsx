'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { lifestyleAdjust, lifestyleDetails, lifestyleMonthly, lifestyleTitle, PERMANENT_MONTHS, startingNuyenRoll } from '@/lib/fichas/sr5/lifestyle';
import { spiritAttr } from '@/lib/fichas/sr5/career';
import { rollPool, type PoolRoll } from '@/lib/fichas/sr5/dice';
import { itemStats, wornArmor, type InventoryItemLike } from '@/lib/fichas/sr5/inventory';
import { conditionLimits, woundModifier } from '@/lib/fichas/sr5/play';
import { ATTR_LABEL, type RulesResult } from '@/lib/fichas/sr5/rules';
import type { AttrKey } from '@/lib/fichas/sr5/types';
import { vehicleStats, vehiclesOf } from '@/lib/fichas/sr5/vehicles';
import { cx, inputClass, matches, SearchInput } from '../ui';
import type { PlayItem } from './types';

const ATTRS: AttrKey[] = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES'];

/** Seção recolhível. Fica aberta se tem coisa e some quando a busca não acha nada nela. */
const VIEWS = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'pericias', label: 'Perícias' },
  { key: 'combate', label: 'Combate' },
  { key: 'magia', label: 'Magia e Matrix' },
  { key: 'veiculos', label: 'Veículos' },
  { key: 'pessoas', label: 'Pessoas' },
  { key: 'equip', label: 'Equipamento' },
] as const;
type View = (typeof VIEWS)[number]['key'];

function Section({ title, count, children, defaultOpen = true, v, cur }: { title: string; count?: number; children: ReactNode; defaultOpen?: boolean; v: View; cur: View | 'all' }) {
  if (count === 0 || (cur !== 'all' && cur !== v)) return null;
  return (
    <details open={defaultOpen} className="group rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-display text-base font-semibold">
        <span>{title}{count !== undefined && <span className="ml-2 text-xs font-normal text-faint">{count}</span>}</span>
        <span className="text-faint transition group-open:rotate-90" aria-hidden>›</span>
      </summary>
      <div className="border-t border-line px-4 py-2">{children}</div>
    </details>
  );
}

function Stat({ name, value, tone }: { name: string; value: ReactNode; tone?: 'warn' | 'danger' }) {
  return (
    <div className="min-w-16 flex-1 rounded-md border border-line px-2 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-faint">{name}</div>
      <div className={cx('font-mono text-lg leading-tight', tone === 'warn' && 'text-warn', tone === 'danger' && 'text-danger')}>{value}</div>
    </div>
  );
}

/** Versão em uma linha, para a faixa fixa ocupar pouco da tela. */
function Chip({ name, value, tone }: { name: string; value: ReactNode; tone?: 'warn' | 'danger' }) {
  return (
    <div className="flex flex-1 items-baseline justify-center gap-1.5 whitespace-nowrap rounded-md border border-line px-2 py-0.5">
      <span className="text-[10px] uppercase tracking-wider text-faint">{name}</span>
      <span className={cx('font-mono text-base leading-tight', tone === 'warn' && 'text-warn', tone === 'danger' && 'text-danger')}>{value}</span>
    </div>
  );
}

function Line({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="block">{title}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
      {right && <span className="shrink-0 text-right">{right}</span>}
    </li>
  );
}

/**
 * Visão de consulta para usar na mesa: tudo que o personagem tem, já com a
 * reserva de dados de cada perícia (atributo + nível + penalidade de ferimentos),
 * busca e um botão de rolar em cada uma.
 */
export function Consulta({
  draft,
  result,
  inventory,
  physical,
  stun,
}: {
  draft: CharacterDraft;
  result: RulesResult;
  inventory: PlayItem[];
  physical: number;
  stun: number;
}) {
  const [q, setQ] = useState('');
  const [edge, setEdge] = useState(false);
  const [view, setView] = useState<View>('resumo');
  /** Com busca, mostra tudo; sem busca, só o grupo escolhido. */
  const cur: View | 'all' = q ? 'all' : view;
  const [rolls, setRolls] = useState<Record<string, PoolRoll>>({});
  const limits = conditionLimits(result);
  const wound = woundModifier(physical, stun, limits);
  const d = result.derived;
  const a = result.attributes;
  const items = inventory as unknown as InventoryItemLike[];
  const armor = wornArmor(items);
  const show = (...texts: (string | undefined)[]) => !q || matches(texts.filter(Boolean).join(' '), q);

  const skills = useMemo(
    () =>
      sr5Data.skills.skills
        .map((s) => {
          const rating = result.skillRatings[s.id] ?? 0;
          const attr = a[s.attribute]?.value ?? 0;
          const spec = draft.skills.find((x) => x.id === s.id)?.specialization?.name;
          return { s, rating, spec, pool: rating > 0 ? attr + rating : s.canDefault ? attr - 1 : 0, attr };
        })
        .filter((x) => x.rating > 0)
        .sort((x, y) => y.pool - x.pool || label(x.s).localeCompare(label(y.s)))
        .filter((x) => show(label(x.s), x.s.name, x.spec)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, draft.skills, q],
  );

  const roll = (key: string, pool: number) => setRolls((r) => ({ ...r, [key]: rollPool(Math.max(0, pool + wound), { edge }) }));
  const rollLabel = (key: string) => {
    const r = rolls[key];
    if (!r) return null;
    return (
      <span className={cx('font-mono text-xs', r.criticalGlitch ? 'text-danger' : r.glitch ? 'text-warn' : 'text-accent')} aria-live="polite">
        {r.hits} {r.hits === 1 ? 'acerto' : 'acertos'}{r.criticalGlitch ? ' · falha crítica' : r.glitch ? ' · falha' : ''}
      </span>
    );
  };

  const weapons = items.filter((i) => i.kind === 'weapon').filter((i) => show(i.name));
  const armors = items.filter((i) => i.kind === 'armor').filter((i) => show(i.name));
  const gear = items.filter((i) => i.kind === 'gear' || i.kind === 'other').filter((i) => show(i.name));
  const vehicles = vehiclesOf(draft).filter((v) => show(v.name, label(v.vehicle), v.notes));
  const spells = draft.magic.spellIds.map((id) => sr5Data.spells.find((s) => s.id === id)).filter((s) => s && show(label(s), s.name, s.category))
    .map((s) => s!);
  const powers = draft.magic.powers.flatMap((p) => {
    const x = sr5Data.powers.find((y) => y.id === p.id);
    return x && show(label(x)) ? [{ p, x }] : [];
  });
  const forms = draft.magic.complexFormIds.map((id) => sr5Data.complexForms.find((s) => s.id === id)).filter((s) => s && show(label(s)))
    .map((s) => s!);
  const quals = draft.qualities.flatMap((qq) => {
    const x = sr5Data.qualities.find((y) => y.id === qq.id);
    return x && show(label(x)) ? [{ qq, x }] : [];
  });
  const contacts = draft.contacts.filter((c) => show(c.name, sr5Data.contacts.find((x) => x.id === c.archetypeId)?.name));
  const implants = draft.gear.flatMap((g) => {
    if (g.kind !== 'cyberware' && g.kind !== 'bioware') return [];
    const it = (g.kind === 'cyberware' ? sr5Data.cyberware : sr5Data.bioware).find((x) => x.id === g.itemId);
    return it && show(label(it)) ? [{ g, it }] : [];
  });
  const decks = draft.gear.flatMap((g) => {
    const it = sr5Data.gear.find((x) => x.id === g.itemId);
    return g.kind === 'gear' && it?.device?.array && show(label(it)) ? [{ g, it }] : [];
  });
  const martial = (draft.martialArts ?? []).flatMap((m) => {
    const x = sr5Data.martialArts.find((y) => y.id === m.id);
    return x && show(label(x), ...m.techniques) ? [{ m, x }] : [];
  });
  const career = draft.career;
  const knowledge = draft.knowledge.filter((k) => show(k.name, k.category, k.specialization?.name));
  const companions = (career?.companions ?? []).flatMap((c) => {
    const x = sr5Data.spirits.find((y) => y.id === c.spiritId);
    return x && show(c.name, label(x)) ? [{ c, x }] : [];
  });
  const lifestyles = draft.lifestyles.flatMap((l) => {
    const x = sr5Data.lifestyles.find((y) => y.id === l.id);
    if (!x) return [];
    const details = lifestyleDetails(l, label);
    return show(label(x), l.name, details) ? [{ l, x, details }] : [];
  });
  const lifestyleCharacter = lifestyleAdjust(draft);
  const startingRoll = startingNuyenRoll(draft.lifestyles);
  const enemies = (draft.enemies ?? []).filter((e) => show(e.name, e.notes));
  const metamagics = (career?.metamagicIds ?? []).flatMap((id) => {
    const x = sr5Data.metamagics.find((y) => y.id === id);
    return x && show(label(x)) ? [x] : [];
  });
  const echoes = (career?.echoIds ?? []).flatMap((id) => {
    const x = sr5Data.echoes.find((y) => y.id === id);
    return x && show(label(x)) ? [x] : [];
  });
  const tradition = [...sr5Data.traditions, ...sr5Data.streams].find((t) => t.id === draft.magic.traditionId)
    ?? [...sr5Data.traditions, ...sr5Data.streams].find((t) => t.id === draft.magic.streamId);
  const mentor = sr5Data.mentors.find((m) => m.id === draft.magic.mentorId);
  /** Acessórios e modificações instaladas numa arma ou armadura comprada na criação. */
  const modsOf = (itemId: string | null) => {
    const g = draft.gear.find((x) => x.itemId === itemId && x.mods?.length);
    return (g?.mods ?? []).map((m) => {
      const list = m.kind === 'accessory' ? sr5Data.weaponAccessories : m.kind === 'armorMod' ? sr5Data.armorMods : sr5Data.vehicleMods;
      const it = list.find((x) => x.id === m.itemId);
      return it ? `${label(it)}${m.rating ? ` ${m.rating}` : ''}` : null;
    }).filter(Boolean).join(', ');
  };
  const weaponStats = (w: InventoryItemLike) => {
    const base = itemStats('weapon', w.itemId) ?? w.notes;
    const cat = sr5Data.weapons.find((x) => x.id === w.itemId);
    const reach = cat?.reach ? `Alcance ${cat.reach}` : null;
    const mods = modsOf(w.itemId);
    return [base, reach, mods && `Acessórios: ${mods}`].filter(Boolean).join(' · ');
  };
  const defense = a.REA.value + a.INT.value;
  const soak = a.BOD.value + (armor ?? 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-1.5 rounded-xl border border-line bg-bg/95 p-1.5 backdrop-blur">
        <div className="flex flex-wrap gap-1.5">
          <Chip name="Iniciativa" value={`${d.initiative.base}+${d.initiative.dice}d6`} />
          <Chip name="Armadura" value={armor ?? '–'} />
          <Chip name="Físico" value={`${physical}/${limits.physical}`} tone={physical >= limits.physical ? 'danger' : undefined} />
          <Chip name="Atordo." value={`${stun}/${limits.stun}`} tone={stun >= limits.stun ? 'danger' : undefined} />
          <Chip name="Ferimentos" value={wound === 0 ? '0' : wound} tone={wound < 0 ? 'warn' : undefined} />
          <Chip name="Edge" value={a.EDG.value} />
          <Chip name="Defesa" value={defense} />
          <Chip name="Resist. dano" value={soak} />
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Limites">
          <Chip name="Limite físico" value={d.limits.physical} />
          <Chip name="Limite mental" value={d.limits.mental} />
          <Chip name="Limite social" value={d.limits.social} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-48 flex-1"><SearchInput value={q} onChange={setQ} placeholder="Buscar perícia, arma, magia, contato…" /></div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={edge} onChange={(e) => setEdge(e.target.checked)} /> Regra do Seis
          </label>
        </div>
        <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Grupos da consulta">
          {VIEWS.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={!q && view === x.key} onClick={() => { setQ(''); setView(x.key); }}
              className={cx('shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition',
                !q && view === x.key ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink')}>
              {x.label}
            </button>
          ))}
        </nav>
      </div>

      <Section v="resumo" cur={cur} title="Atributos" defaultOpen>
        <div className="grid grid-cols-4 gap-2 py-1 sm:grid-cols-6 lg:grid-cols-12">
          {ATTRS.filter((k) => k !== 'MAG' && k !== 'RES' ? true : a[k].value > 0).map((k) => (
            <Stat key={k} name={ATTR_LABEL[k]} value={a[k].value} />
          ))}
          <Stat name="Essência" value={d.essence.toFixed(2).replace(/\.?0+$/, '')} />
        </div>
        <dl className="grid gap-x-6 sm:grid-cols-2">
          {([
            ['Iniciativa', `${d.initiative.base} + ${d.initiative.dice}d6`],
            d.astralInitiative && ['Iniciativa astral', `${d.astralInitiative.base} + ${d.astralInitiative.dice}d6`],
            d.matrixInitiative && ['Matrix (RA)', `${d.matrixInitiative.ar.base} + ${d.matrixInitiative.ar.dice}d6`],
            d.matrixInitiative && ['Matrix (RV fria)', `${d.matrixInitiative.coldSim.base} + ${d.matrixInitiative.coldSim.dice}d6`],
            d.matrixInitiative && ['Matrix (RV quente)', `${d.matrixInitiative.hotSim.base} + ${d.matrixInitiative.hotSim.dice}d6`],
            d.drainResist !== undefined && ['Resistir a dreno', d.drainResist],
            ['Compostura', d.composure],
            ['Julgar intenções', d.judgeIntentions],
            ['Memória', d.memory],
            ['Levantar/carregar', d.liftCarry],
            ['Monitor físico', d.monitors.physical],
            ['Monitor atordoamento', d.monitors.stun],
            ['Excedente', d.monitors.overflow],
            ['−1 a cada', `${d.monitors.woundThreshold} caixas`],
            d.essenceMagicLoss > 0 && !!draft.talent && draft.talent !== 'mundane' && ['Magia/Ressonância perdida', d.essenceMagicLoss],
            tradition && ['Tradição', label(tradition)],
            mentor && ['Mentor', label(mentor)],
            career && career.initiationGrade > 0 && ['Iniciação', career.initiationGrade],
            career && career.submersionGrade > 0 && ['Submersão', career.submersionGrade],
          ] as const).flatMap((r) => (r ? [r] : [])).map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 text-sm">
              <dt className="text-muted">{k}</dt>
              <dd className="font-mono">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section v="pericias" cur={cur} title="Perícias" count={skills.length}>
        <ul className="grid gap-2 py-2 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map(({ s, rating, spec, pool, attr }) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium leading-tight">{label(s)}</div>
                  <div className="text-xs text-muted">{ATTR_LABEL[s.attribute]} {attr} + {rating}{wound ? ` ${wound}` : ''}</div>
                </div>
                <div className="font-mono text-2xl leading-none text-accent">{Math.max(0, pool + wound)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => roll(s.id, pool)} aria-label={`Rolar ${label(s)}`}
                  className="min-h-9 rounded-md border border-line px-3 py-1 text-sm transition hover:border-accent hover:text-accent">
                  Rolar 🎲
                </button>
                {spec && (
                  <button type="button" onClick={() => roll(s.id + ':spec', pool + 2)} aria-label={`Rolar ${label(s)} com especialização`}
                    className="min-h-9 rounded-md border border-line px-3 py-1 text-sm transition hover:border-accent hover:text-accent">
                    {spec} {Math.max(0, pool + 2 + wound)} 🎲
                  </button>
                )}
                {rollLabel(s.id)}{spec && rollLabel(s.id + ':spec')}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section v="combate" cur={cur} title="Armas" count={weapons.length}>
        <ul className="divide-y divide-line">
          {weapons.map((w) => (
            <Line key={w.itemId ?? w.name + w.qty} title={<>{w.name}{w.equipped && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">em mãos</span>}</>}
              sub={weaponStats(w)} right={w.qty > 1 ? `×${w.qty}` : undefined} />
          ))}
        </ul>
      </Section>

      <Section v="combate" cur={cur} title="Armaduras" count={armors.length}>
        <ul className="divide-y divide-line">
          {armors.map((w) => (
            <Line key={w.itemId ?? w.name} title={<>{w.name}{w.equipped && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">vestindo</span>}</>}
              sub={[itemStats('armor', w.itemId), modsOf(w.itemId) && `Modificações: ${modsOf(w.itemId)}`].filter(Boolean).join(' · ') || undefined} />
          ))}
        </ul>
      </Section>

      <Section v="magia" cur={cur} title="Magias" count={spells.length}>
        <ul className="divide-y divide-line">
          {spells.map((s) => (
            <Line key={s.id} title={label(s)} sub={`${s.categoryPt ?? s.category} · ${s.type} · alcance ${s.range} · ${s.duration}${s.damage && s.damage !== 'N' ? ` · dano ${s.damage}` : ''}`} right={<span className="font-mono text-xs">dreno {s.dv}</span>} />
          ))}
        </ul>
      </Section>

      <Section v="magia" cur={cur} title="Poderes de adepto" count={powers.length}>
        <ul className="divide-y divide-line">
          {powers.map(({ p, x }) => <Line key={p.id} title={`${label(x)}${x.levels ? ` ${p.level}` : ''}`} sub={x.action ? `Ação: ${x.action}` : undefined} />)}
        </ul>
      </Section>

      <Section v="magia" cur={cur} title="Formas complexas" count={forms.length}>
        <ul className="divide-y divide-line">
          {forms.map((s) => <Line key={s.id} title={label(s)} sub={`Alvo ${s.target} · ${s.duration}`} right={<span className="font-mono text-xs">FV {s.fv}</span>} />)}
        </ul>
      </Section>

      <Section v="magia" cur={cur} title="Cyberdecks" count={decks.length}>
        <ul className="divide-y divide-line">
          {decks.map(({ g, it }) => {
            const loaded = draft.gear.filter((p) => p.kind === 'program' && p.loadedIn === g.key)
              .map((p) => sr5Data.programs.find((x) => x.id === p.itemId)).filter(Boolean).map((p) => label(p!));
            return (
              <Line key={g.key} title={label(it)}
                sub={`Ataque ${it.device!.array![0]} · Sleaze ${it.device!.array![1]} · Proc. de Dados ${it.device!.array![2]} · Firewall ${it.device!.array![3]} · classif. ${it.device!.rating}`}
                right={<span className="text-xs text-muted">{loaded.length ? loaded.join(', ') : 'sem programas'}</span>} />
            );
          })}
        </ul>
      </Section>

      {cur === 'veiculos' && vehicles.length === 0 && (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          Nenhum veículo ou drone. Adicione na aba <strong className="text-ink">Veículos</strong>, lá em cima.
        </p>
      )}

      <Section v="veiculos" cur={cur} title="Veículos e drones" count={vehicles.length}>
        <ul className="divide-y divide-line">
          {vehicles.map((v) => (
            <Line key={v.key} title={v.name}
              sub={<>
                {vehicleStats(v.vehicle).map(([n, value]) => `${n} ${value}`).join(' · ')}
                {v.mods.length > 0 && <span className="block">Modificações: {v.mods.join(', ')}</span>}
                {v.notes && <span className="block whitespace-pre-line">{v.notes}</span>}
              </>}
              right={v.qty > 1 ? `×${v.qty}` : undefined} />
          ))}
        </ul>
      </Section>

      <Section v="combate" cur={cur} title="Implantes" count={implants.length}>
        <ul className="divide-y divide-line">
          {implants.map(({ g, it }) => <Line key={g.key} title={`${label(it)}${g.rating ? ` ${g.rating}` : ''}`} sub={g.grade && g.grade !== 'standard' ? g.grade : undefined} />)}
        </ul>
      </Section>

      <Section v="combate" cur={cur} title="Artes marciais" count={martial.length}>
        <ul className="divide-y divide-line">
          {martial.map(({ m, x }) => <Line key={x.id} title={label(x)} sub={m.techniques.join(' · ') || undefined} />)}
        </ul>
      </Section>

      <Section v="magia" cur={cur} title="Metamagias e ecos" count={metamagics.length + echoes.length}>
        <ul className="divide-y divide-line">
          {metamagics.map((m) => <Line key={m.id} title={label(m)} />)}
          {echoes.map((m) => <Line key={m.id} title={label(m)} />)}
        </ul>
      </Section>

      <Section v="magia" cur={cur} title="Espíritos e sprites" count={companions.length}>
        <ul className="divide-y divide-line">
          {companions.map(({ c, x }) => {
            const stats = (['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES'] as const)
              .map((k) => [k, spiritAttr(x.attributes[k], c.force)] as const)
              .filter(([, v]) => v !== null && v > 0)
              .map(([k, v]) => `${ATTR_LABEL[k]} ${v}`).join(' · ');
            return (
              <Line key={c.key} title={<>{c.name || label(x)}{c.name && <span className="text-xs text-muted"> ({label(x)})</span>}</>}
                sub={<>{stats}{x.powers.length > 0 && <span className="block">Poderes: {x.powers.join(', ')}</span>}</>}
                right={<span className="font-mono text-xs">{c.force} · {c.services} serv.{c.bound ? ' · vinculado' : ''}</span>} />
            );
          })}
        </ul>
      </Section>

      <Section v="pericias" cur={cur} title="Conhecimentos e idiomas" count={knowledge.length}>
        <ul className="divide-y divide-line">
          {knowledge.map((k) => (
            <Line key={k.key} title={<>{k.name}{k.specialization && <span className="text-xs text-muted"> ({k.specialization.name})</span>}</>}
              sub={k.category === 'Language' ? 'Idioma' : k.category}
              right={<span className="font-mono text-xs">{k.native ? 'nativo' : k.points + k.karma}</span>} />
          ))}
        </ul>
      </Section>

      <Section v="pessoas" cur={cur} title="Contatos" count={contacts.length}>
        <ul className="grid gap-2 py-2 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
              <div className="min-w-0">
                <div className="font-medium leading-tight">{c.name || '(sem nome)'}</div>
                <div className="text-xs text-muted">{sr5Data.contacts.find((x) => x.id === c.archetypeId)?.name ?? 'Contato'}</div>
              </div>
              <div className="flex shrink-0 gap-2 text-center">
                <div title="Conexão"><div className="text-[10px] uppercase tracking-wider text-faint">Conexão</div><div className="font-mono text-lg leading-tight">{c.connection}</div></div>
                <div title="Lealdade"><div className="text-[10px] uppercase tracking-wider text-faint">Lealdade</div><div className="font-mono text-lg leading-tight">{c.loyalty}</div></div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section v="pessoas" cur={cur} title="Estilo de vida" count={lifestyles.length}>
        <ul className="divide-y divide-line">
          {lifestyles.map(({ l, x, details }, i) => (
            <Line key={i} title={lifestyleTitle(label(x), l)}
              sub={[l.months >= PERMANENT_MONTHS ? 'permanente' : `${l.months} ${l.months === 1 ? 'mês pago' : 'meses pagos'}`, details].filter(Boolean).join(' · ')}
              right={<span className="font-mono text-xs">{Math.round(lifestyleMonthly(x, l, lifestyleCharacter)).toLocaleString('pt-BR')}¥/mês</span>} />
          ))}
        </ul>
        {startingRoll && <p className="mt-2 text-xs text-muted">Dinheiro inicial: {startingRoll.dice}D6 × {startingRoll.multiplier.toLocaleString('pt-BR')}¥</p>}
      </Section>

      <Section v="pessoas" cur={cur} title="Inimigos" count={enemies.length}>
        <ul className="divide-y divide-line">
          {enemies.map((e) => <Line key={e.key} title={e.name} sub={e.notes} />)}
        </ul>
      </Section>

      <Section v="resumo" cur={cur} title="Qualidades" count={quals.length}>
        <ul className="divide-y divide-line">
          {quals.map(({ qq, x }) => (
            <Line key={qq.id + (qq.choice ?? '')} title={`${label(x)}${qq.rating > 1 ? ` ${qq.rating}` : ''}`} sub={qq.choice || undefined}
              right={<span className={cx('text-xs', x.kind === 'positive' ? 'text-accent' : 'text-warn')}>{x.kind === 'positive' ? 'positiva' : 'negativa'}</span>} />
          ))}
        </ul>
      </Section>

      <Section v="equip" cur={cur} title="Equipamento" count={gear.length}>
        <ul className="divide-y divide-line">
          {gear.map((g, i) => (
            <Line key={(g.itemId ?? g.name) + i} title={g.rating ? `${g.name} ${g.rating}` : g.name}
              sub={[itemStats('gear', g.itemId), g.notes].filter(Boolean).join(' · ') || undefined} right={g.qty > 1 ? `×${g.qty}` : undefined} />
          ))}
        </ul>
      </Section>

      {!q ? null : (
        <button type="button" className={cx(inputClass, '!w-auto self-start text-sm')} onClick={() => setQ('')}>Limpar busca</button>
      )}
    </div>
  );
}
