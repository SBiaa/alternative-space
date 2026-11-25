import { describe, expect, it } from 'vitest';
import fixture from './fixtures/ficha-valida.json';
import { normalizeDraft, type CharacterDraft, type DraftGear, type GearKind } from '../character';
import { sr5Data } from '../data';
import {
  findCatalogItem,
  implantsOf,
  inventoryFromDraft,
  itemStats,
  ledgerReason,
  parseNewItem,
  parsePrice,
  parseQty,
  unitCost,
  wornArmor,
  type InventoryItemLike,
} from '../inventory';
import { InputError } from '../play';

const byName = (list: { id: string; name: string }[], name: string) => {
  const x = list.find((i) => i.name === name);
  if (!x) throw new Error(`item de teste sumiu do catálogo: ${name}`);
  return x.id;
};

const predator = byName(sr5Data.weapons, 'Ares Predator V');
const armorJacket = byName(sr5Data.armor, 'Armor Jacket');
const helmet = byName(sr5Data.armor, 'Helmet');
const commlink = byName(sr5Data.gear, 'Custom Commlink');
const datajack = byName(sr5Data.cyberware, 'Datajack');

function gear(kind: GearKind, itemId: string, extra: Partial<DraftGear> = {}): DraftGear {
  return { key: `${kind}-${itemId}`, kind, itemId, qty: 1, ...extra };
}

function draftWith(items: DraftGear[]): CharacterDraft {
  return { ...normalizeDraft(fixture.draft), gear: items };
}

const item = (over: Partial<InventoryItemLike>): InventoryItemLike => ({
  kind: 'gear',
  itemId: null,
  name: 'x',
  rating: null,
  qty: 1,
  equipped: false,
  notes: '',
  ...over,
});

describe('inventoryFromDraft', () => {
  it('copia armas, armaduras e equipamento da criação, sem os implantes', () => {
    const draft = draftWith([
      gear('weapon', predator, { qty: 2 }),
      gear('armor', armorJacket),
      gear('armor', helmet),
      gear('gear', commlink, { rating: 3 }),
      gear('cyberware', datajack),
    ]);
    const inv = inventoryFromDraft(draft);
    expect(inv.map((i) => i.kind)).toEqual(['weapon', 'armor', 'armor', 'gear']);
    expect(inv[0]).toMatchObject({ itemId: predator, qty: 2, equipped: false });
    expect(inv[3]).toMatchObject({ itemId: commlink, rating: 3 });
  });

  it('veste só a primeira armadura comprada', () => {
    const inv = inventoryFromDraft(draftWith([gear('armor', armorJacket), gear('armor', helmet)]));
    expect(inv.map((i) => i.equipped)).toEqual([true, false]);
  });

  it('ignora itens que não existem mais no catálogo', () => {
    expect(inventoryFromDraft(draftWith([gear('weapon', 'nao-existe')]))).toEqual([]);
  });
});

describe('implantsOf', () => {
  it('lista ciberware e bioware com o grau', () => {
    const list = implantsOf(draftWith([gear('cyberware', datajack, { grade: 'alpha' }), gear('weapon', predator)]));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: 'cyberware', grade: 'Alfa' });
  });
});

describe('preço e estatísticas', () => {
  it('calcula o preço pelo nível quando o custo é variável', () => {
    const c = findCatalogItem('gear', commlink)!;
    expect(unitCost(c, 1)).toBe(100);
    expect(unitCost(c, 3)).toBe(1000);
    expect(unitCost(findCatalogItem('weapon', predator)!)).toBe(725);
  });

  it('resume dano, PA e precisão das armas e o valor das armaduras', () => {
    expect(itemStats('weapon', predator)).toContain('Dano 8P');
    expect(itemStats('weapon', predator)).toContain('PA -1');
    expect(itemStats('armor', armorJacket)).toBe('Armadura 12');
    expect(itemStats('other', null)).toBeNull();
  });
});

describe('wornArmor', () => {
  it('usa a melhor peça principal e soma os acessórios com "+"', () => {
    const items = [
      item({ kind: 'armor', itemId: armorJacket, equipped: true }),
      item({ kind: 'armor', itemId: helmet, equipped: true }),
    ];
    expect(wornArmor(items)).toBe(14);
  });

  it('não soma o que está guardado, e sem nada em uso devolve null', () => {
    expect(wornArmor([item({ kind: 'armor', itemId: armorJacket, equipped: false })])).toBeNull();
  });
});

describe('parseNewItem', () => {
  it('item do catálogo usa o nome do catálogo e confere o nível', () => {
    const n = parseNewItem({ kind: 'gear', itemId: commlink, rating: 4, qty: 1, name: 'ignorado', price: 2500 });
    expect(n).toMatchObject({ itemId: commlink, rating: 4, price: 2500, equipped: false });
    expect(n.name).not.toBe('ignorado');
    expect(() => parseNewItem({ kind: 'gear', itemId: commlink, rating: 99, qty: 1 })).toThrow(InputError);
  });

  it('item fora do catálogo precisa de nome', () => {
    expect(parseNewItem({ kind: 'other', name: '  Chave do galpão  ', qty: 1 })).toMatchObject({
      itemId: null,
      name: 'Chave do galpão',
      price: 0,
    });
    expect(() => parseNewItem({ kind: 'other', name: ' ', qty: 1 })).toThrow('Dê um nome');
  });

  it('recusa tipo, item e quantidade inválidos', () => {
    expect(() => parseNewItem({ kind: 'cyberware', name: 'x', qty: 1 })).toThrow(InputError);
    expect(() => parseNewItem({ kind: 'weapon', itemId: 'nao-existe', qty: 1 })).toThrow('catálogo');
    expect(() => parseQty(0)).toThrow(InputError);
    expect(() => parseQty(1.5)).toThrow(InputError);
    expect(parseQty('3')).toBe(3);
  });

  it('preço vazio é zero; negativo ou quebrado é erro', () => {
    expect(parsePrice(undefined)).toBe(0);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice(500)).toBe(500);
    expect(() => parsePrice(-1)).toThrow(InputError);
    expect(() => parsePrice(1.2)).toThrow(InputError);
  });
});

describe('ledgerReason', () => {
  it('mostra a quantidade e respeita o limite do histórico', () => {
    expect(ledgerReason('Compra', 'Granada', 3)).toBe('Compra: Granada (×3)');
    expect(ledgerReason('Venda', 'Pistola', 1)).toBe('Venda: Pistola');
    expect(ledgerReason('Compra', 'x'.repeat(300), 1).length).toBe(200);
  });
});
