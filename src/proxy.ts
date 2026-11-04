import { auth } from "@/lib/auth/server";

// Perfil e painel exigem login. Coleções e quizzes ficam abertos e mostram mais pra quem entrou.
// O proxy só barra quem não entrou; quem é admin é conferido na página e em cada ação (src/lib/auth/admin.ts).
export default auth.middleware({ loginUrl: "/entrar" });

export const config = {
  matcher: ["/conta/:path*", "/admin/:path*"],
};
