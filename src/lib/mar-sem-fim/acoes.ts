// Um único ponto de entrada: (estado, ação, agora) -> resultado. O servidor roda isto com o relógio dele (e grava);
// o modo sem conta roda o mesmo código com o relógio do aparelho. Ações e números nunca vêm prontos do cliente.

import { abastecer, carregarAgulha, comprarMelhoria, reparar } from "./barco";
import { escolherNaHistoria, marcarConclusao } from "./historias";
import type { Acao, Estado, Resultado } from "./tipos";
import { chegar, resolverEvento, zarpar } from "./viagem";

const str = (v: unknown, max = 80) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

/** Lê uma ação vinda da rede. Qualquer coisa fora do formato vira null. */
export function lerAcao(bruto: unknown): Acao | null {
  if (!bruto || typeof bruto !== "object") return null;
  const a = bruto as Record<string, unknown>;
  switch (a.t) {
    case "zarpar": { const destino = str(a.destino); return destino ? { t: "zarpar", destino } : null; }
    case "chegar": return { t: "chegar" };
    case "evento": { const id = str(a.id); const opcao = str(a.opcao); return id && opcao ? { t: "evento", id, opcao } : null; }
    case "cena": { const ilha = str(a.ilha); const opcao = str(a.opcao); return ilha && opcao ? { t: "cena", ilha, opcao } : null; }
    case "melhoria": { const id = str(a.id); return id ? { t: "melhoria", id } : null; }
    case "reparar": return { t: "reparar" };
    case "abastecer": return { t: "abastecer" };
    case "carregar": return { t: "carregar" };
    default: return null;
  }
}

export function aplicarAcao(e: Estado, acao: Acao, agora: number): Resultado {
  switch (acao.t) {
    case "zarpar": return zarpar(e, acao.destino, agora);
    case "chegar": return chegar(e, agora);
    case "evento": return resolverEvento(e, acao.id, acao.opcao);
    case "melhoria": return comprarMelhoria(e, acao.id);
    case "reparar": return reparar(e);
    case "abastecer": return abastecer(e);
    case "carregar": return carregarAgulha(e, agora);
    case "cena": {
      if (acao.opcao === null) return { ok: false, erro: "opcao-invalida" };
      const r = escolherNaHistoria(e, acao.ilha, acao.opcao);
      return r.ok ? { ok: true, estado: marcarConclusao(r.estado, acao.ilha, agora) } : r;
    }
  }
}
