"use client";

import { useRouter } from "next/navigation";
import { salvarResultado } from "@/app/actions/tripulante";

export type Extra = { scores?: number[]; tie?: boolean };

// Ao terminar: salva no registro de bordo de quem está logado (sem login ou se falhar, só segue) e abre o resultado.
// Com mistura, ela vai na URL (?m=6.3.2.1, &e=1 se foi escolha no empate) pra a página mostrar e o cadastro salvar depois.
export function useFinishQuiz(slug: string) {
  const router = useRouter();
  return async (result: string, extra: Extra = {}) => {
    await salvarResultado(slug, result, extra).catch(() => false);
    const q = extra.scores ? `?m=${extra.scores.join(".")}${extra.tie ? "&e=1" : ""}` : "";
    router.push(`/quiz/${slug}/${result}${q}`);
  };
}
