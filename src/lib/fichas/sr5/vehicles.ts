/**
 * Veículos e drones da ficha em jogo: os comprados na criação e os adquiridos depois.
 * Funções puras, usadas no servidor (validação) e na tela.
 */
import type { CareerVehicle, CharacterDraft } from './character';
import { label, sr5Data } from './data';
import { parsePrice } from './inventory';
import { InputError } from './play';
import type { Vehicle } from './types';

export const MAX_VEHICLES = 40;
export const MAX_VEHICLE_NAME = 60;
export const MAX_VEHICLE_NOTES = 2_000;

export interface OwnedVehicle {
  key: string;
  /** 'creation' só muda em "Editar ficha"; 'play' dá para anotar e tirar em jogo. */
  source: 'creation' | 'play';
  vehicle: Vehicle;
  name: string;
  notes: string;
  qty: number;
  /** Modificações instaladas na criação. */
  mods: string[];
}

const find = (id: string) => sr5Data.vehicles.find((v) => v.id === id);

export function vehiclesOf(draft: CharacterDraft): OwnedVehicle[] {
  const bought = draft.gear.flatMap((g): OwnedVehicle[] => {
    const vehicle = g.kind === 'vehicle' ? find(g.itemId) : undefined;
    if (!vehicle) return [];
    const mods = (g.mods ?? []).flatMap((m) => {
      const x = sr5Data.vehicleMods.find((y) => y.id === m.itemId);
      return x ? [`${label(x)}${m.rating ? ` ${m.rating}` : ''}`] : [];
    });
    return [{ key: g.key, source: 'creation', vehicle, name: label(vehicle), notes: '', qty: g.qty, mods }];
  });
  const later = (draft.career?.vehicles ?? []).flatMap((c): OwnedVehicle[] => {
    const vehicle = find(c.vehicleId);
    if (!vehicle) return [];
    return [{ key: c.key, source: 'play', vehicle, name: c.name || label(vehicle), notes: c.notes ?? '', qty: 1, mods: [] }];
  });
  return [...bought, ...later];
}

export function vehicleStats(v: Vehicle): [string, string | number][] {
  return [
    ['Manobra', v.handling],
    ['Velocidade', v.speed],
    ['Aceleração', v.accel],
    ['Corpo', v.body],
    ['Armadura', v.armor],
    ['Piloto', v.pilot],
    ['Sensor', v.sensor],
    ['Lugares', v.seats],
  ];
}

export function parseVehicleText(raw: { name?: unknown; notes?: unknown }): { name: string; notes: string } {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const notes = typeof raw.notes === 'string' ? raw.notes : '';
  if (name.length > MAX_VEHICLE_NAME) throw new InputError(`Apelido com no máximo ${MAX_VEHICLE_NAME} letras.`);
  if (notes.length > MAX_VEHICLE_NOTES) throw new InputError('Anotação do veículo grande demais.');
  return { name, notes };
}

export function parseNewVehicle(raw: { vehicleId?: unknown; name?: unknown; notes?: unknown; price?: unknown }, key: string): { vehicle: CareerVehicle; price: number } {
  const found = typeof raw.vehicleId === 'string' ? find(raw.vehicleId) : undefined;
  if (!found) throw new InputError('Veículo não encontrado no catálogo.');
  return { vehicle: { key, vehicleId: found.id, ...parseVehicleText(raw) }, price: parsePrice(raw.price) };
}
