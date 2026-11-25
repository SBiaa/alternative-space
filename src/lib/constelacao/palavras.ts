import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizar, palavraValida } from "./jogo";

// Lista de palpites aceitos: content/constelacao/palavras-validas.txt, uma palavra por linha, sem acento.
// Linhas vazias e as que começam com # são ignoradas. A resposta do dia sempre vale, mesmo fora da lista.

let cache: Promise<Set<string>> | null = null;

export function palavrasValidas(): Promise<Set<string>> {
  cache ??= readFile(path.join(process.cwd(), "content", "constelacao", "palavras-validas.txt"), "utf8").then((txt) => {
    const s = new Set<string>();
    for (const linha of txt.split(/\r?\n/)) {
      if (!linha.trim() || linha.trim().startsWith("#")) continue;
      const p = normalizar(linha);
      if (palavraValida(p)) s.add(p);
    }
    return s;
  });
  return cache;
}
