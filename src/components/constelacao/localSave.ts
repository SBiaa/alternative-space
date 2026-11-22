import { CHAVE_SAVE, migrarSave, saveVazio, type SaveLocal } from "@/lib/constelacao/save";
import { PARTIDA } from "@/lib/constelacao/config";

// Save de quem joga sem conta: fica no navegador e o servidor reconfere tudo. Nenhum acesso pode quebrar a página.

export function lerSaveLocal(): SaveLocal | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SAVE);
    return bruto ? migrarSave(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
}

export function gravarSaveLocal(s: SaveLocal) {
  try {
    const dias = Object.keys(s.dias).sort().slice(-PARTIDA.diasNoNavegador);
    localStorage.setItem(CHAVE_SAVE, JSON.stringify({ ...saveVazio(), dias: Object.fromEntries(dias.map((d) => [d, s.dias[d]])) }));
  } catch {}
}

export function limparSaveLocal() {
  try {
    localStorage.removeItem(CHAVE_SAVE);
  } catch {}
}
