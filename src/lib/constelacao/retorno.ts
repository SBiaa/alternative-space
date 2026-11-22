export type Estado = "certa" | "outro" | "ausente";

/**
 * Retorno de um palpite, letra por letra. Cada ocorrência da letra na resposta conta uma vez:
 * primeiro marcam-se as certas, depois as de outro lugar, enquanto sobrarem ocorrências.
 */
export function retornoPorLetra(resposta: string, palpite: string): Estado[] {
  const n = resposta.length;
  const r: Estado[] = Array.from({ length: n }, () => "ausente");
  if (palpite.length !== n) return r;
  const restantes = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    if (palpite[i] === resposta[i]) r[i] = "certa";
    else restantes.set(resposta[i], (restantes.get(resposta[i]) ?? 0) + 1);
  }
  for (let i = 0; i < n; i++) {
    if (r[i] === "certa") continue;
    const sobra = restantes.get(palpite[i]) ?? 0;
    if (sobra > 0) {
      r[i] = "outro";
      restantes.set(palpite[i], sobra - 1);
    }
  }
  return r;
}

const PESO: Record<Estado, number> = { ausente: 1, outro: 2, certa: 3 };

/** Melhor estado já visto de cada letra, pro teclado. */
export function estadoDasLetras(palpites: string[], retornos: Estado[][]): Map<string, Estado> {
  const m = new Map<string, Estado>();
  palpites.forEach((p, i) => {
    [...p].forEach((l, j) => {
      const novo = retornos[i]?.[j];
      if (!novo) return;
      const atual = m.get(l);
      if (!atual || PESO[novo] > PESO[atual]) m.set(l, novo);
    });
  });
  return m;
}
