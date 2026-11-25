import { CampanhaNaoEncontrada } from '@/lib/mesa/server/acesso';
import { abrirArquivoDoHandout } from '@/lib/mesa/server/mundo';

/**
 * Entrega o arquivo de um handout. O Blob é privado, então esta rota é a única porta: confere o login, se a pessoa
 * está na campanha e, para jogador, se o mestre já revelou. Não revelado vira 404, igual a handout que não existe.
 */
export async function GET(_request: Request, ctx: RouteContext<'/mesa/[id]/handouts/[handoutId]/arquivo'>) {
  const { id, handoutId } = await ctx.params;
  const naoEncontrado = () => new Response('Handout não encontrado.', { status: 404 });
  try {
    const arquivo = await abrirArquivoDoHandout(id, handoutId);
    if (!arquivo) return naoEncontrado();
    return new Response(arquivo.stream, {
      headers: {
        'Content-Type': arquivo.contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
        ...(arquivo.tipo === 'imagem' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
      },
    });
  } catch (e) {
    if (e instanceof CampanhaNaoEncontrada) return naoEncontrado();
    throw e;
  }
}
