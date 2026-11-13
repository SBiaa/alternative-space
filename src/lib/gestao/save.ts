// Utilitários de save compartilhados pelos jogos de gestão (Taverna, Lan House).

/** Entre o save do aparelho e o da conta, o mais avançado vence (o progresso só anda pra frente). Empate: a conta. */
export function escolherMaisAvancado<T>(local: T | null, remoto: T | null, passo: (s: T) => number): { save: T | null; origem: "local" | "remoto" | "nenhum" } {
  if (!local && !remoto) return { save: null, origem: "nenhum" };
  if (!remoto) return { save: local, origem: "local" };
  if (!local) return { save: remoto, origem: "remoto" };
  return passo(local) > passo(remoto) ? { save: local, origem: "local" } : { save: remoto, origem: "remoto" };
}

/** Leitura e escrita no localStorage que nunca quebram a tela (aba anônima, armazenamento cheio). */
export function lerLocal<T>(chave: string, migrar: (bruto: unknown) => T | null): T | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? migrar(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
}
export function guardarLocal(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {}
}
export function apagarLocal(chave: string) {
  try {
    localStorage.removeItem(chave);
  } catch {}
}
