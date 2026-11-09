'use client';

import { useRef, useState, type ReactNode } from 'react';
import { replaceDraft } from '@/lib/fichas/store';
import { exportFilename, exportJson as toJson, parseImport } from '@/lib/fichas/sr5/io';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { ATTR_LABEL, fmtNuyen, isComplete, STEP_ORDER, WARE_GRADES, type StepKey } from '@/lib/fichas/sr5/rules';
import type { AttrKey } from '@/lib/fichas/sr5/types';
import type { StepProps } from '../wizard/Wizard';
import { useWizardExtras } from '../wizard/WizardExtras';
import { Button, Card, cx, IssueList, StepIntro } from '../ui';
import { fmtEss, shortTalent, talentAt } from './shared';

const STEP_TITLE: Record<StepKey, string> = {
  concept: 'Conceito', priorities: 'Prioridades', metatype: 'Metatipo', attributes: 'Atributos', magic: 'Magia/Ressonância',
  qualities: 'Qualidades', skills: 'Perícias', resources: 'Recursos', contacts: 'Contatos', review: 'Karma final',
};

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReviewStep({ draft, result, goTo }: StepProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string>();
  const complete = isComplete(result);
  const extras = useWizardExtras();

  const exportJson = () => download(exportFilename(draft), toJson(draft), 'application/json');

  const importJson = async (file: File) => {
    try {
      const draftIn = parseImport(await file.text());
      if (confirm('Substituir a ficha atual pela importada?')) replaceDraft(draftIn);
      setImportError(undefined);
    } catch (e) {
      setImportError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print">
        <StepIntro title="Revisão">
          {complete
            ? 'Tudo certo com as regras. Confira a ficha abaixo e exporte.'
            : 'Ainda há erros. Eles estão agrupados por passo; clique para ir direto ao lugar certo.'}
        </StepIntro>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => window.print()}>Salvar PDF / imprimir</Button>
          <Button onClick={exportJson}>Exportar JSON</Button>
          <Button onClick={() => fileRef.current?.click()}>Importar JSON</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
        </div>
        {importError && <p className="mt-2 text-sm text-danger">{importError}</p>}
        <p className="mt-2 text-xs text-faint">
          {extras.savedIn === 'account'
            ? 'A ficha fica salva na sua conta. Exporte o JSON se quiser uma cópia fora da Alternative Space.'
            : 'A ficha fica salva só neste navegador. Exporte o JSON para guardar uma cópia ou abrir em outro lugar.'}{' '}
          No PDF, escolha “Salvar como PDF” na janela de impressão.
        </p>

        {result.issues.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {STEP_ORDER.map((s) => {
              const list = result.issues.filter((i) => i.step === s);
              if (!list.length) return null;
              return (
                <div key={s}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="font-display font-semibold">{STEP_TITLE[s]}</h3>
                    {s !== 'review' && <Button variant="ghost" className="!py-1 text-xs" onClick={() => goTo(s)}>Ir para {STEP_TITLE[s]} →</Button>}
                  </div>
                  <IssueList issues={list} compact />
                </div>
              );
            })}
          </div>
        )}

        {/* Depois dos avisos, para serem lidos antes de travar a ficha. */}
        {extras.reviewActions}
      </div>

      <CharacterSheet draft={draft} result={result} />
    </div>
  );
}

/**
 * Ficha completa (também usada na tela de jogo).
 * `showRemaining`: mostra o karma/nuyen que sobrou na criação (escondido em jogo,
 * onde o saldo de verdade é o do histórico).
 */
export function CharacterSheet({
  draft,
  result,
  showRemaining = true,
}: Omit<StepProps, 'goTo'> & { showRemaining?: boolean }) {
  const metatype = sr5Data.metatypes.find((m) => m.id === draft.metatypeId);
  const talent = talentAt(draft.priorities.talent, draft.talent);
  const a = result.attributes;
  const d = result.derived;
  const attrs: AttrKey[] = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG'];
  if (a.MAG.value) attrs.push('MAG');
  if (a.RES.value) attrs.push('RES');
  attrs.push('ESS');

  const skills = sr5Data.skills.skills
    .filter((s) => (result.skillRatings[s.id] ?? 0) > 0)
    .map((s) => ({ s, r: result.skillRatings[s.id], spec: draft.skills.find((x) => x.id === s.id)?.specialization?.name }));
  const tradition = sr5Data.traditions.find((t) => t.id === draft.magic.traditionId);
  const stream = sr5Data.streams.find((t) => t.id === draft.magic.streamId);
  const mentor = sr5Data.mentors.find((t) => t.id === draft.magic.mentorId);

  return (
    <Card className="print-sheet">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
        <div>
          <h2 className="font-display text-3xl font-bold">{draft.concept.alias || draft.concept.name || 'Sem nome'}</h2>
          <p className="text-muted">
            {[draft.concept.alias && draft.concept.name, metatype && label(metatype), talent && shortTalent(talent), draft.concept.role]
              .filter(Boolean).join(' · ')}
          </p>
        </div>
        <p className="font-mono text-xs text-faint">
          Prioridades: {(['metatype', 'talent', 'attributes', 'skills', 'resources'] as const).map((k) => draft.priorities[k] ?? '–').join(' ')}
          {' '}(Metatipo, Magia, Atributos, Perícias, Recursos)
        </p>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {attrs.map((k) => (
          <div key={k} className="rounded-md border border-line px-2 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-faint">{ATTR_LABEL[k]}</div>
            <div className="font-mono text-lg">{k === 'ESS' ? fmtEss(a.ESS.value) : a[k].value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Block title="Valores derivados">
          <Rows rows={[
            ['Limites (Físico / Mental / Social)', `${d.limits.physical} / ${d.limits.mental} / ${d.limits.social}`],
            ['Iniciativa', `${d.initiative.base} + ${d.initiative.dice}D6`],
            ...(d.astralInitiative ? [['Iniciativa astral', `${d.astralInitiative.base} + ${d.astralInitiative.dice}D6`] as [string, string]] : []),
            ...(d.matrixInitiative ? [['Iniciativa Matriz (fria / quente)', `${d.matrixInitiative.coldSim.base} + 3D6 / ${d.matrixInitiative.hotSim.base} + 4D6`] as [string, string]] : []),
            ['Monitor físico / atordoamento', `${d.monitors.physical} / ${d.monitors.stun}`],
            ['Excedente', `${d.monitors.overflow}`],
            ['Compostura · Julgar intenções · Memória', `${d.composure} · ${d.judgeIntentions} · ${d.memory}`],
            ['Levantar/carregar', `${d.liftCarry}`],
            ...(d.drainResist !== undefined ? [['Resistir a dreno', `${d.drainResist}`] as [string, string]] : []),
          ]} />
        </Block>

        <Block title="Perícias">
          {skills.length ? (
            <Rows rows={skills.map(({ s, r, spec }) => [`${label(s)}${spec ? ` (${spec})` : ''}`, String(r)])} />
          ) : <Empty />}
          {draft.knowledge.length > 0 && (
            <>
              <h5 className="mt-3 text-xs uppercase tracking-wider text-faint">Conhecimentos</h5>
              <Rows rows={draft.knowledge.map((k) => [k.name || '(sem nome)', k.native ? 'N' : String(k.points + k.karma)])} />
            </>
          )}
        </Block>

        <Block title="Qualidades">
          {draft.qualities.length ? (
            <Rows rows={draft.qualities.map((q) => {
              const qq = sr5Data.qualities.find((x) => x.id === q.id);
              const choice = q.choice && (ATTR_LABEL[q.choice as AttrKey] ?? sr5Data.skills.skills.find((s) => s.id === q.choice)?.namePt ?? q.choice);
              return [`${qq ? label(qq) : '?'}${q.rating > 1 ? ` ${q.rating}` : ''}${choice ? ` (${choice})` : ''}`, qq?.kind === 'positive' ? 'positiva' : 'negativa'];
            })} />
          ) : <Empty />}
        </Block>

        {(talent?.magic || talent?.resonance) && (
          <Block title={talent.resonance ? 'Ressonância' : 'Magia'}>
            <Rows rows={[
              ...(tradition ? [['Tradição', label(tradition)] as [string, string]] : []),
              ...(stream ? [['Corrente', label(stream)] as [string, string]] : []),
              ...(mentor ? [['Mentor', label(mentor)] as [string, string]] : []),
            ]} />
            <List title="Magias" items={draft.magic.spellIds.map((id) => sr5Data.spells.find((s) => s.id === id)).filter(Boolean).map((s) => label(s!))} />
            <List title="Poderes" items={draft.magic.powers.map((p) => {
              const pw = sr5Data.powers.find((x) => x.id === p.id);
              return pw ? `${label(pw)}${pw.levels ? ` ${p.level}` : ''}` : '';
            }).filter(Boolean)} />
            <List title="Formas complexas" items={draft.magic.complexFormIds.map((id) => sr5Data.complexForms.find((s) => s.id === id)).filter(Boolean).map((s) => label(s!))} />
          </Block>
        )}

        <Block title="Equipamento">
          {draft.gear.length ? (
            <Rows rows={draft.gear.map((g) => {
              const list = { gear: sr5Data.gear, weapon: sr5Data.weapons, armor: sr5Data.armor, cyberware: sr5Data.cyberware, bioware: sr5Data.bioware }[g.kind];
              const item = list.find((x) => x.id === g.itemId);
              const grade = g.grade && g.grade !== 'standard' ? ` [${WARE_GRADES[g.grade].namePt}]` : '';
              return [`${item ? label(item) : '?'}${g.rating && g.rating > 1 ? ` ${g.rating}` : ''}${grade}`, g.qty > 1 ? `×${g.qty}` : ''];
            })} />
          ) : <Empty />}
          {draft.lifestyles.map((l, i) => {
            const ls = sr5Data.lifestyles.find((x) => x.id === l.id);
            return <p key={i} className="mt-2 text-sm">Estilo de vida: {ls ? label(ls) : '?'} ({l.months} {l.months === 1 ? 'mês' : 'meses'})</p>;
          })}
        </Block>

        <Block title="Contatos">
          {draft.contacts.length ? (
            <Rows rows={draft.contacts.map((c) => {
              const arch = sr5Data.contacts.find((x) => x.id === c.archetypeId);
              return [`${c.name || '(sem nome)'}${arch ? ` — ${label(arch)}` : ''}`, `C${c.connection} / L${c.loyalty}`];
            })} />
          ) : <Empty />}
        </Block>
      </div>

      {showRemaining && (
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-1 border-t border-line pt-3 text-sm">
          <span>Karma restante: <strong className={cx('font-mono', result.budgets.karma.remaining < 0 && 'text-danger')}>{result.budgets.karma.remaining}</strong></span>
          <span>Nuyen restante: <strong className={cx('font-mono', result.budgets.nuyen.remaining < 0 && 'text-danger')}>{fmtNuyen(result.budgets.nuyen.remaining)}</strong></span>
        </div>
      )}
      {draft.concept.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{draft.concept.notes}</p>}
      <p className="print-only mt-6 text-[10px]">
        Gerado na Alternative Space. Dados de regras derivados do Chummer5a (GPL-3.0). Shadowrun é marca da The Topps Company, Inc.
      </p>
    </Card>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h4 className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-accent">{title}</h4>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-sm">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt>{k}</dt>
          <dd className="text-right font-mono text-muted">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <p className="mt-2 text-sm">
      <span className="text-xs uppercase tracking-wider text-faint">{title}: </span>
      {items.join(', ')}
    </p>
  );
}

function Empty() {
  return <p className="text-sm text-faint">—</p>;
}
