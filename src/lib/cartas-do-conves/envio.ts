// Conferência de um envio de ações. Lógica pura (sem banco), usada pelas server actions e pelos testes.

import { CONTEUDO } from "./conteudo";
import { liberacoes, simular } from "./simular";
import type { Acao, Conteudo, Estado, Resumo } from "./tipos";

export type Conferido =
  | { ok: true; acoes: Acao[]; estado: Estado; resumo: Resumo; liberadas: string[] }
  | { ok: false; erro: "refazer" | "invalida"; detalhe?: string };

/**
 * `guardadas` são as ações que o servidor já conferiu antes. O envio novo tem que continuar a partir delas:
 * voltar atrás (pra tentar de novo uma escolha e ver outra recompensa) é recusado.
 */
export function conferirEnvio(run: { seed: string; oficio: string; colecao: string[]; acoes: Acao[] }, enviadas: unknown, C: Conteudo = CONTEUDO): Conferido {
  if (!Array.isArray(enviadas)) return { ok: false, erro: "invalida", detalhe: "formato" };
  if (enviadas.length < run.acoes.length) return { ok: false, erro: "refazer", detalhe: "menos ações do que as já guardadas" };
  for (let i = 0; i < run.acoes.length; i++) {
    if (JSON.stringify(enviadas[i]) !== JSON.stringify(run.acoes[i])) return { ok: false, erro: "refazer", detalhe: `ação ${i} diferente da guardada` };
  }
  const s = simular({ seed: run.seed, oficio: run.oficio, colecao: run.colecao, acoes: enviadas }, C);
  if (!s.ok) return { ok: false, erro: "invalida", detalhe: `${s.erro} na ação ${s.indice}` };
  return { ok: true, acoes: enviadas as Acao[], estado: s.estado, resumo: s.resumo, liberadas: liberacoes(s.resumo, C) };
}
