'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { spiritAttr } from '@/lib/fichas/sr5/career';
import { rollPool, type PoolRoll } from '@/lib/fichas/sr5/dice';
import { itemStats, wornArmor, type InventoryItemLike } from '@/lib/fichas/sr5/inventory';
import { conditionLimits, woundModifier } from '@/lib/fichas/sr5/play';
import { ATTR_LABEL, type RulesResult } from '@/lib/fichas/sr5/rules';
import type { AttrKey, Vehicle } from '@/lib/fichas/sr5/types';
import { cx, inputClass, matches, SearchInput } from '../ui';
import type { PlayItem } from './types';

const ATTRS: AttrKey[] = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES'];

/** Seção recolhível. Fica aberta se tem coisa e some quando a busca não acha nada nela. */
function Section({ title, count, children, defaultOpen = true }: { title: string; count?: number; children: ReactNode; defaultOpen?: boolean }) {
  if (count === 0) return null;
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
  const vehicles = draft.gear.flatMap((g) => {
    if (g.kind !== 'vehicle') return [];
    const v = sr5Data.vehicles.find((x) => x.id === g.itemId);
    return v && show(label(v)) ? [{ g, v }] : [];
  });
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
    return x && show(label(x)) ? [{ l, x }] : [];
  });
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
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-2 rounded-xl border border-line bg-bg/95 p-2 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          <Stat name="Iniciativa" value={`${d.initiative.base}+${d.initiative.dice}d6`} />
          <Stat name="Armadura" value={armor ?? '–'} />
          <Stat name="Físico" value={`${physical}/${limits.physical}`} tone={physical >= limits.physical ? 'danger' : undefined} />
          <Stat name="Atordo." value={`${stun}/${limits.stun}`} tone={stun >= limits.stun ? 'danger' : undefined} />
          <Stat name="Ferimentos" value={wound === 0 ? '0' : wound} tone={wound < 0 ? 'warn' : undefined} />
          <Stat name="Edge" value={a.EDG.value} />
          <Stat name="Defesa" value={defense} />
          <Stat name="Resist. dano" value={soak} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-48 flex-1"><SearchInput value={q} onChange={setQ} placeholder="Buscar perícia, arma, magia, contato…" /></div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={edge} onChange={(e) => setEdge(e.target.checked)} /> Regra do Seis
          </label>
        </div>
      </div>

      <Section title="Atributos" defaultOpen>
        <div className="grid grid-cols-4 gap-2 py-1 sm:grid-cols-6 lg:grid-cols-12">
          {ATTRS.filter((k) => k !== 'MAG' && k !== 'RES' ? true : a[k].value > 0).map((k) => (
            <Stat key={k} name={ATTR_LABEL[k]} value={a[k].value} />
          ))}
          <Stat name="Essência" value={d.essence.toFixed(2).replace(/\.?0+$/, '')} />
        </div>
        <p className="py-1 text-xs text-muted">
          Limites: Físico {d.limits.physical} · Mental {d.limits.mental} · Social {d.limits.social}
          {d.astralInitiative && ` · Astral ${d.astralInitiative.base}+${d.astralInitiative.dice}d6`}
          {d.drainResist !== undefined && ` · Resistir a dreno ${d.drainResist}`}
          {' '}· Compostura {d.composure} · Julgar intenções {d.judgeIntentions} · Memória {d.memory} · Levantar/carregar {d.liftCarry}
        </p>
        <p className="py-1 text-xs text-muted">
          Monitor: {d.monitors.physical} físico · {d.monitors.stun} atordoamento · {d.monitors.overflow} excedente · −1 a cada {d.monitors.woundThreshold} caixas
          {d.matrixInitiative && ` · Matrix RA ${d.matrixInitiative.ar.base}+${d.matrixInitiative.ar.dice}d6 · RV fria ${d.matrixInitiative.coldSim.base}+${d.matrixInitiative.coldSim.dice}d6 · RV quente ${d.matrixInitiative.hotSim.base}+${d.matrixInitiative.hotSim.dice}d6`}
          {d.essenceMagicLoss > 0 && ` · Essência custou ${d.essenceMagicLoss} de Magia/Ressonância`}
          {tradition && ` · Tradição ${label(tradition)}`}{mentor && ` · Mentor ${label(mentor)}`}
          {career && career.initiationGrade > 0 && ` · Iniciação ${career.initiationGrade}`}
          {career && career.submersionGrade > 0 && ` · Submersão ${career.submersionGrade}`}
        </p>
      </Section>

      <Section title="Perícias" count={skills.length}>
        <ul className="divide-y divide-line">
          {skills.map(({ s, rating, spec, pool, attr }) => (
            <Line
              key={s.id}
              title={<>{label(s)}{spec && <span className="text-xs text-muted"> ({spec})</span>}</>}
              sub={`${ATTR_LABEL[s.attribute]} ${attr} + ${rating}${wound ? ` ${wound}` : ''}${spec ? ` · +2 na especialização` : ''}`}
              right={
                <span className="flex items-center gap-2">
                  {rollLabel(s.id)}
                  <button type="button" onClick={() => roll(s.id, pool)} aria-label={`Rolar ${label(s)}`}
                    className="rounded-md border border-line px-2.5 py-1 font-mono text-sm transition hover:border-accent hover:text-accent">
                    {Math.max(0, pool + wound)} 🎲
                  </button>
                </span>
              }
            />
          ))}
        </ul>
      </Section>

      <Section title="Armas" count={weapons.length}>
        <ul className="divide-y divide-line">
          {weapons.map((w) => (
            <Line key={w.itemId ?? w.name + w.qty} title={<>{w.name}{w.equipped && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">em mãos</span>}</>}
              sub={weaponStats(w)} right={w.qty > 1 ? `×${w.qty}` : undefined} />
          ))}
        </ul>
      </Section>

      <Section title="Armaduras" count={armors.length}>
        <ul className="divide-y divide-line">
          {armors.map((w) => (
            <Line key={w.itemId ?? w.name} title={<>{w.name}{w.equipped && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">vestindo</span>}</>}
              sub={[itemStats('armor', w.itemId), modsOf(w.itemId) && `Modificações: ${modsOf(w.itemId)}`].filter(Boolean).join(' · ') || undefined} />
          ))}
        </ul>
      </Section>

      <Section title="Magias" count={spells.length}>
        <ul className="divide-y divide-line">
          {spells.map((s) => (
            <Line key={s.id} title={label(s)} sub={`${s.categoryPt ?? s.category} · ${s.type} · alcance ${s.range} · ${s.duration}${s.damage && s.damage !== 'N' ? ` · dano ${s.damage}` : ''}`} right={<span className="font-mono text-xs">dreno {s.dv}</span>} />
          ))}
        </ul>
      </Section>

      <Section title="Poderes de adepto" count={powers.length}>
        <ul className="divide-y divide-line">
          {powers.map(({ p, x }) => <Line key={p.id} title={`${label(x)}${x.levels ? ` ${p.level}` : ''}`} sub={x.action ? `Ação: ${x.action}` : undefined} />)}
        </ul>
      </Section>

      <Section title="Formas complexas" count={forms.length}>
        <ul className="divide-y divide-line">
          {forms.map((s) => <Line key={s.id} title={label(s)} sub={`Alvo ${s.target} · ${s.duration}`} right={<span className="font-mono text-xs">FV {s.fv}</span>} />)}
        </ul>
      </Section>

      <Section title="Cyberdecks" count={decks.length}>
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

      <Section title="Veículos e drones" count={vehicles.length}>
        <ul className="divide-y divide-line">
          {vehicles.map(({ g, v }) => (
            <Line key={g.key} title={label(v)}
              sub={`Manobra ${(v as Vehicle).handling} · Acel. ${(v as Vehicle).accel} · Vel. ${(v as Vehicle).speed} · Corpo ${(v as Vehicle).body} · Armadura ${(v as Vehicle).armor} · Piloto ${(v as Vehicle).pilot} · Sensor ${(v as Vehicle).sensor}`}
              right={g.qty > 1 ? `×${g.qty}` : undefined} />
          ))}
        </ul>
      </Section>

      <Section title="Implantes" count={implants.length}>
        <ul className="divide-y divide-line">
          {implants.map(({ g, it }) => <Line key={g.key} title={`${label(it)}${g.rating ? ` ${g.rating}` : ''}`} sub={g.grade && g.grade !== 'standard' ? g.grade : undefined} />)}
        </ul>
      </Section>

      <Section title="Artes marciais" count={martial.length}>
        <ul className="divide-y divide-line">
          {martial.map(({ m, x }) => <Line key={x.id} title={label(x)} sub={m.techniques.join(' · ') || undefined} />)}
        </ul>
      </Section>

      <Section title="Metamagias e ecos" count={metamagics.length + echoes.length}>
        <ul className="divide-y divide-line">
          {metamagics.map((m) => <Line key={m.id} title={label(m)} />)}
          {echoes.map((m) => <Line key={m.id} title={label(m)} />)}
        </ul>
      </Section>

      <Section title="Espíritos e sprites" count={companions.length}>
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

      <Section title="Conhecimentos e idiomas" count={knowledge.length}>
        <ul className="divide-y divide-line">
          {knowledge.map((k) => (
            <Line key={k.key} title={<>{k.name}{k.specialization && <span className="text-xs text-muted"> ({k.specialization.name})</span>}</>}
              sub={k.category === 'Language' ? 'Idioma' : k.category}
              right={<span className="font-mono text-xs">{k.native ? 'nativo' : k.points + k.karma}</span>} />
          ))}
        </ul>
      </Section>

      <Section title="Estilo de vida" count={lifestyles.length}>
        <ul className="divide-y divide-line">
          {lifestyles.map(({ l, x }) => <Line key={l.id} title={label(x)} sub={`${l.months} ${l.months === 1 ? 'mês' : 'meses'} pagos`} right={<span className="font-mono text-xs">{x.cost.toLocaleString('pt-BR')}¥/mês</span>} />)}
        </ul>
      </Section>

      <Section title="Inimigos" count={enemies.length}>
        <ul className="divide-y divide-line">
          {enemies.map((e) => <Line key={e.key} title={e.name} sub={e.notes} />)}
        </ul>
      </Section>

      <Section title="Qualidades" count={quals.length}>
        <ul className="divide-y divide-line">
          {quals.map(({ qq, x }) => (
            <Line key={qq.id + (qq.choice ?? '')} title={`${label(x)}${qq.rating > 1 ? ` ${qq.rating}` : ''}`} sub={qq.choice || undefined}
              right={<span className={cx('text-xs', x.kind === 'positive' ? 'text-accent' : 'text-warn')}>{x.kind === 'positive' ? 'positiva' : 'negativa'}</span>} />
          ))}
        </ul>
      </Section>

      <Section title="Contatos" count={contacts.length}>
        <ul className="divide-y divide-line">
          {contacts.map((c) => (
            <Line key={c.key} title={c.name || '(sem nome)'} sub={sr5Data.contacts.find((x) => x.id === c.archetypeId)?.name}
              right={<span className="font-mono text-xs">C{c.connection} / L{c.loyalty}</span>} />
          ))}
        </ul>
      </Section>

      <Section title="Equipamento" count={gear.length} defaultOpen={false}>
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
