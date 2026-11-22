'use client';

import { useState } from 'react';
import { apagarNpcAction, criarNpcAction, duplicarNpcAction, editarNpcAction } from '@/app/mesa/actions-ao-vivo';
import { Button, cx, Field, inputClass } from '@/components/fichas/ui';
import type { SistemaCampanha } from '@/lib/mesa/regras';
import { CAMPOS_NPC, LIMITE_ATAQUES, LIMITE_NOME_NPC, LIMITE_NOTAS_NPC, NOME_TIPO_NPC, TIPOS_NPC, type DadosNpc, type TipoNpc } from '@/lib/mesa/regras-npcs';
import { Aviso, useMesa } from './MesaForms';

export interface NpcItem {
  id: string;
  nome: string;
  tipo: TipoNpc;
  dados: DadosNpc;
  notas: string;
}

const textareaClass = cx(inputClass, 'min-h-20 resize-y leading-relaxed');

export function NpcForm({ campanhaId, sistema, npc, onFeito }: { campanhaId: string; sistema: SistemaCampanha; npc?: NpcItem; onFeito?: () => void }) {
  const campos = CAMPOS_NPC[sistema];
  const { pending, erro, mensagem, run } = useMesa();
  const inicial = () => Object.fromEntries(campos.map((c) => [c.chave, String(npc?.dados[c.chave] ?? c.padrao)]));
  const [nome, setNome] = useState(npc?.nome ?? '');
  const [tipo, setTipo] = useState<TipoNpc>(npc?.tipo ?? 'npc');
  const [numeros, setNumeros] = useState<Record<string, string>>(inicial);
  const [ataques, setAtaques] = useState(String(npc?.dados.ataques ?? ''));
  const [notas, setNotas] = useState(npc?.notas ?? '');

  const enviar = () => {
    const dados = { ...numeros, ataques };
    const corpo = { nome, tipo, dados, notas };
    run(
      () => (npc ? editarNpcAction(campanhaId, npc.id, corpo) : criarNpcAction(campanhaId, corpo)),
      () => {
        if (npc) return onFeito?.();
        setNome('');
        setNumeros(inicial());
        setAtaques('');
        setNotas('');
        onFeito?.();
      },
    );
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <Field label="Nome">
          <input className={inputClass} value={nome} maxLength={LIMITE_NOME_NPC} onChange={(e) => setNome(e.target.value)} placeholder="Segurança da Ares" />
        </Field>
        <Field label="Tipo">
          <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value as TipoNpc)}>
            {TIPOS_NPC.map((t) => (
              <option key={t} value={t}>
                {NOME_TIPO_NPC[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {campos.map((c) => (
          <Field key={c.chave} label={c.rotulo}>
            <input
              className={inputClass}
              inputMode="numeric"
              value={numeros[c.chave] ?? ''}
              onChange={(e) => setNumeros((n) => ({ ...n, [c.chave]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      <Field label="Ataques">
        <textarea className={textareaClass} value={ataques} maxLength={LIMITE_ATAQUES} onChange={(e) => setAtaques(e.target.value)} placeholder="Pistola pesada, 5P, -2 PA" />
      </Field>
      <Field label="Notas" hint="Só você vê.">
        <textarea className={textareaClass} value={notas} maxLength={LIMITE_NOTAS_NPC} onChange={(e) => setNotas(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending || !nome.trim()}>
          {npc ? 'Salvar' : 'Criar NPC'}
        </Button>
        {npc && onFeito && (
          <Button variant="ghost" onClick={onFeito}>
            Cancelar
          </Button>
        )}
        <Aviso erro={erro} mensagem={mensagem} />
      </div>
    </form>
  );
}

function resumo(sistema: SistemaCampanha, d: DadosNpc): string {
  if (sistema === 'sr5') return `Inic. ${d.iniciativaBase}+${d.dados}d6 · Físico ${d.fisico} · Atord. ${d.atordoamento} · Armadura ${d.armadura} · Defesa ${d.defesa}`;
  if (sistema === 'pf2e') return `PV ${d.pvMax} · CA ${d.ca} · Percepção ${d.percepcao} · Fort ${d.fortitude} · Ref ${d.reflexos} · Von ${d.vontade}`;
  return `Vida ${d.pvMax} · Iniciativa ${d.iniciativaMod}`;
}

function NpcLinha({ campanhaId, sistema, npc }: { campanhaId: string; sistema: SistemaCampanha; npc: NpcItem }) {
  const [editando, setEditando] = useState(false);
  const [copias, setCopias] = useState('3');
  const { pending, erro, mensagem, run } = useMesa();
  if (editando) {
    return (
      <li className="rounded-lg border border-line bg-surface-2 p-3">
        <NpcForm campanhaId={campanhaId} sistema={sistema} npc={npc} onFeito={() => setEditando(false)} />
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-medium">
          {npc.nome}
          <span className={cx('ml-2 text-xs font-normal', npc.tipo === 'inimigo' ? 'text-danger' : 'text-muted')}>{NOME_TIPO_NPC[npc.tipo]}</span>
        </p>
        <Button variant="ghost" onClick={() => setEditando(true)}>
          Editar
        </Button>
        <span className="flex items-center gap-1">
          <input className={cx(inputClass, 'w-14 px-2 py-1 text-center')} inputMode="numeric" value={copias} onChange={(e) => setCopias(e.target.value)} aria-label="Quantas cópias" />
          <Button disabled={pending} onClick={() => run(() => duplicarNpcAction(campanhaId, npc.id, Number(copias)))}>
            Duplicar
          </Button>
        </span>
        <button
          type="button"
          disabled={pending}
          className="text-xs text-faint hover:text-danger disabled:opacity-40"
          onClick={() => {
            if (confirm(`Apagar ${npc.nome}?`)) run(() => apagarNpcAction(campanhaId, npc.id));
          }}
        >
          apagar
        </button>
      </div>
      <p className="font-mono text-xs text-muted">{resumo(sistema, npc.dados)}</p>
      {npc.dados.ataques && <p className="whitespace-pre-wrap text-sm text-muted">{String(npc.dados.ataques)}</p>}
      {npc.notas && <p className="whitespace-pre-wrap text-sm text-faint">{npc.notas}</p>}
      <Aviso erro={erro} mensagem={mensagem} />
    </li>
  );
}

export function NpcLista({ campanhaId, sistema, npcs }: { campanhaId: string; sistema: SistemaCampanha; npcs: NpcItem[] }) {
  if (!npcs.length) return <p className="text-sm text-muted">Nenhum NPC ainda. Crie o primeiro ao lado.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {npcs.map((n) => (
        <NpcLinha key={n.id} campanhaId={campanhaId} sistema={sistema} npc={n} />
      ))}
    </ul>
  );
}
