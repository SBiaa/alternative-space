'use client';

import { useState } from 'react';
import { addVehicleAction, removeVehicleAction, updateVehicleAction } from '@/app/fichas/play-actions';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import { label, sr5Data } from '@/lib/fichas/sr5/data';
import { ledgerTotals } from '@/lib/fichas/sr5/play';
import { fmtNuyen } from '@/lib/fichas/sr5/rules';
import { MAX_VEHICLE_NAME, MAX_VEHICLE_NOTES, vehicleStats, vehiclesOf, type OwnedVehicle } from '@/lib/fichas/sr5/vehicles';
import { Button, Card, cx, inputClass, matches, SearchInput } from '../ui';
import type { PlayEntry } from './types';
import { useAction } from './useAction';

/** Veículos e drones em jogo: ver os atributos, anotar, adquirir e se desfazer. */
export function Vehicles({ id, draft, entries }: { id: string; draft: CharacterDraft; entries: PlayEntry[] }) {
  const nuyen = ledgerTotals(entries).nuyen;
  const owned = vehiclesOf(draft);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        {owned.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
            Nenhum veículo ou drone ainda. Escolha um no catálogo para adicionar.
          </p>
        ) : (
          owned.map((v) => <VehicleCard key={v.key} id={id} item={v} />)
        )}
      </div>
      <AddVehicle id={id} nuyen={nuyen} />
    </div>
  );
}

function VehicleCard({ id, item: v }: { id: string; item: OwnedVehicle }) {
  const [open, setOpen] = useState<'edit' | 'remove' | null>(null);
  const catalogName = label(v.vehicle);
  return (
    <Card title={v.qty > 1 ? `${v.name} ×${v.qty}` : v.name}>
      <p className="text-xs text-muted">
        {v.vehicle.drone ? 'Drone' : 'Veículo'} · {v.vehicle.categoryPt ?? v.vehicle.category}
        {v.name !== catalogName && ` · ${catalogName}`}
      </p>
      <dl className="mt-2 grid grid-cols-4 gap-2">
        {vehicleStats(v.vehicle).map(([name, value]) => (
          <div key={name} className="rounded-md border border-line px-1 py-1.5 text-center">
            <dt className="text-[10px] uppercase tracking-wider text-faint">{name}</dt>
            <dd className="font-mono text-lg leading-tight">{value}</dd>
          </div>
        ))}
      </dl>
      {v.mods.length > 0 && <p className="mt-2 text-xs text-muted">Modificações: {v.mods.join(', ')}</p>}
      {v.notes && open !== 'edit' && <p className="mt-2 whitespace-pre-line text-sm">{v.notes}</p>}
      {v.source === 'creation' ? (
        <p className="mt-2 text-xs text-faint">Comprado na criação: mude em “Editar ficha”.</p>
      ) : (
        <div className="mt-2 flex gap-1">
          <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setOpen(open === 'edit' ? null : 'edit')}>anotar</Button>
          <Button variant="ghost" className="!px-2 !py-1 text-xs hover:!text-danger" onClick={() => setOpen(open === 'remove' ? null : 'remove')}>tirar</Button>
        </div>
      )}
      {open === 'edit' && <EditForm id={id} item={v} onDone={() => setOpen(null)} />}
      {open === 'remove' && <RemoveForm id={id} item={v} onDone={() => setOpen(null)} />}
    </Card>
  );
}

function EditForm({ id, item: v, onDone }: { id: string; item: OwnedVehicle; onDone: () => void }) {
  const [name, setName] = useState(v.name === label(v.vehicle) ? '' : v.name);
  const [notes, setNotes] = useState(v.notes);
  const { pending, error, run } = useAction();
  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateVehicleAction(id, v.key, { name, notes }), onDone);
      }}
    >
      <input className={inputClass} aria-label="Apelido" placeholder="Apelido" maxLength={MAX_VEHICLE_NAME} value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className={cx(inputClass, 'min-h-24')} aria-label="Anotações do veículo" placeholder="Modificações, armas, autosofts, dano…"
        maxLength={MAX_VEHICLE_NOTES} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="self-start" disabled={pending}>{pending ? 'Salvando…' : 'Salvar'}</Button>
    </form>
  );
}

function RemoveForm({ id, item: v, onDone }: { id: string; item: OwnedVehicle; onDone: () => void }) {
  const [price, setPrice] = useState('');
  const { pending, error, run } = useAction();
  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => removeVehicleAction(id, v.key, price), onDone);
      }}
    >
      <input type="number" min={0} className={cx(inputClass, '!w-40')} aria-label="Valor da venda" placeholder="Vendido por ¥ (opcional)" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Button type="submit" disabled={pending}>Tirar da ficha</Button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </form>
  );
}

function AddVehicle({ id, nuyen }: { id: string; nuyen: number }) {
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState('');
  const [name, setName] = useState('');
  const [charge, setCharge] = useState(false);
  const [price, setPrice] = useState('');
  const { pending, error, run } = useAction();
  const item = sr5Data.vehicles.find((v) => v.id === chosen);
  const found = q ? sr5Data.vehicles.filter((v) => matches(`${label(v)} ${v.name} ${v.categoryPt ?? v.category}`, q)) : sr5Data.vehicles;

  const choose = (vehicleId: string) => {
    setChosen(vehicleId);
    setPrice(String(sr5Data.vehicles.find((v) => v.id === vehicleId)?.cost.value ?? ''));
  };

  return (
    <Card title="Adicionar veículo ou drone">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addVehicleAction(id, { vehicleId: chosen, name, price: charge ? price : 0 }), () => {
            setChosen('');
            setName('');
            setQ('');
          });
        }}
      >
        <SearchInput value={q} onChange={setQ} placeholder="Buscar no catálogo…" />
        <select className={inputClass} aria-label="Veículo ou drone" size={8} value={chosen} onChange={(e) => choose(e.target.value)}>
          {found.map((v) => (
            <option key={v.id} value={v.id}>
              {label(v)} · {v.categoryPt ?? v.category}
            </option>
          ))}
        </select>
        {item && (
          <p className="text-xs text-muted">
            {vehicleStats(item).map(([n, value]) => `${n} ${value}`).join(' · ')}
            {item.cost.value !== null && ` · ${fmtNuyen(item.cost.value)}`}
          </p>
        )}
        <input className={inputClass} aria-label="Apelido" placeholder="Apelido (opcional)" maxLength={MAX_VEHICLE_NAME} value={name} onChange={(e) => setName(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={charge} onChange={(e) => setCharge(e.target.checked)} /> Descontar do nuyen (você tem {fmtNuyen(nuyen)})
        </label>
        {charge && (
          <input type="number" min={0} className={inputClass} aria-label="Preço" placeholder="Preço ¥" value={price} onChange={(e) => setPrice(e.target.value)} />
        )}
        {charge && Number(price) > nuyen && <p className="text-xs text-warn">O saldo vai ficar negativo.</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" variant="primary" disabled={!chosen || pending}>{pending ? 'Adicionando…' : 'Adicionar'}</Button>
      </form>
    </Card>
  );
}
