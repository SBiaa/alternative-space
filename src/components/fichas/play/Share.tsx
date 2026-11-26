'use client';

import { useState } from 'react';
import { disableShareAction, enableShareAction, renewShareAction } from '@/app/fichas/play-actions';
import { Button, Card, inputClass } from '../ui';
import { useAction } from './useAction';

/** Liga, copia, troca ou desliga o link público da ficha. `code` null = desligado. */
export function SharePanel({ id, code }: { id: string; code: string | null }) {
  const { pending, error, run } = useAction();
  const [copied, setCopied] = useState(false);
  const path = code ? `/fichas/publica/${code}` : '';
  /** O painel só aparece depois de um clique, então já está no navegador. */
  const url = path && typeof window !== 'undefined' ? window.location.origin + path : path;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false); // sem acesso à área de transferência: o campo continua selecionável
    }
  };

  return (
    <Card title="Compartilhar ficha">
      <p className="text-sm text-muted">
        Quem tiver o link vê a ficha sem precisar entrar e sem poder editar: atributos, perícias, equipamento, contatos e
        dano. Nuyen, histórico e anotações não aparecem.
      </p>
      {code ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input readOnly value={url} aria-label="Link público da ficha" onFocus={(e) => e.target.select()}
              className={`${inputClass} min-w-0 flex-1`} />
            <Button variant="primary" onClick={copy}>{copied ? 'Copiado' : 'Copiar link'}</Button>
            <a href={path} target="_blank" rel="noreferrer"
              className="inline-flex items-center rounded-md px-3.5 py-2 text-sm font-medium text-muted hover:text-ink">
              Abrir ↗
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => {
              if (window.confirm('Trocar o link? O link atual para de funcionar.')) run(() => renewShareAction(id), () => setCopied(false));
            }}>Trocar link</Button>
            <Button variant="danger" disabled={pending} onClick={() => {
              if (window.confirm('Desligar o link? Quem já tem deixa de ver a ficha.')) run(() => disableShareAction(id), () => setCopied(false));
            }}>Desligar link</Button>
          </div>
        </div>
      ) : (
        <Button variant="primary" className="mt-3" disabled={pending} onClick={() => run(() => enableShareAction(id))}>
          Criar link público
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
    </Card>
  );
}
