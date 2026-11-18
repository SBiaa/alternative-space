'use client';

import { upload } from '@vercel/blob/client';
import { useRef, useState } from 'react';
import {
  apagarHandoutAction,
  apagarPaginaAction,
  criarHandoutAction,
  criarPaginaAction,
  editarPaginaAction,
  liberarPaginaAction,
  revelarHandoutAction,
} from '@/app/mesa/actions-mundo';
import { Button, cx, Field, inputClass } from '@/components/fichas/ui';
import {
  ARQUIVOS_PERMITIDOS,
  CATEGORIAS_PAGINA,
  filtrarPaginas,
  LIMITE_CORPO,
  LIMITE_TITULO,
  MAX_BYTES_HANDOUT,
  NOME_CATEGORIA,
  NOME_CATEGORIA_UM,
  NOME_TIPO_HANDOUT,
  prefixoDosArquivos,
  tipoDoArquivo,
  type CategoriaPagina,
  type TipoHandout,
} from '@/lib/mesa/regras-mundo';
import { Aviso, useMesa } from './MesaForms';
import { Texto } from './MesaUI';

const textareaClass = cx(inputClass, 'min-h-32 resize-y leading-relaxed');

export interface PaginaItem {
  id: string;
  titulo: string;
  categoria: CategoriaPagina;
  corpo: string;
  liberada: boolean;
  nova: boolean;
}

export function PaginaForm({ campanhaId, pagina, onFeito }: { campanhaId: string; pagina?: PaginaItem; onFeito?: () => void }) {
  const { pending, erro, mensagem, run } = useMesa();
  const [titulo, setTitulo] = useState(pagina?.titulo ?? '');
  const [categoria, setCategoria] = useState<CategoriaPagina>(pagina?.categoria ?? 'lugar');
  const [corpo, setCorpo] = useState(pagina?.corpo ?? '');

  const enviar = () => {
    const dados = { titulo, categoria, corpo };
    run(
      () => (pagina ? editarPaginaAction(campanhaId, pagina.id, dados) : criarPaginaAction(campanhaId, dados)),
      () => {
        if (!pagina) {
          setTitulo('');
          setCorpo('');
        }
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
        <Field label="Título">
          <input className={inputClass} value={titulo} maxLength={LIMITE_TITULO} onChange={(e) => setTitulo(e.target.value)} placeholder="Porto Sombrio" />
        </Field>
        <Field label="Categoria">
          <select className={inputClass} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaPagina)}>
            {CATEGORIAS_PAGINA.map((c) => (
              <option key={c} value={c}>
                {NOME_CATEGORIA_UM[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Texto" hint={pagina ? undefined : 'A página nasce oculta. Você escolhe quando liberar para a mesa.'}>
        <textarea className={textareaClass} value={corpo} maxLength={LIMITE_CORPO} onChange={(e) => setCorpo(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending || !titulo.trim()}>
          {pagina ? 'Salvar' : 'Criar página'}
        </Button>
        {pagina && onFeito && (
          <Button variant="ghost" onClick={onFeito}>
            Cancelar
          </Button>
        )}
        <Aviso erro={erro} mensagem={mensagem} />
      </div>
    </form>
  );
}

function PaginaCartao({ campanhaId, pagina, ehMestre }: { campanhaId: string; pagina: PaginaItem; ehMestre: boolean }) {
  const [editando, setEditando] = useState(false);
  const { pending, erro, mensagem, run } = useMesa();
  if (editando) {
    return (
      <li className="rounded-lg border border-line bg-surface-2 p-3">
        <PaginaForm campanhaId={campanhaId} pagina={pagina} onFeito={() => setEditando(false)} />
      </li>
    );
  }
  return (
    <li className={cx('flex flex-col gap-2 rounded-lg border bg-surface-2 p-3', pagina.nova ? 'border-accent/60' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-medium">
          {pagina.titulo}
          <span className="ml-2 text-xs font-normal text-muted">{NOME_CATEGORIA_UM[pagina.categoria]}</span>
          {pagina.nova && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-accent">novo</span>}
          {ehMestre && !pagina.liberada && <span className="ml-2 text-xs font-normal text-faint">oculta</span>}
        </p>
        {ehMestre && (
          <>
            <Button disabled={pending} onClick={() => run(() => liberarPaginaAction(campanhaId, pagina.id, !pagina.liberada))}>
              {pagina.liberada ? 'Ocultar' : 'Liberar para a mesa'}
            </Button>
            <Button variant="ghost" onClick={() => setEditando(true)}>
              Editar
            </Button>
            <button
              type="button"
              disabled={pending}
              className="text-xs text-faint hover:text-danger disabled:opacity-40"
              onClick={() => {
                if (confirm(`Apagar a página "${pagina.titulo}"?`)) run(() => apagarPaginaAction(campanhaId, pagina.id));
              }}
            >
              apagar
            </button>
          </>
        )}
      </div>
      {pagina.corpo && <Texto className="text-sm text-muted">{pagina.corpo}</Texto>}
      <Aviso erro={erro} mensagem={mensagem} />
    </li>
  );
}

export function PaginasLista({ campanhaId, paginas, ehMestre }: { campanhaId: string; paginas: PaginaItem[]; ehMestre: boolean }) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<CategoriaPagina | 'todas'>('todas');
  if (!paginas.length) {
    return <p className="text-sm text-muted">{ehMestre ? 'Nenhuma página ainda. Crie a primeira ao lado.' : 'O mestre ainda não liberou nenhuma página.'}</p>;
  }
  const visiveis = filtrarPaginas(paginas, busca, categoria);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input className={cx(inputClass, 'min-w-40 flex-1')} placeholder="Buscar" aria-label="Buscar no Mundo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className={cx(inputClass, 'w-auto')} aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaPagina | 'todas')}>
          <option value="todas">Todas</option>
          {CATEGORIAS_PAGINA.map((c) => (
            <option key={c} value={c}>
              {NOME_CATEGORIA[c]}
            </option>
          ))}
        </select>
      </div>
      {visiveis.length === 0 ? (
        <p className="text-sm text-muted">Nada encontrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visiveis.map((p) => (
            <PaginaCartao key={p.id} campanhaId={campanhaId} pagina={p} ehMestre={ehMestre} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Handouts

export interface HandoutItem {
  id: string;
  titulo: string;
  tipo: TipoHandout;
  texto: string;
  sessao: string | null;
  revelado: boolean;
}

export function HandoutForm({ campanhaId, sessoes }: { campanhaId: string; sessoes: { id: string; nome: string }[] }) {
  const { pending, erro, mensagem, run } = useMesa();
  const [titulo, setTitulo] = useState('');
  const [modo, setModo] = useState<'arquivo' | 'texto'>('arquivo');
  const [texto, setTexto] = useState('');
  const [sessaoId, setSessaoId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string>();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const limpar = () => {
    setTitulo('');
    setTexto('');
    if (arquivoRef.current) arquivoRef.current.value = '';
  };

  const enviar = async () => {
    setFalha(undefined);
    if (modo === 'texto') return run(() => criarHandoutAction(campanhaId, { titulo, tipo: 'texto', texto, sessaoId }), limpar);
    const arquivo = arquivoRef.current?.files?.[0];
    if (!arquivo) return setFalha('Escolha um arquivo.');
    const tipo = tipoDoArquivo(arquivo.type);
    if (!tipo) return setFalha('Só imagem (PNG, JPG, WEBP, GIF) ou PDF.');
    if (arquivo.size > MAX_BYTES_HANDOUT) return setFalha(`O arquivo passa de ${MAX_BYTES_HANDOUT / 1024 / 1024} MB.`);
    setEnviando(true);
    try {
      const nome = arquivo.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80) || 'arquivo';
      const blob = await upload(`${prefixoDosArquivos(campanhaId)}${nome}`, arquivo, {
        access: 'private',
        handleUploadUrl: `/mesa/${campanhaId}/handouts/upload`,
        contentType: arquivo.type,
      });
      run(() => criarHandoutAction(campanhaId, { titulo, tipo, blobUrl: blob.url, blobPathname: blob.pathname, sessaoId }), limpar);
    } catch (e) {
      setFalha(e instanceof Error && e.message ? e.message : 'Não deu para enviar o arquivo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      <Field label="Título">
        <input className={inputClass} value={titulo} maxLength={LIMITE_TITULO} onChange={(e) => setTitulo(e.target.value)} placeholder="Mapa do porto" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo">
          <select className={inputClass} value={modo} onChange={(e) => setModo(e.target.value as 'arquivo' | 'texto')}>
            <option value="arquivo">Imagem ou PDF</option>
            <option value="texto">Texto (carta, bilhete)</option>
          </select>
        </Field>
        <Field label="Sessão" hint="Opcional.">
          <select className={inputClass} value={sessaoId} onChange={(e) => setSessaoId(e.target.value)}>
            <option value="">Nenhuma</option>
            {sessoes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {modo === 'arquivo' ? (
        <Field label="Arquivo" hint="Imagem ou PDF, até 10 MB.">
          <input ref={arquivoRef} type="file" accept={ARQUIVOS_PERMITIDOS.join(',')} className={inputClass} />
        </Field>
      ) : (
        <Field label="Texto">
          <textarea className={textareaClass} value={texto} maxLength={LIMITE_CORPO} onChange={(e) => setTexto(e.target.value)} />
        </Field>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending || enviando || !titulo.trim()}>
          {enviando ? 'Enviando…' : 'Criar handout'}
        </Button>
        <Aviso erro={falha ?? erro} mensagem={mensagem} />
      </div>
      <p className="text-xs text-faint">O handout nasce escondido. Os jogadores só o veem depois que você clicar em Revelar.</p>
    </form>
  );
}

function HandoutCartao({ campanhaId, h, ehMestre }: { campanhaId: string; h: HandoutItem; ehMestre: boolean }) {
  const { pending, erro, mensagem, run } = useMesa();
  const url = `/mesa/${campanhaId}/handouts/${h.id}/arquivo`;
  return (
    <li className={cx('flex flex-col gap-2 rounded-lg border bg-surface-2 p-3', h.revelado || !ehMestre ? 'border-line' : 'border-dashed border-line-strong')}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-medium">
          {h.titulo}
          <span className="ml-2 text-xs font-normal text-muted">{NOME_TIPO_HANDOUT[h.tipo]}</span>
          {h.sessao && <span className="ml-2 text-xs font-normal text-faint">{h.sessao}</span>}
          {ehMestre && <span className={cx('ml-2 text-xs font-normal', h.revelado ? 'text-accent' : 'text-faint')}>{h.revelado ? 'revelado' : 'escondido'}</span>}
        </p>
        {ehMestre && (
          <>
            <Button variant={h.revelado ? 'default' : 'primary'} disabled={pending} onClick={() => run(() => revelarHandoutAction(campanhaId, h.id, !h.revelado))}>
              {h.revelado ? 'Esconder' : 'Revelar'}
            </Button>
            <button
              type="button"
              disabled={pending}
              className="text-xs text-faint hover:text-danger disabled:opacity-40"
              onClick={() => {
                if (confirm(`Apagar o handout "${h.titulo}"? O arquivo também é apagado.`)) run(() => apagarHandoutAction(campanhaId, h.id));
              }}
            >
              apagar
            </button>
          </>
        )}
      </div>
      {h.tipo === 'imagem' && (
        <a href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- o arquivo vem de uma rota autenticada, não do otimizador */}
          <img src={url} alt={h.titulo} className="max-h-96 rounded-md border border-line object-contain" loading="lazy" />
        </a>
      )}
      {h.tipo === 'pdf' && (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-accent">
          Abrir o PDF
        </a>
      )}
      {h.tipo === 'texto' && <Texto className="rounded-md border border-line bg-surface p-3 text-sm">{h.texto}</Texto>}
      <Aviso erro={erro} mensagem={mensagem} />
    </li>
  );
}

export function HandoutsLista({ campanhaId, handouts, ehMestre }: { campanhaId: string; handouts: HandoutItem[]; ehMestre: boolean }) {
  if (!handouts.length) {
    return <p className="text-sm text-muted">{ehMestre ? 'Nenhum handout ainda. Crie o primeiro ao lado.' : 'Nenhum handout revelado até agora.'}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {handouts.map((h) => (
        <HandoutCartao key={h.id} campanhaId={campanhaId} h={h} ehMestre={ehMestre} />
      ))}
    </ul>
  );
}
