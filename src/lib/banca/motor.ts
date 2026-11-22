// Simulação do evento: visitantes chegam por RNG com semente (seed do save + semana), olham a mesa, entram na fila,
// são atendidos, pedem desconto, pagam e recebem troco. Tudo em função do tempo que a tela manda (`passo`): sem
// relógio, sem Math.random e sem React, então a mesma seed gera o mesmo público e o módulo roda nos testes.

import { escolherPeso, sortear } from "../gestao/rng";
import { ARQUETIPOS, BANCA, DENOMINACOES_TROCO, EVENTO, NOTAS, PRODUTOS, REPUTACAO, arquetipoDe, eventoDe, produtoDe } from "./config";
import { atributos, lerItem, ordemDeVisao, precoDe, visibilidade } from "./mesa";
import type { ArqSlug, EventoEstado, ItemKey, ProdutoSlug, Progresso, ResumoEvento, Visitante } from "./tipos";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Estado inicial do evento: mesa arrumada (cada espaço leva até a capacidade), o resto do estoque na caixa de reposição. */
export function criarEvento(prog: Progresso, eventoSlug: string): EventoEstado | null {
  const def = eventoDe(eventoSlug);
  if (!def) return null;
  const attrs = atributos(prog.melhorias);
  const itens = prog.estoque.itens;
  const caixa: Record<ItemKey, number> = { ...itens };
  const celulas = prog.layout.celulas.map((item) => {
    const un = item ? Math.min(BANCA.capacidadeCelula, itens[item] ?? 0) : 0;
    if (item) caixa[item] = (caixa[item] ?? 0) - un;
    return { item: un > 0 ? item : null, un, placa: false, repondoAte: null };
  });
  const precos = Object.fromEntries(PRODUTOS.map((p) => [p.slug, precoDe(prog.layout, p.slug)])) as Record<ProdutoSlug, number>;

  const jitter = 0.95 + 0.1 * sortear(prog.seed, prog.semana, "publico");
  const n = Math.min(def.publicoMax, Math.round(def.publico * (0.8 + 0.08 * prog.reputacao) * jitter));
  const ate = def.duracaoSeg * EVENTO.chegadasAteFracao;
  const chegadas = Array.from({ length: n }, (_, i) => EVENTO.primeiraChegadaSeg + (ate - EVENTO.primeiraChegadaSeg) * sortear(prog.seed, prog.semana, `chega:${i}`)).sort((a, b) => a - b);
  const pesos = ARQUETIPOS.map((a) => a.peso);
  const visitantes: Visitante[] = chegadas.map((chegaEm, id) => {
    const arq = escolherPeso(ARQUETIPOS, pesos, sortear(prog.seed, prog.semana, `arq:${id}`));
    const pac = arq.paciencia * (prog.tranquilo ? EVENTO.tranquiloPaciencia : 1);
    return {
      id, arq: arq.slug, chegaEm: r2(chegaEm), fase: "andando", olharAte: 0, pac, pacMax: pac, pedido: [], troca: false,
      pedeDesconto: arq.especial === "desconto" && sortear(prog.seed, prog.semana, `v${id}:pede`) < 0.85 ? arq.desconto : 0,
      descontoAplicado: 0, cartao: false, total: 0, entregou: 0, troco: 0, saiu: null,
    };
  });

  return {
    semana: prog.semana, seed: prog.seed, evento: def.slug, t: 0, duracao: def.duracaoSeg, graca: EVENTO.gracaSeg, tranquilo: prog.tranquilo,
    attrs, celulas, caixa, precos, visitantes, fila: [], atendendo: null, atendeAte: 0, vendas: {}, trocas: {}, receita: 0, receitaCartao: 0,
    desistiram: 0, repDelta: 0, procurado: {}, errosTroco: 0, fim: false,
  };
}

const rnd = (e: EventoEstado, v: Visitante, rotulo: string) => sortear(e.seed, e.semana, `v${v.id}:${rotulo}`);
const visitante = (e: EventoEstado, id: number | null) => (id === null ? undefined : e.visitantes.find((v) => v.id === id));

/** Fator do preço: mais caro que o sugerido vende menos, mais barato vende mais. */
export function fatorPreco(produto: ProdutoSlug, preco: number): number {
  const sug = produtoDe(produto)!.precoSugerido;
  return Math.min(EVENTO.precoFatorMax, Math.max(EVENTO.precoFatorMin, Math.pow(sug / preco, EVENTO.precoElasticidade)));
}

type Cand = { idx: number; item: ItemKey; produto: ProdutoSlug; score: number; disponivel: boolean };

/** O que o visitante vê (só os primeiros espaços na ordem de visão) e quanto cada coisa o atrai. */
export function candidatos(e: EventoEstado, arq: ArqSlug): Cand[] {
  const a = arquetipoDe(arq)!;
  const vistos = ordemDeVisao(e.attrs).slice(0, a.atencao + e.attrs.atencao);
  const lista: Cand[] = [];
  for (const idx of vistos) {
    const c = e.celulas[idx];
    const item = c.item;
    if (!item) continue;
    const produto = lerItem(item)?.produto;
    if (!produto) continue;
    lista.push({
      idx, item, produto, disponivel: c.un > 0 && !c.placa,
      score: a.apelo[produto] * Math.min(1.3, visibilidade(idx, e.attrs)) * fatorPreco(produto, e.precos[produto]),
    });
  }
  return lista;
}

function sair(e: EventoEstado, v: Visitante, saiu: NonNullable<Visitante["saiu"]>) {
  v.fase = "fim";
  v.saiu = saiu;
  e.fila = e.fila.filter((id) => id !== v.id);
  if (e.atendendo === v.id) e.atendendo = null;
}

function desistir(e: EventoEstado, v: Visitante, rep: number = REPUTACAO.desistiu) {
  sair(e, v, "desistiu");
  e.desistiram++;
  e.repDelta += rep;
}

/** O visitante terminou de olhar a mesa: compra, troca ou vai embora. */
function decidir(e: EventoEstado, v: Visitante) {
  const a = arquetipoDe(v.arq)!;
  const cands = candidatos(e, v.arq);
  if (cands.length === 0) return sair(e, v, "olhou");
  const melhor = cands.reduce((m, c) => (c.score > m.score ? c : m));
  const disponiveis = cands.filter((c) => c.disponivel);

  // O que ele queria mais não está lá: conta como procurado. Sem placa de "esgotou", ainda fica chateado.
  if (!melhor.disponivel) {
    e.procurado[melhor.produto] = (e.procurado[melhor.produto] ?? 0) + 1;
    const cel = e.celulas[melhor.idx];
    if (cel.un === 0 && !cel.placa) e.repDelta += REPUTACAO.esgotouSemPlaca;
  }
  if (disponiveis.length === 0) return sair(e, v, "sem-estoque");
  const alvo = disponiveis.reduce((m, c) => (c.score > m.score ? c : m));

  let prob = a.compra * Math.min(1, alvo.score * 1.4);
  let pedido: Visitante["pedido"] = [{ item: alvo.item, qtd: 1 }];

  if (a.especial === "troca") {
    if (rnd(e, v, "compra") >= prob) return sair(e, v, "olhou");
    v.troca = true;
    v.pedido = [{ item: alvo.item, qtd: EVENTO.trocaItens }];
    return entrarNaFila(e, v);
  }

  if (a.especial === "colecao") {
    // Coleção: vários temas do mesmo produto, entre o que ele enxerga.
    const porProduto = new Map<ProdutoSlug, Cand[]>();
    for (const c of disponiveis) porProduto.set(c.produto, [...(porProduto.get(c.produto) ?? []), c]);
    const melhorGrupo = [...porProduto.values()].sort((x, y) => y.length - x.length || y[0].produto.localeCompare(x[0].produto))[0];
    if (melhorGrupo && melhorGrupo.length >= EVENTO.colecaoMinTemas) {
      pedido = melhorGrupo.slice(0, EVENTO.colecaoMaxItens).map((c) => ({ item: c.item, qtd: 1 }));
    } else {
      prob *= 0.3; // sem coleção completa na mesa, quase não compra
    }
  } else {
    const preco = e.precos[alvo.produto];
    const max = Math.max(1, Math.min(a.qtdMax, Math.floor(a.orcamento / preco)));
    const bruta = a.especial === "crianca" && alvo.produto === "adesivo" ? 2 + Math.floor(rnd(e, v, "qtd") * 3) : 1 + Math.floor(rnd(e, v, "qtd") * a.qtdMax);
    pedido = [{ item: alvo.item, qtd: Math.min(max, Math.max(1, bruta)) }];
  }

  if (rnd(e, v, "compra") >= prob) return sair(e, v, "olhou");
  v.pedido = pedido;
  v.cartao = e.attrs.maquininha && rnd(e, v, "cartao") < a.cartao;
  entrarNaFila(e, v);
}

function entrarNaFila(e: EventoEstado, v: Visitante) {
  v.fase = "fila";
  e.fila.push(v.id);
}

const unidadesNaMesa = (e: EventoEstado, item: ItemKey) => e.celulas.reduce((s, c) => (c.item === item ? s + c.un : s), 0);

function retirar(e: EventoEstado, item: ItemKey, qtd: number) {
  let falta = qtd;
  for (const c of e.celulas) {
    if (c.item !== item || falta <= 0) continue;
    const t = Math.min(c.un, falta);
    c.un -= t;
    falta -= t;
  }
}

const totalDe = (e: EventoEstado, v: Visitante, desconto: number) =>
  Math.round(v.pedido.reduce((s, p) => s + p.qtd * e.precos[lerItem(p.item)!.produto], 0) * (1 - desconto));

/** Ajusta o pedido ao que ainda tem na mesa (outro cliente pode ter levado antes). */
function conferirPedido(e: EventoEstado, v: Visitante) {
  v.pedido = v.pedido.map((p) => ({ item: p.item, qtd: Math.min(p.qtd, unidadesNaMesa(e, p.item)) })).filter((p) => p.qtd > 0);
}

function concluir(e: EventoEstado, v: Visitante) {
  if (v.troca) {
    const p = v.pedido[0];
    retirar(e, p.item, p.qtd);
    e.trocas[p.item] = (e.trocas[p.item] ?? 0) + p.qtd;
    e.repDelta += REPUTACAO.trocaArtista;
    return sair(e, v, "trocou");
  }
  for (const p of v.pedido) {
    retirar(e, p.item, p.qtd);
    e.vendas[p.item] = (e.vendas[p.item] ?? 0) + p.qtd;
  }
  e.receita += v.total;
  if (v.cartao) e.receitaCartao += v.total;
  e.repDelta += REPUTACAO.compra;
  sair(e, v, "comprou");
}

/** Nota que o cliente entrega: a menor que cobre o total, às vezes a seguinte. Acima de R$ 100, múltiplos de 100. */
export function notaEntregue(total: number, sorteio: number): number {
  const i = NOTAS.findIndex((n) => n >= total);
  if (i === -1) return Math.ceil(total / 100) * 100;
  return i + 1 < NOTAS.length && sorteio < EVENTO.notaSeguinteChance ? NOTAS[i + 1] : NOTAS[i];
}

function pagar(e: EventoEstado, v: Visitante) {
  conferirPedido(e, v);
  if (v.pedido.length === 0) {
    e.repDelta += REPUTACAO.esgotouSemPlaca;
    return sair(e, v, "sem-estoque");
  }
  if (v.troca) return concluir(e, v);
  v.total = totalDe(e, v, v.descontoAplicado);
  if (v.cartao) return concluir(e, v);
  v.entregou = notaEntregue(v.total, rnd(e, v, "nota"));
  v.troco = v.entregou - v.total;
  if (v.troco === 0 || e.tranquilo) return concluir(e, v);
  v.fase = "troco";
}

/** Confere se as notas e moedas escolhidas somam o troco. */
export const trocoCorreto = (valores: number[], troco: number) =>
  valores.every((x) => (DENOMINACOES_TROCO as readonly number[]).includes(x)) && valores.reduce((s, x) => s + x, 0) === troco;

/** Menor combinação de notas e moedas pro troco (usada pelo troco automático e pela dica). */
export function trocoSugerido(troco: number): number[] {
  const saida: number[] = [];
  let resto = troco;
  for (const d of [...DENOMINACOES_TROCO].reverse()) {
    while (resto >= d) {
      saida.push(d);
      resto -= d;
    }
  }
  return saida;
}

// ---------- ações do tripulante ----------

/** Atende o primeiro da fila (só um por vez). */
export function atender(estado: EventoEstado): EventoEstado {
  if (estado.fim || estado.atendendo !== null || estado.fila.length === 0) return estado;
  const e = structuredClone(estado);
  const v = visitante(e, e.fila.shift()!)!;
  v.fase = "atendido";
  e.atendendo = v.id;
  e.atendeAte = e.t + EVENTO.atenderSeg;
  return e;
}

export type EscolhaDesconto = "aceitar" | "recusar" | "contraproposta";

export function decidirDesconto(estado: EventoEstado, escolha: EscolhaDesconto): EventoEstado {
  const v0 = visitante(estado, estado.atendendo);
  if (!v0 || v0.fase !== "desconto") return estado;
  const e = structuredClone(estado);
  const v = visitante(e, e.atendendo)!;
  const sorteio = rnd(e, v, "desc");
  if (escolha === "aceitar") {
    v.descontoAplicado = v.pedeDesconto;
    pagar(e, v);
  } else {
    const ok = sorteio < (escolha === "contraproposta" ? EVENTO.aceitaContraChance : EVENTO.aceitaRecusaChance);
    if (ok) {
      v.descontoAplicado = escolha === "contraproposta" ? v.pedeDesconto / 2 : 0;
      pagar(e, v);
    } else {
      e.desistiram++;
      e.repDelta += REPUTACAO.recusouDesconto;
      sair(e, v, "recusou");
    }
  }
  return e;
}

/** Entrega o troco (notas e moedas escolhidas). Se não bate, o cliente perde paciência e o erro conta. */
export function darTroco(estado: EventoEstado, valores: number[]): EventoEstado {
  const v0 = visitante(estado, estado.atendendo);
  if (!v0 || v0.fase !== "troco") return estado;
  const e = structuredClone(estado);
  const v = visitante(e, e.atendendo)!;
  if (trocoCorreto(valores, v.troco)) concluir(e, v);
  else {
    e.errosTroco++;
    e.repDelta += REPUTACAO.trocoErrado;
    v.pac -= 4;
  }
  return e;
}

/** Repõe um espaço da mesa com o que está na caixa. Leva tempo. */
export function repor(estado: EventoEstado, idx: number): EventoEstado {
  const c0 = estado.celulas[idx];
  if (estado.fim || !c0?.item || c0.repondoAte !== null || c0.un >= BANCA.capacidadeCelula || (estado.caixa[c0.item] ?? 0) <= 0) return estado;
  const e = structuredClone(estado);
  e.celulas[idx].repondoAte = e.t + EVENTO.reporSeg * e.attrs.reposMult;
  return e;
}

/** Liga ou desliga a placa "esgotou" num espaço. */
export function alternarPlaca(estado: EventoEstado, idx: number): EventoEstado {
  if (!estado.celulas[idx]?.item) return estado;
  const e = structuredClone(estado);
  e.celulas[idx].placa = !e.celulas[idx].placa;
  return e;
}

// ---------- o tempo ----------

/** Avança `dt` segundos. */
export function passo(estado: EventoEstado, dt: number = EVENTO.passoSeg): EventoEstado {
  if (estado.fim) return estado;
  const e = structuredClone(estado);
  e.t = r2(e.t + dt);

  for (const c of e.celulas) {
    if (c.item && c.repondoAte !== null && e.t >= c.repondoAte) {
      const mover = Math.min(BANCA.capacidadeCelula - c.un, e.caixa[c.item] ?? 0);
      c.un += mover;
      e.caixa[c.item] = (e.caixa[c.item] ?? 0) - mover;
      c.repondoAte = null;
      if (c.un > 0) c.placa = false;
    }
  }

  const pacienciaDe = (v: Visitante) => dt * (v.fase === "fila" ? 1 : EVENTO.pacienciaNoBalcao);
  for (const v of e.visitantes) {
    if (v.fase === "andando" && e.t >= v.chegaEm) {
      v.fase = "olhando";
      v.olharAte = r2(e.t + arquetipoDe(v.arq)!.olharSeg);
    }
    if (v.fase === "olhando" && e.t >= v.olharAte) decidir(e, v);
    if (v.fase === "fila" || v.fase === "atendido" || v.fase === "desconto" || v.fase === "troco") {
      v.pac -= pacienciaDe(v);
      if (v.pac <= 0) desistir(e, v);
    }
  }

  const v = visitante(e, e.atendendo);
  if (v && v.fase === "atendido" && e.t >= e.atendeAte) {
    if (v.pedeDesconto > 0 && !v.troca) v.fase = "desconto";
    else pagar(e, v);
  }

  if (e.t >= e.duracao + e.graca && (e.atendendo === null || e.t >= e.duracao + e.graca + 30)) {
    for (const w of e.visitantes) {
      if (w.fase === "fila" || w.fase === "atendido" || w.fase === "desconto" || w.fase === "troco") {
        sair(e, w, "desistiu");
        e.desistiram++;
      } else if (w.fase === "olhando" || w.fase === "andando") sair(e, w, "olhou");
    }
    e.fim = true;
  }
  return e;
}

/** O que o servidor recebe. Visitantes = quem chegou (todos, no fim). */
export function resumoDoEvento(e: EventoEstado): ResumoEvento {
  return {
    evento: e.evento, vendas: { ...e.vendas }, trocas: { ...e.trocas }, receita: e.receita, receitaCartao: e.receitaCartao,
    visitantes: e.visitantes.length, desistiram: e.desistiram, repDelta: r2(e.repDelta), procurado: { ...e.procurado }, tranquilo: e.tranquilo,
  };
}
