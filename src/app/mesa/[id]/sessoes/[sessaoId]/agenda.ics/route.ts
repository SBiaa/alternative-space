import { calendarioIcs, eventoDeSessao } from '@/lib/mesa/ics';
import { CampanhaNaoEncontrada } from '@/lib/mesa/server/acesso';
import { getSessao } from '@/lib/mesa/server/sessoes';

/** Baixa a sessão como evento de calendário (.ics) para abrir no Google Agenda, Apple Calendar, Outlook. */
export async function GET(request: Request, ctx: RouteContext<'/mesa/[id]/sessoes/[sessaoId]/agenda.ics'>) {
  const { id, sessaoId } = await ctx.params;
  try {
    const d = await getSessao(id, sessaoId); // confere login e se a pessoa está na campanha
    const url = `${new URL(request.url).origin}/mesa/${d.campanha.id}/sessoes/${d.sessao.id}`;
    const ics = calendarioIcs([eventoDeSessao(d.sessao, d.campanha.nome, url)], d.campanha.nome);
    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sessao.ics"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    if (e instanceof CampanhaNaoEncontrada) return new Response('Sessão não encontrada.', { status: 404 });
    throw e;
  }
}
