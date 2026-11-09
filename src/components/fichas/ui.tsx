'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Help } from '@/lib/fichas/sr5/help';
import type { Budget, Issue } from '@/lib/fichas/sr5/rules';

import { cx } from '@/lib/fichas/cx';

export { cx };

// ---------------------------------------------------------------------------
// "?" com explicação curta

export function HelpTip({ help, title, className }: { help?: Help; title?: string; className?: string }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const open = pos !== null;
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  const toggle = (btn: HTMLElement) => {
    if (open) return setPos(null);
    const r = btn.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8));
    setPos({ left, top: r.bottom + 8 });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (!help) return null;
  return (
    <span ref={ref} className={cx('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={title ? `O que é ${title}?` : 'Explicação'}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          toggle(e.currentTarget);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line-strong text-[11px] font-semibold text-muted transition hover:border-accent hover:text-accent"
      >
        ?
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{ left: pos.left, top: pos.top, width: Math.min(288, window.innerWidth - 16) }}
          className="fixed z-50 rounded-lg border border-line-strong bg-surface-3 p-3 text-left text-sm font-normal normal-case leading-relaxed tracking-normal text-ink shadow-2xl shadow-black/50"
        >
          {title && <span className="mb-1 block font-display font-semibold text-accent">{title}</span>}
          <span className="block">{help.text}</span>
          {help.fits && (
            <span className="mt-2 block text-muted">
              <span className="text-accent-2">Combina com quem quer</span> {help.fits}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------

export function Button({
  children,
  variant = 'default',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' | 'danger' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-accent-ink hover:brightness-110',
        variant === 'default' && 'border border-line-strong bg-surface-2 text-ink hover:border-accent/60',
        variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-ink',
        variant === 'danger' && 'border border-danger/40 text-danger hover:bg-danger/10',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Campo numérico com − e +. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  size = 'md',
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const btn =
    'flex items-center justify-center text-muted transition hover:text-accent disabled:opacity-30 disabled:hover:text-muted';
  const h = size === 'sm' ? 'h-7' : 'h-8';
  return (
    <div className={cx('inline-flex items-stretch overflow-hidden rounded-md border border-line-strong bg-surface', h)}>
      <button type="button" className={cx(btn, 'w-7')} aria-label={`Diminuir ${label}`}
        disabled={disabled || value <= min} onClick={() => onChange(clamp(value - 1))}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        disabled={disabled}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(clamp(Math.round(n)));
        }}
        className="w-9 border-x border-line bg-transparent text-center font-mono text-sm text-ink outline-none"
      />
      <button type="button" className={cx(btn, 'w-7')} aria-label={`Aumentar ${label}`}
        disabled={disabled || value >= max} onClick={() => onChange(clamp(value + 1))}>
        +
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Cartão selecionável. Quando indisponível, fica apagado e mostra o motivo. */
export function OptionCard({
  title,
  subtitle,
  help,
  selected,
  disabled,
  reason,
  onSelect,
  children,
  badge,
}: {
  title: string;
  subtitle?: ReactNode;
  help?: Help;
  selected?: boolean;
  disabled?: boolean;
  reason?: string;
  onSelect?: () => void;
  children?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'group relative flex flex-col rounded-xl border p-4 text-left transition',
        selected
          ? 'border-accent bg-accent/[0.07] shadow-[0_0_0_1px_var(--color-accent),0_0_24px_-8px_var(--color-accent)]'
          : 'border-line bg-surface',
        disabled ? 'opacity-55' : 'hover:border-line-strong',
      )}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={onSelect}
        className="absolute inset-0 rounded-xl disabled:cursor-not-allowed"
        aria-label={`${title}${disabled && reason ? ` — indisponível: ${reason}` : ''}`}
      />
      <div className="pointer-events-none relative flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-base font-semibold text-ink">{title}</div>
          {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {badge}
          <HelpTip help={help} title={title} />
        </div>
      </div>
      {children && <div className="pointer-events-none relative mt-3 text-sm text-muted">{children}</div>}
      {disabled && reason && (
        <div className="pointer-events-none relative mt-3 flex gap-1.5 text-xs text-warn">
          <span aria-hidden>⊘</span>
          <span>{reason}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function IssueList({ issues, compact }: { issues: Issue[]; compact?: boolean }) {
  if (!issues.length) return null;
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <ul className={cx('flex flex-col', compact ? 'gap-1' : 'gap-1.5')} aria-live="polite">
      {sorted.map((i, n) => (
        <li
          key={`${i.code}-${n}`}
          className={cx(
            'flex gap-2 rounded-md border-l-2 px-3 py-1.5 text-sm',
            i.severity === 'error' && 'border-danger bg-danger/[0.08] text-ink',
            i.severity === 'warning' && 'border-warn bg-warn/[0.06] text-ink',
            i.severity === 'info' && 'border-line-strong bg-surface-2 text-muted',
          )}
        >
          <span aria-hidden className={cx(
            'mt-px shrink-0 font-mono text-xs',
            i.severity === 'error' && 'text-danger',
            i.severity === 'warning' && 'text-warn',
          )}>
            {i.severity === 'error' ? '✕' : i.severity === 'warning' ? '!' : 'i'}
          </span>
          <span>
            <span className="sr-only">{i.severity === 'error' ? 'Erro: ' : i.severity === 'warning' ? 'Aviso: ' : 'Dica: '}</span>
            {i.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Pílula "restam X de Y" para um orçamento. */
export function BudgetMeter({
  label,
  budget,
  format = (n) => String(n),
  help,
}: {
  label: string;
  budget: Budget;
  format?: (n: number) => string;
  help?: Help;
}) {
  const over = budget.remaining < 0;
  const done = budget.remaining === 0 && budget.total > 0;
  const pct = budget.total > 0 ? Math.min(100, (budget.spent / budget.total) * 100) : over ? 100 : 0;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 truncate text-muted">
          {label}
          {help && <HelpTip help={help} title={label} />}
        </span>
        <span className={cx('font-mono tabular-nums', over ? 'text-danger' : done ? 'text-ok' : 'text-ink')}>
          {format(budget.remaining)}
          <span className="text-faint"> / {format(budget.total)}</span>
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cx('h-full rounded-full transition-all', over ? 'bg-danger' : done ? 'bg-ok' : 'bg-accent')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Card({ title, help, children, actions, className }: {
  title?: ReactNode; help?: Help; children: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <section className={cx('rounded-xl border border-line bg-surface p-4 sm:p-5', className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              {title}
              {help && <HelpTip help={help} title={typeof title === 'string' ? title : undefined} />}
            </h3>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-accent';

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={inputClass}
    />
  );
}

/** Busca sem acento e sem diferenciar maiúsculas. */
export function matches(text: string, query: string): boolean {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return norm(text).includes(norm(query.trim()));
}

export function StepIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="mb-5">
      <h2 className="font-display text-2xl font-semibold tracking-wide sm:text-3xl">{title}</h2>
      <div className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{children}</div>
    </header>
  );
}
