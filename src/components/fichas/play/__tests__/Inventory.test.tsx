// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from '@/lib/fichas/sr5/__tests__/fixtures/ficha-valida.json';
import { normalizeDraft } from '@/lib/fichas/sr5/character';
import { sr5Data } from '@/lib/fichas/sr5/data';
import { Inventory } from '../Inventory';
import type { PlayEntry, PlayItem } from '../types';

const actions = vi.hoisted(() => ({
  addInventoryItemAction: vi.fn(async () => ({ ok: true as const })),
  updateInventoryItemAction: vi.fn(async () => ({ ok: true as const })),
  removeInventoryItemAction: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock('@/app/fichas/play-actions', () => actions);

const id = '11111111-1111-4111-8111-111111111111';
const idOf = (list: { id: string; name: string }[], name: string) => list.find((x) => x.name === name)!.id;
const predator = idOf(sr5Data.weapons, 'Ares Predator V');
const jacket = idOf(sr5Data.armor, 'Armor Jacket');

function item(over: Partial<PlayItem>): PlayItem {
  return {
    id: crypto.randomUUID(),
    characterId: id,
    kind: 'gear',
    itemId: null,
    name: 'Item',
    rating: null,
    qty: 1,
    equipped: false,
    notes: '',
    createdAt: new Date('2026-11-01T12:00:00Z'),
    ...over,
  };
}

const entries: PlayEntry[] = [
  { id: 'e1', characterId: id, kind: 'nuyen', amount: 3000, reason: 'Sobra da criação', missionId: null, createdAt: new Date() },
];

function renderInv(items: PlayItem[]) {
  const user = userEvent.setup();
  render(<Inventory id={id} items={items} entries={entries} draft={normalizeDraft(fixture.draft)} />);
  return user;
}

beforeEach(() => {
  Object.values(actions).forEach((f) => f.mockClear());
});

describe('Inventário', () => {
  it('agrupa por tipo, mostra estatísticas e a armadura em uso', () => {
    renderInv([
      item({ kind: 'weapon', itemId: predator, name: 'Ares Predator V', equipped: true }),
      item({ kind: 'armor', itemId: jacket, name: 'Jaqueta Blindada', equipped: true }),
      item({ kind: 'other', name: 'Chave do galpão' }),
    ]);
    expect(screen.getByRole('heading', { name: 'Armas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Outros' })).toBeInTheDocument();
    expect(screen.getByText(/Dano 8P/)).toBeInTheDocument();
    expect(screen.getByText('Armadura em uso').nextSibling).toHaveTextContent('12');
    expect(screen.getByText('Armas em mãos').nextSibling).toHaveTextContent('1');
  });

  it('com o inventário vazio, explica o que fazer', () => {
    renderInv([]);
    expect(screen.getByText(/Nada no inventário/)).toBeInTheDocument();
  });

  it('busca no catálogo, preenche o preço e compra descontando do nuyen', async () => {
    const user = renderInv([]);
    await user.type(screen.getByRole('searchbox'), 'Predator');
    await user.click(screen.getByRole('button', { name: /Ares Predator V/ }));
    expect(screen.getByLabelText('Preço total pago')).toHaveValue('725');
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade do item' }));
    expect(screen.getByLabelText('Preço total pago')).toHaveValue('1450');
    await user.click(screen.getByRole('button', { name: /Comprar por/ }));
    expect(actions.addInventoryItemAction).toHaveBeenCalledWith(id, expect.objectContaining({
      kind: 'weapon',
      itemId: predator,
      qty: 2,
      price: 1450,
    }));
  });

  it('guarda item fora do catálogo sem mexer no nuyen', async () => {
    const user = renderInv([]);
    await user.click(screen.getByRole('button', { name: 'Outros' }));
    await user.type(screen.getByLabelText('Nome do item'), 'Pen drive da Renraku');
    await user.click(screen.getByLabelText('Descontar do nuyen'));
    await user.click(screen.getByRole('button', { name: 'Guardar no inventário' }));
    expect(actions.addInventoryItemAction).toHaveBeenCalledWith(id, expect.objectContaining({
      kind: 'other',
      itemId: undefined,
      name: 'Pen drive da Renraku',
      price: 0,
    }));
  });

  it('usa uma unidade, veste a armadura e vende com preço', async () => {
    const ammo = item({ name: 'Munição regular', qty: 3 });
    const armor = item({ kind: 'armor', itemId: jacket, name: 'Jaqueta Blindada' });
    const user = renderInv([ammo, armor]);

    await user.click(screen.getByRole('button', { name: 'Usar um de Munição regular' }));
    expect(actions.updateInventoryItemAction).toHaveBeenLastCalledWith(id, ammo.id, { qty: 2 });

    await user.click(screen.getByRole('checkbox', { name: 'vestindo' }));
    expect(actions.updateInventoryItemAction).toHaveBeenLastCalledWith(id, armor.id, { equipped: true });

    const row = screen.getByText('Jaqueta Blindada').closest('li')!;
    await user.click(within(row).getByRole('button', { name: 'tirar' }));
    await user.type(within(row).getByLabelText('Vendeu por (opcional)'), '600');
    await user.click(within(row).getByRole('button', { name: 'Vender' }));
    expect(actions.removeInventoryItemAction).toHaveBeenCalledWith(id, armor.id, { qty: 1, salePrice: 600 });
  });
});
