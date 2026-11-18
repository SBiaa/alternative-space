import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { ARQUIVOS_PERMITIDOS, MAX_BYTES_HANDOUT, prefixoDosArquivos } from '@/lib/mesa/regras-mundo';
import { acessoDeMestre, CampanhaNaoEncontrada, InputError } from '@/lib/mesa/server/acesso';

/**
 * Entrega ao navegador do mestre um token para enviar o arquivo direto ao Blob (o corpo de uma função da Vercel
 * aceita só 4,5 MB). Só o mestre desta campanha recebe o token, e ele só vale para imagem ou PDF de até 10 MB,
 * num caminho dentro da pasta da campanha. O Blob é privado: ninguém abre o arquivo sem passar pela rota de arquivo.
 */
export async function POST(request: Request, ctx: RouteContext<'/mesa/[id]/handouts/upload'>) {
  const { id } = await ctx.params;
  const body = (await request.json()) as HandleUploadBody;
  try {
    const resposta = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        await acessoDeMestre(id, 'enviar handouts');
        if (!pathname.startsWith(prefixoDosArquivos(id)) || pathname.includes('..')) throw new InputError('Caminho do arquivo inválido.');
        return {
          allowedContentTypes: ARQUIVOS_PERMITIDOS,
          maximumSizeInBytes: MAX_BYTES_HANDOUT,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(resposta);
  } catch (e) {
    if (e instanceof CampanhaNaoEncontrada) return Response.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    if (e instanceof InputError) return Response.json({ error: e.message }, { status: 403 });
    console.error('Falha ao preparar o envio do handout', e);
    return Response.json({ error: 'Não deu para preparar o envio.' }, { status: 400 });
  }
}
