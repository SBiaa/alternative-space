import { describe, expect, it } from 'vitest';
import { createEmptyDraft, emptyCareer, normalizeDraft } from '../character';
import { sr5Data } from '../data';
import { parseNewVehicle, vehiclesOf } from '../vehicles';

const id = sr5Data.vehicles[0].id;

describe('veículos em jogo', () => {
  it('junta os da criação com os adquiridos em jogo, e sobrevive a salvar e abrir', () => {
    const draft = normalizeDraft(JSON.parse(JSON.stringify({
      ...createEmptyDraft(),
      gear: [{ key: 'a', kind: 'vehicle', itemId: id, qty: 2 }],
      career: { ...emptyCareer(), vehicles: [{ key: 'b', vehicleId: id, name: 'Besouro' }] },
    })));
    expect(vehiclesOf(draft).map((v) => [v.source, v.qty])).toEqual([['creation', 2], ['play', 1]]);
    expect(vehiclesOf(draft)[1].name).toBe('Besouro');
  });

  it('valida o veículo novo', () => {
    expect(parseNewVehicle({ vehicleId: id, price: '500' }, 'k').price).toBe(500);
    expect(() => parseNewVehicle({ vehicleId: 'nada' }, 'k')).toThrow(/catálogo/);
    expect(() => parseNewVehicle({ vehicleId: id, price: -1 }, 'k')).toThrow();
  });
});
