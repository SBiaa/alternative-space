/**
 * Inventário da ficha em jogo: o que o personagem carrega depois da criação.
 * Funções puras, usadas no servidor (validação) e na tela (exibição).
 *
 * Implantes (ciberware/bioware) não entram aqui: fazem parte do corpo e mexem
 * na Essência, então continuam vindo da ficha de criação, só para consulta.
 */
import type { CharacterDraft, DraftGear } from './character';
import { label, sr5Data } from './data';
import { InputError, MAX_LEDGER_AMOUNT } from './play';
import { evalExpr, WARE_GRADES } from './rules';
import type { Armor, Augmentation, GearItem, Weapon } from './types';

export type InventoryKind = 'weapon' | 'armor' | 'gear' | 'other';

export const INVENTORY_KINDS: { key: InventoryKind; title: string }[] = [
  { key: 'weapon', title: 'Armas' },
  { key: 'armor', title: 'Armaduras' },
  { key: 'gear', title: 'Equipamento' },
  { key: 'other', title: 'Outros' },
];

export const MAX_ITEM_NAME_LENGTH = 120;
export const MAX_ITEM_NOTES_LENGTH = 2_000;
export const MAX_ITEM_QTY = 9_999;
export const MAX_ITEM_RATING = 20;

/** Item do inventário como ele chega na tela (mesmo formato da tabela). */
export interface InventoryItemLike {
  kind: InventoryKind;
  itemId: string | null;
  name: string;
  rating: number | null;
  qty: number;
  equipped: boolean;
  notes: string;
}

const CATALOG: Record<Exclude<InventoryKind, 'other'>, GearItem[]> = {
  weapon: sr5Data.weapons,
  armor: sr5Data.armor,
  gear: sr5Data.gear,
};

/** Lista do catálogo para um tipo. "Outros" não tem catálogo: é sempre texto livre. */
export function catalogFor(kind: InventoryKind): GearItem[] {
  return kind === 'other' ? [] : CATALOG[kind];
}

export function findCatalogItem(kind: InventoryKind, itemId: string | null | undefined): GearItem | undefined {
  if (!itemId) return undefined;
  return catalogFor(kind).find((x) => x.id === itemId);
}

/** Nível máximo do item, quando ele tem nível. */
export function maxRatingOf(item: GearItem | Augmentation): number | undefined {
  return ('maxRating' in item && item.maxRating) || item.rating || undefined;
}

/** Se o item pede nível na hora de comprar (tem nível ou custo que depende dele). */
export function hasRating(item: GearItem): boolean {
  return (maxRatingOf(item) ?? 0) > 1 || (item.cost.value === null && /rating/i.test(item.cost.raw));
}

/** Preço de uma unidade no catálogo, já com o nível. `null` quando o preço é variável. */
export function unitCost(item: GearItem, rating?: number | null): number | null {
  const v = item.cost.value ?? evalExpr(item.cost.raw, { rating: rating ?? 1, minRating: 1 });
  return v === null || !Number.isFinite(v) ? null : Math.round(v);
}

/** Resumo das estatísticas de jogo, para mostrar na linha do item. */
export function itemStats(kind: InventoryKind, itemId: string | null): string | null {
  const item = findCatalogItem(kind, itemId);
  if (!item) return null;
  if (kind === 'weapon') {
    const w = item as Weapon;
    const parts = [
      `Dano ${w.damage}`,
      w.ap && w.ap !== '-' && w.ap !== '0' ? `PA ${w.ap}` : null,
      w.mode && w.mode !== '0' ? w.mode : null,
      `Precisão ${w.accuracy}`,
      w.rc && w.rc !== '0' ? `RC ${w.rc}` : null,
      w.ammo && w.ammo !== '0' ? `Munição ${w.ammo}` : null,
    ];
    return parts.filter(Boolean).join(' · ');
  }
  if (kind === 'armor') return `Armadura ${(item as Armor).armor}`;
  return item.categoryPt ?? item.category;
}

/**
 * O que a ficha de criação comprou, convertido em itens de inventário.
 * Implantes ficam de fora (veja `implantsOf`). A primeira armadura comprada já vem "em uso".
 */
export function inventoryFromDraft(draft: CharacterDraft): InventoryItemLike[] {
  const out: InventoryItemLike[] = [];
  let armorWorn = false;
  for (const g of draft.gear) {
    if (g.kind !== 'weapon' && g.kind !== 'armor' && g.kind !== 'gear') continue;
    const item = findCatalogItem(g.kind, g.itemId);
    if (!item) continue;
    const equipped = g.kind === 'armor' && !armorWorn;
    if (equipped) armorWorn = true;
    out.push({
      kind: g.kind,
      itemId: g.itemId,
      name: label(item).slice(0, MAX_ITEM_NAME_LENGTH),
      rating: g.rating ?? null,
      qty: Math.min(Math.max(1, g.qty), MAX_ITEM_QTY),
      equipped,
      notes: '',
    });
  }
  return out;
}

export interface ImplantLine {
  key: string;
  name: string;
  kind: 'cyberware' | 'bioware';
  rating: number | null;
  grade: string;
}

/** Implantes da ficha de criação, só para consulta no inventário. */
export function implantsOf(draft: CharacterDraft): ImplantLine[] {
  return draft.gear.flatMap((g: DraftGear) => {
    if (g.kind !== 'cyberware' && g.kind !== 'bioware') return [];
    const list = g.kind === 'cyberware' ? sr5Data.cyberware : sr5Data.bioware;
    const item = list.find((x) => x.id === g.itemId);
    if (!item) return [];
    return [
      {
        key: g.key,
        name: label(item),
        kind: g.kind,
        rating: g.rating ?? null,
        grade: WARE_GRADES[g.grade ?? 'standard'].namePt,
      },
    ];
  });
}

/** Valor da armadura que está em uso: a melhor peça principal, mais os acessórios com "+". */
export function wornArmor(items: InventoryItemLike[]): number | null {
  let base = 0;
  let bonus = 0;
  let any = false;
  for (const i of items) {
    if (i.kind !== 'armor' || !i.equipped) continue;
    const a = findCatalogItem('armor', i.itemId) as Armor | undefined;
    if (!a) continue;
    any = true;
    const raw = String(a.armor).trim();
    const n = Number.parseInt(raw.replace(/^\+/, ''), 10);
    if (!Number.isFinite(n)) continue;
    if (raw.startsWith('+')) bonus += n;
    else base = Math.max(base, n);
  }
  return any ? base + bonus : null;
}

// ---------------------------------------------------------------------------
// Validação do que vem do navegador

function parseKind(v: unknown): InventoryKind {
  if (v === 'weapon' || v === 'armor' || v === 'gear' || v === 'other') return v;
  throw new InputError('Tipo de item inválido.');
}

export function parseQty(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < 1) throw new InputError('A quantidade precisa ser 1 ou mais.');
  if (n > MAX_ITEM_QTY) throw new InputError('Quantidade alta demais.');
  return n;
}

export function parseItemNotes(v: unknown): string {
  const text = typeof v === 'string' ? v : '';
  if (text.length > MAX_ITEM_NOTES_LENGTH) throw new InputError('Anotação do item grande demais.');
  return text;
}

function parseItemName(v: unknown): string {
  const t = typeof v === 'string' ? v.trim() : '';
  if (!t) throw new InputError('Dê um nome para o item.');
  if (t.length > MAX_ITEM_NAME_LENGTH) throw new InputError(`Nome com no máximo ${MAX_ITEM_NAME_LENGTH} letras.`);
  return t;
}

/** Valor em nuyen opcional (preço pago ou recebido). 0 ou vazio = não mexe no saldo. */
export function parsePrice(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < 0) throw new InputError('O preço precisa ser um número inteiro, sem sinal.');
  if (n > MAX_LEDGER_AMOUNT) throw new InputError('Preço alto demais.');
  return n;
}

export interface NewItemInput {
  kind: unknown;
  itemId?: unknown;
  name?: unknown;
  rating?: unknown;
  qty: unknown;
  notes?: unknown;
  /** Quanto descontar do nuyen pela compra (total, não por unidade). */
  price?: unknown;
}

export interface NewItem extends InventoryItemLike {
  price: number;
}

/**
 * Valida um item novo. Do catálogo, o nome vem do catálogo; fora dele, o jogador
 * dá o nome. Armas e armaduras novas não entram "em uso" sozinhas.
 */
export function parseNewItem(input: NewItemInput): NewItem {
  const kind = parseKind(input.kind);
  const qty = parseQty(input.qty);
  const notes = parseItemNotes(input.notes);
  const price = parsePrice(input.price);

  const itemId = typeof input.itemId === 'string' && input.itemId ? input.itemId : null;
  if (itemId) {
    const item = findCatalogItem(kind, itemId);
    if (!item) throw new InputError('Item não encontrado no catálogo.');
    let rating: number | null = null;
    if (hasRating(item)) {
      const max = maxRatingOf(item) ?? MAX_ITEM_RATING;
      const r = typeof input.rating === 'number' ? input.rating : Number(input.rating ?? 1);
      if (!Number.isInteger(r) || r < 1 || r > max) throw new InputError(`Nível entre 1 e ${max}.`);
      rating = r;
    }
    return { kind, itemId, name: label(item).slice(0, MAX_ITEM_NAME_LENGTH), rating, qty, equipped: false, notes, price };
  }

  return { kind, itemId: null, name: parseItemName(input.name), rating: null, qty, equipped: false, notes, price };
}

/** Motivo do lançamento no histórico de nuyen, dentro do limite de letras. */
export function ledgerReason(prefix: 'Compra' | 'Venda', name: string, qty: number): string {
  const text = `${prefix}: ${name}${qty > 1 ? ` (×${qty})` : ''}`;
  return text.length > 200 ? `${text.slice(0, 199)}…` : text;
}
