import { calendarioIcs } from '@/lib/mesa/ics';
import { eventosDaAgenda } from '@/lib/mesa/server/agenda';

/**
 * Calendário assinável das sessões da Mesa do Mestre. Google Agenda e celular buscam este endereço sozinhos,
 * sem login: o token na URL é o segredo (fica de fora do proxy.ts de propósito). Trocar o token no
 * calendário da Mesa invalida o link antigo.
 */
export async function GET(request: Request, ctx: RouteContext<'/agenda-mesa/[token]'>) {
  const { token } = await ctx.params;
  const eventos = await eventosDaAgenda(token.replace(/\.ics$/, ''), new URL(request.url).origin);
  if (!eventos) return new Response('Link de agenda inválido ou trocado.', { status: 404 });
  return new Response(calendarioIcs(eventos, 'Mesa do Mestre'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="mesa-do-mestre.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
