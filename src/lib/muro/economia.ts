// Dinheiro, reputação, compras, contratação, entrega, nível e o fechamento do dia e da semana.
// Tudo puro. O servidor roda estas mesmas funções com os preços dele.

import { CLIENTES } from "./catalogo";
import { CAMADAS, MURO, TAMANHOS, fimDeSemana, limitar, semanaDe } from "./config";
import { atributos, habilidadeMax, salariosDoDia, vagasDe } from "./efeitos";
import { julgar, type Julgamento } from "./encontro";
import { capacidadeLonas, capacidadeReserva, capacidadeSpray, capacidadeTinta, estoqueInicial } from "./material";
import { concluida, fidelidadeFinal, qualidadeFinal, tetoQualidade } from "./pintura";
import { gerarQuadro } from "./quadro";
import type { ArquetipoArtista, Catalogo, CorId, Gastos, ItemMaterial, Job, Progresso, RegistroDia, RegistroSemana, Tamanho } from "./tipos";
import { clonar, jobPorId, type Resultado } from "./trabalho";

export const gastosZero = (): Gastos => ({ tinta: 0, spray: 0, salarios: 0, lona: 0, outros: 0 });
export const somaGastos = (g: Gastos) => g.tinta + g.spray + g.salarios + g.lona + g.outros;
const ORDEM_TAMANHO: Tamanho[] = ["porta", "fachada", "quadra", "longo", "empena"];

export function novoProgresso(seed: string, cat: Catalogo, tagPropria = false): Progresso {
  const p: Progresso = {
    v: MURO.versaoSave, bairro: MURO.bairroInicial, nivel: 1, dinheiro: MURO.dinheiroInicial, repQuebrada: MURO.reputacaoInicial.quebrada,
    repClientes: MURO.reputacaoInicial.clientes, dia: 0, minuto: 0, seed, entregues: 0, maiorMuro: null, estoque: estoqueInicial(), melhorias: {},
    equipe: [], jobs: [], gastosDia: gastosZero(), ganhosDia: 0, dinheiroIniDia: MURO.dinheiroInicial, tagPropria, entreguesDia: [],
    encontro: { semana: 1, inscrito: false, jobId: null, fimMinuto: 0 }, tranquilo: false,
  };
  p.jobs = gerarQuadro(seed, 1, 1, cat, 1);
  return p;
}

// ---------- reputação ----------
/** Ganho com retorno decrescente: perto do 5 sobe devagar. */
export const ganhar = (rep: number, ganho: number) => limitar(rep + ganho * (1 - (rep / MURO.reputacao.max) * MURO.reputacao.decrescente), 0, MURO.reputacao.max);
export const perder = (rep: number, perda: number) => limitar(rep - perda, 0, MURO.reputacao.max);
const arred = (v: number) => Math.round(v * 1000) / 1000;

// ---------- nível ----------
export function nivelDoProgresso(p: Pick<Progresso, "entregues" | "repQuebrada" | "repClientes" | "nivel">): number {
  const media = (p.repQuebrada + p.repClientes) / 2;
  let n = p.nivel;
  MURO.niveis.forEach((req, i) => {
    if (i + 1 > n && p.entregues >= req.entregues && media >= req.rep) n = i + 1;
  });
  return Math.min(n, MURO.nivelMax);
}

// ---------- compras ----------
export type PedidoMaterial = { item: ItemMaterial; cor?: CorId };
const CORES_OK: CorId[] = ["laranja", "azul", "creme", "tijolo", "preto"];

export function comprarMaterial(p0: Progresso, cat: Catalogo, pedido: PedidoMaterial): Resultado<{ preco: number }> {
  const p = clonar(p0);
  const attr = atributos(p, cat);
  const M = MURO.material;
  const cor = pedido.cor;
  let preco = 0;
  let cat2: keyof Gastos = "outros";
  if (pedido.item === "tinta") {
    if (!cor || !CORES_OK.includes(cor)) return { ok: false, erro: "invalido" };
    if (p.estoque.tinta[cor] >= capacidadeTinta(attr) - 0.01) return { ok: false, erro: "estoque" };
    preco = Math.round(M.precoTinta * attr.precoTinta);
    cat2 = "tinta";
    if (p.dinheiro < preco) return { ok: false, erro: "saldo" };
    p.estoque.tinta[cor] = Math.min(capacidadeTinta(attr), p.estoque.tinta[cor] + M.tintaPorCompra);
  } else if (pedido.item === "spray") {
    if (!cor || !CORES_OK.includes(cor)) return { ok: false, erro: "invalido" };
    if (p.estoque.spray[cor] >= capacidadeSpray(attr)) return { ok: false, erro: "estoque" };
    preco = M.precoSpray;
    cat2 = "spray";
    if (p.dinheiro < preco) return { ok: false, erro: "saldo" };
    p.estoque.spray[cor] = Math.floor(p.estoque.spray[cor]) + 1;
  } else if (pedido.item === "rolinho") {
    if (p.estoque.rolinho.reserva >= capacidadeReserva(attr)) return { ok: false, erro: "estoque" };
    preco = M.precoRolinho;
    if (p.dinheiro < preco) return { ok: false, erro: "saldo" };
    p.estoque.rolinho.reserva += 1;
  } else if (pedido.item === "bico") {
    if (p.estoque.bico.reserva >= capacidadeReserva(attr)) return { ok: false, erro: "estoque" };
    preco = M.precoBico;
    if (p.dinheiro < preco) return { ok: false, erro: "saldo" };
    p.estoque.bico.reserva += 1;
  } else if (pedido.item === "lona") {
    if (p.estoque.lonas >= capacidadeLonas(attr)) return { ok: false, erro: "estoque" };
    preco = M.precoLona;
    cat2 = "lona";
    if (p.dinheiro < preco) return { ok: false, erro: "saldo" };
    p.estoque.lonas += 1;
  } else return { ok: false, erro: "invalido" };
  p.dinheiro -= preco;
  p.gastosDia[cat2] += preco;
  return { ok: true, prog: p, avisos: [], preco };
}

export function comprarMelhoria(p0: Progresso, cat: Catalogo, slug: string): Resultado<{ preco: number; nivel: number }> {
  const item = cat.itens.find((i) => i.slug === slug);
  if (!item) return { ok: false, erro: "invalido" };
  const p = clonar(p0);
  const atual = p.melhorias[slug] ?? 0;
  if (atual >= item.maxLevel) return { ok: false, erro: "maximo" };
  if (p.nivel < item.minCrewLevel) return { ok: false, erro: "nivel" };
  const preco = item.prices[atual];
  if (p.dinheiro < preco) return { ok: false, erro: "saldo" };
  p.dinheiro -= preco;
  p.gastosDia.outros += preco;
  p.melhorias[slug] = atual + 1;
  return { ok: true, prog: p, avisos: [], preco, nivel: atual + 1 };
}

export function contratar(p0: Progresso, cat: Catalogo, slug: string): Resultado<{ preco: number }> {
  const arq = cat.arquetipos.find((a) => a.slug === slug);
  if (!arq) return { ok: false, erro: "invalido" };
  const p = clonar(p0);
  const attr = atributos(p, cat);
  if (p.equipe.some((a) => a.arquetipo === slug)) return { ok: false, erro: "maximo" };
  if (p.nivel < arq.nivelMin) return { ok: false, erro: "nivel" };
  if (p.equipe.length >= vagasDe(p.nivel, attr)) return { ok: false, erro: "vaga" };
  if (p.dinheiro < arq.contratacao) return { ok: false, erro: "saldo" };
  p.dinheiro -= arq.contratacao;
  p.gastosDia.outros += arq.contratacao;
  p.equipe.push({ id: `a${p.equipe.length + 1}-${slug}`, arquetipo: slug, nivel: 1, hab: { ...arq.hab }, cansaco: 0, contratadoDia: p.dia + 1, escala: null, folga: false, minTrabalhados: 0 });
  return { ok: true, prog: p, avisos: [], preco: arq.contratacao };
}

// ---------- entrega e pagamento ----------
export const diasDeAtraso = (p: Pick<Progresso, "dia">, job: Pick<Job, "prazo">) => Math.max(0, p.dia + 1 - job.prazo);

export function calcularPagamento(job: Pick<Job, "pagamento" | "briefing">, qualidade: number, atraso: number): number {
  const P = MURO.pagamento;
  const base = job.pagamento * (P.piso + P.porQualidade * (qualidade / 100));
  const bonus = job.briefing.tagDestaque && qualidade >= 70 ? 1 + P.bonusTag : 1;
  const mult = 1 - Math.min(MURO.prazo.penalidadeMax, atraso * MURO.prazo.penalidadePorDia);
  return Math.max(0, Math.round(base * bonus * mult));
}

/** Reputação e pagamento de um mural entregue. Usado na entrega e na conferência do servidor. */
export function liquidar(p: Progresso, job: Job, qualidade: number): { pago: number } {
  const R = MURO.reputacao;
  const atraso = diasDeAtraso(p, job);
  const pago = calcularPagamento(job, qualidade, atraso);
  const fid = fidelidadeFinal(job);
  const bom = qualidade >= R.qualidadeMinGanho;
  if (job.comunitario) {
    if (bom) p.repQuebrada = ganhar(p.repQuebrada, R.ganhoEntregaQuebrada * (qualidade / 100) + (job.briefing.tagDestaque && qualidade >= 70 ? R.ganhoTagDestaque : 0));
    if (atraso > 0) p.repQuebrada = perder(p.repQuebrada, R.perdaAtrasoQuebrada);
  } else {
    if (fid < R.fidelidadeMinima) p.repClientes = perder(p.repClientes, R.perdaForaDoCombinado);
    else if (bom) p.repClientes = ganhar(p.repClientes, R.ganhoEntregaClientes * (qualidade / 100));
    if (atraso > 0) p.repClientes = perder(p.repClientes, R.perdaAtrasoClientes);
    if (bom && job.briefing.tagDestaque) p.repQuebrada = ganhar(p.repQuebrada, R.ganhoTagDestaque);
  }
  if (job.ruinas > 0) p.repQuebrada = perder(p.repQuebrada, R.perdaEstragado);
  p.repQuebrada = arred(p.repQuebrada);
  p.repClientes = arred(p.repClientes);
  p.dinheiro += pago;
  p.ganhosDia += pago;
  return { pago };
}

export function entregar(p0: Progresso, cat: Catalogo, jobId: string): Resultado<{ pago: number; qualidade: number }> {
  const p = clonar(p0);
  const job = jobPorId(p, jobId);
  if (!job || job.status !== "em_andamento" || job.encontro) return { ok: false, erro: "invalido" };
  if (job.auth !== "autorizado") return { ok: false, erro: "autorizacao" };
  if (!concluida(job)) return { ok: false, erro: "camada" };
  const attr = atributos(p, cat);
  const qualidade = Math.min(qualidadeFinal(job), tetoQualidade(job.tamanho, attr, habilidadeMax(p, attr)));
  const { pago } = liquidar(p, job, qualidade);
  job.status = "entregue";
  job.entregueDia = p.dia + 1;
  job.qualFinal = qualidade;
  job.pago = pago;
  p.entregues += 1;
  p.entreguesDia.push(job.id);
  if (!p.maiorMuro || ORDEM_TAMANHO.indexOf(job.tamanho) > ORDEM_TAMANHO.indexOf(p.maiorMuro)) p.maiorMuro = job.tamanho;
  p.nivel = nivelDoProgresso(p);
  return { ok: true, prog: p, avisos: [], pago, qualidade };
}

// ---------- fechamento ----------
export type FechamentoDia = {
  ok: true;
  prog: Progresso;
  registro: RegistroDia;
  semana: RegistroSemana | null;
  subiuDeNivel: boolean;
  julgamento: Julgamento | null;
};
const PIOR: Gastos = gastosZero();

/** Fecha o dia: encontro, atrasos, chuva que estragou, salários, cansaço, contas da semana, novo quadro. */
export function fecharDia(p0: Progresso, cat: Catalogo): FechamentoDia {
  const p = clonar(p0);
  const hoje = p.dia + 1;
  const R = MURO.reputacao;
  const ganhosDoDia = p.ganhosDia;
  const gastos: Gastos = { ...PIOR, ...p.gastosDia };
  let julgamento: Julgamento | null = null;
  let evento: RegistroDia["evento"] = null;

  // encontro de sábado
  const ev = p.encontro.inscrito && p.encontro.jobId ? p.jobs.find((j) => j.id === p.encontro.jobId) : undefined;
  if (ev && ev.status === "em_andamento") {
    julgamento = julgar(p, ev, semanaDe(hoje));
    const prem = MURO.encontro.premios[julgamento.resultado];
    p.dinheiro += prem.dinheiro;
    p.ganhosDia += prem.dinheiro;
    p.repQuebrada = arred(ganhar(p.repQuebrada, prem.quebrada));
    ev.status = "entregue";
    ev.entregueDia = hoje;
    ev.qualFinal = julgamento.nota;
    ev.pago = prem.dinheiro;
    evento = { resultado: julgamento.resultado, score: julgamento.score, posicao: julgamento.posicao };
  }

  // chuva que estragou
  let ruinasChuva = 0;
  for (const j of p.jobs) {
    if (j.ruinasHoje > 0 && !j.encontro) {
      ruinasChuva += 1;
      p.repQuebrada = arred(perder(p.repQuebrada, R.perdaEstragado));
    }
    j.ruinasHoje = 0;
  }

  // salários
  const salarios = Math.min(p.dinheiro, salariosDoDia(p, cat));
  p.dinheiro -= salarios;
  gastos.salarios += salarios;

  // contas da semana (domingo)
  let semana: RegistroSemana | null = null;
  if (fimDeSemana(hoje)) {
    const C = MURO.contas;
    const contas = C.aluguel + C.transporte + C.luz + C.porNivel * (p.nivel - 1);
    const paga = p.dinheiro >= contas;
    const pagou = Math.min(p.dinheiro, contas);
    p.dinheiro -= pagou;
    gastos.outros += pagou;
    if (!paga) p.repClientes = arred(perder(p.repClientes, C.atrasoReputacao));
    semana = { semana: semanaDe(hoje), paga, contas, saldoFim: p.dinheiro };
  }

  // cansaço: a noite recupera, a folga recupera mais
  for (const a of p.equipe) {
    a.cansaco = Math.max(0, a.cansaco - MURO.artista.recuperaNoite - (a.folga ? MURO.artista.recuperaFolga : 0));
    a.minTrabalhados = 0;
  }

  // atrasos
  p.dia += 1;
  p.minuto = 0;
  const novoDia = p.dia + 1;
  let atrasados = 0;
  for (const j of p.jobs) {
    if (!j.aceita || j.encontro || (j.status !== "aberta" && j.status !== "em_andamento")) continue;
    if (novoDia > j.prazo) atrasados += 1;
    const tipo = j.comunitario ? "quebrada" : "clientes";
    if (novoDia === j.prazo + 1) {
      if (tipo === "quebrada") p.repQuebrada = arred(perder(p.repQuebrada, R.perdaAtrasoQuebrada));
      else p.repClientes = arred(perder(p.repClientes, R.perdaAtrasoClientes));
    }
    if (novoDia - j.prazo > MURO.prazo.diasAteDesistir) {
      j.status = "perdida";
      if (tipo === "quebrada") p.repQuebrada = arred(perder(p.repQuebrada, R.perdaPerdida));
      else p.repClientes = arred(perder(p.repClientes, R.perdaPerdida));
    }
  }

  // nova semana: o quadro muda e o encontro zera
  if (fimDeSemana(hoje)) {
    const nova = semanaDe(novoDia);
    p.jobs = p.jobs.filter((j) => j.aceita && !j.encontro && (j.status === "em_andamento" || j.status === "aberta" || j.status === "entregue"));
    p.jobs = [...p.jobs.filter((j) => j.status !== "entregue" || novoDia - (j.entregueDia ?? 0) < 8), ...gerarQuadro(p.seed, nova, p.nivel, cat, novoDia)];
    p.encontro = { semana: nova, inscrito: false, jobId: null, fimMinuto: 0 };
  }

  const nivelAntes = p.nivel;
  p.nivel = nivelDoProgresso(p);
  const ganhos = p.ganhosDia;
  const gastosFinais = gastos;
  const registro: RegistroDia = {
    dia: hoje, entregues: p.entreguesDia.length, ruinasChuva, ganhos, gastos: gastosFinais, saldo: ganhos - somaGastos(gastosFinais),
    repQuebradaFim: p.repQuebrada, repClientesFim: p.repClientes, tranquilo: p.tranquilo, atrasados, evento,
  };
  void ganhosDoDia;
  p.gastosDia = gastosZero();
  p.ganhosDia = 0;
  p.entreguesDia = [];
  p.dinheiroIniDia = p.dinheiro;
  return { ok: true, prog: p, registro, semana, subiuDeNivel: p.nivel > nivelAntes, julgamento };
}

export const salarioDe = (a: ArquetipoArtista) => a.salario;
export const clientePorSlug = (slug: string) => CLIENTES.find((c) => c.slug === slug);
export { CAMADAS, TAMANHOS };
