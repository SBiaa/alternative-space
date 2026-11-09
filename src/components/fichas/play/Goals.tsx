'use client';

import { useMemo, useState } from 'react';
import {
  completeGoalAction,
  createGoalAction,
  deleteGoalAction,
  moveGoalAction,
  updateGoalAction,
} from '@/app/fichas/play-actions';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import {
  GOAL_ATTRS,
  GOAL_KIND_LABEL,
  currentRating,
  goalCost,
  goalSummary,
  parseGoalTarget,
  planGoals,
  type GoalAttr,
  type GoalCost,
  type GoalKind,
  type GoalTarget,
  type PlannedGoal,
} from '@/lib/fichas/sr5/goals';
import { ledgerTotals, MAX_TITLE_LENGTH } from '@/lib/fichas/sr5/play';
import { ATTR_LABEL, fmtNuyen, type RulesResult } from '@/lib/fichas/sr5/rules';
import { Button, Card, cx, inputClass } from '../ui';
import { NotesField } from './NotesField';
import type { PlayEntry, PlayGoal } from './types';
import { useAction } from './useAction';

function fmtCost(c: GoalCost): string {
  if (!c.currency) return 'sem custo';
  return c.currency === 'nuyen' ? fmtNuyen(c.amount) : `${c.amount} karma`;
}

export function Goals({
  id,
  goals,
  entries,
  result,
}: {
  id: string;
  goals: PlayGoal[];
  entries: PlayEntry[];
  result: RulesResult;
}) {
  const totals = ledgerTotals(entries);
  const plan = planGoals(goals, result, totals);
  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status === 'done');
  const dropped = goals.filter((g) => g.status === 'dropped');

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Você tem <strong className="text-ink">{totals.karma} karma</strong> e{' '}
        <strong className="text-ink">{fmtNuyen(totals.nuyen)}</strong>. As metas estão em ordem de prioridade: o app
        mostra até onde o saldo dá, de cima para baixo.
      </p>

      <NewGoal id={id} goals={goals} result={result} />

      {active.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          Nenhuma meta ativa. Onde você quer que o personagem chegue? Subir um atributo, aprender uma perícia, comprar
          um ciberbraço, vingar um contato…
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {active.map((g, i) => (
            <ActiveGoal
              key={g.id}
              id={id}
              goal={g}
              plan={plan.get(g.id)}
              first={i === 0}
              last={i === active.length - 1}
            />
          ))}
        </ol>
      )}

      {done.length > 0 && <FinishedGoals id={id} title={`Concluídas (${done.length})`} goals={done} />}
      {dropped.length > 0 && <FinishedGoals id={id} title={`Deixadas de lado (${dropped.length})`} goals={dropped} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nova meta

function NewGoal({ id, goals, result }: { id: string; goals: PlayGoal[]; result: RulesResult }) {
  const [kind, setKind] = useState<GoalKind>('attribute');
  const [title, setTitle] = useState('');
  const [attr, setAttr] = useState<GoalAttr>('AGI');
  const [skillId, setSkillId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [rating, setRating] = useState('');
  const [spec, setSpec] = useState('');
  const [amount, setAmount] = useState('');
  const { pending, error, run } = useAction();

  const skills = useMemo(
    () => [...sr5Data.skills.skills].sort((a, b) => label(a).localeCompare(label(b), 'pt-BR')),
    [],
  );
  const groups = useMemo(
    () => [...sr5Data.skills.groups].sort((a, b) => label(a).localeCompare(label(b), 'pt-BR')),
    [],
  );
  const attrs = GOAL_ATTRS.filter((a) => (a !== 'MAG' && a !== 'RES') || result.attributes[a].value > 0);
  // Nível atual contando metas concluídas (mostrado entre parênteses nas listas).
  const skillLevel = (skillId: string) => currentRating({ kind: 'skill', skillId, rating: 1 }, result, goals);
  const groupLevel = (groupId: string) => currentRating({ kind: 'skillGroup', groupId, rating: 1 }, result, goals);

  // Monta a meta com o que já foi preenchido, para mostrar o custo antes de criar.
  const draftTarget: GoalTarget | null = useMemo(() => {
    const raw =
      kind === 'attribute' ? { kind, attr, rating } :
      kind === 'skill' ? { kind, skillId, rating } :
      kind === 'skillGroup' ? { kind, groupId, rating } :
      kind === 'specialization' ? { kind, skillId, name: spec } :
      kind === 'karma' || kind === 'nuyen' ? { kind, cost: amount } :
      { kind };
    try {
      return parseGoalTarget(raw);
    } catch {
      return null;
    }
  }, [kind, attr, skillId, groupId, rating, spec, amount]);
  const preview = draftTarget ? goalCost(draftTarget, result, goals) : null;
  const summary = draftTarget && preview ? goalSummary(draftTarget, preview) : '';
  const needsTitle = kind === 'story' || kind === 'karma' || kind === 'nuyen';

  // Sugere o nível seguinte ao atual quando muda o que vai subir.
  const suggest = (t: GoalTarget) => setRating(String(goalCost(t, result, goals).from! + 1));

  const reset = () => {
    setTitle('');
    setRating('');
    setSpec('');
    setAmount('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTarget) return;
    run(() => createGoalAction(id, { title: title.trim() || summary, target: draftTarget }), reset);
  };

  const digits = (v: string) => v.replace(/[^\d]/g, '');

  return (
    <Card title="Nova meta">
      <form onSubmit={submit} className="flex flex-col gap-2" aria-label="Nova meta">
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Tipo de meta"
            className={cx(inputClass, '!w-auto')}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as GoalKind);
              reset();
            }}
          >
            {(Object.keys(GOAL_KIND_LABEL) as GoalKind[]).map((k) => (
              <option key={k} value={k}>
                {GOAL_KIND_LABEL[k]}
              </option>
            ))}
          </select>

          {kind === 'attribute' && (
            <select
              aria-label="Atributo"
              className={cx(inputClass, '!w-auto')}
              value={attr}
              onChange={(e) => {
                const a = e.target.value as GoalAttr;
                setAttr(a);
                suggest({ kind: 'attribute', attr: a, rating: 1 });
              }}
            >
              {attrs.map((a) => (
                <option key={a} value={a}>
                  {ATTR_LABEL[a]} ({currentRating({ kind: 'attribute', attr: a, rating: 1 }, result, goals)})
                </option>
              ))}
            </select>
          )}

          {(kind === 'skill' || kind === 'specialization') && (
            <select
              aria-label="Perícia"
              className={cx(inputClass, '!w-auto max-w-full')}
              value={skillId}
              onChange={(e) => {
                setSkillId(e.target.value);
                if (kind === 'skill' && e.target.value) suggest({ kind: 'skill', skillId: e.target.value, rating: 1 });
              }}
            >
              <option value="">Escolha a perícia…</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {label(s)}
                  {skillLevel(s.id) ? ` (${skillLevel(s.id)})` : ''}
                </option>
              ))}
            </select>
          )}

          {kind === 'skillGroup' && (
            <select
              aria-label="Grupo de perícias"
              className={cx(inputClass, '!w-auto')}
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                if (e.target.value) suggest({ kind: 'skillGroup', groupId: e.target.value, rating: 1 });
              }}
            >
              <option value="">Escolha o grupo…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {label(g)}
                  {groupLevel(g.id) ? ` (${groupLevel(g.id)})` : ''}
                </option>
              ))}
            </select>
          )}

          {(kind === 'attribute' || kind === 'skill' || kind === 'skillGroup') && (
            <input
              aria-label="Nível desejado"
              inputMode="numeric"
              placeholder="Nível"
              className={cx(inputClass, '!w-20')}
              value={rating}
              onChange={(e) => setRating(digits(e.target.value))}
            />
          )}

          {kind === 'specialization' && (
            <input
              aria-label="Especialização"
              placeholder='Ex.: "Rifles"'
              className={cx(inputClass, '!w-40')}
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            />
          )}

          {(kind === 'karma' || kind === 'nuyen') && (
            <input
              aria-label={kind === 'karma' ? 'Custo em karma' : 'Preço em nuyen'}
              inputMode="numeric"
              placeholder={kind === 'karma' ? 'Karma' : '¥'}
              className={cx(inputClass, '!w-28')}
              value={amount}
              onChange={(e) => setAmount(digits(e.target.value))}
            />
          )}
        </div>

        <input
          aria-label="Nome da meta"
          placeholder={
            needsTitle
              ? kind === 'story'
                ? 'Ex.: "Descobrir quem traiu o time"'
                : kind === 'nuyen'
                  ? 'Ex.: "Ciberbraço com arma embutida"'
                  : 'Ex.: "Iniciação grau 1"'
              : summary
                ? `Nome (opcional): "${summary}"`
                : 'Nome (opcional)'
          }
          maxLength={MAX_TITLE_LENGTH}
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {preview && preview.currency && (
          <p className="text-sm text-muted">
            {preview.reached ? (
              <span className="text-warn">Já está nesse nível.</span>
            ) : (
              <>
                Custa <strong className="text-ink">{fmtCost(preview)}</strong>
                {summary && ` (${summary})`}.
              </>
            )}
            {preview.overMax !== undefined && (
              <span className="block text-warn">
                Passa do máximo natural ({preview.overMax}); só com qualidade ou aprimoramento.
              </span>
            )}
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          type="submit"
          variant="primary"
          className="self-start"
          disabled={pending || !draftTarget || (needsTitle && !title.trim()) || !!preview?.reached}
        >
          {pending ? 'Criando…' : 'Criar meta'}
        </Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Meta ativa

function ActiveGoal({
  id,
  goal: g,
  plan,
  first,
  last,
}: {
  id: string;
  goal: PlayGoal;
  plan?: PlannedGoal;
  first: boolean;
  last: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const act = useAction();
  const cost = plan?.cost;
  const summary = cost ? goalSummary(g.target, cost) : '';
  const payable = !!cost?.currency && cost.amount > 0 && !cost.reached;

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            aria-label={`Subir prioridade de ${g.title}`}
            disabled={first || act.pending}
            onClick={() => act.run(() => moveGoalAction(id, g.id, -1))}
            className="rounded px-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-20"
          >
            ▲
          </button>
          <button
            type="button"
            aria-label={`Descer prioridade de ${g.title}`}
            disabled={last || act.pending}
            onClick={() => act.run(() => moveGoalAction(id, g.id, 1))}
            className="rounded px-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-20"
          >
            ▼
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold">{g.title}</h3>
              {summary && summary !== g.title && <p className="text-sm text-muted">{summary}</p>}
            </div>
            {cost && <Badge cost={cost} plan={plan} />}
          </div>
          {cost?.overMax !== undefined && (
            <p className="mt-1 text-xs text-warn">
              Passa do máximo natural ({cost.overMax}); só com qualidade ou aprimoramento.
            </p>
          )}

          <div className="mt-2">
            <NotesField
              label={`Anotações de ${g.title}`}
              initial={g.notes}
              rows={2}
              placeholder="Por quê? Como chegar lá? (treinador, contato, missão…)"
              save={(notes) => updateGoalAction(id, g.id, { notes })}
            />
          </div>

          {act.error && <p className="mt-1 text-sm text-danger">{act.error}</p>}

          {confirming ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm">
              <span className="text-muted">Concluir “{g.title}”:</span>
              {payable && (
                <Button
                  variant="primary"
                  className="!py-1 text-xs"
                  disabled={act.pending}
                  onClick={() => act.run(() => completeGoalAction(id, g.id, true))}
                >
                  Lançar −{fmtCost(cost!)} e concluir
                </Button>
              )}
              <Button
                variant={payable ? 'default' : 'primary'}
                className="!py-1 text-xs"
                disabled={act.pending}
                onClick={() => act.run(() => completeGoalAction(id, g.id, false))}
              >
                {payable ? 'Concluir sem lançar' : 'Concluir'}
              </Button>
              <Button variant="ghost" className="!py-1 text-xs" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button className="!py-1 text-xs" onClick={() => setConfirming(true)}>
                Concluir
              </Button>
              <Button
                variant="ghost"
                className="!py-1 text-xs"
                disabled={act.pending}
                onClick={() => act.run(() => updateGoalAction(id, g.id, { status: 'dropped' }))}
              >
                Deixar de lado
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Badge({ cost, plan }: { cost: GoalCost; plan?: { affordable: boolean; missing: number } }) {
  if (!cost.currency) return <span className="text-xs text-faint">sem custo</span>;
  if (cost.reached) return <span className="rounded-full bg-ok/15 px-2 py-0.5 text-xs text-ok">já alcançada</span>;
  const missing = plan?.missing ?? 0;
  return (
    <div className="shrink-0 text-right">
      <div className="font-mono text-sm">{fmtCost(cost)}</div>
      {plan?.affordable ? (
        <span className="rounded-full bg-ok/15 px-2 py-0.5 text-xs text-ok">dá para pagar</span>
      ) : (
        <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">
          faltam {cost.currency === 'nuyen' ? fmtNuyen(missing) : `${missing} karma`}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Concluídas / deixadas de lado

const doneFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });

function FinishedGoals({ id, title, goals }: { id: string; title: string; goals: PlayGoal[] }) {
  return (
    <details className="rounded-xl border border-line bg-surface p-4">
      <summary className="cursor-pointer font-display font-semibold">{title}</summary>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {goals.map((g) => (
          <FinishedGoal key={g.id} id={id} goal={g} />
        ))}
      </ul>
    </details>
  );
}

function FinishedGoal({ id, goal: g }: { id: string; goal: PlayGoal }) {
  const act = useAction();
  const paid =
    g.paid != null
      ? g.target.kind === 'nuyen'
        ? fmtNuyen(g.paid)
        : `${g.paid} karma`
      : null;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <span className={cx('min-w-0 flex-1', g.status === 'dropped' && 'text-muted line-through')}>{g.title}</span>
      {g.status === 'done' && (
        <span className="text-xs text-faint">
          {g.completedAt && doneFmt.format(g.completedAt)}
          {paid && ` · pago ${paid}`}
        </span>
      )}
      {g.status === 'dropped' && (
        <Button
          variant="ghost"
          className="!py-0.5 text-xs"
          disabled={act.pending}
          onClick={() => act.run(() => updateGoalAction(id, g.id, { status: 'active' }))}
        >
          Retomar
        </Button>
      )}
      <button
        type="button"
        disabled={act.pending}
        className="text-xs text-faint hover:text-danger"
        onClick={() => {
          if (confirm(`Apagar a meta "${g.title}"? Gastos já lançados continuam no histórico.`))
            act.run(() => deleteGoalAction(id, g.id));
        }}
      >
        apagar
      </button>
      {act.error && <span className="w-full text-xs text-danger">{act.error}</span>}
    </li>
  );
}
