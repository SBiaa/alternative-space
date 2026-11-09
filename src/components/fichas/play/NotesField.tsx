'use client';

import { useState } from 'react';
import type { ActionResult } from '@/app/fichas/play-actions';
import { MAX_NOTES_LENGTH } from '@/lib/fichas/sr5/play';
import { cx, inputClass } from '../ui';
import { useAction } from './useAction';

/** Texto livre que salva ao sair do campo. */
export function NotesField({
  label,
  initial,
  placeholder,
  rows = 6,
  save,
}: {
  label: string;
  initial: string;
  placeholder?: string;
  rows?: number;
  save: (text: string) => Promise<ActionResult>;
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const { pending, error, run } = useAction();
  const dirty = text !== saved;

  return (
    <div>
      <textarea
        aria-label={label}
        rows={rows}
        maxLength={MAX_NOTES_LENGTH}
        placeholder={placeholder}
        className={cx(inputClass, 'resize-y')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (!dirty) return;
          const value = text;
          run(() => save(value), () => setSaved(value));
        }}
      />
      <p className={cx('mt-1 text-xs', error ? 'text-danger' : 'text-faint')}>
        {error ?? (pending ? 'Salvando…' : dirty ? 'Salva quando você sair do campo.' : 'Salvo.')}
      </p>
    </div>
  );
}
