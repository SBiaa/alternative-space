import { gerarCartaz } from "@/lib/mar-sem-fim/cartaz-og";
import { lerCartaz } from "@/lib/mar-sem-fim/dados";
import { acharPorApelido } from "@/lib/role/dados";

// Cartaz de procurado como imagem pra compartilhar. Só mostra nome de pirata, barco e recompensa do jogo.
export async function GET(_req: Request, { params }: { params: Promise<{ usuario: string }> }) {
  const { usuario } = await params;
  const perfil = await acharPorApelido(decodeURIComponent(usuario).replace(/^@/, "")).catch(() => null);
  const c = perfil ? await lerCartaz(perfil.userId).catch(() => null) : null;
  if (!c) return new Response("Sem cartaz", { status: 404 });
  return gerarCartaz(c);
}
