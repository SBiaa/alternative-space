'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { resetDraft, setStep, useWizard } from '@/lib/fichas/store';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { blockingErrors, evaluate, issuesForStep, type RulesResult, type StepKey } from '@/lib/fichas/sr5/rules';
import { Button, cx, IssueList } from '../ui';
import { Glossary } from './Glossary';
import { SummaryPanel } from './SummaryPanel';
import { ConceptStep } from '../steps/ConceptStep';
import { PrioritiesStep } from '../steps/PrioritiesStep';
import { MetatypeStep } from '../steps/MetatypeStep';
import { AttributesStep } from '../steps/AttributesStep';
import { MagicStep } from '../steps/MagicStep';
import { QualitiesStep } from '../steps/QualitiesStep';
import { SkillsStep } from '../steps/SkillsStep';
import { ResourcesStep } from '../steps/ResourcesStep';
import { ContactsStep } from '../steps/ContactsStep';
import { ReviewStep } from '../steps/ReviewStep';

export interface StepProps {
  draft: CharacterDraft;
  result: RulesResult;
  goTo: (key: StepKey) => void;
}

const STEPS: { key: StepKey; title: string; Component: (p: StepProps) => ReactNode }[] = [
  { key: 'concept', title: 'Conceito', Component: ConceptStep },
  { key: 'priorities', title: 'Prioridades', Component: PrioritiesStep },
  { key: 'metatype', title: 'Metatipo', Component: MetatypeStep },
  { key: 'attributes', title: 'Atributos', Component: AttributesStep },
  { key: 'magic', title: 'Magia/Ressonância', Component: MagicStep },
  { key: 'qualities', title: 'Qualidades', Component: QualitiesStep },
  { key: 'skills', title: 'Perícias', Component: SkillsStep },
  { key: 'resources', title: 'Recursos', Component: ResourcesStep },
  { key: 'contacts', title: 'Contatos', Component: ContactsStep },
  { key: 'review', title: 'Revisão', Component: ReviewStep },
];

/**
 * `account`: link de entrar/conta (fica fora do assistente para os testes não dependerem do login).
 * `actions`: substitui o botão "Nova ficha" (na ficha da conta: status de salvamento e link para a lista).
 */
export function Wizard({ account, actions }: { account?: ReactNode; actions?: ReactNode } = {}) {
  const w = useWizard();
  const draft = w?.draft;
  const result = useMemo(() => (draft ? evaluate(draft) : null), [draft]);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const stepIndex = w ? Math.min(Math.max(w.step, 0), STEPS.length - 1) : 0;

  useEffect(() => {
    mainRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [stepIndex]);

  if (!w || !draft || !result) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <span className="animate-pulse font-display tracking-widest">CARREGANDO FICHA…</span>
      </div>
    );
  }

  const step = STEPS[stepIndex];
  const errorsByStep = STEPS.map((s) => blockingErrors(result, s.key).length);
  const firstBlocked = errorsByStep.findIndex((n) => n > 0);
  const canReach = (i: number) => i <= stepIndex || firstBlocked === -1 || i <= firstBlocked;
  const blocking = blockingErrors(result, step.key);
  const stepIssues = issuesForStep(result, step.key);
  const goTo = (key: StepKey) => setStep(STEPS.findIndex((s) => s.key === key));
  const Current = step.Component;

  return (
    <div className="flex flex-1 flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 sm:flex-nowrap sm:py-3 sm:px-6">
          <div className="flex min-w-0 shrink-0 items-baseline gap-3">
            <Link href="/fichas" className="etiqueta whitespace-nowrap text-[11px] text-accent no-underline hover:text-ink">← Fichas</Link>
            <span className="truncate font-display text-lg font-semibold text-ink">Shadowrun 5ª edição</span>
          </div>
          <div className="-mx-2 flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] sm:mx-0">
            <Button variant="ghost" className="!px-2 sm:!px-3.5" onClick={() => setGlossaryOpen(true)}>Glossário</Button>
            <Button variant="ghost" className="!px-2 sm:!px-3.5 lg:hidden" onClick={() => setSummaryOpen(true)}>Resumo</Button>
            {actions ?? (
              <Button
                variant="ghost"
                className="whitespace-nowrap !px-2 sm:!px-3.5"
                onClick={() => {
                  if (confirm('Começar uma ficha nova? A atual será apagada deste navegador.')) resetDraft();
                }}
              >
                Nova ficha
              </Button>
            )}
            {account}
          </div>
        </div>
        <ProgressBar
          index={stepIndex}
          errors={errorsByStep}
          canReach={canReach}
        />
      </header>

      <div ref={mainRef} className="mx-auto grid w-full max-w-7xl flex-1 scroll-mt-32 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0">
          <Current draft={draft} result={result} goTo={goTo} />

          {step.key !== 'review' && stepIssues.length > 0 && (
            <div className="no-print mt-6">
              <IssueList issues={stepIssues} />
            </div>
          )}

          <nav className="no-print mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5" aria-label="Navegação dos passos">
            <Button onClick={() => setStep(stepIndex - 1)} disabled={stepIndex === 0}>← Voltar</Button>
            <div className="flex items-center gap-3">
              {blocking.length > 0 && (
                <span className="text-sm text-danger">
                  Corrija {blocking.length === 1 ? 'o erro' : `os ${blocking.length} erros`} acima para avançar
                </span>
              )}
              {stepIndex < STEPS.length - 1 && (
                <Button variant="primary" onClick={() => setStep(stepIndex + 1)} disabled={blocking.length > 0}>
                  Avançar: {STEPS[stepIndex + 1].title} →
                </Button>
              )}
            </div>
          </nav>
        </main>

        <aside className="no-print hidden lg:block">
          <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-xl border border-line bg-surface/80 p-4">
            <SummaryPanel draft={draft} result={result} />
          </div>
        </aside>
      </div>

      <Drawer open={glossaryOpen} onClose={() => setGlossaryOpen(false)} title="Glossário">
        <Glossary />
      </Drawer>
      <Drawer open={summaryOpen} onClose={() => setSummaryOpen(false)} title="Resumo da ficha">
        <SummaryPanel draft={draft} result={result} />
      </Drawer>
    </div>
  );
}

function ProgressBar({ index, errors, canReach }: { index: number; errors: number[]; canReach: (i: number) => boolean }) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    const list = listRef.current;
    if (el && list) list.scrollTo({ left: el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [index]);
  const pct = (index / (STEPS.length - 1)) * 100;
  return (
    <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
      <div className="mb-2 h-0.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={index + 1} aria-label="Progresso">
        <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol ref={listRef} className="relative flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
        {STEPS.map((s, i) => {
          const current = i === index;
          const reachable = canReach(i);
          return (
            <li key={s.key} className="shrink-0">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => setStep(i)}
                aria-current={current ? 'step' : undefined}
                title={reachable ? s.title : 'Resolva os erros dos passos anteriores primeiro'}
                className={cx(
                  'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition',
                  current ? 'bg-accent/15 text-accent' : 'text-muted hover:text-ink',
                  !reachable && 'cursor-not-allowed opacity-40 hover:text-muted',
                )}
              >
                <span className={cx(
                  'flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[10px]',
                  current ? 'border-accent' : i < index && !errors[i] ? 'border-ok/60 text-ok' : 'border-line-strong',
                )}>
                  {i < index && !errors[i] ? '✓' : i + 1}
                </span>
                <span className={cx(current ? 'inline' : 'hidden md:inline')}>{s.title}</span>
                {errors[i] > 0 && i < index && <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-label="tem erros" />}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="no-print m-0 ml-auto h-dvh max-h-dvh w-full max-w-md bg-transparent p-0 text-ink"
    >
      <div className="flex h-full flex-col border-l border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Fechar">✕</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}
