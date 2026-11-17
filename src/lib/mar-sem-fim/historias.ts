// Histórias: pequenos grafos de cenas (cena -> opções -> efeitos -> próxima cena) guardados em content/.
// O estado só guarda a lista de opções escolhidas; a cena atual é sempre refeita a partir dela, então o cliente
// nunca diz em que cena está: só diz qual opção escolheu.

import { ILHA } from "./conteudo";
import { aplicarEfeitos, emViagem, liberarPelaAgulha, progressoVazio, restanteDaIlha } from "./estado";
import type { Cena, Estado, Ilha, OpcaoCena, Resultado } from "./tipos";

export type PosicaoNaHistoria = { id: string; cena: Cena; terminou: boolean };

/** Refaz o caminho escolhido e diz onde a história está. null = caminho inválido (save adulterado). */
export function cenaAtual(ilha: Ilha, caminho: string[]): PosicaoNaHistoria | null {
  let id = ilha.historia.inicio;
  let cena = ilha.historia.cenas[id];
  for (const op of caminho) {
    const escolhida: OpcaoCena | undefined = cena?.opcoes.find((o) => o.id === op);
    if (!cena || !escolhida) return null;
    id = escolhida.proxima;
    cena = ilha.historia.cenas[id];
  }
  if (!cena) return null;
  return { id, cena, terminou: Boolean(cena.fim) || cena.opcoes.length === 0 };
}

/** Opções que o pirata pode escolher agora (ofício e ouro conferidos). */
export function opcoesDisponiveis(e: Estado, cena: Cena): (OpcaoCena & { bloqueada?: "oficio" | "ouro" })[] {
  return cena.opcoes.map((o) => {
    if (o.oficio && o.oficio !== e.oficio) return { ...o, bloqueada: "oficio" as const };
    if ((o.efeitos?.ouro ?? 0) < 0 && e.ouro + (o.efeitos?.ouro ?? 0) < 0) return { ...o, bloqueada: "ouro" as const };
    return o;
  });
}

/** Escolhe uma opção da cena atual. O servidor e o modo local rodam exatamente esta função. */
export function escolherNaHistoria(e: Estado, slug: string, opcaoId: string): Resultado {
  const ilha = ILHA[slug];
  if (!ilha) return { ok: false, erro: "sem-ilha" };
  if (emViagem(e)) return { ok: false, erro: "viagem-em-andamento" };
  if (e.barco.ilhaAtual !== slug) return { ok: false, erro: "fora-da-ilha" };
  const prog = e.ilhas[slug] ?? progressoVazio("travada");
  if (prog.status === "travada" || prog.status === "liberada") return { ok: false, erro: "travada" };
  if (prog.status === "concluida") return { ok: false, erro: "nada-a-fazer" };

  const pos = cenaAtual(ilha, prog.caminho);
  if (!pos || pos.terminou) return { ok: false, erro: "sem-historia" };
  const op = pos.cena.opcoes.find((o) => o.id === opcaoId);
  if (!op) return { ok: false, erro: "opcao-invalida" };
  if (op.oficio && op.oficio !== e.oficio) return { ok: false, erro: "opcao-invalida" };
  if ((op.efeitos?.ouro ?? 0) < 0 && e.ouro + (op.efeitos?.ouro ?? 0) < 0) return { ok: false, erro: "sem-ouro" };

  // Os efeitos da opção e, se a próxima cena tiver, os da entrada nela. Ouro e recompensa respeitam o teto da ilha.
  let estado = e;
  let ganhoOuro = prog.ganhoOuro;
  let ganhoRecompensa = prog.ganhoRecompensa;
  const proxima = ilha.historia.cenas[op.proxima];
  for (const ef of [op.efeitos, proxima?.efeitos]) {
    const teto = restanteDaIlha(slug, { ...prog, ganhoOuro, ganhoRecompensa });
    const r = aplicarEfeitos(estado, ef, teto);
    estado = r.estado;
    ganhoOuro += r.ganho.ouro;
    ganhoRecompensa += r.ganho.recompensa;
  }
  const caminho = [...prog.caminho, op.id];
  const fim = Boolean(proxima?.fim) || (proxima?.opcoes.length ?? 0) === 0;
  const ilhas = {
    ...estado.ilhas,
    [slug]: { ...prog, status: fim ? ("concluida" as const) : prog.status, caminho, ganhoOuro, ganhoRecompensa },
  };
  return { ok: true, estado: liberarPelaAgulha({ ...estado, ilhas }) };
}

/** Marca a hora em que a ilha foi concluída (o relógio é de quem chama, não deste módulo). */
export function marcarConclusao(e: Estado, slug: string, agora: number): Estado {
  const p = e.ilhas[slug];
  if (!p || p.status !== "concluida" || p.concluidaEm) return e;
  return { ...e, ilhas: { ...e.ilhas, [slug]: { ...p, concluidaEm: agora } } };
}

/** Maior recompensa e ouro que um caminho da história pode render (para o teste de conteúdo e para checar o teto). */
export function maximoDaHistoria(ilha: Ilha): { ouro: number; recompensa: number } {
  const memo = new Map<string, { ouro: number; recompensa: number }>();
  const visita = (id: string, pilha: Set<string>): { ouro: number; recompensa: number } => {
    const m = memo.get(id);
    if (m) return m;
    const cena = ilha.historia.cenas[id];
    if (!cena || pilha.has(id)) return { ouro: 0, recompensa: 0 };
    pilha.add(id);
    const base = { ouro: Math.max(0, cena.efeitos?.ouro ?? 0), recompensa: Math.max(0, cena.efeitos?.recompensa ?? 0) };
    let melhor = { ouro: 0, recompensa: 0 };
    for (const o of cena.opcoes) {
      const f = visita(o.proxima, pilha);
      const o1 = { ouro: Math.max(0, o.efeitos?.ouro ?? 0) + f.ouro, recompensa: Math.max(0, o.efeitos?.recompensa ?? 0) + f.recompensa };
      melhor = { ouro: Math.max(melhor.ouro, o1.ouro), recompensa: Math.max(melhor.recompensa, o1.recompensa) };
    }
    pilha.delete(id);
    const r = { ouro: base.ouro + melhor.ouro, recompensa: base.recompensa + melhor.recompensa };
    memo.set(id, r);
    return r;
  };
  return visita(ilha.historia.inicio, new Set());
}
