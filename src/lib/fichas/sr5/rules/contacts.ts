import { addKarma, budget, issue, pluralize, type Ctx } from './context';

/** Acima disso, o contato é forte demais para começar (orientação do livro básico). */
export const CONTACT_SOFT_CAP = 7;

export function checkContacts(ctx: Ctx): void {
  const { draft, s } = ctx;
  // settings.contactPointsExpr = {CHAUnaug} * 3
  const total = ctx.attrs.CHA.value * 3;
  let spent = 0;

  draft.contacts.forEach((c, i) => {
    const path = `contacts.${i}`;
    const name = c.name.trim() || `Contato ${i + 1}`;
    if (!Number.isInteger(c.connection) || c.connection < 1 || c.connection > 12) {
      issue(ctx, 'error', 'contacts', 'contact.connection', `${name}: Conexão vai de 1 a 12.`, path);
    }
    if (!Number.isInteger(c.loyalty) || c.loyalty < 1 || c.loyalty > 6) {
      issue(ctx, 'error', 'contacts', 'contact.loyalty', `${name}: Lealdade vai de 1 a 6.`, path);
    }
    const cost = Math.max(0, c.connection) + Math.max(0, c.loyalty);
    if (cost > CONTACT_SOFT_CAP) {
      issue(ctx, 'warning', 'contacts', 'contact.strong',
        `${name}: Conexão + Lealdade = ${cost}. Na criação, o normal é no máximo ${CONTACT_SOFT_CAP}; combine com o mestre.`, path);
    }
    if (!c.name.trim()) {
      issue(ctx, 'warning', 'contacts', 'contact.name', `Dê um nome ao contato ${i + 1}.`, path);
    }
    spent += cost;
  });

  const karma = Math.max(0, spent - total);
  addKarma(ctx, 'contatos', karma * s.karmaCosts.contact);
  ctx.budgets.contacts = budget(total, Math.min(spent, total));
  if (ctx.metatype && spent < total) {
    issue(ctx, 'warning', 'contacts', 'contacts.leftover',
      `Sobraram ${pluralize(total - spent, 'ponto', 'pontos')} de contato (Carisma × 3). Pontos não usados são perdidos.`);
  }
  if (karma > 0) {
    issue(ctx, 'info', 'contacts', 'contacts.karma',
      `Os contatos passaram dos pontos gratuitos em ${karma}; isso sai do karma.`);
  }
}
