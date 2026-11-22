// Leitura dos casos em content/assombracoes/casos. Sem server-only: os testes usam direto.

import fs from "node:fs";
import path from "node:path";
import { problemasDoCaso, schemaCaso, type Caso } from "./schema";

export const PASTA_CASOS = path.join(process.cwd(), "content", "assombracoes", "casos");

/** Lê e valida todos os casos de uma pasta. Caso inválido derruba o build com a lista de problemas. */
export function lerCasosDe(pasta: string = PASTA_CASOS): Caso[] {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const bruto = JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8"));
      const r = schemaCaso.safeParse(bruto);
      if (!r.success) throw new Error(`Caso ${f} inválido: ${r.error.message}`);
      if (`${r.data.publico.slug}.json` !== f) throw new Error(`Caso ${f}: o slug precisa ser o nome do arquivo`);
      const problemas = problemasDoCaso(r.data);
      if (problemas.length) throw new Error(`Caso ${f} com problemas:\n- ${problemas.join("\n- ")}`);
      return r.data;
    });
}

/** Casos em rascunho (cartão sem revisão) só aparecem fora de produção ou com ASSOMBRACOES_PREVIEW=1. */
export const mostraRascunhos = () => process.env.NODE_ENV !== "production" || process.env.ASSOMBRACOES_PREVIEW === "1";

export const visiveis = (casos: Caso[], rascunhos = mostraRascunhos()) => casos.filter((c) => c.status === "publicado" || rascunhos);
