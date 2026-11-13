// Economia da taverna: compra, contratação, fechamento da noite e da semana. Funções puras sobre o Progresso.
// O servidor roda exatamente estas funções (e grava o resultado numa transação); o jogo sem conta roda as mesmas
// localmente. Preço e saldo nunca vêm do cliente.

import { atributos, completarLayout, efeitoDe, itemDe, nivelDe, salariosDaNoite } from "./atributos";
import { EQUIPE, TAVERNA, TEXTOS_ERRO } from "./config";
import { melhorArquetipo } from "./motor";
import type { Catalogo, Membro, Papel, Progresso, RegistroNoite, RegistroSemana, ResumoNoite } from "./tipos";

export type Erro = keyof typeof TEXTOS_ERRO;
export type Resultado<T> = ({ ok: true } & T) | { ok: false; erro: Erro };

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const arred2 = (n: number) => Math.round(n * 100) / 100;

export function novaTaverna(seed: string): Progresso {
  const base: Progresso = {
    v: TAVERNA.versaoSave,
    cidade: TAVERNA.cidadeInicial,
    nivel: 1,
    ouro: TAVERNA.ouroInicial,
    reputacao: TAVERNA.reputacaoInicial,
    noite: 0,
    seed,
    layout: [],
    melhorias: { ...TAVERNA.inicial },
    equipe: [],
    tranquila: false,
  };
  return { ...base, layout: TAVERNA.layoutInicial.map((m, i) => ({ id: `m${i + 1}`, ...m })) };
}

// ---------- melhorias ----------

export function validarCompra(p: Progresso, cat: Catalogo, slug: string): Resultado<{ preco: number; nivel: number }> {
  const item = itemDe(cat, slug);
  if (!item) return { ok: false, erro: "generico" };
  const nivel = nivelDe(p, slug);
  if (nivel >= item.maxLevel) return { ok: false, erro: "nivelMax" };
  if (p.nivel < item.minTavernLevel) return { ok: false, erro: "nivelTaverna" };
  const preco = item.prices[nivel];
  if (preco === undefined) return { ok: false, erro: "generico" };
  if (p.ouro < preco) return { ok: false, erro: "saldo" };
  return { ok: true, preco, nivel: nivel + 1 };
}

export function comprarMelhoria(p: Progresso, cat: Catalogo, slug: string): Resultado<{ prog: Progresso; preco: number; nivel: number }> {
  const v = validarCompra(p, cat, slug);
  if (!v.ok) return v;
  const novo: Progresso = { ...p, ouro: p.ouro - v.preco, melhorias: { ...p.melhorias, [slug]: v.nivel } };
  const item = itemDe(cat, slug)!;
  if (item.kind === "mobilia" || item.kind === "expansao") novo.layout = completarLayout(novo.layout, novo, cat);
  return { ok: true, prog: novo, preco: v.preco, nivel: v.nivel };
}

// ---------- equipe ----------

export function vagasDe(nivelTaverna: number) {
  return TAVERNA.vagasEquipe[clamp(nivelTaverna, 1, 5) - 1];
}

export function validarContratar(p: Progresso, papel: Papel): Resultado<{ preco: number }> {
  const d = EQUIPE[papel];
  if (!d) return { ok: false, erro: "generico" };
  if (p.equipe.some((m) => m.papel === papel)) return { ok: false, erro: "jaContratado" };
  if (p.nivel < d.nivelTaverna) return { ok: false, erro: "nivelTaverna" };
  if (p.equipe.length >= vagasDe(p.nivel)) return { ok: false, erro: "semVaga" };
  if (p.ouro < d.precos[0]) return { ok: false, erro: "saldo" };
  return { ok: true, preco: d.precos[0] };
}

export function contratar(p: Progresso, papel: Papel): Resultado<{ prog: Progresso; preco: number }> {
  const v = validarContratar(p, papel);
  if (!v.ok) return v;
  const m: Membro = { papel, nivel: 1, contratadaNoite: p.noite };
  return { ok: true, prog: { ...p, ouro: p.ouro - v.preco, equipe: [...p.equipe, m] }, preco: v.preco };
}

export function validarMelhorarFuncionario(p: Progresso, papel: Papel): Resultado<{ preco: number; nivel: number }> {
  const m = p.equipe.find((x) => x.papel === papel);
  const d = EQUIPE[papel];
  if (!m || !d) return { ok: false, erro: "generico" };
  if (m.nivel >= d.precos.length) return { ok: false, erro: "nivelMax" };
  const preco = d.precos[m.nivel];
  if (p.ouro < preco) return { ok: false, erro: "saldo" };
  return { ok: true, preco, nivel: m.nivel + 1 };
}

export function melhorarFuncionario(p: Progresso, papel: Papel): Resultado<{ prog: Progresso; preco: number; nivel: number }> {
  const v = validarMelhorarFuncionario(p, papel);
  if (!v.ok) return v;
  return { ok: true, prog: { ...p, ouro: p.ouro - v.preco, equipe: p.equipe.map((m) => (m.papel === papel ? { ...m, nivel: v.nivel } : m)) }, preco: v.preco, nivel: v.nivel };
}

// ---------- teto de ouro e fechamento ----------

/** Teto de uma noite: o salão não atende mais clientes do que lugares × duração permitem, nem cobra mais que o prato mais caro. */
export function tetoDaNoite(p: Progresso, cat: Catalogo): { clientes: number; ouro: number } {
  const a = atributos(p, cat);
  const N = TAVERNA.noite;
  const clientes = Math.floor((a.lugares * (N.duracaoSeg + N.gracaFechamentoSeg)) / N.tempoMinPorClienteSeg);
  const maxPreco = Math.max(1, ...cat.itens.filter((i) => i.kind === "receita").map((i) => Math.max(...i.effects.map((e) => e.preco ?? 0))));
  const maxSpend = Math.max(1, ...cat.arquetipos.map((q) => q.spend));
  const vendas = clientes * maxPreco * Math.max(maxSpend, 1);
  return { clientes, ouro: Math.ceil(vendas * (1 + TAVERNA.economia.gorjetaMaxSobreVendas)) };
}

/** O saldo registrado tem que bater com ganhos + gorjetas − gastos. */
export const saldoBate = (r: Pick<RegistroNoite, "ganhos" | "gorjetas" | "gastos" | "saldo">) =>
  r.saldo === r.ganhos + r.gorjetas - (r.gastos.ingredientes + r.gastos.salarios + r.gastos.reparos);

export function nivelPorProgresso(nivelAtual: number, reputacao: number, noites: number): number {
  let nivel = nivelAtual;
  TAVERNA.niveis.forEach((req, i) => {
    if (reputacao >= req.reputacao && noites >= req.noites) nivel = Math.max(nivel, i + 2);
  });
  return Math.min(nivel, TAVERNA.nivelMax);
}

export const taxaDaGuilda = (nivel: number) => TAVERNA.guilda.base + TAVERNA.guilda.porNivel * (nivel - 1);
export const semanaDe = (noite: number) => Math.ceil(noite / TAVERNA.guilda.dias);

const inteiroNaoNegativo = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

export type FechamentoNoite = { prog: Progresso; registro: RegistroNoite; semana: RegistroSemana | null; subiuDeNivel: boolean };

/**
 * Fecha a noite a partir do resumo enviado: confere a noite (só avança pra frente, de 1 em 1), refaz ganhos e gastos
 * com os preços do servidor, confere o teto e então aplica ouro, reputação, nível e a taxa da guilda (a cada 7 noites).
 */
export function fecharNoite(p: Progresso, cat: Catalogo, r: ResumoNoite): Resultado<FechamentoNoite> {
  const inv = { ok: false, erro: "invalido" } as const;
  if (!r || r.noite !== p.noite + 1) return inv;
  const numeros = [r.servidos, r.foram, r.ganhos, r.gorjetas, r.reparos];
  if (!numeros.every(inteiroNaoNegativo)) return inv;
  if (typeof r.repDelta !== "number" || !Number.isFinite(r.repDelta)) return inv;

  const a = atributos(p, cat);
  let itens = 0;
  let minGanho = 0;
  let maxGanho = 0;
  let ingredientes = 0;
  const spends = cat.arquetipos.map((q) => q.spend);
  const spendMin = Math.min(...spends);
  const spendMax = Math.max(...spends);
  for (const [slug, qtd] of Object.entries(r.vendas ?? {})) {
    const rec = a.receitas[slug];
    if (!rec || !inteiroNaoNegativo(qtd)) return inv;
    itens += qtd;
    minGanho += Math.floor(qtd * rec.preco * spendMin);
    maxGanho += Math.ceil(qtd * rec.preco * spendMax) + qtd;
    ingredientes += qtd * rec.ingrediente;
  }
  if (itens !== r.servidos) return inv;
  if (r.ganhos < minGanho - itens || r.ganhos > maxGanho) return inv;
  if (r.gorjetas > Math.ceil(r.ganhos * TAVERNA.economia.gorjetaMaxSobreVendas)) return inv;
  if (r.reparos > (r.servidos + r.foram) * TAVERNA.custoReparoCadeira) return inv;

  const teto = tetoDaNoite(p, cat);
  if (r.servidos > teto.clientes || r.ganhos + r.gorjetas > teto.ouro) return inv;

  let nAtendidos = 0;
  for (const [slug, v] of Object.entries(r.porArquetipo ?? {})) {
    if (!cat.arquetipos.some((q) => q.slug === slug) || !inteiroNaoNegativo(v.n) || !(v.sat >= 0 && v.sat <= 1)) return inv;
    nAtendidos += v.n;
  }
  if (nAtendidos !== r.servidos) return inv;

  const gastos = { ingredientes, salarios: salariosDaNoite(p), reparos: r.reparos };
  const saldo = r.ganhos + r.gorjetas - (gastos.ingredientes + gastos.salarios + gastos.reparos);
  const max = TAVERNA.satisfacao.reputacaoNoiteMax;
  let ouro = Math.max(0, p.ouro + saldo);
  let reputacao = clamp(arred2(p.reputacao + clamp(r.repDelta, -max, max)), 0, 5);
  const noite = p.noite + 1;
  const nivel = nivelPorProgresso(p.nivel, reputacao, noite);

  let semana: RegistroSemana | null = null;
  if (noite % TAVERNA.guilda.dias === 0) {
    const taxa = taxaDaGuilda(nivel);
    const paga = ouro >= taxa;
    ouro = paga ? ouro - taxa : 0;
    if (!paga) reputacao = clamp(arred2(reputacao - TAVERNA.guilda.reputacaoSeNaoPagar), 0, 5);
    semana = { semana: semanaDe(noite), taxa, paga, saldoFim: ouro };
  }

  const registro: RegistroNoite = {
    noite, servidos: r.servidos, foram: r.foram, ganhos: r.ganhos, gorjetas: r.gorjetas, gastos, saldo,
    reputacaoFim: reputacao, melhorArquetipo: melhorArquetipo(r.porArquetipo ?? {}), tranquila: Boolean(r.tranquila),
  };
  return { ok: true, prog: { ...p, ouro, reputacao, noite, nivel }, registro, semana, subiuDeNivel: nivel > p.nivel };
}

/** Valor que um item de efeito entrega, pra mostrar na tela (ex.: "+2 lugares"). */
export const efeitoDoItem = (p: Progresso, cat: Catalogo, slug: string) => efeitoDe(p, cat, slug);
