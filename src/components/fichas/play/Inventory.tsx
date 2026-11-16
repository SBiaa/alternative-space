'use client';

import { useMemo, useState } from 'react';
import {
  addInventoryItemAction,
  removeInventoryItemAction,
  updateInventoryItemAction,
} from '@/app/fichas/play-actions';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { label } from '@/lib/fichas/sr5/data';
import {
  catalogFor,
  hasRating,
  implantsOf,
  INVENTORY_KINDS,
  itemStats,
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_NOTES_LENGTH,
  maxRatingOf,
  unitCost,
  wornArmor,
  type InventoryKind,
} from '@/lib/fichas/sr5/inventory';
import { ledgerTotals } from '@/lib/fichas/sr5/play';
import { fmtNuyen } from '@/lib/fichas/sr5/rules';
import type { GearItem } from '@/lib/fichas/sr5/types';
import { Button, Card, cx, inputClass, matches, SearchInput, Stepper } from '../ui';
import type { PlayEntry, PlayItem } from './types';
import { useAction } from './useAction';

/** Inventário em jogo: o que o personagem carrega, com compra e venda ligadas ao nuyen. */
export function Inventory({
  id,
  items,
  entries,
  draft,
}: {
  id: string;
  items: PlayItem[];
  entries: PlayEntry[];
  draft: CharacterDraft;
}) {
  const nuyen = ledgerTotals(entries).nuyen;
  const armor = wornArmor(items);
  const implants = useMemo(() => implantsOf(draft), [draft]);
  const armed = items.filter((i) => i.kind === 'weapon' && i.equipped);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Nuyen" value={fmtNuyen(nuyen)} danger={nuyen < 0} />
          <Stat label="Armadura em uso" value={armor === null ? '—' : String(armor)} />
          <Stat label="Armas em mãos" value={String(armed.length)} hint={armed.map((a) => a.name).join(', ') || undefined} />
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
            Nada no inventário. Adicione o que o personagem carrega: armas, munição, comlink, kit médico…
          </p>
        ) : (
          INVENTORY_KINDS.map(({ key, title }) => {
            const list = items.filter((i) => i.kind === key);
            if (!list.length) return null;
            return (
              <Card key={key} title={title}>
                <ul className="flex flex-col divide-y divide-line">
                  {list.map((i) => (
                    <ItemRow key={i.id} id={id} item={i} />
                  ))}
                </ul>
              </Card>
            );
          })
        )}

        {implants.length > 0 && (
          <Card title="Implantes">
            <ul className="flex flex-col gap-1 text-sm">
              {implants.map((x) => (
                <li key={x.key} className="flex justify-between gap-3">
                  <span>
                    {x.name}
                    {x.rating ? ` ${x.rating}` : ''}
                  </span>
                  <span className="text-xs text-faint">
                    {x.kind === 'cyberware' ? 'Ciberware' : 'Bioware'} · {x.grade}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-faint">
              Implantes fazem parte do corpo e vêm da ficha de criação. Implantes novos em jogo ainda não recalculam a
              Essência; anote nas observações do personagem.
            </p>
          </Card>
        )}
      </div>

      <AddItem id={id} nuyen={nuyen} />
    </div>
  );
}

function Stat({ label: l, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface-2 p-3">
      <div className="text-xs uppercase tracking-wider text-muted">{l}</div>
      <div className={cx('font-display text-2xl font-semibold', danger ? 'text-danger' : 'text-ink')}>{value}</div>
      {hint && <div className="truncate text-xs text-faint" title={hint}>{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Linha de item

function ItemRow({ id, item: i }: { id: string; item: PlayItem }) {
  const [open, setOpen] = useState<'notes' | 'remove' | null>(null);
  const { pending, error, run } = useAction();
  const stats = itemStats(i.kind, i.itemId);
  const canEquip = i.kind === 'weapon' || i.kind === 'armor';
  const setQty = (qty: number) => run(() => updateInventoryItemAction(id, i.id, { qty }));

  return (
    <li className="py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-40 flex-1">
          <span className={cx(i.equipped && 'font-semibold text-accent')}>
            {i.name}
            {i.rating ? ` (nível ${i.rating})` : ''}
          </span>
          {stats && <span className="block text-xs text-faint">{stats}</span>}
          {i.notes && open !== 'notes' && <span className="block whitespace-pre-line text-xs text-muted">{i.notes}</span>}
        </span>

        {canEquip && (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={i.equipped}
              disabled={pending}
              onChange={(e) => run(() => updateInventoryItemAction(id, i.id, { equipped: e.target.checked }))}
            />
            {i.kind === 'armor' ? 'vestindo' : 'em mãos'}
          </label>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-7 w-7 rounded border border-line-strong text-muted hover:text-accent disabled:opacity-30"
            aria-label={`Usar um de ${i.name}`}
            disabled={pending || i.qty <= 1}
            onClick={() => setQty(i.qty - 1)}
          >
            −
          </button>
          <span className="w-10 text-center font-mono" aria-label={`Quantidade de ${i.name}`}>
            ×{i.qty}
          </span>
          <button
            type="button"
            className="h-7 w-7 rounded border border-line-strong text-muted hover:text-accent disabled:opacity-30"
            aria-label={`Mais um de ${i.name}`}
            disabled={pending}
            onClick={() => setQty(i.qty + 1)}
          >
            +
          </button>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setOpen(open === 'notes' ? null : 'notes')}>
            nota
          </Button>
          <Button
            variant="ghost"
            className="!px-2 !py-1 text-xs hover:!text-danger"
            onClick={() => setOpen(open === 'remove' ? null : 'remove')}
          >
            tirar
          </Button>
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {open === 'notes' && <NotesEditor id={id} item={i} onDone={() => setOpen(null)} />}
      {open === 'remove' && <RemoveForm id={id} item={i} onDone={() => setOpen(null)} />}
    </li>
  );
}

function NotesEditor({ id, item: i, onDone }: { id: string; item: PlayItem; onDone: () => void }) {
  const [notes, setNotes] = useState(i.notes);
  const { pending, error, run } = useAction();
  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateInventoryItemAction(id, i.id, { notes }), onDone);
      }}
    >
      <textarea
        aria-label={`Anotação de ${i.name}`}
        className={cx(inputClass, 'min-h-16')}
        maxLength={MAX_ITEM_NOTES_LENGTH}
        placeholder="Modificações, munição carregada, de quem pegou emprestado…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="!py-1 text-xs" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar nota'}
        </Button>
        <Button className="!py-1 text-xs" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function RemoveForm({ id, item: i, onDone }: { id: string; item: PlayItem; onDone: () => void }) {
  const [qty, setQty] = useState(i.qty);
  const [price, setPrice] = useState('');
  const { pending, error, run } = useAction();
  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 p-2"
      aria-label={`Tirar ${i.name} do inventário`}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => removeInventoryItemAction(id, i.id, { qty, salePrice: price ? Number(price) : 0 }), onDone);
      }}
    >
      {i.qty > 1 && (
        <>
          <span className="text-xs text-muted">Quantos?</span>
          <Stepper size="sm" label={`quantidade a tirar de ${i.name}`} value={qty} min={1} max={i.qty} onChange={setQty} />
        </>
      )}
      <input
        aria-label="Vendeu por (opcional)"
        inputMode="numeric"
        placeholder="Vendeu por ¥ (opcional)"
        className={cx(inputClass, '!w-44 !py-1')}
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
      />
      <Button type="submit" variant="danger" className="!py-1 text-xs" disabled={pending}>
        {pending ? 'Tirando…' : price ? 'Vender' : 'Tirar'}
      </Button>
      <Button className="!py-1 text-xs" onClick={onDone}>
        Cancelar
      </Button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
      <p className="w-full text-xs text-faint">Sem preço, o item só sai do inventário (usou, perdeu, deu). Com preço, entra no nuyen.</p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Adicionar item

function AddItem({ id, nuyen }: { id: string; nuyen: number }) {
  const [kind, setKind] = useState<InventoryKind>('weapon');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<GearItem | null>(null);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(1);
  const [qty, setQty] = useState(1);
  const [pay, setPay] = useState(true);
  const [price, setPrice] = useState('');
  const { pending, error, run } = useAction();

  const free = kind === 'other' || picked === null;
  const results = useMemo(
    () =>
      q.trim().length < 2
        ? []
        : catalogFor(kind)
            .filter((x) => x.page > 0 && matches(`${label(x)} ${x.name} ${x.categoryPt ?? x.category}`, q))
            .slice(0, 12),
    [kind, q],
  );

  const reset = () => {
    setQ('');
    setPicked(null);
    setName('');
    setRating(1);
    setQty(1);
    setPrice('');
  };

  const pick = (item: GearItem) => {
    setPicked(item);
    setRating(1);
    const cost = unitCost(item, 1);
    setPrice(cost === null ? '' : String(cost * qty));
  };

  const updatePrice = (item: GearItem | null, r: number, n: number) => {
    if (!item) return;
    const cost = unitCost(item, r);
    if (cost !== null) setPrice(String(cost * n));
  };

  const total = pay && price ? Number(price) : 0;
  const ready = picked !== null || name.trim().length > 0;

  return (
    <Card title="Adicionar item">
      <form
        className="flex flex-col gap-3"
        aria-label="Adicionar item ao inventário"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              addInventoryItemAction(id, {
                kind,
                itemId: picked?.id,
                name: picked ? undefined : name,
                rating: picked && hasRating(picked) ? rating : undefined,
                qty,
                price: total,
              }),
            reset,
          );
        }}
      >
        <div className="flex flex-wrap gap-1" role="group" aria-label="Tipo de item">
          {INVENTORY_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => {
                setKind(k.key);
                reset();
              }}
              className={cx(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                kind === k.key ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink',
              )}
            >
              {k.title}
            </button>
          ))}
        </div>

        {picked ? (
          <div className="rounded-lg border border-accent/40 bg-surface-2 p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span>
                <span className="font-semibold">{label(picked)}</span>
                <span className="block text-xs text-faint">{itemStats(kind, picked.id)}</span>
              </span>
              <Button variant="ghost" className="!px-2 !py-0.5 text-xs" onClick={() => setPicked(null)}>
                trocar
              </Button>
            </div>
            {hasRating(picked) && (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                nível
                <Stepper
                  size="sm"
                  label="nível do item"
                  value={rating}
                  min={1}
                  max={maxRatingOf(picked) ?? 20}
                  onChange={(r) => {
                    setRating(r);
                    updatePrice(picked, r, qty);
                  }}
                />
              </label>
            )}
          </div>
        ) : (
          <>
            {kind !== 'other' && (
              <>
                <SearchInput value={q} onChange={setQ} placeholder="Buscar no catálogo do livro básico…" />
                {results.length > 0 && (
                  <ul className="flex max-h-60 flex-col overflow-y-auto rounded-lg border border-line">
                    {results.map((x) => {
                      const cost = unitCost(x, 1);
                      return (
                        <li key={x.id}>
                          <button
                            type="button"
                            className="flex w-full items-baseline justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                            onClick={() => pick(x)}
                          >
                            <span className="min-w-0 truncate">{label(x)}</span>
                            <span className="shrink-0 text-xs text-faint">{cost === null ? 'preço variável' : fmtNuyen(cost)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
            <input
              aria-label="Nome do item"
              placeholder={kind === 'other' ? 'Ex.: "Chave do galpão", "Pen drive da Renraku"' : 'Ou escreva um item fora do catálogo'}
              maxLength={MAX_ITEM_NAME_LENGTH}
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-muted">
          Quantidade
          <Stepper
            size="sm"
            label="quantidade do item"
            value={qty}
            min={1}
            max={999}
            onChange={(n) => {
              setQty(n);
              updatePrice(picked, rating, n);
            }}
          />
        </label>

        <div className="flex flex-col gap-1.5 rounded-lg border border-line p-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} />
            Descontar do nuyen
          </label>
          {pay && (
            <>
              <input
                aria-label="Preço total pago"
                inputMode="numeric"
                placeholder="Preço total pago (¥)"
                className={cx(inputClass, '!py-1.5')}
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
              />
              <span className={cx('text-xs', total > nuyen ? 'text-danger' : 'text-faint')}>
                {free && !picked ? 'Preço combinado na rua. ' : 'Preço de tabela; ajuste se negociou. '}
                Saldo depois: {fmtNuyen(nuyen - total)}
              </span>
            </>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" disabled={pending || !ready} className="self-start">
          {pending ? 'Guardando…' : total > 0 ? `Comprar por ${fmtNuyen(total)}` : 'Guardar no inventário'}
        </Button>
      </form>
    </Card>
  );
}
