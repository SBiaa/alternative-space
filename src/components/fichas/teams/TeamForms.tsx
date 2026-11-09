'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import {
  addMyCharacterAction,
  createTeamAction,
  deleteTeamAction,
  joinTeamAction,
  regenerateInviteAction,
  removeMemberAction,
  renameTeamAction,
  type TeamActionResult,
} from '@/app/fichas/times/actions';
import { MAX_TITLE_LENGTH } from '@/lib/fichas/sr5/play';
import { Button, cx, inputClass } from '../ui';

const noop = () => () => {};

export interface CharacterOption {
  id: string;
  name: string;
}

function useTeamAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<TeamActionResult>, onOk?: () => void) =>
    start(async () => {
      setError(undefined);
      try {
        const r = await fn();
        if (r.ok) onOk?.();
        else setError(r.error);
      } catch (e) {
        // redirect() do Next chega aqui como erro especial e precisa seguir.
        if (e && typeof e === 'object' && 'digest' in e && String(e.digest).startsWith('NEXT_REDIRECT')) throw e;
        setError('Sem conexão. Tente de novo.');
      }
    });
  return { pending, error, run };
}

function CharacterSelect({
  characters,
  value,
  onChange,
  label,
}: {
  characters: CharacterOption[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <select aria-label={label} className={cx(inputClass, '!w-auto max-w-full')} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Escolha uma ficha…</option>
      {characters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function CreateTeamForm({ characters }: { characters: CharacterOption[] }) {
  const [name, setName] = useState('');
  const [characterId, setCharacterId] = useState('');
  const { pending, error, run } = useTeamAction();

  if (characters.length === 0) {
    return <p className="text-sm text-muted">Crie uma ficha antes: quem entra no time é a ficha.</p>;
  }

  return (
    <form
      className="flex flex-col gap-2"
      aria-label="Criar time"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createTeamAction({ name, characterId }));
      }}
    >
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Nome do time"
          placeholder='Ex.: "Os Sem-Nome de Seattle"'
          maxLength={MAX_TITLE_LENGTH}
          className={cx(inputClass, 'min-w-0 flex-1 basis-56')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <CharacterSelect label="Sua ficha no time" characters={characters} value={characterId} onChange={setCharacterId} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="self-start" disabled={pending || !name.trim() || !characterId}>
        {pending ? 'Criando…' : 'Criar time'}
      </Button>
    </form>
  );
}

export function JoinTeamForm({ code, characters }: { code: string; characters: CharacterOption[] }) {
  const [characterId, setCharacterId] = useState(characters.length === 1 ? characters[0].id : '');
  const { pending, error, run } = useTeamAction();

  return (
    <form
      className="flex flex-col gap-2"
      aria-label="Entrar no time"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => joinTeamAction(code, characterId));
      }}
    >
      <CharacterSelect label="Ficha que vai entrar" characters={characters} value={characterId} onChange={setCharacterId} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="self-start" disabled={pending || !characterId}>
        {pending ? 'Entrando…' : 'Entrar no time'}
      </Button>
    </form>
  );
}

export function AddCharacterForm({ teamId, characters }: { teamId: string; characters: CharacterOption[] }) {
  const [characterId, setCharacterId] = useState('');
  const { pending, error, run } = useTeamAction();
  if (characters.length === 0) return null;

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      aria-label="Adicionar outra ficha"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addMyCharacterAction(teamId, characterId), () => setCharacterId(''));
      }}
    >
      <CharacterSelect label="Outra ficha sua" characters={characters} value={characterId} onChange={setCharacterId} />
      <Button type="submit" disabled={pending || !characterId}>
        {pending ? 'Adicionando…' : 'Adicionar ao time'}
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}

export function InviteLink({ teamId, code, isOwner }: { teamId: string; code: string; isOwner: boolean }) {
  const [copied, setCopied] = useState(false);
  const { pending, error, run } = useTeamAction();
  // A origem (domínio) só existe no navegador; no servidor fica vazia.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => '');
  const url = `${origin}/fichas/convite/${code}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input aria-label="Link de convite" readOnly value={url} className={cx(inputClass, 'min-w-0 flex-1 basis-64 font-mono text-xs')} onFocus={(e) => e.target.select()} />
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* sem permissão: o campo já fica selecionável */
            }
          }}
        >
          {copied ? 'Copiado!' : 'Copiar link'}
        </Button>
        {isOwner && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (confirm('Gerar um link novo? O link atual para de funcionar.')) run(() => regenerateInviteAction(teamId));
            }}
          >
            Gerar novo link
          </Button>
        )}
      </div>
      <p className="text-xs text-faint">Quem abrir o link e entrar na conta escolhe uma ficha para entrar no time.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function RemoveMemberButton({
  teamId,
  characterId,
  name,
  mine,
}: {
  teamId: string;
  characterId: string;
  name: string;
  mine: boolean;
}) {
  const { pending, error, run } = useTeamAction();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className="text-xs text-faint hover:text-danger disabled:opacity-40"
        onClick={() => {
          const msg = mine ? `Tirar ${name} do time?` : `Tirar ${name} do time? A ficha continua com o jogador.`;
          if (confirm(msg)) run(() => removeMemberAction(teamId, characterId));
        }}
      >
        {mine ? 'sair do time' : 'tirar do time'}
      </button>
      {error && <span className="block text-xs text-danger">{error}</span>}
    </>
  );
}

export function OwnerControls({ teamId, name: initial }: { teamId: string; name: string }) {
  const [name, setName] = useState(initial);
  const rename = useTeamAction();
  const remove = useTeamAction();

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          rename.run(() => renameTeamAction(teamId, name));
        }}
      >
        <input
          aria-label="Nome do time"
          maxLength={MAX_TITLE_LENGTH}
          className={cx(inputClass, 'min-w-0 flex-1 basis-56')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={rename.pending || !name.trim() || name === initial}>
          Renomear
        </Button>
      </form>
      {rename.error && <p className="text-sm text-danger">{rename.error}</p>}
      <Button
        variant="danger"
        className="self-start"
        disabled={remove.pending}
        onClick={() => {
          if (confirm('Apagar o time? As fichas continuam com cada jogador.')) remove.run(() => deleteTeamAction(teamId));
        }}
      >
        Apagar time
      </Button>
      {remove.error && <p className="text-sm text-danger">{remove.error}</p>}
    </div>
  );
}
