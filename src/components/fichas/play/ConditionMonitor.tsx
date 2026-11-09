'use client';

import { useEffect, useRef, useState } from 'react';
import { setDamageAction } from '@/app/fichas/play-actions';
import { conditionState, woundModifier, type ConditionLimits } from '@/lib/fichas/sr5/play';
import { Card, cx } from '../ui';

const STATE_LABEL = {
  ok: null,
  unconscious: 'Inconsciente',
  dying: 'Morrendo: precisa de socorro',
  dead: 'Morto',
} as const;

/**
 * Monitores de condição. Clicar numa caixa marca o dano até ela; clicar na
 * última marcada desmarca uma. Salva sozinho logo depois do clique.
 */
export function ConditionMonitor({
  id,
  limits,
  physical: initialPhysical,
  stun: initialStun,
}: {
  id: string;
  limits: ConditionLimits;
  physical: number;
  stun: number;
}) {
  const [physical, setPhysical] = useState(initialPhysical);
  const [stun, setStun] = useState(initialStun);
  const [error, setError] = useState<string>();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await setDamageAction(id, physical, stun);
        setError(r.ok ? undefined : r.error);
      } catch {
        setError('Sem conexão: o dano não foi salvo.');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [id, physical, stun]);

  const mod = woundModifier(physical, stun, limits);
  const state = STATE_LABEL[conditionState(physical, stun, limits)];
  const toggle = (cur: number, box: number) => (cur === box ? box - 1 : box);

  return (
    <Card
      title="Monitor de condição"
      actions={
        <span className={cx('text-sm', mod < 0 ? 'text-warn' : 'text-faint')}>
          {mod < 0 ? `${mod} nos testes` : 'sem penalidade'}
        </span>
      }
    >
      {state && <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{state}</p>}
      <Track
        label="Físico"
        damage={physical}
        boxes={limits.physical}
        overflow={limits.overflow}
        threshold={limits.woundThreshold}
        onBox={(b) => setPhysical((p) => toggle(p, b))}
      />
      <Track
        label="Atordoamento"
        damage={stun}
        boxes={limits.stun}
        threshold={limits.woundThreshold}
        onBox={(b) => setStun((s) => toggle(s, b))}
      />
      <p className="mt-2 text-xs text-faint">
        Cada {limits.woundThreshold} caixas marcadas dão −1 nos testes. As caixas vermelhas são o transbordamento: se
        encherem, o personagem morre.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

function Track({
  label,
  damage,
  boxes,
  overflow = 0,
  threshold,
  onBox,
}: {
  label: string;
  damage: number;
  boxes: number;
  overflow?: number;
  threshold: number;
  onBox: (box: number) => void;
}) {
  const all = Array.from({ length: boxes + overflow }, (_, i) => i + 1);
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted">
          {Math.min(damage, boxes)}/{boxes}
          {damage > boxes && ` + ${damage - boxes} transb.`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label={`Monitor ${label}`}>
        {all.map((b) => {
          const isOverflow = b > boxes;
          const marked = b <= damage;
          return (
            <button
              key={b}
              type="button"
              aria-label={`${label} ${b}${isOverflow ? ' (transbordamento)' : ''}`}
              aria-pressed={marked}
              onClick={() => onBox(b)}
              className={cx(
                'h-7 w-7 rounded border text-[10px] transition',
                b % threshold === 0 && !isOverflow && 'mr-1.5',
                isOverflow ? 'border-danger/50' : 'border-line-strong',
                marked && !isOverflow && 'border-accent bg-accent/70',
                marked && isOverflow && 'bg-danger/70',
                !marked && 'hover:border-accent/60',
              )}
            >
              {b % threshold === 0 && !isOverflow ? `−${b / threshold}` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
