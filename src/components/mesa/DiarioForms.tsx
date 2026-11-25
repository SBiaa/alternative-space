'use client';

import { useState } from 'react';
import {
  aceitarRecompensaAction,
  cancelarRecompensaAction,
  darRecompensaAction,
  recusarRecompensaAction,
  salvarMeuDiarioAction,
} from '@/app/mesa/actions-diario';
import { Button, cx, Field, inputClass } from '@/components/fichas/ui';
import type { SistemaCampanha } from '@/lib/mesa/regras';
import {
  descreverRecompensa,
  LIMITE_DESCRICAO,
  LIMITE_DIARIO,
  NOME_STATUS_RECOMPENSA,
  NOME_TIPO_RECOMPENSA,
  TIPOS_DO_SISTEMA,
  textoDasRecompensas,
  type StatusRecompensa,
  type TipoRecompensa,
} from '@/lib/mesa/regras-recompensas';
import { Aviso, BotaoTexto, useMesa } from './MesaForms';

const textareaClass = cx(inputClass, 'min-h-28 resize-y leading-relaxed');

/** Só os campos que a tela precisa (e que cabem no caminho do servidor para o navegador). */
export interface RecompensaItem {
  id: string;
  nome: string;
  tipo: TipoRecompensa;
  quantidade: number;
  descricao: string;
  status: StatusRecompensa;
  naFicha: boolean;
}

const DICA_XP = 'O XP fica registrado na Mesa (a ficha não tem campo de XP) e aparece no Resumo da campanha.';
const DICAS: Record<SistemaCampanha, Partial<Record<TipoRecompensa, string>>> = {
  sr5: {
    karma: 'Cai no histórico de karma da ficha quando o jogador aceitar.',
    nuyen: 'Cai no histórico de nuyen da ficha quando o jogador aceitar.',
    item: 'Fica só registrado: o jogador anota na ficha.',
  },
  pf2e: {
    po: 'Soma nas peças de ouro da ficha quando o jogador aceitar.',
    item: 'Entra no inventário da ficha quando o jogador aceitar.',
  },
  outro: { item: 'Fica só registrado: o jogador anota onde guarda a ficha.' },
};

const chipStatus: Record<StatusRecompensa, string> = {
  pendente: 'bg-warn/15 text-warn',
  aceita: 'bg-accent/15 text-accent',
  recusada: 'bg-danger/15 text-danger',
  cancelada: 'text-faint',
};

function ChipStatus({ status }: { status: StatusRecompensa }) {
  return <span className={cx('rounded-full px-2 py-0.5 text-xs', chipStatus[status])}>{NOME_STATUS_RECOMPENSA[status]}</span>;
}

// ---------------------------------------------------------------------------
// Mestre: dar recompensa

export function DarRecompensa({
  campanhaId,
  sessaoId,
  sistema,
  jogadores,
}: {
  campanhaId: string;
  sessaoId: string;
  sistema: SistemaCampanha;
  jogadores: { userId: string; nome: string }[];
}) {
  const tipos = TIPOS_DO_SISTEMA[sistema];
  const [tipo, setTipo] = useState<TipoRecompensa>(tipos[0]);
  const [quantidade, setQuantidade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [paraTodos, setParaTodos] = useState(true);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const { pending, erro, mensagem, run } = useMesa();
  const dica = tipo === 'xp' ? DICA_XP : DICAS[sistema][tipo];
  const ehItem = tipo === 'item';

  if (!jogadores.length) return <p className="text-sm text-muted">Ainda não há jogadores na campanha para receber recompensas.</p>;

  return (
    <form
      className="flex flex-col gap-3"
      aria-label="Dar recompensa"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => darRecompensaAction(campanhaId, sessaoId, { tipo, quantidade: Number(quantidade), descricao, para: paraTodos ? 'todos' : escolhidos }),
          () => {
            setQuantidade('');
            setDescricao('');
          },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="O que dar">
          <select
            className={inputClass}
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoRecompensa);
              setQuantidade('');
            }}
          >
            {tipos.map((t) => (
              <option key={t} value={t}>
                {NOME_TIPO_RECOMPENSA[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quantidade">
          <input type="number" min={1} step={1} required inputMode="numeric" className={inputClass} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
        </Field>
      </div>
      <Field label={ehItem ? 'Qual item' : 'Motivo (opcional)'} hint={dica}>
        <input
          className={inputClass}
          required={ehItem}
          maxLength={LIMITE_DESCRICAO}
          placeholder={ehItem ? 'Espada longa +1' : 'Pagamento da missão do galpão'}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </Field>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 text-muted">Para quem</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="para" checked={paraTodos} onChange={() => setParaTodos(true)} />
          Todos os jogadores ({jogadores.length})
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="para" checked={!paraTodos} onChange={() => setParaTodos(false)} />
          Só alguns
        </label>
        {!paraTodos && (
          <div className="ml-6 flex flex-wrap gap-x-5 gap-y-2">
            {jogadores.map((j) => (
              <label key={j.userId} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-accent)]"
                  checked={escolhidos.includes(j.userId)}
                  onChange={(e) => setEscolhidos((v) => (e.target.checked ? [...v, j.userId] : v.filter((id) => id !== j.userId)))}
                />
                {j.nome}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <Aviso erro={erro} mensagem={mensagem} />
      <Button type="submit" variant="primary" className="self-start" disabled={pending || !quantidade || (!paraTodos && !escolhidos.length)}>
        {pending ? 'Enviando…' : 'Enviar recompensa'}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Mestre: acompanhar o que foi dado

export function RecompensasDoMestre({ campanhaId, campanha, itens }: { campanhaId: string; campanha: string; itens: RecompensaItem[] }) {
  const [texto, setTexto] = useState<string>();
  const [copiado, setCopiado] = useState(false);
  if (!itens.length) return <p className="text-sm text-muted">Nada enviado nessa sessão ainda.</p>;

  // O link só existe no navegador, então o texto é montado ao clicar.
  const montar = () => textoDasRecompensas({ campanha, url: `${window.location.origin}/mesa/${campanhaId}`, recompensas: itens });
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line text-sm">
        {itens.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              <span className="text-muted">{r.nome}:</span> {descreverRecompensa(r, true)}
            </span>
            <span className="flex items-center gap-3">
              <ChipStatus status={r.status} />
              {r.status === 'pendente' && (
                <BotaoTexto perigo confirmar="Cancelar essa recompensa?" acao={() => cancelarRecompensaAction(campanhaId, r.id)}>
                  cancelar
                </BotaoTexto>
              )}
            </span>
          </li>
        ))}
      </ul>
      {!nadaParaAvisar(itens) && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                const t = montar();
                setTexto(t);
                try {
                  await navigator.clipboard.writeText(t);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  /* sem permissão: o texto aparece abaixo para copiar à mão */
                }
              }}
            >
              {copiado ? 'Copiado!' : 'Copiar lista'}
            </Button>
            <Button variant="ghost" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(montar())}`, '_blank', 'noopener,noreferrer')}>
              Abrir no WhatsApp
            </Button>
          </div>
          {texto && (
            <textarea
              readOnly
              aria-label="Lista de recompensas"
              className={cx(inputClass, 'min-h-28 resize-y text-xs leading-relaxed')}
              value={texto}
              onFocus={(e) => e.target.select()}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Só há o que avisar no grupo se sobrou alguma recompensa que não foi recusada nem cancelada. */
const nadaParaAvisar = (itens: RecompensaItem[]) => itens.every((r) => r.status === 'recusada' || r.status === 'cancelada');

// ---------------------------------------------------------------------------
// Jogador: aceitar o que o mestre deu

export function RecompensasParaAceitar({
  campanhaId,
  sistema,
  itens,
  mostrarSessao = false,
}: {
  campanhaId: string;
  sistema: SistemaCampanha;
  itens: (RecompensaItem & { sessao?: string | null })[];
  mostrarSessao?: boolean;
}) {
  const { pending, erro, mensagem, run } = useMesa();
  const pendentes = itens.filter((r) => r.status === 'pendente');
  const resolvidas = itens.filter((r) => r.status === 'aceita' || r.status === 'recusada');
  if (!pendentes.length && !resolvidas.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {pendentes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pendentes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2">
              <span className="text-sm">
                <span className="font-medium">{descreverRecompensa(r)}</span>
                {r.tipo !== 'item' && r.descricao && <span className="text-muted"> · {r.descricao}</span>}
                {mostrarSessao && r.sessao && <span className="block text-xs text-faint">{r.sessao}</span>}
              </span>
              <span className="flex items-center gap-2">
                <Button variant="primary" disabled={pending} onClick={() => run(() => aceitarRecompensaAction(campanhaId, r.id))}>
                  Aceitar
                </Button>
                <BotaoTexto perigo confirmar="Recusar essa recompensa? Ela não vai para a ficha." acao={() => recusarRecompensaAction(campanhaId, r.id)}>
                  recusar
                </BotaoTexto>
              </span>
            </li>
          ))}
        </ul>
      )}
      {pendentes.length > 0 && sistema === 'pf2e' && (
        <p className="text-xs text-faint">Ouro e itens entram na sua ficha ao aceitar. Se ela estiver aberta em outra aba, recarregue-a antes de continuar editando.</p>
      )}
      {resolvidas.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {resolvidas.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {descreverRecompensa(r)}
                {r.status === 'aceita' && r.naFicha && <span className="text-xs text-faint"> · na ficha</span>}
              </span>
              <ChipStatus status={r.status} />
            </li>
          ))}
        </ul>
      )}
      <Aviso erro={erro} mensagem={mensagem} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jogador: o próprio diário da sessão

export function MeuDiario({
  campanhaId,
  sessaoId,
  inicial,
}: {
  campanhaId: string;
  sessaoId: string;
  inicial: { texto: string; compartilhado: boolean } | null;
}) {
  const [texto, setTexto] = useState(inicial?.texto ?? '');
  const [compartilhado, setCompartilhado] = useState(inicial?.compartilhado ?? false);
  const { pending, erro, mensagem, run } = useMesa();
  return (
    <form
      className="flex flex-col gap-3"
      aria-label="Meu diário da sessão"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => salvarMeuDiarioAction(campanhaId, sessaoId, { texto, compartilhado }));
      }}
    >
      <Field label="O que aconteceu para você" hint="O resumo ou o ponto de vista do seu personagem. O mestre lê tudo.">
        <textarea className={cx(textareaClass, 'min-h-40')} maxLength={LIMITE_DIARIO} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={compartilhado} onChange={(e) => setCompartilhado(e.target.checked)} />
        Deixar os outros jogadores lerem
      </label>
      <Aviso erro={erro} mensagem={mensagem} />
      <Button type="submit" variant="primary" className="self-start" disabled={pending}>
        {pending ? 'Salvando…' : texto.trim() ? 'Salvar meu diário' : 'Apagar meu diário'}
      </Button>
    </form>
  );
}
