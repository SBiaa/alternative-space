import { cx } from '@/lib/fichas/cx';
import type { SistemaCampanha } from '@/lib/mesa/regras';
import type { Combate } from '@/lib/mesa/regras-combate';

/** A ordem de ação como o jogador vê: NPCs só pelo nome. A lista já vem ordenada (ver `visaoDoJogador`). */
export function CombateLeitura({ combate, sistema, meuId }: { combate: Combate; sistema: SistemaCampanha; meuId: string }) {
  if (!combate.ativo) return <p className="text-sm text-muted">Nenhum combate em andamento.</p>;
  const minhaVez = combate.participantes.some((p) => p.id === combate.turnoId && p.tipo === 'jogador' && p.refId === meuId);
  return (
    <div className="flex flex-col gap-3">
      <p className="font-display text-lg font-semibold">
        Rodada {combate.rodada}
        {sistema === 'sr5' && <span className="ml-2 text-sm font-normal text-muted">passe {combate.passe}</span>}
      </p>
      {minhaVez && <p className="rounded-md bg-accent/15 px-3 py-2 text-sm font-medium text-accent">É a sua vez!</p>}
      <ol className="flex flex-col gap-2">
        {combate.participantes.map((p) => {
          const naVez = combate.turnoId === p.id;
          const eu = p.tipo === 'jogador' && p.refId === meuId;
          return (
            <li
              key={p.id}
              className={cx(
                'flex items-center gap-3 rounded-lg border px-3 py-2',
                naVez ? 'border-accent bg-accent/10' : 'border-line bg-surface-2',
                p.fora && 'opacity-50',
              )}
            >
              <span className="w-4 text-center text-accent">{naVez ? '▶' : ''}</span>
              <span className="min-w-0 flex-1 truncate">
                {p.nome}
                {eu && <span className="ml-2 text-xs text-accent">você</span>}
                {p.fora && <span className="ml-2 text-xs text-faint">fora de combate</span>}
                {p.condicoes && <span className="ml-2 text-xs text-warn">{p.condicoes}</span>}
              </span>
              {p.tipo === 'jogador' && <span className="font-mono text-sm text-muted">{p.iniciativa}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
