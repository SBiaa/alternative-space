"use client";

import { useRouter } from "next/navigation";
import { salvarResultado } from "@/app/actions/tripulante";

// Ao terminar: salva no diário de bordo de quem está logado (sem login ou se falhar, só segue) e abre o resultado.
export function useFinishQuiz(slug: string) {
  const router = useRouter();
  return async (result: string) => {
    await salvarResultado(slug, result).catch(() => false);
    router.push(`/quiz/${slug}/${result}`);
  };
}
