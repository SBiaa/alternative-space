import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../character';
import { sr5Data } from '../data';
import { evaluate } from '../rules';
import { publicDraft, publicInventory } from '../share';

const SECRET = 'SEGREDO';

function draftWithSecrets() {
  const d = createEmptyDraft();
  d.concept = { name: 'Nome', alias: 'Codinome', role: 'Decker', notes: SECRET };
  d.enemies = [{ key: 'e', name: 'Inimigo', notes: SECRET }];
  d.career!.vehicles = [{ key: 'v', vehicleId: 'x', name: 'Van', notes: SECRET }];
  d.career!.improvements = [
    { key: SECRET, kind: 'skill', ref: sr5Data.skills.skills[0].id, label: SECRET, from: 1, to: 5, karma: 12, at: SECRET },
  ];
  return d;
}

describe('link público da ficha', () => {
  it('não leva anotações nem o histórico de karma', () => {
    const out = publicDraft(draftWithSecrets());
    expect(JSON.stringify(out)).not.toContain(SECRET);
    expect(out.career!.improvements[0]).toMatchObject({ karma: 0, label: '', at: '' });
    expect(out.concept).toEqual({ name: 'Nome', alias: 'Codinome', role: 'Decker' });
    expect(out.enemies).toEqual([{ key: 'e', name: 'Inimigo' }]);
  });

  it('um campo desconhecido não passa', () => {
    const d = { ...draftWithSecrets(), campoNovo: SECRET };
    expect(JSON.stringify(publicDraft(d))).not.toContain(SECRET);
  });

  it('os números continuam iguais, inclusive o que evoluiu em jogo', () => {
    const d = draftWithSecrets();
    expect(evaluate(publicDraft(d)).skillRatings).toEqual(evaluate(d).skillRatings);
    expect(evaluate(publicDraft(d)).skillRatings[sr5Data.skills.skills[0].id]).toBe(5);
  });

  it('o inventário sai sem anotações nem ids do banco', () => {
    const row = {
      id: SECRET, characterId: SECRET, createdAt: new Date(), kind: 'gear' as const, itemId: null,
      name: 'Item', rating: null, qty: 2, equipped: false, notes: SECRET,
    };
    expect(publicInventory([row])).toEqual([
      { kind: 'gear', itemId: null, name: 'Item', rating: null, qty: 2, equipped: false, notes: '' },
    ]);
  });
});
