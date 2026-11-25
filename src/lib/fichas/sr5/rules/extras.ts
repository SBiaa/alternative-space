import { label } from '../data';
import { addKarma, issue, type Ctx } from './context';
import { findItem } from './resources';

/**
 * Regras que vêm depois dos atributos calculados: focos vinculados, programas
 * carregados em cyberdecks e artes marciais.
 */
export function checkExtras(ctx: Ctx): void {
  const { draft, s } = ctx;

  // Focos vinculados: karma = Força × multiplicador do tipo; soma das Forças ≤ Magia × 5.
  let boundForce = 0;
  draft.gear.forEach((g, i) => {
    if (!g.bonded) return;
    const path = `gear.${i}`;
    const item = findItem(ctx, g.kind, g.itemId);
    if (!item || !('bindKarma' in item) || !item.bindKarma) {
      issue(ctx, 'error', 'resources', 'focus.notFocus', 'Só focos podem ser vinculados.', path);
      return;
    }
    const force = g.rating ?? 1;
    boundForce += force;
    addKarma(ctx, 'focos vinculados', force * item.bindKarma);
  });
  if (boundForce > 0) {
    const mag = ctx.attrs.MAG.value;
    if (mag <= 0) {
      issue(ctx, 'error', 'resources', 'focus.noMagic', 'Só quem tem Magia pode vincular focos.');
    } else if (boundForce > mag * 5) {
      issue(ctx, 'error', 'resources', 'focus.limit',
        `A soma da Força dos focos vinculados (${boundForce}) passa de Magia × 5 = ${mag * 5}.`);
    }
  }

  // Programas carregados: cabem nos slots do cyberdeck.
  const loaded = new Map<string, number>();
  draft.gear.forEach((g, i) => {
    if (g.kind !== 'program' || !g.loadedIn) return;
    const host = draft.gear.find((h) => h.key === g.loadedIn);
    const hostItem = host ? findItem(ctx, host.kind, host.itemId) : undefined;
    if (!host || !hostItem || !('device' in hostItem) || !hostItem.device?.array) {
      issue(ctx, 'error', 'resources', 'program.host', 'O programa precisa estar carregado num cyberdeck da ficha.', `gear.${i}`);
      return;
    }
    loaded.set(host.key, (loaded.get(host.key) ?? 0) + Math.max(1, g.qty ?? 1));
  });
  for (const [key, n] of loaded) {
    const host = draft.gear.find((h) => h.key === key)!;
    const item = findItem(ctx, host.kind, host.itemId);
    const slots = item && 'device' in item ? item.device?.programs ?? 0 : 0;
    if (n > slots) {
      issue(ctx, 'error', 'resources', 'program.slots',
        `${item ? label(item) : 'O deck'} roda ${slots} ${slots === 1 ? 'programa' : 'programas'} ao mesmo tempo, mas você carregou ${n}.`);
    }
  }

  // Artes marciais (Run & Gun): 7 de karma por estilo, 5 por técnica.
  const seen = new Set<string>();
  (draft.martialArts ?? []).forEach((m, i) => {
    const path = `martialArts.${i}`;
    const art = ctx.data.martialArts.find((a) => a.id === m.id);
    if (!art) {
      issue(ctx, 'error', 'extras', 'martial.unknown', 'Arte marcial desconhecida.', path);
      return;
    }
    if (seen.has(art.id)) {
      issue(ctx, 'error', 'extras', 'martial.duplicate', `${label(art)}: já escolhida.`, path);
      return;
    }
    seen.add(art.id);
    const bad = m.techniques.filter((t) => !art.techniques.includes(t));
    if (bad.length) {
      issue(ctx, 'error', 'extras', 'martial.technique', `${label(art)}: ${bad.join(', ')} não faz parte desse estilo.`, path);
    }
    addKarma(ctx, 'artes marciais', s.martialArtKarma + new Set(m.techniques).size * s.martialTechniqueKarma);
  });
}
