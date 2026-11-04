import { auth } from "@/lib/auth/server";

// Só o perfil exige login. Coleções e quizzes ficam abertos e mostram mais pra quem entrou.
export default auth.middleware({ loginUrl: "/entrar" });

export const config = {
  matcher: ["/conta/:path*"],
};
