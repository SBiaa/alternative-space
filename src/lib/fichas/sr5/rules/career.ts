import type { AttrKey } from '../types';
import type { Ctx } from './context';

/**
 * Aplica ao resultado o que o personagem já evoluiu em jogo (metas concluídas,
 * iniciação...). Roda depois da criação ser avaliada e antes dos valores
 * derivados, então iniciativa, monitores e limites já saem atualizados.
 * Na criação a lista de melhorias é sempre vazia.
 */
export function applyCareer(ctx: Ctx): void {
  const list = ctx.draft.career?.improvements ?? [];
  for (const imp of list) {
    if (imp.to === undefined || !imp.ref) continue;
    if (imp.kind === 'attribute') {
      const a = ctx.attrs[imp.ref as AttrKey];
      if (!a || imp.ref === 'ESS') continue;
      a.value = Math.max(a.value, imp.to);
      a.max = Math.max(a.max, imp.to);
    } else if (imp.kind === 'skill') {
      ctx.skillRatings[imp.ref] = Math.max(ctx.skillRatings[imp.ref] ?? 0, imp.to);
    } else if (imp.kind === 'skillGroup') {
      ctx.groupRatings[imp.ref] = Math.max(ctx.groupRatings[imp.ref] ?? 0, imp.to);
    }
  }
}
