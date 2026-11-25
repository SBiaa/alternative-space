import { describe, expect, it } from 'vitest';
import { createEmptyDraft, type CharacterDraft } from '../character';
import { sr5Data } from '../data';
import { inventoryDelta } from '../inventory';

const weapon = sr5Data.weapons[0].id;
const withWeapon = (qty: number): CharacterDraft => ({
  ...createEmptyDraft(),
  gear: qty ? [{ key: 'w', kind: 'weapon', itemId: weapon, qty }] : [],
});

describe('inventoryDelta', () => {
  it('sem mudança no equipamento, não mexe no inventário', () => {
    expect(inventoryDelta(withWeapon(2), withWeapon(2))).toEqual([]);
  });

  it('devolve só o que entrou ou saiu', () => {
    expect(inventoryDelta(withWeapon(0), withWeapon(2))).toMatchObject([{ kind: 'weapon', itemId: weapon, qty: 2 }]);
    expect(inventoryDelta(withWeapon(3), withWeapon(1))).toMatchObject([{ kind: 'weapon', itemId: weapon, qty: -2 }]);
  });
});
