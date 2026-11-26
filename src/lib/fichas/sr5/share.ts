/**
 * O que sai no link público de uma ficha. Ficam de fora o nuyen, o histórico e todas
 * as anotações livres. A limpeza é feita no servidor: o que não está aqui nem chega
 * ao navegador de quem abre o link.
 */
import type { CharacterDraft } from './character';
import type { InventoryItemLike } from './inventory';

/**
 * Cada campo é listado um a um de propósito: um campo novo na ficha não vai
 * para o link público sem alguém decidir isso aqui.
 */
export function publicDraft(d: CharacterDraft): CharacterDraft {
  return {
    schemaVersion: d.schemaVersion,
    concept: { name: d.concept.name, alias: d.concept.alias, role: d.concept.role },
    priorities: d.priorities,
    metatypeId: d.metatypeId,
    talent: d.talent,
    attributes: d.attributes,
    special: d.special,
    magic: d.magic,
    qualities: d.qualities,
    skills: d.skills,
    skillGroups: d.skillGroups,
    knowledge: d.knowledge,
    contacts: d.contacts,
    gear: d.gear,
    lifestyles: d.lifestyles,
    karmaToNuyen: d.karmaToNuyen,
    options: d.options,
    martialArts: d.martialArts,
    enemies: d.enemies?.map((e) => ({ key: e.key, name: e.name })),
    career: d.career && {
      initiationGrade: d.career.initiationGrade,
      submersionGrade: d.career.submersionGrade,
      metamagicIds: d.career.metamagicIds,
      echoIds: d.career.echoIds,
      companions: d.career.companions,
      // As regras precisam do que mudou; o histórico (nome, karma gasto, data) não sai.
      improvements: d.career.improvements.map((i, n) => ({
        key: String(n), kind: i.kind, ref: i.ref, to: i.to, label: '', karma: 0, at: '',
      })),
      vehicles: d.career.vehicles?.map((v) => ({ key: v.key, vehicleId: v.vehicleId, name: v.name })),
    },
    portrait: d.portrait,
  };
}

export function publicInventory(items: readonly InventoryItemLike[]): InventoryItemLike[] {
  return items.map((i) => ({
    kind: i.kind, itemId: i.itemId, name: i.name, rating: i.rating, qty: i.qty, equipped: i.equipped, notes: '',
  }));
}
