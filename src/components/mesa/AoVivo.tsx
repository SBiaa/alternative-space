'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  adicionarAvulsoAction,
  adicionarJogadorAction,
  adicionarNpcAoCombateAction,
  encerrarCombateAction,
  iniciarCombateAction,
  mudarParticipanteAction,
  novaRodadaAction,
  proximoTurnoAction,
  rolarNpcsAction,
  tirarDoCombateAction,
} from '@/app/mesa/actions-ao-vivo';
import { Button, cx, inputClass } from '@/components/fichas/ui';
import type { SistemaCampanha } from '@/lib/mesa/regras';
import { ordenar, pontuacaoNoPasse, type Combate, type Participante } from '@/lib/mesa/regras-combate';
import { Aviso, useMesa } from './MesaForms';

/** Pede dados novos ao servidor de tempos em tempos, só com a aba à vista e sem ninguém digitando. */
export function AutoAtualizar({ segundos = 5 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const a = document.activeElement;
      if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement) return;
      router.refresh();
    }, segundos * 1000);
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [router, segundos]);
  return null;
}

const miniInput = cx(inputClass, 'w-16 px-2 py-1 text-center font-mono');

interface Props {
  campanhaId: string;
  sistema: SistemaCampanha;
  combate: Combate;
  jogadores: { userId: string; nome: string }[];
  npcs: { id: string; nome: string }[];
}

export function CombateMestre({ campanhaId, sistema, combate, jogadores, npcs }: Props) {
  const { pending, erro, mensagem, run } = useMesa();
  const sr5 = sistema === 'sr5';
  const ordem = ordenar(combate.participantes);
  const foraDoCombate = jogadores.filter((j) => !combate.participantes.some((p) => p.tipo === 'jogador' && p.refId === j.userId));

  const [npcId, setNpcId] = useState('');
  const [qtd, setQtd] = useState('1');
  const [avulso, setAvulso] = useState('');
  const [avulsoIni, setAvulsoIni] = useState('');
  const [jogadorId, setJogadorId] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-display text-lg font-semibold">
          {combate.ativo ? (
            <>
              Rodada {combate.rodada}
              {sr5 && <span className="ml-2 text-sm font-normal text-muted">passe {combate.passe}</span>}
            </>
          ) : (
            'Combate parado'
          )}
        </p>
        {combate.ativo ? (
          <>
            <Button variant="primary" disabled={pending} onClick={() => run(() => proximoTurnoAction(campanhaId))}>
              Próximo turno
            </Button>
            <Button disabled={pending} onClick={() => run(() => novaRodadaAction(campanhaId))}>
              Nova rodada
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (confirm('Encerrar o combate? A lista de participantes é limpa.')) run(() => encerrarCombateAction(campanhaId));
              }}
            >
              Encerrar
            </Button>
          </>
        ) : (
          <Button variant="primary" disabled={pending || !combate.participantes.length} onClick={() => run(() => iniciarCombateAction(campanhaId))}>
            Começar combate
          </Button>
        )}
        {combate.participantes.some((p) => p.tipo === 'npc') && (
          <Button variant="ghost" disabled={pending} onClick={() => run(() => rolarNpcsAction(campanhaId))}>
            Rolar iniciativa dos NPCs
          </Button>
        )}
      </div>
      <Aviso erro={erro} mensagem={mensagem} />

      {ordem.length === 0 ? (
        <p className="text-sm text-muted">Ninguém no combate. Adicione jogadores, NPCs ou alguém avulso abaixo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordem.map((p) => (
            <Linha
              key={p.id}
              campanhaId={campanhaId}
              p={p}
              sr5={sr5}
              naVez={combate.ativo && combate.turnoId === p.id}
              sairiaNoPasse={combate.ativo && sr5 && pontuacaoNoPasse(p, combate.passe, sistema) <= 0}
            />
          ))}
        </ul>
      )}

      <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-faint">Jogador</span>
          <select className={inputClass} value={jogadorId} onChange={(e) => setJogadorId(e.target.value)} aria-label="Jogador">
            <option value="">Escolher…</option>
            {foraDoCombate.map((j) => (
              <option key={j.userId} value={j.userId}>
                {j.nome}
              </option>
            ))}
          </select>
          <Button
            disabled={pending || !jogadorId}
            onClick={() => run(() => adicionarJogadorAction(campanhaId, jogadorId), () => setJogadorId(''))}
          >
            Adicionar (rola pela ficha)
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-faint">NPC ou inimigo</span>
          <div className="flex gap-2">
            <select className={inputClass} value={npcId} onChange={(e) => setNpcId(e.target.value)} aria-label="NPC">
              <option value="">{npcs.length ? 'Escolher…' : 'Crie NPCs na aba NPCs'}</option>
              {npcs.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </select>
            <input className={cx(inputClass, 'w-16 text-center')} inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} aria-label="Quantos" />
          </div>
          <Button disabled={pending || !npcId} onClick={() => run(() => adicionarNpcAoCombateAction(campanhaId, npcId, Number(qtd)))}>
            Adicionar (rola a iniciativa)
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-faint">Avulso</span>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Nome" value={avulso} onChange={(e) => setAvulso(e.target.value)} maxLength={80} />
            <input className={cx(inputClass, 'w-20 text-center')} inputMode="numeric" placeholder="Inic." value={avulsoIni} onChange={(e) => setAvulsoIni(e.target.value)} />
          </div>
          <Button
            disabled={pending || !avulso.trim()}
            onClick={() =>
              run(() => adicionarAvulsoAction(campanhaId, avulso, avulsoIni), () => {
                setAvulso('');
                setAvulsoIni('');
              })
            }
          >
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

const NOME_TIPO = { jogador: 'jogador', npc: 'NPC', avulso: 'avulso' } as const;

function Linha({ campanhaId, p, sr5, naVez, sairiaNoPasse }: { campanhaId: string; p: Participante; sr5: boolean; naVez: boolean; sairiaNoPasse: boolean }) {
  const { pending, erro, run } = useMesa();
  const muda = (m: Parameters<typeof mudarParticipanteAction>[2]) => run(() => mudarParticipanteAction(campanhaId, p.id, m));
  const controlaDano = p.tipo === 'npc' && p.max > 0;
  const caido = controlaDano && p.dano >= p.max;

  return (
    <li
      className={cx(
        'flex flex-col gap-2 rounded-lg border p-3',
        naVez ? 'border-accent bg-accent/10' : 'border-line bg-surface-2',
        (p.fora || sairiaNoPasse) && 'opacity-50',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-4 text-center text-accent" aria-label={naVez ? 'Na vez' : undefined}>
          {naVez ? '▶' : ''}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {p.nome}
          <span className="ml-2 text-xs font-normal text-faint">{NOME_TIPO[p.tipo]}</span>
          {caido && <span className="ml-2 text-xs text-danger">caído</span>}
          {sairiaNoPasse && !p.fora && <span className="ml-2 text-xs text-faint">sem ação neste passe</span>}
        </span>
        <label className="flex items-center gap-1.5 text-xs text-faint">
          Inic.
          <input
            key={`ini-${p.id}-${p.iniciativa}`}
            className={miniInput}
            inputMode="numeric"
            defaultValue={p.iniciativa}
            disabled={pending}
            onBlur={(e) => e.target.value !== String(p.iniciativa) && muda({ iniciativa: e.target.value })}
          />
        </label>
        {controlaDano && (
          <Contador rotulo={sr5 ? 'Físico' : 'Dano'} valor={p.dano} max={p.max} disabled={pending} onChange={(v) => muda({ dano: v })} />
        )}
        {p.tipo === 'npc' && sr5 && p.maxAtord > 0 && (
          <Contador rotulo="Atord." valor={p.atordoamento} max={p.maxAtord} disabled={pending} onChange={(v) => muda({ atordoamento: v })} />
        )}
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={p.fora} disabled={pending} onChange={(e) => muda({ fora: e.target.checked })} />
          fora
        </label>
        <button
          type="button"
          disabled={pending}
          className="text-xs text-faint hover:text-danger disabled:opacity-40"
          onClick={() => run(() => tirarDoCombateAction(campanhaId, p.id))}
        >
          tirar
        </button>
      </div>
      <input
        key={`cond-${p.id}-${p.condicoes}`}
        className={cx(inputClass, 'py-1 text-xs')}
        placeholder="Condições (visível para a mesa)"
        defaultValue={p.condicoes}
        maxLength={120}
        disabled={pending}
        onBlur={(e) => e.target.value.trim() !== p.condicoes && muda({ condicoes: e.target.value })}
      />
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </li>
  );
}

function Contador({ rotulo, valor, max, disabled, onChange }: { rotulo: string; valor: number; max: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <span className="flex items-center gap-1 text-xs text-faint">
      {rotulo}
      <button type="button" disabled={disabled || valor <= 0} className="h-6 w-6 rounded border border-line-strong text-muted hover:text-ink disabled:opacity-40" onClick={() => onChange(valor - 1)} aria-label={`Menos ${rotulo}`}>
        −
      </button>
      <span className={cx('w-12 text-center font-mono text-sm', valor >= max ? 'text-danger' : valor > 0 ? 'text-warn' : 'text-ink')}>
        {valor}/{max}
      </span>
      <button type="button" disabled={disabled} className="h-6 w-6 rounded border border-line-strong text-muted hover:text-ink disabled:opacity-40" onClick={() => onChange(valor + 1)} aria-label={`Mais ${rotulo}`}>
        +
      </button>
    </span>
  );
}
