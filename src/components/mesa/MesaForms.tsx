'use client';

import { useState, useSyncExternalStore, useTransition, type ReactNode } from 'react';
import * as acoes from '@/app/mesa/actions';
import type { MesaResultado } from '@/app/mesa/actions';
import { Button, cx, Field, inputClass } from '@/components/fichas/ui';
import {
  CORES,
  LIMITES,
  NOME_RESPOSTA,
  NOME_SISTEMA,
  NOME_STATUS_CAMPANHA,
  NOME_STATUS_SESSAO,
  RESPOSTAS,
  SISTEMAS,
  STATUS_CAMPANHA,
  STATUS_SESSAO,
  type CorCampanha,
  type RespostaPresenca,
  type SistemaCampanha,
  type StatusCampanha,
  type StatusSessao,
} from '@/lib/mesa/regras';

const noop = () => () => {};
const textareaClass = cx(inputClass, 'min-h-24 resize-y leading-relaxed');

export function useMesa() {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string>();
  const [mensagem, setMensagem] = useState<string>();
  const run = (fn: () => Promise<MesaResultado>, onOk?: () => void) =>
    start(async () => {
      setErro(undefined);
      setMensagem(undefined);
      try {
        const r = await fn();
        if (r.ok) {
          setMensagem(r.mensagem);
          onOk?.();
        } else setErro(r.erro);
      } catch (e) {
        // redirect() do Next chega aqui como erro especial e precisa seguir.
        if (e && typeof e === 'object' && 'digest' in e && String(e.digest).startsWith('NEXT_REDIRECT')) throw e;
        setErro('Sem conexão. Tente de novo.');
      }
    });
  return { pending, erro, mensagem, run };
}

export function Aviso({ erro, mensagem }: { erro?: string; mensagem?: string }) {
  if (erro) return <p className="text-sm text-danger">{erro}</p>;
  if (mensagem) return <p className="text-sm text-accent">{mensagem}</p>;
  return null;
}

// ---------------------------------------------------------------------------
// Campanha

export interface CampanhaInicial {
  nome: string;
  sistema: SistemaCampanha;
  sinopse: string;
  status: StatusCampanha;
  rotina: string;
  cor: CorCampanha;
}

export function CampanhaForm({
  campanhaId,
  inicial,
  rotinaGerada,
}: {
  campanhaId?: string;
  inicial?: CampanhaInicial;
  /** A rotina das sessões está ligada: o texto "quando vocês jogam" vem dela. */
  rotinaGerada?: boolean;
}) {
  const [c, setC] = useState<CampanhaInicial>(
    inicial ?? { nome: '', sistema: 'sr5', sinopse: '', status: 'planejando', rotina: '', cor: 'laranja' },
  );
  const set = <K extends keyof CampanhaInicial>(k: K, v: CampanhaInicial[K]) => setC((x) => ({ ...x, [k]: v }));
  const { pending, erro, mensagem, run } = useMesa();
  const trocouSistema = !!inicial && inicial.sistema !== c.sistema;

  return (
    <form
      className="flex flex-col gap-4"
      aria-label={campanhaId ? 'Editar campanha' : 'Nova campanha'}
      onSubmit={(e) => {
        e.preventDefault();
        if (trocouSistema && !confirm('Trocar o sistema desvincula as fichas que não forem dele. Continuar?')) return;
        run(() => (campanhaId ? acoes.editarCampanhaAction(campanhaId, { ...c }) : acoes.criarCampanhaAction({ ...c })));
      }}
    >
      <Field label="Nome da campanha">
        <input
          className={inputClass}
          maxLength={LIMITES.nome}
          placeholder='Ex.: "Sombras sobre Seattle"'
          value={c.nome}
          onChange={(e) => set('nome', e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sistema" hint="As fichas dos jogadores precisam ser desse sistema. Em “Outro”, vale qualquer ficha ou nenhuma.">
          <select className={inputClass} value={c.sistema} onChange={(e) => set('sistema', e.target.value as SistemaCampanha)}>
            {SISTEMAS.map((s) => (
              <option key={s} value={s}>
                {NOME_SISTEMA[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={c.status} onChange={(e) => set('status', e.target.value as StatusCampanha)}>
            {STATUS_CAMPANHA.map((s) => (
              <option key={s} value={s}>
                {NOME_STATUS_CAMPANHA[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Quando vocês jogam"
          hint={rotinaGerada ? 'Vem da rotina das sessões, logo abaixo.' : 'Texto livre, aparece no card da campanha.'}
        >
          <input
            className={inputClass}
            maxLength={LIMITES.rotina}
            placeholder="Sábados 19h, a cada 15 dias"
            value={c.rotina}
            disabled={rotinaGerada}
            onChange={(e) => set('rotina', e.target.value)}
          />
        </Field>
        <fieldset className="flex flex-col gap-1.5 text-sm">
          <legend className="mb-1.5 text-muted">Cor no calendário</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CORES) as CorCampanha[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-label={CORES[k].nome}
                aria-pressed={c.cor === k}
                onClick={() => set('cor', k)}
                className={cx(
                  'h-8 w-8 rounded-full border-2 transition',
                  CORES[k].bolinha,
                  c.cor === k ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              />
            ))}
          </div>
        </fieldset>
      </div>
      <Field label="Sinopse" hint="O que os jogadores sabem da campanha. Todos na mesa leem.">
        <textarea className={textareaClass} maxLength={LIMITES.sinopse} value={c.sinopse} onChange={(e) => set('sinopse', e.target.value)} />
      </Field>
      <Aviso erro={erro} mensagem={mensagem} />
      <Button type="submit" variant="primary" className="self-start" disabled={pending || !c.nome.trim()}>
        {pending ? 'Salvando…' : campanhaId ? 'Salvar campanha' : 'Criar campanha'}
      </Button>
    </form>
  );
}

export function ApagarCampanha({ campanhaId, nome }: { campanhaId: string; nome: string }) {
  const { pending, erro, run } = useMesa();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="danger"
        className="self-start"
        disabled={pending}
        onClick={() => {
          if (confirm(`Apagar “${nome}”? Sessões, diário e ganchos somem. As fichas continuam com cada jogador.`))
            run(() => acoes.apagarCampanhaAction(campanhaId));
        }}
      >
        Apagar campanha
      </Button>
      <Aviso erro={erro} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Convites

export function LinkDeConvite({ campanhaId, code }: { campanhaId: string; code: string }) {
  const [copiado, setCopiado] = useState(false);
  const { pending, erro, run } = useMesa();
  // A origem (domínio) só existe no navegador; no servidor fica vazia.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => '');
  const url = `${origin}/mesa/convite/${code}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Link de convite"
          readOnly
          value={url}
          className={cx(inputClass, 'min-w-0 flex-1 basis-64 font-mono text-xs')}
          onFocus={(e) => e.target.select()}
        />
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              /* sem permissão: o campo já fica selecionável */
            }
          }}
        >
          {copiado ? 'Copiado!' : 'Copiar link'}
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (confirm('Gerar um link novo? O link atual para de funcionar.')) run(() => acoes.trocarLinkAction(campanhaId));
          }}
        >
          Gerar novo link
        </Button>
      </div>
      <p className="text-xs text-faint">Quem abrir o link entra na conta, escolhe a ficha e já fica na mesa.</p>
      <Aviso erro={erro} />
    </div>
  );
}

export function ConvidarPorApelido({ campanhaId }: { campanhaId: string }) {
  const [apelido, setApelido] = useState('');
  const { pending, erro, mensagem, run } = useMesa();
  return (
    <form
      className="flex flex-col gap-2"
      aria-label="Convidar pelo apelido"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => acoes.convidarAction(campanhaId, apelido), () => setApelido(''));
      }}
    >
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Apelido do jogador"
          placeholder="@apelido"
          maxLength={41}
          className={cx(inputClass, 'min-w-0 flex-1 basis-40')}
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
        />
        <Button type="submit" disabled={pending || !apelido.trim().replace('@', '')}>
          {pending ? 'Convidando…' : 'Convidar'}
        </Button>
      </div>
      <Aviso erro={erro} mensagem={mensagem} />
    </form>
  );
}

/** Botão pequeno de texto com confirmação. */
function BotaoTexto({
  children,
  confirmar,
  acao,
  perigo,
}: {
  children: ReactNode;
  confirmar?: string;
  acao: () => Promise<MesaResultado>;
  perigo?: boolean;
}) {
  const { pending, erro, run } = useMesa();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={cx('text-xs text-faint disabled:opacity-40', perigo ? 'hover:text-danger' : 'hover:text-ink')}
        onClick={() => {
          if (!confirmar || confirm(confirmar)) run(acao);
        }}
      >
        {children}
      </button>
      {erro && <span className="block text-xs text-danger">{erro}</span>}
    </>
  );
}

export function CancelarConvite({ campanhaId, userId, nome }: { campanhaId: string; userId: string; nome: string }) {
  return (
    <BotaoTexto perigo confirmar={`Cancelar o convite de ${nome}?`} acao={() => acoes.cancelarConviteAction(campanhaId, userId)}>
      cancelar
    </BotaoTexto>
  );
}

export function RemoverJogador({ campanhaId, userId, nome }: { campanhaId: string; userId: string; nome: string }) {
  return (
    <BotaoTexto
      perigo
      confirmar={`Tirar ${nome} da campanha? A ficha continua com a pessoa.`}
      acao={() => acoes.removerJogadorAction(campanhaId, userId)}
    >
      tirar da mesa
    </BotaoTexto>
  );
}

export function SairDaCampanha({ campanhaId }: { campanhaId: string }) {
  return (
    <BotaoTexto perigo confirmar="Sair da campanha? Você pode voltar pelo link do mestre." acao={() => acoes.sairAction(campanhaId)}>
      sair da campanha
    </BotaoTexto>
  );
}

export interface FichaOpcao {
  id: string;
  nome: string;
}

function SelectFicha({ fichas, value, onChange }: { fichas: FichaOpcao[]; value: string; onChange: (v: string) => void }) {
  return (
    <select aria-label="Ficha" className={cx(inputClass, '!w-auto max-w-full')} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sem ficha por enquanto</option>
      {fichas.map((f) => (
        <option key={f.id} value={f.id}>
          {f.nome}
        </option>
      ))}
    </select>
  );
}

/** Entrar pelo link, aceitar convite ou trocar a ficha vinculada: escolhe a ficha e confirma. */
export function EscolherFicha({
  modo,
  campanhaId,
  code,
  fichas,
  atual,
}: {
  modo: 'link' | 'convite' | 'vincular';
  campanhaId?: string;
  code?: string;
  fichas: FichaOpcao[];
  atual?: string | null;
}) {
  const [ficha, setFicha] = useState(atual ?? (fichas.length === 1 ? fichas[0].id : ''));
  const { pending, erro, mensagem, run } = useMesa();
  const rotulo = { link: 'Entrar na campanha', convite: 'Aceitar convite', vincular: 'Salvar ficha' }[modo];
  return (
    <form
      className="flex flex-col gap-2"
      aria-label={rotulo}
      onSubmit={(e) => {
        e.preventDefault();
        const id = ficha || null;
        run(() =>
          modo === 'link'
            ? acoes.entrarPorLinkAction(code!, id)
            : modo === 'convite'
              ? acoes.aceitarConviteAction(campanhaId!, id)
              : acoes.vincularFichaAction(campanhaId!, id),
        );
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SelectFicha fichas={fichas} value={ficha} onChange={setFicha} />
        <Button type="submit" variant={modo === 'vincular' ? 'default' : 'primary'} disabled={pending || (modo === 'vincular' && ficha === (atual ?? ''))}>
          {pending ? 'Salvando…' : rotulo}
        </Button>
        {modo === 'convite' && (
          <BotaoTexto perigo confirmar="Recusar o convite?" acao={() => acoes.recusarConviteAction(campanhaId!)}>
            recusar
          </BotaoTexto>
        )}
      </div>
      <Aviso erro={erro} mensagem={mensagem} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sessões

export interface SessaoInicial {
  titulo: string;
  data: string;
  hora: string;
  duracaoMin: number;
  local: string;
  pauta: string;
}

const DURACOES = [60, 90, 120, 150, 180, 210, 240, 300, 360, 480];
const nomeDuracao = (m: number) => (m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

export function SessaoForm({
  campanhaId,
  sessaoId,
  inicial,
  onSalvo,
}: {
  campanhaId: string;
  sessaoId?: string;
  inicial: SessaoInicial;
  onSalvo?: () => void;
}) {
  const [s, setS] = useState(inicial);
  const set = <K extends keyof SessaoInicial>(k: K, v: SessaoInicial[K]) => setS((x) => ({ ...x, [k]: v }));
  const { pending, erro, mensagem, run } = useMesa();
  const duracoes = DURACOES.includes(s.duracaoMin) ? DURACOES : [...DURACOES, s.duracaoMin].sort((a, b) => a - b);
  return (
    <form
      className="flex flex-col gap-3"
      aria-label={sessaoId ? 'Editar sessão' : 'Marcar sessão'}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => (sessaoId ? acoes.editarSessaoAction(campanhaId, sessaoId, { ...s }) : acoes.criarSessaoAction(campanhaId, { ...s })),
          () => {
            if (!sessaoId) setS({ ...inicial });
            onSalvo?.();
          },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Data">
          <input type="date" required className={inputClass} value={s.data} onChange={(e) => set('data', e.target.value)} />
        </Field>
        <Field label="Hora (Brasília)">
          <input type="time" required className={inputClass} value={s.hora} onChange={(e) => set('hora', e.target.value)} />
        </Field>
        <Field label="Duração">
          <select className={inputClass} value={s.duracaoMin} onChange={(e) => set('duracaoMin', Number(e.target.value))}>
            {duracoes.map((d) => (
              <option key={d} value={d}>
                {nomeDuracao(d)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Título (opcional)">
          <input className={inputClass} maxLength={LIMITES.titulo} placeholder="O assalto à Renraku" value={s.titulo} onChange={(e) => set('titulo', e.target.value)} />
        </Field>
        <Field label="Local ou link">
          <input className={inputClass} maxLength={LIMITES.local} placeholder="Casa da Ana / link do Discord" value={s.local} onChange={(e) => set('local', e.target.value)} />
        </Field>
      </div>
      <Field label="Pauta" hint="O que os jogadores precisam saber antes: o que trazer, onde a história parou.">
        <textarea className={textareaClass} maxLength={LIMITES.pauta} value={s.pauta} onChange={(e) => set('pauta', e.target.value)} />
      </Field>
      <Aviso erro={erro} mensagem={mensagem} />
      <Button type="submit" variant="primary" className="self-start" disabled={pending || !s.data || !s.hora}>
        {pending ? 'Salvando…' : sessaoId ? 'Salvar sessão' : 'Marcar sessão'}
      </Button>
    </form>
  );
}

export function EditarSessao(props: { campanhaId: string; sessaoId: string; inicial: SessaoInicial }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto)
    return (
      <Button variant="ghost" className="self-start" onClick={() => setAberto(true)}>
        Editar data, local e pauta
      </Button>
    );
  return <SessaoForm {...props} onSalvo={() => setAberto(false)} />;
}

export function ApagarSessao({ campanhaId, sessaoId }: { campanhaId: string; sessaoId: string }) {
  return (
    <BotaoTexto perigo confirmar="Apagar a sessão? O diário dela some junto." acao={() => acoes.apagarSessaoAction(campanhaId, sessaoId)}>
      apagar sessão
    </BotaoTexto>
  );
}

export function Presenca({
  campanhaId,
  sessaoId,
  atual,
}: {
  campanhaId: string;
  sessaoId: string;
  atual: RespostaPresenca | null;
}) {
  const { pending, erro, run } = useMesa();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sua presença">
        {RESPOSTAS.map((r) => (
          <button
            key={r}
            type="button"
            disabled={pending}
            aria-pressed={atual === r}
            onClick={() => run(() => acoes.responderPresencaAction(campanhaId, sessaoId, r))}
            className={cx(
              'rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50',
              atual === r
                ? r === 'nao'
                  ? 'border-danger/60 bg-danger/15 text-danger'
                  : 'border-accent bg-accent/15 text-accent'
                : 'border-line-strong text-muted hover:text-ink',
            )}
          >
            {NOME_RESPOSTA[r]}
          </button>
        ))}
      </div>
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diário

export function DiarioForm({
  campanhaId,
  sessaoId,
  inicial,
}: {
  campanhaId: string;
  sessaoId: string;
  inicial: { status: StatusSessao; resumo: string; recompensas: string; notasMestre: string };
}) {
  const [d, setD] = useState(inicial);
  const set = <K extends keyof typeof inicial>(k: K, v: (typeof inicial)[K]) => setD((x) => ({ ...x, [k]: v }));
  const { pending, erro, mensagem, run } = useMesa();
  return (
    <form
      className="flex flex-col gap-4"
      aria-label="Diário da sessão"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => acoes.salvarDiarioAction(campanhaId, sessaoId, { ...d }));
      }}
    >
      <Field label="Status da sessão">
        <select className={cx(inputClass, 'sm:max-w-56')} value={d.status} onChange={(e) => set('status', e.target.value as StatusSessao)}>
          {STATUS_SESSAO.map((s) => (
            <option key={s} value={s}>
              {NOME_STATUS_SESSAO[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Resumo (os jogadores leem)" hint="O que aconteceu, quem apareceu, onde o grupo parou.">
        <textarea className={cx(textareaClass, 'min-h-40')} maxLength={LIMITES.texto} value={d.resumo} onChange={(e) => set('resumo', e.target.value)} />
      </Field>
      <Field label="Recompensas (os jogadores leem)" hint="XP, karma, dinheiro, itens. Cada jogador lança na própria ficha.">
        <textarea className={textareaClass} maxLength={LIMITES.texto} value={d.recompensas} onChange={(e) => set('recompensas', e.target.value)} />
      </Field>
      <Field label="Notas secretas do mestre" hint="Só você vê. Segredos, o que os NPCs planejam, o que preparar para a próxima.">
        <textarea
          className={cx(textareaClass, 'min-h-32 border-dashed')}
          maxLength={LIMITES.texto}
          value={d.notasMestre}
          onChange={(e) => set('notasMestre', e.target.value)}
        />
      </Field>
      <Aviso erro={erro} mensagem={mensagem} />
      <Button type="submit" variant="primary" className="self-start" disabled={pending}>
        {pending ? 'Salvando…' : 'Salvar diário'}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Ganchos

export interface GanchoView {
  id: string;
  texto: string;
  resolvido: boolean;
}

export function Ganchos({ campanhaId, sessaoId, ganchos }: { campanhaId: string; sessaoId?: string; ganchos: GanchoView[] }) {
  const [texto, setTexto] = useState('');
  const novo = useMesa();
  const item = useMesa();
  const abertos = ganchos.filter((g) => !g.resolvido);
  const resolvidos = ganchos.filter((g) => g.resolvido);
  const linha = (g: GanchoView) => (
    <li key={g.id} className="flex items-start gap-2">
      <input
        type="checkbox"
        aria-label={g.resolvido ? `Reabrir: ${g.texto}` : `Resolvido: ${g.texto}`}
        className="mt-1 accent-[var(--color-accent)]"
        checked={g.resolvido}
        disabled={item.pending}
        onChange={(e) => item.run(() => acoes.marcarGanchoAction(campanhaId, g.id, e.target.checked))}
      />
      <span className={cx('flex-1 text-sm', g.resolvido && 'text-faint line-through')}>{g.texto}</span>
      <button
        type="button"
        aria-label={`Apagar: ${g.texto}`}
        disabled={item.pending}
        className="text-xs text-faint hover:text-danger"
        onClick={() => item.run(() => acoes.apagarGanchoAction(campanhaId, g.id))}
      >
        ×
      </button>
    </li>
  );
  return (
    <div className="flex flex-col gap-3">
      {abertos.length === 0 ? (
        <p className="text-sm text-muted">Nenhum gancho em aberto.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">{abertos.map(linha)}</ul>
      )}
      <form
        className="flex flex-wrap gap-2"
        aria-label="Novo gancho"
        onSubmit={(e) => {
          e.preventDefault();
          novo.run(() => acoes.criarGanchoAction(campanhaId, texto, sessaoId), () => setTexto(''));
        }}
      >
        <input
          aria-label="Novo gancho"
          placeholder="O Sr. Johnson ainda deve 5.000¥"
          maxLength={LIMITES.gancho}
          className={cx(inputClass, 'min-w-0 flex-1 basis-56')}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Button type="submit" disabled={novo.pending || !texto.trim()}>
          Anotar
        </Button>
      </form>
      <Aviso erro={novo.erro ?? item.erro} />
      {resolvidos.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-faint">Resolvidos ({resolvidos.length})</summary>
          <ul className="mt-2 flex flex-col gap-1.5">{resolvidos.map(linha)}</ul>
        </details>
      )}
    </div>
  );
}
