// Economia da banca: produção (prazo e orçamento), melhorias, layout e fechamento do evento.
// Tudo é função pura e roda no servidor (que é quem decide saldo e progresso) e no aparelho (jogo sem conta).

import { sortear } from "../gestao/rng";
import {
  ARQUETIPOS, BANCA, DIAS_EVENTO, EDICOES, EVENTO, EVENTOS, MELHORIAS, PRODUTOS, REPUTACAO, TEMAS, eventoDe, melhoriaDe, produtoDe, temaDe,
} from "./config";
import { ajustarLayout, atributos, layoutValido, layoutVazio, lerItem } from "./mesa";
import type { ErroBanca, EventoDef, ItemKey, Layout, ProdutoSlug, Progresso, RegistroEvento, ResumoEvento } from "./tipos";

type Erro = { ok: false; erro: ErroBanca };
const falha = (erro: ErroBanca): Erro => ({ ok: false, erro });
const r2 = (n: number) => Math.round(n * 100) / 100;
const inteiro = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

export function novaBanca(seed: string): Progresso {
  const attrs = atributos({});
  return {
    v: BANCA.versaoSave, dinheiro: BANCA.dinheiroInicial, reputacao: BANCA.reputacaoInicial, semana: 1, seed,
    estoque: { itens: {}, diasUsados: 0, gastoMaterial: 0 }, layout: layoutVazio(attrs), melhorias: {}, tranquilo: false,
  };
}

export const diasLivres = (p: Progresso) => Math.max(0, atributos(p.melhorias).diasAtelie - p.estoque.diasUsados);
export const unidadesEmEstoque = (p: Progresso) => Object.values(p.estoque.itens).reduce((s, n) => s + n, 0);

/** Quanto custa e quanto tempo toma produzir `lotes` lotes. */
export function custoDeProducao(produto: ProdutoSlug, lotes: number) {
  const pr = produtoDe(produto)!;
  return { dias: pr.diasLote * lotes, material: pr.custo * pr.lote * lotes, unidades: pr.lote * lotes };
}

/** Produz: gasta dias de ateliê da semana e material (dinheiro). Sem dias ou sem dinheiro, não produz. */
export function produzir(p: Progresso, produto: string, tema: string, lotes: number): { ok: true; prog: Progresso; unidades: number } | Erro {
  const pr = produtoDe(produto);
  if (!pr) return falha("produto");
  if (!temaDe(tema)) return falha("tema");
  if (!inteiro(lotes) || lotes < 1 || lotes > BANCA.limiteLotes) return falha("lotes");
  const c = custoDeProducao(pr.slug, lotes);
  if (c.dias > diasLivres(p)) return falha("dias");
  if (c.material > p.dinheiro) return falha("saldo");
  const item: ItemKey = `${pr.slug}:${tema}`;
  return {
    ok: true, unidades: c.unidades,
    prog: {
      ...p, dinheiro: p.dinheiro - c.material,
      estoque: { itens: { ...p.estoque.itens, [item]: (p.estoque.itens[item] ?? 0) + c.unidades }, diasUsados: p.estoque.diasUsados + c.dias, gastoMaterial: p.estoque.gastoMaterial + c.material },
    },
  };
}

export const nivelDe = (p: Pick<Progresso, "melhorias">, slug: string) => p.melhorias[slug] ?? 0;

export function comprarMelhoria(p: Progresso, slug: string): { ok: true; prog: Progresso; preco: number; nivel: number } | Erro {
  const m = melhoriaDe(slug);
  if (!m) return falha("melhoria");
  const nivel = nivelDe(p, slug);
  if (nivel >= m.niveis.length) return falha("nivelMax");
  const prox = m.niveis[nivel];
  if (p.reputacao < prox.repMin) return falha("reputacao");
  if (p.dinheiro < prox.preco) return falha("saldo");
  const melhorias = { ...p.melhorias, [slug]: nivel + 1 };
  const layout = ajustarLayout(p.layout, atributos(p.melhorias), atributos(melhorias));
  return { ok: true, preco: prox.preco, nivel: nivel + 1, prog: { ...p, dinheiro: p.dinheiro - prox.preco, melhorias, layout } };
}

export function definirLayout(p: Progresso, layout: Layout): { ok: true; prog: Progresso } | Erro {
  if (!layoutValido(layout, p)) return falha("layout");
  const limpo: Layout = { celulas: [...layout.celulas], precos: { ...layout.precos } };
  return { ok: true, prog: { ...p, layout: limpo } };
}

// ---------- calendário ----------

export type OpcaoEvento = { def: EventoDef; edicao: string; dia: string; liberado: boolean; pagavel: boolean };

/** Os três eventos da semana: o nome da edição e o dia vêm do sorteio da semana, a trava vem da reputação. */
export function calendario(p: Progresso): OpcaoEvento[] {
  return EVENTOS.map((def) => ({
    def,
    edicao: EDICOES[Math.floor(sortear(p.seed, p.semana, `edicao:${def.slug}`) * EDICOES.length)],
    dia: DIAS_EVENTO[Math.floor(sortear(p.seed, p.semana, `dia:${def.slug}`) * DIAS_EVENTO.length)],
    liberado: p.reputacao >= def.repMin,
    pagavel: p.dinheiro >= def.taxaMesa,
  }));
}

/** Máximo de itens que um evento pode vender: pelo público e pela duração (o menor dos dois). */
export function tetoDeItens(def: EventoDef): number {
  const porDuracao = Math.floor((def.duracaoSeg + EVENTO.gracaSeg) / EVENTO.tempoMinPorClienteSeg);
  return Math.min(def.publicoMax, porDuracao) * EVENTO.itensPorClienteMax;
}

// ---------- fechamento ----------

export type FechamentoEvento = { ok: true; prog: Progresso; registro: RegistroEvento; subiu: boolean };

const somar = (o: Record<string, number>) => Object.values(o).reduce((s, n) => s + n, 0);

function mapaValido(o: unknown, max: number): o is Record<string, number> {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  return Object.entries(o).every(([k, v]) => lerItem(k) !== null && inteiro(v) && v <= max);
}

/**
 * Fim do evento. O cliente manda só o resumo; o servidor refaz receita e custos com os preços e a taxa da config e
 * confere os tetos: vendas não passam do estoque levado nem do que o público e a duração permitem.
 */
export function fecharEvento(p: Progresso, resumo: ResumoEvento): FechamentoEvento | Erro {
  const def = eventoDe(resumo?.evento);
  if (!def) return falha("evento");
  if (p.reputacao < def.repMin) return falha("reputacao");
  if (p.dinheiro < def.taxaMesa) return falha("saldo");
  const attrs = atributos(p.melhorias);

  const teto = tetoDeItens(def);
  if (!mapaValido(resumo.vendas, teto) || !mapaValido(resumo.trocas, teto)) return falha("invalido");
  const procurado = resumo.procurado ?? {};
  if (typeof procurado !== "object" || Object.entries(procurado).some(([k, v]) => !produtoDe(k) || !inteiro(v) || v > def.publicoMax)) return falha("invalido");
  if (![resumo.receita, resumo.receitaCartao, resumo.visitantes, resumo.desistiram].every(inteiro)) return falha("invalido");
  if (typeof resumo.repDelta !== "number" || !Number.isFinite(resumo.repDelta)) return falha("invalido");

  // Estoque: o que vendeu e trocou de cada item não passa do que a banca levou.
  const saidas: Record<string, number> = {};
  for (const m of [resumo.vendas, resumo.trocas]) for (const [k, n] of Object.entries(m)) saidas[k] = (saidas[k] ?? 0) + n;
  for (const [k, n] of Object.entries(saidas)) if (n > (p.estoque.itens[k] ?? 0)) return falha("estoque");
  if (somar(saidas) > teto) return falha("teto");
  if (resumo.visitantes > def.publicoMax || resumo.desistiram > resumo.visitantes) return falha("teto");

  // Receita: dentro do que os preços da config permitem (com o maior desconto que algum visitante pede).
  const descMax = Math.max(...ARQUETIPOS.map((a) => a.desconto));
  let min = 0;
  let max = 0;
  for (const [k, n] of Object.entries(resumo.vendas)) {
    const pr = produtoDe(lerItem(k)!.produto)!;
    min += n * Math.floor(pr.precoMin * (1 - descMax));
    max += n * pr.precoMax;
  }
  if (resumo.receita < min || resumo.receita > max) return falha("invalido");
  if (resumo.receitaCartao > resumo.receita || (!attrs.maquininha && resumo.receitaCartao > 0)) return falha("invalido");

  const maquininha = Math.ceil(resumo.receitaCartao * EVENTO.cartaoTaxa);
  const material = p.estoque.gastoMaterial;
  const custos = { taxa: def.taxaMesa, material, maquininha };
  const delta = Math.max(-REPUTACAO.perdaMaxEvento, Math.min(REPUTACAO.ganhoMaxEvento, resumo.repDelta));
  const reputacaoFim = r2(Math.max(0, Math.min(BANCA.reputacaoMax, p.reputacao + delta)));

  const itens = { ...p.estoque.itens };
  for (const [k, n] of Object.entries(saidas)) {
    itens[k] -= n;
    if (itens[k] <= 0) delete itens[k];
  }
  const layout: Layout = { ...p.layout, celulas: p.layout.celulas.map((c) => (c && itens[c] ? c : null)) };
  const prog: Progresso = {
    ...p, dinheiro: p.dinheiro - def.taxaMesa + resumo.receita - maquininha, reputacao: reputacaoFim, semana: p.semana + 1,
    estoque: { itens, diasUsados: 0, gastoMaterial: 0 }, layout, tranquilo: p.tranquilo,
  };

  let maisProcurado: ProdutoSlug | null = null;
  let melhor = 0;
  for (const pr of PRODUTOS) {
    const n = procurado[pr.slug] ?? 0;
    if (n > melhor) {
      melhor = n;
      maisProcurado = pr.slug;
    }
  }
  const registro: RegistroEvento = {
    evento: def.slug, semana: p.semana, vendas: { ...resumo.vendas }, trocas: somar(resumo.trocas), receita: resumo.receita, custos,
    lucro: resumo.receita - def.taxaMesa - material - maquininha, visitantes: resumo.visitantes, desistiram: resumo.desistiram,
    reputacaoFim, maisProcurado, tranquilo: Boolean(resumo.tranquilo),
  };
  const subiu = EVENTOS.some((e) => p.reputacao < e.repMin && reputacaoFim >= e.repMin);
  return { ok: true, prog, registro, subiu };
}

/** Todos os produtos da banca com o tema, pra listar o estoque. */
export function listarEstoque(p: Progresso) {
  return Object.entries(p.estoque.itens)
    .map(([item, un]) => ({ item, un, ...lerItem(item)! }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

export const todosOsTemas = () => TEMAS;
export { MELHORIAS };
