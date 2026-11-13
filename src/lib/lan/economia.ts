// Economia da lan: compra, contratação, fechamento do dia e da semana. Funções puras sobre o Progresso.
// O servidor roda exatamente estas funções (e grava o resultado numa transação); o jogo sem conta roda as mesmas
// localmente. Preço e saldo nunca vêm do cliente.

import { atributos, completarMaquinas, efeitoDe, horasAbertas, itemDe, nivelDe, salariosDoDia } from "./atributos";
import { EQUIPE, LAN } from "./config";
import type { TEXTOS_ERRO } from "./conteudo";
import { melhorArquetipo } from "./motor";
import type { Catalogo, Layout, Membro, Papel, Produto, Progresso, RegistroDia, RegistroSemana, ResumoDia, Servico } from "./tipos";

export type Erro = keyof typeof TEXTOS_ERRO;
export type Resultado<T> = ({ ok: true } & T) | { ok: false; erro: Erro };

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const arred2 = (n: number) => Math.round(n * 100) / 100;

/** Estoque cheio pra cada lanche liberado (o balcão é reposto toda noite). */
export function estoqueCheio(p: Progresso, cat: Catalogo): Partial<Record<Produto, number>> {
  const out: Partial<Record<Produto, number>> = {};
  for (const slug of LAN.produtos) {
    const cap = efeitoDe(p, cat, slug).capacidade;
    if (cap) out[slug] = cap;
  }
  return out;
}

export function novaLan(seed: string, cat: Catalogo): Progresso {
  const base: Progresso = {
    v: LAN.versaoSave, local: LAN.localInicial, nivel: 1, dinheiro: LAN.dinheiroInicial, reputacao: LAN.reputacaoInicial,
    dia: 0, seed, layout: { pcs: [], divisoria: null }, maquinas: [], estoque: {}, frequentes: {},
    melhorias: { ...LAN.inicial }, equipe: [], tranquilo: false,
  };
  // As máquinas iniciais nas posições do config; o resto (se houver) numa casa livre.
  const maquinas = LAN.layoutInicial.map((_, i) => ({ id: `pc${i + 1}`, tipo: "basica" as const, saude: LAN.maquinas.saudeInicial, sujeira: 0 }));
  const layout: Layout = { pcs: LAN.layoutInicial.map((c, i) => ({ id: `pc${i + 1}`, ...c })), divisoria: null };
  const comp = completarMaquinas({ ...base, layout, maquinas }, cat) ?? { layout, maquinas };
  const p = { ...base, ...comp };
  return { ...p, estoque: estoqueCheio(p, cat) };
}

// ---------- melhorias ----------

export function validarCompra(p: Progresso, cat: Catalogo, slug: string): Resultado<{ preco: number; nivel: number }> {
  const it = itemDe(cat, slug);
  if (!it) return { ok: false, erro: "generico" };
  const nivel = nivelDe(p, slug);
  if (nivel >= it.maxLevel) return { ok: false, erro: "nivelMax" };
  if (p.nivel < it.minLanLevel) return { ok: false, erro: "nivelLan" };
  const preco = it.prices[nivel];
  if (preco === undefined) return { ok: false, erro: "generico" };
  if (p.dinheiro < preco) return { ok: false, erro: "saldo" };
  return { ok: true, preco, nivel: nivel + 1 };
}

export function comprarMelhoria(p: Progresso, cat: Catalogo, slug: string): Resultado<{ prog: Progresso; preco: number; nivel: number }> {
  const v = validarCompra(p, cat, slug);
  if (!v.ok) return v;
  let novo: Progresso = { ...p, dinheiro: p.dinheiro - v.preco, melhorias: { ...p.melhorias, [slug]: v.nivel } };
  const it = itemDe(cat, slug)!;
  if (it.kind === "maquina" || it.kind === "expansao") {
    const comp = completarMaquinas(novo, cat);
    if (!comp) return { ok: false, erro: "semEspaco" };
    novo = { ...novo, ...comp };
  }
  if (it.kind === "balcao") novo.estoque = estoqueCheio(novo, cat);
  if (slug === "divisoria" && novo.layout.divisoria === null) novo.layout = { ...novo.layout, divisoria: Math.max(1, Math.floor(atributos(novo, cat).grade.colunas / 2)) };
  return { ok: true, prog: novo, preco: v.preco, nivel: v.nivel };
}

// ---------- equipe ----------

export const vagasDe = (nivelLan: number) => LAN.vagasEquipe[clamp(nivelLan, 1, 5) - 1];

export function validarContratar(p: Progresso, papel: Papel): Resultado<{ preco: number }> {
  const d = EQUIPE[papel];
  if (!d) return { ok: false, erro: "generico" };
  if (p.equipe.some((m) => m.papel === papel)) return { ok: false, erro: "jaContratado" };
  if (p.nivel < d.nivelLan) return { ok: false, erro: "nivelLan" };
  if (p.equipe.length >= vagasDe(p.nivel)) return { ok: false, erro: "semVaga" };
  if (p.dinheiro < d.precos[0]) return { ok: false, erro: "saldo" };
  return { ok: true, preco: d.precos[0] };
}

export function contratar(p: Progresso, papel: Papel): Resultado<{ prog: Progresso; preco: number }> {
  const v = validarContratar(p, papel);
  if (!v.ok) return v;
  const m: Membro = { papel, nivel: 1, contratadoDia: p.dia };
  return { ok: true, prog: { ...p, dinheiro: p.dinheiro - v.preco, equipe: [...p.equipe, m] }, preco: v.preco };
}

export function validarMelhorarFuncionario(p: Progresso, papel: Papel): Resultado<{ preco: number; nivel: number }> {
  const m = p.equipe.find((x) => x.papel === papel);
  const d = EQUIPE[papel];
  if (!m || !d) return { ok: false, erro: "generico" };
  if (m.nivel >= d.precos.length) return { ok: false, erro: "nivelMax" };
  const preco = d.precos[m.nivel];
  if (p.dinheiro < preco) return { ok: false, erro: "saldo" };
  return { ok: true, preco, nivel: m.nivel + 1 };
}

export function melhorarFuncionario(p: Progresso, papel: Papel): Resultado<{ prog: Progresso; preco: number; nivel: number }> {
  const v = validarMelhorarFuncionario(p, papel);
  if (!v.ok) return v;
  return { ok: true, prog: { ...p, dinheiro: p.dinheiro - v.preco, equipe: p.equipe.map((m) => (m.papel === papel ? { ...m, nivel: v.nivel } : m)) }, preco: v.preco, nivel: v.nivel };
}

// ---------- tetos, contas e fechamento ----------

const maiorPacoteMin = () => Math.max(...LAN.pacotes.map((p) => p.minutos));
/** Maior preço por minuto de máquina (o pacote mais caro por minuto, na máquina mais cara). */
const maiorPrecoMinuto = () => Math.max(...LAN.pacotes.map((p) => (Math.max(...Object.values(LAN.maquinas.precoHora)) * p.mult + 0.5) / p.minutos));

/** Teto de horas vendidas: máquinas × horas abertas (mais um pacote cheio, de quem compra perto de fechar). */
export function tetoDeHoras(p: Progresso, cat: Catalogo): number {
  const a = atributos(p, cat);
  return a.maquinas.length * (horasAbertas(a) + maiorPacoteMin() / 60);
}

export const saldoBate = (r: Pick<RegistroDia, "ganhos" | "gastos" | "saldo">) => r.saldo === r.ganhos - (r.gastos.estoque + r.gastos.salarios + r.gastos.consertos);

export function nivelPorProgresso(nivelAtual: number, reputacao: number, dias: number): number {
  let nivel = nivelAtual;
  LAN.niveis.forEach((req, i) => {
    if (reputacao >= req.reputacao && dias >= req.dias) nivel = Math.max(nivel, i + 2);
  });
  return Math.min(nivel, LAN.nivelMax);
}

export const semanaDe = (dia: number) => Math.ceil(dia / LAN.contas.dias);

/** Contas da semana: aluguel pelo nível, luz pelas máquinas e extras, internet pelo plano. */
export function contasDaSemana(p: Progresso, cat: Catalogo, nivel = p.nivel): RegistroSemana["contas"] {
  const a = atributos(p, cat);
  const C = LAN.contas;
  const luzDia = (a.maquinas.length * (a.telaFina ? C.luzPorPcFina : C.luzPorPcTubo) + a.luzExtra) * (a.corujao ? C.luzCorujaoMult : 1);
  return { aluguel: C.aluguelBase + C.aluguelPorNivel * (nivel - 1), luz: Math.round(luzDia * C.dias), internet: a.contaInternet };
}

const inteiroNaoNegativo = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
const mapaInteiros = (m: unknown, chaves: readonly string[]) =>
  m !== null && typeof m === "object" && Object.entries(m as Record<string, unknown>).every(([k, v]) => chaves.includes(k) && inteiroNaoNegativo(v));

export type FechamentoDia = { prog: Progresso; registro: RegistroDia; semana: RegistroSemana | null; subiuDeNivel: boolean };

/**
 * Fecha o dia a partir do resumo enviado: confere o dia (só avança pra frente, de 1 em 1), refaz os ganhos de lanche
 * e serviço com os preços do servidor, confere o teto de horas e os limites, calcula estoque, salários e consertos,
 * e então aplica dinheiro, reputação, nível, frequentes e as contas (a cada 7 dias).
 */
export function fecharDia(p: Progresso, cat: Catalogo, r: ResumoDia): Resultado<FechamentoDia> {
  const inv = { ok: false, erro: "invalido" } as const;
  if (!r || r.dia !== p.dia + 1) return inv;
  const nums = [r.servidos, r.foram, r.minutosVendidos, r.ganhosTempo, r.ganhosServicos, r.ganhosLanches, r.gorjetas, r.reembolsos, r.formatacoes];
  if (!nums.every(inteiroNaoNegativo)) return inv;
  if (typeof r.repDelta !== "number" || !Number.isFinite(r.repDelta)) return inv;
  if (!mapaInteiros(r.servicos, Object.keys(LAN.servicos.precos)) || !mapaInteiros(r.lanches, LAN.produtos)) return inv;
  if (!mapaInteiros(r.incidentes, ["travou", "mouse", "virus", "erro", "internet", "energia"])) return inv;

  const a = atributos(p, cat);
  // horas
  const horas = r.minutosVendidos / 60;
  if (horas > tetoDeHoras(p, cat) + 1e-9) return inv;
  if (r.ganhosTempo > Math.ceil(r.minutosVendidos * maiorPrecoMinuto()) + a.maquinas.length * 2) return inv;
  if (r.reembolsos > r.ganhosTempo) return inv;

  // lanches: quantidade dentro do estoque, valor exato pelo preço do servidor
  let ganhosLanches = 0;
  let estoqueGasto = 0;
  let lanchesVendidos = 0;
  for (const [slug, qtd] of Object.entries(r.lanches) as [Produto, number][]) {
    const l = a.lanches[slug];
    if (!l || qtd > (p.estoque[slug] ?? l.capacidade)) return inv;
    ganhosLanches += qtd * l.preco;
    estoqueGasto += qtd * l.custo;
    lanchesVendidos += qtd;
  }
  if (ganhosLanches !== r.ganhosLanches) return inv;

  // serviços: preço do servidor; a impressão colorida pode somar um extra por impressão
  let base = 0;
  for (const [s, qtd] of Object.entries(r.servicos) as [Servico, number][]) base += qtd * LAN.servicos.precos[s];
  const extraMax = (r.servicos.impressao ?? 0) * LAN.servicos.impressaoColoridaExtra;
  if (r.ganhosServicos < base || r.ganhosServicos > base + extraMax) return inv;

  const ganhosBrutos = r.ganhosTempo + r.ganhosServicos + r.ganhosLanches;
  if (r.gorjetas > Math.ceil(ganhosBrutos * LAN.satisfacao.gorjetaMaxSobreGanhos)) return inv;

  // clientes
  let nAtendidos = 0;
  for (const [slug, v] of Object.entries(r.porArquetipo ?? {})) {
    if (!cat.arquetipos.some((q) => q.slug === slug) || !inteiroNaoNegativo(v?.n) || !(v.sat >= 0 && v.sat <= 1)) return inv;
    nAtendidos += v.n;
  }
  if (nAtendidos !== r.servidos) return inv;
  for (const [slug, n] of Object.entries(r.novosFrequentes ?? {})) {
    if (!inteiroNaoNegativo(n) || n > (r.porArquetipo[slug]?.n ?? 0)) return inv;
  }

  // máquinas: as mesmas do save, com saúde e sujeira de 0 a 100
  const ids = new Set(p.maquinas.map((m) => m.id));
  if (!Array.isArray(r.maquinas) || r.maquinas.length !== ids.size) return inv;
  for (const m of r.maquinas) {
    if (!ids.has(m.id) || !(m.saude >= 0 && m.saude <= 100) || !(m.sujeira >= 0 && m.sujeira <= 100)) return inv;
  }
  if (r.formatacoes > a.maquinas.length * Math.ceil(LAN.dia.duracaoSeg / LAN.paradaSeg.formatar + 1) * 2) return inv;

  const gastos = { estoque: estoqueGasto, salarios: salariosDoDia(p), consertos: r.formatacoes * LAN.custoFormatar };
  const ganhos = ganhosBrutos + r.gorjetas - r.reembolsos;
  const saldo = ganhos - (gastos.estoque + gastos.salarios + gastos.consertos);
  const max = LAN.satisfacao.reputacaoDiaMax;
  let dinheiro = Math.max(0, p.dinheiro + saldo);
  let reputacao = clamp(arred2(p.reputacao + clamp(r.repDelta, -max, max)), 0, 5);
  const dia = p.dia + 1;
  const nivel = nivelPorProgresso(p.nivel, reputacao, dia);

  const salvas = new Map(r.maquinas.map((m) => [m.id, m]));
  const maquinas = p.maquinas.map((m) => ({ ...m, saude: Math.round(salvas.get(m.id)!.saude), sujeira: Math.round(salvas.get(m.id)!.sujeira) }));
  const frequentes = { ...p.frequentes };
  for (const [slug, n] of Object.entries(r.novosFrequentes ?? {})) frequentes[slug] = Math.min((frequentes[slug] ?? 0) + n, 99);

  let semana: RegistroSemana | null = null;
  if (dia % LAN.contas.dias === 0) {
    const contas = contasDaSemana(p, cat, nivel);
    const total = contas.aluguel + contas.luz + contas.internet;
    const paga = dinheiro >= total;
    dinheiro = paga ? dinheiro - total : 0;
    if (!paga) reputacao = clamp(arred2(reputacao - LAN.contas.reputacaoSeNaoPagar), 0, 5);
    semana = { semana: semanaDe(dia), contas, paga, saldoFim: dinheiro };
  }

  const registro: RegistroDia = {
    dia, servidos: r.servidos, foram: r.foram, horasVendidas: arred2(horas), servicos: r.servicos, lanchesVendidos,
    ganhos, gastos, incidentes: r.incidentes, saldo, reputacaoFim: reputacao, melhorArquetipo: melhorArquetipo(r.porArquetipo ?? {}),
    tranquilo: Boolean(r.tranquilo),
  };
  const prog: Progresso = { ...p, dinheiro, reputacao, dia, nivel, maquinas, frequentes, estoque: estoqueCheio(p, cat) };
  return { ok: true, prog, registro, semana, subiuDeNivel: nivel > p.nivel };
}
