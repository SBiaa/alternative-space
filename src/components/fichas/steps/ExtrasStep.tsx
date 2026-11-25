'use client';

import { useRef, useState } from 'react';
import { uid, updateDraft } from '@/lib/fichas/store';
import { MAX_PORTRAIT_LENGTH } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import type { StepProps } from '../wizard/Wizard';
import { BudgetMeter, Button, Card, cx, inputClass, matches, SearchInput, StepIntro } from '../ui';

/** Reduz a imagem para um retrato pequeno (JPEG até ~80 KB) guardado dentro da ficha. */
export async function toPortrait(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = 256;
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.max(side / bitmap.width, side / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (side - w) / 2, (side - h) / 2, w, h);
  for (const q of [0.85, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= MAX_PORTRAIT_LENGTH) return url;
  }
  throw new Error('Imagem complexa demais. Tente outra.');
}

export function ExtrasStep({ draft, result }: StepProps) {
  const [q, setQ] = useState('');
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const arts = draft.martialArts ?? [];
  const enemies = draft.enemies ?? [];
  const catalog = sr5Data.martialArts
    .filter((a) => !arts.some((m) => m.id === a.id) && (!q || matches(`${label(a)} ${a.name}`, q)))
    .slice(0, 40);

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Extras">
        Coisas opcionais que dão cara ao personagem: um retrato, estilos de luta e quem quer o seu pescoço.
        Artes marciais vêm do livro Run &amp; Gun e custam karma.
      </StepIntro>

      <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
        <BudgetMeter label="Karma" budget={result.budgets.karma} />
      </div>

      <Card title="Retrato">
        <div className="flex items-center gap-4">
          {draft.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.portrait} alt="Retrato do personagem" className="h-24 w-24 rounded-lg border border-line object-cover" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-line text-xs text-faint">sem foto</div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={() => fileRef.current?.click()}>Escolher imagem</Button>
              {draft.portrait && <Button variant="ghost" onClick={() => updateDraft((d) => { delete d.portrait; })}>Remover</Button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const url = await toPortrait(f);
                  updateDraft((d) => { d.portrait = url; });
                  setError(undefined);
                } catch (err) {
                  setError((err as Error).message || 'Não deu para usar essa imagem.');
                }
              }} />
            {error && <p className="text-xs text-danger" role="alert">{error}</p>}
            <p className="text-xs text-faint">A imagem é reduzida e fica só dentro da ficha.</p>
          </div>
        </div>
      </Card>

      <Card title="Artes marciais" help={{ text: `Cada estilo custa ${sr5Data.settings.martialArtKarma} de karma e cada técnica ${sr5Data.settings.martialTechniqueKarma}.` }}>
        {arts.map((m, i) => {
          const art = sr5Data.martialArts.find((a) => a.id === m.id);
          if (!art) return null;
          return (
            <div key={m.id} className="mb-3 rounded-md border border-line p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <strong>{label(art)} <span className="text-xs font-normal text-faint">({art.source} p.{art.page})</span></strong>
                <Button variant="ghost" className="!px-2 !py-0.5" aria-label={`Remover ${label(art)}`}
                  onClick={() => updateDraft((d) => { d.martialArts!.splice(i, 1); })}>✕</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {art.techniques.map((t) => {
                  const on = m.techniques.includes(t);
                  return (
                    <button key={t} type="button" aria-pressed={on}
                      onClick={() => updateDraft((d) => {
                        const list = d.martialArts![i].techniques;
                        d.martialArts![i].techniques = on ? list.filter((x) => x !== t) : [...list, t];
                      })}
                      className={cx('rounded-full border px-2.5 py-1 text-xs transition', on ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:text-ink')}>
                      {t}
                    </button>
                  );
                })}
                {!art.techniques.length && <span className="text-xs text-faint">Sem técnicas listadas.</span>}
              </div>
            </div>
          );
        })}
        <SearchInput value={q} onChange={setQ} placeholder="Buscar arte marcial…" />
        <ul className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {catalog.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate">{label(a)} <span className="text-xs text-faint">{a.source}</span></span>
              <Button className="!px-2.5 !py-1 text-xs" onClick={() => updateDraft((d) => { (d.martialArts ??= []).push({ id: a.id, techniques: [] }); })}>
                Aprender
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Inimigos"
        actions={<Button className="!py-1 text-sm" onClick={() => updateDraft((d) => { (d.enemies ??= []).push({ key: uid(), name: '' }); })}>+ Inimigo</Button>}
      >
        {!enemies.length && <p className="text-sm text-muted">Ninguém na sua cola. Ainda.</p>}
        {enemies.map((e, i) => (
          <div key={e.key} className="mb-2 flex flex-wrap items-center gap-2">
            <input aria-label="Nome do inimigo" placeholder="Quem é" className={cx(inputClass, '!w-52')} value={e.name}
              onChange={(ev) => updateDraft((d) => { d.enemies![i].name = ev.target.value; })} />
            <input aria-label="Motivo" placeholder="Por que quer você morto" className={cx(inputClass, 'min-w-48 flex-1')} value={e.notes ?? ''}
              onChange={(ev) => updateDraft((d) => { d.enemies![i].notes = ev.target.value; })} />
            <Button variant="ghost" className="!px-2 !py-1" aria-label="Remover inimigo"
              onClick={() => updateDraft((d) => { d.enemies!.splice(i, 1); })}>✕</Button>
          </div>
        ))}
        <p className="mt-2 text-xs text-faint">Inimigos de verdade rendem karma pela qualidade "Inimigo" (passo de Qualidades); aqui é só o registro.</p>
      </Card>
    </div>
  );
}
