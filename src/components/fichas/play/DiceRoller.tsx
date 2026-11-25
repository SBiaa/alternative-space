'use client';

import { useState } from 'react';
import { type InitiativeRoll, MAX_POOL, type PoolRoll, rollInitiative, rollPool } from '@/lib/fichas/sr5/dice';
import type { RulesResult } from '@/lib/fichas/sr5/rules';
import { Button, Card, cx, Stepper } from '../ui';

const FACE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/** Rolador de dados da mesa: reserva, limite, Regra do Seis e iniciativa. */
export function DiceRoller({ result }: { result: RulesResult }) {
  const [pool, setPool] = useState(8);
  const [limit, setLimit] = useState(0);
  const [edge, setEdge] = useState(false);
  const [roll, setRoll] = useState<PoolRoll>();
  const [init, setInit] = useState<{ kind: string; roll: InitiativeRoll }>();

  const ini = result.derived.initiative;
  const astral = result.derived.astralInitiative;
  const matrix = result.derived.matrixInitiative;
  const options = [
    { key: 'Física', base: ini.base, dice: ini.dice },
    ...(astral ? [{ key: 'Astral', base: astral.base, dice: astral.dice }] : []),
    ...(matrix ? [
      { key: 'Matriz (RA)', base: matrix.ar.base, dice: matrix.ar.dice },
      { key: 'Matriz (sim. fria)', base: matrix.coldSim.base, dice: matrix.coldSim.dice },
      { key: 'Matriz (sim. quente)', base: matrix.hotSim.base, dice: matrix.hotSim.dice },
    ] : []),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Teste de reserva de dados">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">dados
            <Stepper label="Reserva de dados" value={pool} min={0} max={MAX_POOL} onChange={setPool} />
          </label>
          <label className="flex items-center gap-2">limite
            <Stepper label="Limite (0 = sem limite)" value={limit} min={0} max={30} onChange={setLimit} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={edge} onChange={(e) => setEdge(e.target.checked)} />
            Regra do Seis (Edge)
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="primary" onClick={() => setRoll(rollPool(pool, { limit: limit || undefined, edge }))}>Rolar</Button>
          {roll && <Button variant="ghost" onClick={() => setRoll(undefined)}>Limpar</Button>}
        </div>
        {roll && (
          <div className="mt-4" aria-live="polite">
            <div className="flex flex-wrap gap-1 text-2xl leading-none" aria-label={`Dados: ${roll.dice.join(', ')}`}>
              {roll.dice.map((d, i) => (
                <span key={i} className={cx(d >= 5 ? 'text-accent' : d === 1 ? 'text-danger' : 'text-faint')}>{FACE[d - 1]}</span>
              ))}
            </div>
            <p className="mt-2 text-lg">
              <strong className="font-mono">{roll.hitsLimited}</strong> {roll.hitsLimited === 1 ? 'acerto' : 'acertos'}
              {roll.limited && <span className="text-sm text-muted"> (de {roll.hits}, cortados pelo limite)</span>}
            </p>
            {roll.criticalGlitch && <p className="text-sm font-semibold text-danger">Falha crítica! Sem acertos e mais da metade dos dados deu 1.</p>}
            {roll.glitch && !roll.criticalGlitch && <p className="text-sm font-semibold text-warn">Falha: mais da metade dos dados deu 1.</p>}
          </div>
        )}
      </Card>

      <Card title="Iniciativa">
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <div key={o.key} className="flex items-center gap-3 text-sm">
              <span className="w-44">{o.key}</span>
              <span className="font-mono text-muted">{o.base} + {o.dice}d6</span>
              <Button className="!px-2.5 !py-1 text-xs" onClick={() => setInit({ kind: o.key, roll: rollInitiative(o.base, o.dice) })}>Rolar</Button>
            </div>
          ))}
        </div>
        {init && (
          <p className="mt-4 text-lg" aria-live="polite">
            {init.kind}: <strong className="font-mono">{init.roll.total}</strong>
            <span className="text-sm text-muted"> ({init.roll.dice.join(' + ')} + base)</span>
          </p>
        )}
        <p className="mt-4 text-xs text-faint">A iniciativa já considera seus atributos atuais. Limite 0 desliga o limite no teste de reserva.</p>
      </Card>
    </div>
  );
}
