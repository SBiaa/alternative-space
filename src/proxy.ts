import { auth } from "@/lib/auth/server";

// Perfil, painel e as fichas salvas (ficha, times, convites) exigem login. Coleções, quizzes e o assistente
// de ficha (/fichas/shadowrun) ficam abertos e mostram mais pra quem entrou.
// O proxy só barra quem não entrou; quem é admin é conferido na página e em cada ação (src/lib/auth/admin.ts).
export default auth.middleware({ loginUrl: "/entrar" });

export const config = {
  matcher: ["/conta/:path*", "/admin/:path*", "/fichas/times/:path*", "/fichas/convite/:path*", "/fichas/:id([0-9a-fA-F-]{36})"],
};
