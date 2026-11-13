// Simulação do dia na lan. Lógica pura: recebe estado + ação (ou tempo) + contexto e devolve o novo estado.
// Sem React, sem Phaser, sem relógio, sem Math.random: as chegadas e os problemas saem da seed (seed do save + dia),
// então a mesma lan no mesmo dia recebe sempre os mesmos clientes, e as mesmas ações dão o mesmo resultado.

import { escolherPeso, sortear } from "../gestao/rng";
import { duracaoDoDia, type Atributos } from "./atributos";
import { LAN } from "./config";
import { AVISOS_SALAO, preencher } from "./conteudo";
import type { Arquetipo, Incidente, MaquinaSalva, Papel, Periodo, Produto, ResumoDia, Servico, TipoPc } from "./tipos";

const D = LAN.dia;
const P = LAN.paciencia;
const PR = LAN.problemas;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export type Ctx = {
  seed: string;
  dia: number; // o dia que vai ser jogado (dias fechados + 1)
  nivel: number;
  reputacao: number;
  tranquilo: boolean;
  attr: Atributos;
  arquetipos: Arquetipo[];
  frequentes: Record<string, number>;
  /** Estado das máquinas no começo do dia (saúde e sujeira vêm do dia anterior). */
  maquinas: MaquinaSalva[];
  /** Aviso da companhia de luz no ConversaNet: neste dia a luz cai mais. */
  energiaInstavel?: boolean;
};

export type ProblemaMaquina = Exclude<Incidente, "internet" | "energia">;
export type Conserto = "reiniciar" | "limpar" | "antivirus" | "formatar";
export type FaseGrupo = "agendado" | "fila" | "usando" | "cobrar" | "fim";
export type Saida = "pago" | "semCobrar" | "paciencia" | "recusou" | "fechou";

export type Grupo = {
  id: number;
  arq: string;
  n: number;
  chegaEm: number;
  fase: FaseGrupo;
  pac: number;
  pacMax: number;
  espera: number;
  maquinas: string[];
  pacoteMin: number;
  pago: number;
  usoSeg: number;
  querSeg: number;
  problemaSeg: number;
  servicos: Servico[];
  chamado: null | "ajuda" | "lanche";
  lancheEm: number; // fração do uso em que pede lanche (0 = não pede)
  pediuLanche: boolean;
  lanche: Produto | null;
  ajudado: boolean;
  adequada: number;
  saiu: null | Saida;
  sat: number;
};

export type MaquinaEstado = {
  id: string;
  tipo: TipoPc;
  x: number;
  y: number;
  saude: number;
  sujeira: number;
  problema: ProblemaMaquina | null;
  erroRepete: boolean;
  paradaAte: number;
  formatando: boolean;
  grupo: number | null;
};

export type Agente = { papel: Papel | "voce"; ocupadoAte: number; tarefa: string | null };
export type Aviso = { n: number; t: number; texto: string; tipo: "bom" | "ruim" | "info" };

export type DiaEstado = {
  v: 1;
  dia: number;
  t: number;
  duracao: number;
  fechou: boolean;
  fim: boolean;
  grupos: Grupo[];
  maquinas: MaquinaEstado[];
  netAte: number;
  energiaAte: number;
  estoque: Partial<Record<Produto, number>>;
  agentes: Agente[];
  avisos: Aviso[];
  nAviso: number;
  // contadores do resumo
  servidos: number;
  foram: number;
  minutosVendidos: number;
  ganhosTempo: number;
  servicos: Partial<Record<Servico, number>>;
  ganhosServicos: number;
  lanches: Partial<Record<Produto, number>>;
  ganhosLanches: number;
  gorjetas: number;
  reembolsos: number;
  formatacoes: number;
  incidentes: Partial<Record<Incidente, number>>;
  repDelta: number;
  porArquetipo: Record<string, { n: number; sat: number }>;
  novosFrequentes: Record<string, number>;
};

export type Acao =
  | { tipo: "atender"; grupo: number; maquinas: string[]; pacote: string }
  | { tipo: "consertar"; maquina: string; como: Conserto }
  | { tipo: "chamado"; grupo: number; produto?: Produto }
  | { tipo: "cobrar"; grupo: number }
  | { tipo: "recusar"; grupo: number };

// ---------------- tempo e períodos ----------------

/** Minutos desde a meia-noite (passa de 1440 no corujão). */
export const relogio = (t: number) => D.abreHora * 60 + t * LAN.minutosPorSeg;
export const horaTexto = (t: number) => {
  const m = Math.floor(relogio(t)) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export const segDeMinutos = (min: number) => min / LAN.minutosPorSeg;
export const minutosDeSeg = (s: number) => s * LAN.minutosPorSeg;

export function periodoDe(t: number): Periodo {
  const h = relogio(t) / 60;
  for (const [p, [a, b]] of Object.entries(LAN.periodos) as [Periodo, [number, number]][]) if (h >= a && h < b) return p;
  return "madrugada";
}

/** Dia 1 é uma segunda; o sábado tem campeonato. */
export const diaDaSemana = (dia: number) => (dia - 1) % 7;
export const ehSabado = (dia: number) => diaDaSemana(dia) === D.sabado;

// ---------------- preços ----------------

export const pacoteDe = (id: string) => LAN.pacotes.find((p) => p.id === id);
export const precoPacote = (tipo: TipoPc, pacoteId: string) => {
  const p = pacoteDe(pacoteId);
  return p ? Math.max(1, Math.round(LAN.maquinas.precoHora[tipo] * p.mult)) : 0;
};
/** Menor pacote que cobre o tempo que o grupo quer (o maior, se nenhum cobre). */
export function pacoteSugerido(g: Pick<Grupo, "querSeg">): string {
  const min = minutosDeSeg(g.querSeg);
  return (LAN.pacotes.find((p) => p.minutos >= min - 5) ?? LAN.pacotes[LAN.pacotes.length - 1]).id;
}

// ---------------- chegadas ----------------

export const liberados = (arqs: Arquetipo[], reputacao: number, nivel: number) =>
  arqs.filter((a) => reputacao >= a.unlock.reputacao && nivel >= a.unlock.nivel);

function horaDaChegada(r: number, curva: readonly number[]): number {
  const idx = curva.map((_, i) => i);
  const h = escolherPeso(idx, [...curva], r);
  return h;
}

/** Os grupos do dia, sorteados pela seed. Mesma seed + mesmo dia = mesmos grupos. */
export function sortearChegadas(ctx: Ctx): Omit<Grupo, "id">[] {
  const C = LAN.chegadas;
  const arqs = liberados(ctx.arquetipos, ctx.reputacao, ctx.nivel);
  if (arqs.length === 0) return [];
  const sabado = ehSabado(ctx.dia);
  const nDia = Math.round((C.gruposBase + C.gruposPorNivel * (ctx.nivel - 1) + C.gruposPorReputacao * ctx.reputacao) * (sabado ? C.sabadoMult : 1));
  const nCorujao = ctx.attr.corujao ? C.gruposCorujao : 0;
  const segPorHora = 60 / LAN.minutosPorSeg;
  const limite = D.duracaoSeg * D.chegadasAteFracao;
  const out: Omit<Grupo, "id">[] = [];
  const r = (i: number, rot: string) => sortear(ctx.seed, ctx.dia, `${rot}${i}`);

  for (let i = 0; i < nDia + nCorujao; i++) {
    const noCorujao = i >= nDia;
    let t: number;
    if (noCorujao) {
      const h = horaDaChegada(r(i, "h"), C.curvaCorujao);
      t = D.duracaoSeg + (h + r(i, "m")) * segPorHora;
      if (t > D.duracaoSeg + LAN.dia.corujaoSeg * D.chegadasAteFracao) t = D.duracaoSeg + r(i, "m") * LAN.dia.corujaoSeg * 0.8;
    } else {
      const h = horaDaChegada(r(i, "h"), sabado ? C.curvaSabado : C.curva);
      t = Math.min(limite, Math.max(D.primeiraChegadaSeg, (h + r(i, "m")) * segPorHora));
    }
    const periodo = periodoDe(t);
    const pesos = arqs.map((a) => {
      const freq = Math.min(ctx.frequentes[a.slug] ?? 0, C.frequenteMax);
      const camp = sabado && a.makesNoise ? C.sabadoGrupoMult : 1;
      return a.wants.periodos[periodo] * (1 + freq * C.frequenteMult) * camp;
    });
    if (pesos.every((p) => p <= 0)) continue;
    const a = escolherPeso(arqs, pesos, r(i, "a"));
    const [gmin, gmax] = a.wants.grupo;
    // ninguém traz um grupo maior do que a lan tem de máquinas
    const n = Math.max(1, Math.min(gmax, gmin + Math.floor(r(i, "n") * (gmax - gmin + 1)), ctx.attr.maquinas.length));
    const querMin = (a.wants.servicos ? a.wants.servicos.reduce((s, x) => s + LAN.servicos.minutos[x], 0) : a.wants.horas * 60) * (0.8 + r(i, "q") * 0.4);
    const pedeLanche = r(i, "l") < a.wants.lanche * Math.min(1.3, a.spend);
    let pacMax = a.patience;
    if (a.quirk.id === "pressa-fim-tarde" && relogio(t) / 60 >= Number(a.quirk.hora)) pacMax = pacMax / Number(a.quirk.mult);
    out.push({
      arq: a.slug, n, chegaEm: t, fase: "agendado", pac: pacMax, pacMax, espera: 0, maquinas: [], pacoteMin: 0, pago: 0,
      usoSeg: 0, querSeg: segDeMinutos(querMin), problemaSeg: 0, servicos: a.wants.servicos ? [...a.wants.servicos] : [],
      chamado: null, lancheEm: pedeLanche ? 0.2 + r(i, "le") * 0.6 : 0, pediuLanche: false, lanche: null, ajudado: false,
      adequada: 1, saiu: null, sat: 0,
    });
  }
  out.sort((x, y) => x.chegaEm - y.chegaEm);
  // o primeiro cliente chega logo depois de abrir (ninguém gosta de abrir a lan e ficar olhando pro teto)
  if (out[0] && out[0].chegaEm < D.duracaoSeg) out[0].chegaEm = Math.min(out[0].chegaEm, D.primeiraChegadaSeg);
  return out;
}

// ---------------- criação ----------------

export function criarDia(ctx: Ctx): DiaEstado {
  const salvas = new Map(ctx.maquinas.map((m) => [m.id, m]));
  const agentes: Agente[] = [{ papel: "voce", ocupadoAte: 0, tarefa: null }];
  for (const papel of ["caixa", "tecnico", "monitor"] as Papel[]) if (ctx.attr.equipe[papel]) agentes.push({ papel, ocupadoAte: 0, tarefa: null });
  const estoque: DiaEstado["estoque"] = {};
  for (const [slug, l] of Object.entries(ctx.attr.lanches)) estoque[slug as Produto] = l!.capacidade;
  return {
    v: 1, dia: ctx.dia, t: 0, duracao: duracaoDoDia(ctx.attr), fechou: false, fim: false,
    grupos: sortearChegadas(ctx).map((g, i) => ({ ...g, id: i + 1 })),
    maquinas: ctx.attr.maquinas.map((m) => ({
      ...m, saude: salvas.get(m.id)?.saude ?? LAN.maquinas.saudeInicial, sujeira: salvas.get(m.id)?.sujeira ?? 0,
      problema: null, erroRepete: false, paradaAte: 0, formatando: false, grupo: null,
    })),
    netAte: -1, energiaAte: -1, estoque, agentes, avisos: [], nAviso: 0,
    servidos: 0, foram: 0, minutosVendidos: 0, ganhosTempo: 0, servicos: {}, ganhosServicos: 0, lanches: {}, ganhosLanches: 0,
    gorjetas: 0, reembolsos: 0, formatacoes: 0, incidentes: {}, repDelta: 0, porArquetipo: {}, novosFrequentes: {},
  };
}

// ---------------- consultas ----------------

const arqDe = (ctx: Ctx, slug: string) => ctx.arquetipos.find((a) => a.slug === slug)!;
export const naFila = (e: DiaEstado) => e.grupos.filter((g) => g.fase === "fila");
export const restante = (e: DiaEstado) => Math.max(0, e.duracao - e.t);
export const semInternet = (e: DiaEstado) => e.t < e.netAte;
export const semEnergia = (e: DiaEstado) => e.t < e.energiaAte;
const vizinhas = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
export const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** A divisória fica entre as colunas k-1 e k: bloqueia o barulho entre lados diferentes. */
export const divisoriaEntre = (div: number | null, a: { x: number }, b: { x: number }) => div !== null && a.x < div !== b.x < div;

export const maquinaLivre = (e: DiaEstado, m: MaquinaEstado) => m.grupo === null && m.problema === null && e.t >= m.paradaAte;

/** As máquinas formam um bloco só (cada uma encosta em outra do grupo). */
export function saoVizinhas(ms: { x: number; y: number }[]): boolean {
  if (ms.length <= 1) return true;
  const visto = new Set([0]);
  const fila = [0];
  while (fila.length) {
    const i = fila.pop()!;
    ms.forEach((m, j) => {
      if (!visto.has(j) && vizinhas(ms[i], m)) {
        visto.add(j);
        fila.push(j);
      }
    });
  }
  return visto.size === ms.length;
}

/**
 * Completa a seleção a partir de uma máquina: as livres mais perto dela, preferindo encostadas
 * (pra grupo sentar junto). Devolve as ids, ou null se não houver máquinas livres suficientes.
 */
export function escolherVizinhas(e: DiaEstado, inicial: string, n: number): string[] | null {
  const m0 = e.maquinas.find((m) => m.id === inicial);
  if (!m0 || !maquinaLivre(e, m0)) return null;
  const escolhidas = [m0];
  while (escolhidas.length < n) {
    const livres = e.maquinas.filter((m) => maquinaLivre(e, m) && !escolhidas.includes(m));
    if (livres.length === 0) return null;
    livres.sort((a, b) => {
      const va = escolhidas.some((x) => vizinhas(x, a)) ? 0 : 1;
      const vb = escolhidas.some((x) => vizinhas(x, b)) ? 0 : 1;
      return va - vb || distancia(m0, a) - distancia(m0, b) || a.y - b.y || a.x - b.x;
    });
    escolhidas.push(livres[0]);
  }
  return escolhidas.map((m) => m.id);
}

/** Quão adequada a máquina é pro que o grupo quer (0 a 1). */
export function adequacao(ctx: Ctx, g: Pick<Grupo, "arq" | "n">, ms: Pick<MaquinaEstado, "tipo" | "x" | "y">[]): number {
  const a = arqDe(ctx, g.arq);
  const T = LAN.maquinas.tier;
  const piorTier = Math.min(...ms.map((m) => T[m.tipo]));
  let v = piorTier >= T[a.wants.tier] ? 1 : 0.55 + 0.15 * piorTier;
  if (a.wants.online && !ctx.attr.online) v *= 0.4;
  if (a.wants.atividade === "jogar") v += ctx.attr.jogoBonus;
  if (g.n > 1 && !saoVizinhas(ms)) v *= 0.7;
  return clamp(v, 0, 1);
}

/** Melhor escolha automática (usada pelo caixa): máquinas vizinhas do melhor tipo pro arquétipo. */
export function melhorAlocacao(e: DiaEstado, ctx: Ctx, g: Grupo): string[] | null {
  let melhor: { ids: string[]; v: number } | null = null;
  for (const m of e.maquinas) {
    if (!maquinaLivre(e, m)) continue;
    const ids = escolherVizinhas(e, m.id, g.n);
    if (!ids) continue;
    const ms = ids.map((id) => e.maquinas.find((x) => x.id === id)!);
    // quem é sensível a barulho prefere ficar longe de quem grita; quem grita prefere não ocupar a gamer à toa
    const v = adequacao(ctx, g, ms) - expostoAoBarulho(e, ctx, ms, arqDe(ctx, g.arq)) * 0.3;
    if (!melhor || v > melhor.v + 1e-9) melhor = { ids, v };
  }
  return melhor?.ids ?? null;
}

// ---------------- barulho ----------------

/** Intensidade de barulho (0 a ~3) que chega a essas máquinas, vindo de quem grita, pela distância e pela divisória. */
export function barulhoEm(e: DiaEstado, ctx: Ctx, alvo: Pick<MaquinaEstado, "x" | "y" | "id">[]): number {
  const B = LAN.barulho;
  let total = 0;
  for (const g of e.grupos) {
    if (g.fase !== "usando" || !arqDe(ctx, g.arq).makesNoise) continue;
    for (const id of g.maquinas) {
      const fonte = e.maquinas.find((m) => m.id === id);
      if (!fonte || alvo.some((a) => a.id === id)) continue;
      const perto = Math.min(...alvo.map((a) => (divisoriaEntre(ctx.attr.divisoria, fonte, a) ? Infinity : distancia(fonte, a))));
      if (perto > B.raio) continue;
      let v = (B.raio + 1 - perto) / (B.raio + 1);
      if (ctx.attr.salaGamer && fonte.tipo === "gamer") v *= B.salaGamerMult;
      total += v;
    }
  }
  const mon = ctx.attr.equipe.monitor;
  return total * ctx.attr.barulhoMult * (mon ? P.monitorBarulhoMult[Math.min(mon.nivel, 3) - 1] : 1);
}

const expostoAoBarulho = (e: DiaEstado, ctx: Ctx, ms: MaquinaEstado[], a: Arquetipo) => (a.makesNoise ? 0 : barulhoEm(e, ctx, ms) * (1 - a.noiseTolerance));

// ---------------- problemas ----------------

/** Chance por segundo de cada problema numa máquina em uso, pelo estado dela e pelas melhorias. */
export function chanceProblema(ctx: Ctx, m: Pick<MaquinaEstado, "tipo" | "saude" | "sujeira">, tipo: ProblemaMaquina, fucador: boolean): number {
  const desgaste = 1 + PR.pesoSaude * (1 - m.saude / 100);
  let c = PR.base[tipo] * desgaste * PR.tierMult[m.tipo] * (ctx.tranquilo ? PR.tranquiloMult : 1);
  if (tipo === "mouse") c = ctx.attr.mouseOptico ? 0 : PR.base.mouse * (1 + PR.pesoSujeira * (m.sujeira / 100)) * (ctx.tranquilo ? PR.tranquiloMult : 1);
  if (tipo === "virus") c *= ctx.attr.virusMult * (fucador && !ctx.attr.congelar ? PR.fucadorVirusMult : 1);
  return c;
}

/** Sorteia (pela seed) se aparece um problema nesta máquina neste segundo. */
export function sortearProblema(ctx: Ctx, m: Pick<MaquinaEstado, "id" | "tipo" | "saude" | "sujeira">, segundo: number, fucador: boolean): ProblemaMaquina | null {
  for (const tipo of ["travou", "mouse", "virus", "erro"] as ProblemaMaquina[]) {
    if (sortear(ctx.seed, ctx.dia, `p|${m.id}|${segundo}|${tipo}`) < chanceProblema(ctx, m, tipo, fucador)) return tipo;
  }
  return null;
}

/** Que consertos resolvem cada problema. */
export function consertosPara(m: Pick<MaquinaEstado, "problema" | "erroRepete">): Conserto[] {
  switch (m.problema) {
    case "travou": return ["reiniciar", "formatar"];
    case "mouse": return ["limpar"];
    case "virus": return ["antivirus", "formatar"];
    case "erro": return m.erroRepete ? ["formatar"] : ["reiniciar", "formatar"];
    default: return ["formatar"];
  }
}

// ---------------- avisos ----------------

function avisar(e: DiaEstado, texto: string, tipo: Aviso["tipo"]) {
  e.nAviso++;
  e.avisos = [...e.avisos.slice(-11), { n: e.nAviso, t: e.t, texto, tipo }];
}
const contar = <K extends string>(r: Partial<Record<K, number>>, k: K, n = 1) => {
  r[k] = (r[k] ?? 0) + n;
};

// ---------------- ações ----------------

function liberarMaquinas(e: DiaEstado, g: Grupo) {
  for (const m of e.maquinas) if (m.grupo === g.id) m.grupo = null;
}

/** O grupo foi embora sem paciência: se já pagou, pede o dinheiro de volta. */
function foiEmbora(e: DiaEstado, ctx: Ctx, g: Grupo) {
  const a = arqDe(ctx, g.arq);
  if (g.pago > 0) {
    e.reembolsos += g.pago;
    avisar(e, preencher(AVISOS_SALAO.reembolso, a.name), "ruim");
  } else avisar(e, preencher(AVISOS_SALAO.foi, a.name), "ruim");
  liberarMaquinas(e, g);
  g.fase = "fim";
  g.saiu = "paciencia";
  g.chamado = null;
  e.foram += g.n;
  e.repDelta -= LAN.satisfacao.reputacaoPorFuga * (1 + 0.25 * (g.n - 1));
}

const equipamento = (ctx: Ctx, s: Servico): boolean => {
  const req = LAN.servicos.precisa[s];
  if (!req) return true;
  if (req === "impressora") return ctx.attr.impressora >= 1;
  return Boolean(ctx.attr[req as "gravador" | "scanner" | "xerox"]);
};

/** Satisfação na saída (0 a 1) = espera + máquina adequada + problemas resolvidos rápido + conforto + lanche. */
export function satisfacao(ctx: Ctx, g: Pick<Grupo, "espera" | "pacMax" | "adequada" | "problemaSeg" | "usoSeg" | "pediuLanche" | "lanche" | "pacoteMin" | "querSeg">, semCobrar = false): number {
  const S = LAN.satisfacao;
  const espera = clamp(1 - g.espera / g.pacMax, 0, 1);
  const problemas = clamp(1 - (2 * g.problemaSeg) / Math.max(g.usoSeg + g.problemaSeg, 1), 0, 1);
  const lanche = g.pediuLanche ? (g.lanche ? (ctx.attr.lanches[g.lanche]?.satisfacao ?? 0.5) : 0.2) : 0.7;
  let sat = S.pesos.espera * espera + S.pesos.maquina * g.adequada + S.pesos.problemas * problemas + S.pesos.conforto * ctx.attr.conforto + S.pesos.lanche * lanche;
  sat += ctx.attr.satisfacaoBonus;
  if (g.pacoteMin > minutosDeSeg(g.querSeg) + 45) sat -= 0.05; // pagou bem mais tempo do que usou
  if (semCobrar) sat *= 0.9;
  return clamp(sat, 0, 1);
}

/** Gorjeta: só acima da satisfação mínima, proporcional ao que gastou. */
export function gorjeta(sat: number, gasto: number, tip: number): number {
  const min = LAN.satisfacao.gorjetaMinSat;
  if (sat < min || gasto <= 0) return 0;
  return Math.round(gasto * tip * ((sat - min) / (1 - min)) * 1.5);
}

/** Fecha a conta do grupo: tempo extra, serviços; calcula satisfação, gorjeta e reputação. */
function fecharConta(e: DiaEstado, ctx: Ctx, g: Grupo, semCobrar: boolean) {
  const a = arqDe(ctx, g.arq);
  let gasto = g.pago;
  if (!semCobrar) {
    const usoMin = minutosDeSeg(g.usoSeg);
    const extraMin = Math.max(0, Math.round(usoMin - g.pacoteMin));
    if (extraMin > 0) {
      for (const id of g.maquinas) {
        const m = e.maquinas.find((x) => x.id === id);
        const v = Math.ceil((extraMin / 60) * LAN.maquinas.precoHora[m?.tipo ?? "basica"]);
        e.ganhosTempo += v;
        gasto += v;
      }
      e.minutosVendidos += extraMin * g.maquinas.length;
    }
    let faltou = false;
    const servicos = [...g.servicos];
    if (a.slug === "estudante" && ctx.attr.xerox) servicos.push("xerox");
    if (a.slug === "fotografo" && ctx.attr.scanner) servicos.push("scanner");
    for (const s of servicos) {
      if (!equipamento(ctx, s)) {
        faltou = true;
        continue;
      }
      let v = LAN.servicos.precos[s];
      if (s === "impressao" && a.slug === "fotografo" && ctx.attr.impressora >= 2) v += LAN.servicos.impressaoColoridaExtra;
      v *= g.n;
      contar(e.servicos, s, g.n);
      e.ganhosServicos += v;
      gasto += v;
    }
    if (faltou) {
      g.adequada = Math.min(g.adequada, 0.2);
      avisar(e, preencher(AVISOS_SALAO.semEquipamento, a.name), "ruim");
    }
  }
  if (g.lanche) gasto += ctx.attr.lanches[g.lanche]?.preco ?? 0;

  const sat = satisfacao(ctx, g, semCobrar);
  g.sat = sat;
  const gj = semCobrar ? 0 : gorjeta(sat, gasto, a.tip);
  e.gorjetas += gj;
  const S = LAN.satisfacao;
  let rep = (sat - S.pontoNeutro) * S.reputacaoPorCliente * g.n + ctx.attr.reputacaoBonus * g.n;
  if (a.quirk.id === "pede-ajuda" && g.ajudado && sat >= S.pontoNeutro) rep += Number(a.quirk.bonus ?? 0);
  e.repDelta += rep;
  const pa = e.porArquetipo[a.slug] ?? { n: 0, sat: 0 };
  e.porArquetipo[a.slug] = { n: pa.n + g.n, sat: (pa.sat * pa.n + sat * g.n) / (pa.n + g.n) };
  if (sat >= S.frequenteSat) contar(e.novosFrequentes, a.slug);
  e.servidos += g.n;
  g.fase = "fim";
  g.saiu = semCobrar ? "semCobrar" : "pago";
  g.chamado = null;
  liberarMaquinas(e, g);
  if (!semCobrar) avisar(e, `${preencher(AVISOS_SALAO.pago, a.name)}${gj > 0 ? ` (+${gj} de gorjeta)` : ""}`, "bom");
}

function vender(e: DiaEstado, ctx: Ctx, g: Grupo, produto?: Produto): boolean {
  const opcoes = (produto ? [produto] : LAN.produtos).filter((p) => (e.estoque[p] ?? 0) > 0 && ctx.attr.lanches[p]);
  const p = opcoes[0];
  if (!p) return false;
  e.estoque[p] = (e.estoque[p] ?? 0) - 1;
  contar(e.lanches, p);
  e.ganhosLanches += ctx.attr.lanches[p]!.preco;
  g.lanche = p;
  return true;
}

/** Valida e aplica uma ação feita por um agente (o tripulante ou um funcionário). */
function executar(e: DiaEstado, ctx: Ctx, ag: Agente, a: Acao): string | null {
  if (e.t < ag.ocupadoAte) return "ocupado";
  const vel = ag.papel === "voce" ? 1 : (ctx.attr.equipe[ag.papel]?.velocidade ?? 1);
  const ocupar = (acao: string, rotulo: string) => {
    ag.ocupadoAte = e.t + LAN.tempoAcao[acao] / vel;
    ag.tarefa = rotulo;
  };
  const g = "grupo" in a ? e.grupos.find((x) => x.id === a.grupo) : undefined;

  switch (a.tipo) {
    case "atender": {
      if (!g || g.fase !== "fila") return "grupo";
      if (e.fechou) return "fechado";
      const p = pacoteDe(a.pacote);
      if (!p) return "pacote";
      if (new Set(a.maquinas).size !== g.n || a.maquinas.length !== g.n) return "maquinas";
      const ms = a.maquinas.map((id) => e.maquinas.find((m) => m.id === id));
      if (ms.some((m) => !m || !maquinaLivre(e, m))) return "maquinas";
      const lista = ms as MaquinaEstado[];
      for (const m of lista) m.grupo = g.id;
      g.maquinas = [...a.maquinas];
      g.fase = "usando";
      g.pacoteMin = p.minutos;
      g.pago = lista.reduce((s, m) => s + precoPacote(m.tipo, p.id), 0);
      g.adequada = adequacao(ctx, g, lista);
      e.ganhosTempo += g.pago;
      e.minutosVendidos += p.minutos * g.n;
      const arq = arqDe(ctx, g.arq);
      if (arq.quirk.id === "pede-ajuda") g.chamado = "ajuda";
      ocupar("atender", "atendendo");
      return null;
    }
    case "consertar": {
      const m = e.maquinas.find((x) => x.id === a.maquina);
      if (!m) return "maquina";
      if (e.t < m.paradaAte) return "parada";
      if (a.como !== "formatar" && (!m.problema || !consertosPara(m).includes(a.como))) return "conserto";
      if (a.como === "formatar" && m.problema && !consertosPara(m).includes("formatar")) return "conserto";
      let parada = LAN.paradaSeg[a.como];
      if (a.como === "antivirus" && ctx.attr.antivirusRapido) parada = parada / 2;
      if (a.como === "reiniciar" && m.problema === "erro" && sortear(ctx.seed, ctx.dia, `erro|${m.id}|${Math.floor(e.t * 4)}`) < PR.erroRepeteChance) {
        m.erroRepete = true; // a tela de erro voltou: agora só formatando
        m.paradaAte = e.t + parada;
        ocupar("reiniciar", "reiniciando");
        return null;
      }
      if (a.como === "reiniciar") m.saude = Math.min(100, m.saude + LAN.maquinas.reiniciarRecupera);
      if (a.como === "limpar") m.sujeira = 0;
      if (a.como === "antivirus") m.saude = Math.min(100, m.saude + PR.virusSaude);
      if (a.como === "formatar") {
        m.saude = LAN.maquinas.formatarRecupera;
        m.formatando = true;
        e.formatacoes++;
      }
      m.problema = null;
      m.erroRepete = false;
      m.paradaAte = e.t + parada;
      ocupar(a.como, a.como === "formatar" ? "formatando" : "consertando");
      return null;
    }
    case "chamado": {
      if (!g || g.fase !== "usando" || !g.chamado) return "grupo";
      if (g.chamado === "lanche") {
        if (!vender(e, ctx, g, a.produto)) {
          g.chamado = null; // acabou o estoque: fica sem lanche
          return "estoque";
        }
        g.chamado = null;
        ocupar("lanche", "no balcão");
        return null;
      }
      g.chamado = null;
      g.ajudado = true;
      ocupar("ajudar", "ajudando");
      return null;
    }
    case "cobrar": {
      if (!g || g.fase !== "cobrar") return "grupo";
      fecharConta(e, ctx, g, false);
      ocupar("cobrar", "cobrando");
      return null;
    }
    case "recusar": {
      if (!g || g.fase !== "fila") return "grupo";
      g.fase = "fim";
      g.saiu = "recusou";
      e.repDelta -= LAN.satisfacao.reputacaoRecusa * g.n;
      avisar(e, preencher(AVISOS_SALAO.recusou, arqDe(ctx, g.arq).name), "info");
      return null;
    }
  }
}

/** Ação do tripulante. Devolve um estado novo (o anterior não muda). */
export function agir(e0: DiaEstado, ctx: Ctx, a: Acao): { estado: DiaEstado; erro: string | null } {
  const e = clonar(e0);
  const voce = e.agentes.find((x) => x.papel === "voce")!;
  const erro = executar(e, ctx, voce, a);
  return erro ? { estado: e0, erro } : { estado: e, erro: null };
}

// ---------------- funcionários ----------------

function agirFuncionarios(e: DiaEstado, ctx: Ctx) {
  for (const ag of e.agentes) {
    if (ag.papel === "voce" || e.t < ag.ocupadoAte) continue;
    if (e.t >= ag.ocupadoAte && ag.tarefa) ag.tarefa = null;
    const feito = (a: Acao) => executar(e, ctx, ag, a) === null;
    if (ag.papel === "caixa") {
      const cobrar = e.grupos.find((g) => g.fase === "cobrar");
      if (cobrar && feito({ tipo: "cobrar", grupo: cobrar.id })) continue;
      const lanche = e.grupos.find((g) => g.fase === "usando" && g.chamado === "lanche");
      if (lanche && feito({ tipo: "chamado", grupo: lanche.id })) continue;
      if (!e.fechou) {
        for (const g of naFila(e)) {
          const ids = melhorAlocacao(e, ctx, g);
          if (ids && feito({ tipo: "atender", grupo: g.id, maquinas: ids, pacote: pacoteSugerido(g) })) break;
        }
      }
    } else if (ag.papel === "tecnico") {
      const m = e.maquinas.find((x) => x.problema && e.t >= x.paradaAte);
      if (!m) continue;
      const op = consertosPara(m);
      const como: Conserto = m.problema === "virus" ? (ctx.attr.virusMult < 1 ? "antivirus" : "formatar") : op[0];
      feito({ tipo: "consertar", maquina: m.id, como });
    } else if (ag.papel === "monitor") {
      const g = e.grupos.find((x) => x.fase === "usando" && x.chamado === "ajuda");
      if (g) feito({ tipo: "chamado", grupo: g.id });
    }
  }
}

// ---------------- passo do tempo ----------------

function eventosDoSegundo(e: DiaEstado, ctx: Ctx, s: number) {
  const emUso = new Set(e.grupos.filter((g) => g.fase === "usando").flatMap((g) => g.maquinas));
  const tranq = ctx.tranquilo ? PR.tranquiloMult : 1;
  // internet
  if (e.t >= e.netAte && sortear(ctx.seed, ctx.dia, `net|${s}`) < PR.internetPorSeg * ctx.attr.quedaNetMult * tranq) {
    e.netAte = s + PR.internetDuracaoSeg;
    contar(e.incidentes, "internet");
    avisar(e, AVISOS_SALAO.internet, "ruim");
  }
  // energia
  if (e.t >= e.energiaAte && sortear(ctx.seed, ctx.dia, `luz|${s}`) < PR.energiaPorSeg * tranq * (ctx.energiaInstavel ? 2 : 1)) {
    contar(e.incidentes, "energia");
    if (ctx.attr.nobreakSeg >= PR.energiaDuracaoSeg) avisar(e, AVISOS_SALAO.energiaNobreak, "info");
    else {
      e.energiaAte = s + PR.energiaDuracaoSeg - ctx.attr.nobreakSeg;
      avisar(e, AVISOS_SALAO.energia, "ruim");
      for (const g of e.grupos) if (g.fase === "usando") g.pac -= P.quedaEnergia * (ctx.tranquilo ? P.tranquiloMult : 1);
    }
  }
  // problemas das máquinas em uso
  for (const m of e.maquinas) {
    if (!emUso.has(m.id) || m.problema || e.t < m.paradaAte || semEnergia(e)) continue;
    const g = e.grupos.find((x) => x.id === m.grupo);
    const fucador = g ? arqDe(ctx, g.arq).quirk.id === "instala-coisas" : false;
    const p = sortearProblema(ctx, m, s, fucador);
    if (p) {
      m.problema = p;
      contar(e.incidentes, p);
      if (p === "virus") m.saude = Math.max(0, m.saude - PR.virusSaude);
    }
  }
}

function passoUnico(e: DiaEstado, ctx: Ctx, h: number) {
  const antes = Math.floor(e.t);
  e.t += h;
  const pacMult = (ctx.tranquilo ? P.tranquiloMult : 1) * ctx.attr.pacienciaMult;

  // chegadas
  for (const g of e.grupos) if (g.fase === "agendado" && g.chegaEm <= e.t) g.fase = e.fechou ? "fim" : "fila";

  if (Math.floor(e.t) > antes) eventosDoSegundo(e, ctx, Math.floor(e.t));
  if (e.netAte >= 0 && e.t >= e.netAte && e.t - h < e.netAte) avisar(e, AVISOS_SALAO.internetVoltou, "info");
  if (e.energiaAte >= 0 && e.t >= e.energiaAte && e.t - h < e.energiaAte) avisar(e, AVISOS_SALAO.energiaVoltou, "info");

  // máquinas: fim da formatação
  for (const m of e.maquinas) if (m.formatando && e.t >= m.paradaAte) m.formatando = false;

  const madrugada = e.t > D.duracaoSeg;
  for (const g of e.grupos) {
    if (g.fase === "fila") {
      g.espera += h;
      g.pac -= P.fila * pacMult * h;
    } else if (g.fase === "usando") {
      const a = arqDe(ctx, g.arq);
      const ms = g.maquinas.map((id) => e.maquinas.find((m) => m.id === id)!);
      const travada = semEnergia(e) || ms.some((m) => m.problema || e.t < m.paradaAte);
      const precisaNet = a.wants.online || a.wants.atividade === "mensageiro";
      const semNet = semInternet(e) && precisaNet;
      let queda = 0;
      if (travada) queda += P.travada;
      else if (semNet) queda += P.semInternet * (a.wants.online ? P.onlineSemInternetMult : 1) * (a.quirk.id === "odeia-queda" ? 1.5 : 1);
      if (g.chamado) queda += P.chamado;
      if (!a.makesNoise) queda += P.barulho * barulhoEm(e, ctx, ms) * (1 - a.noiseTolerance);
      if (travada || semNet) g.problemaSeg += h;
      else {
        g.usoSeg += h;
        for (const m of ms) {
          m.saude = Math.max(0, m.saude - LAN.maquinas.desgasteSeg * h * (madrugada ? LAN.maquinas.desgasteCorujaoMult : 1));
          if (!ctx.attr.mouseOptico) m.sujeira = Math.min(100, m.sujeira + LAN.maquinas.sujeiraSeg * h);
        }
      }
      g.pac = queda > 0 ? g.pac - queda * pacMult * h : Math.min(g.pacMax, g.pac + P.recupera * h);
      if (g.lancheEm > 0 && !g.pediuLanche && g.usoSeg >= g.lancheEm * g.querSeg) {
        g.pediuLanche = true;
        if (!g.chamado) g.chamado = "lanche";
      }
      if (g.usoSeg >= g.querSeg) {
        g.fase = "cobrar";
        g.chamado = null;
        g.espera += 0;
        liberarMaquinas(e, g);
      }
    } else if (g.fase === "cobrar") {
      g.pac -= P.fila * 0.5 * pacMult * h;
      if (g.pac <= 0) fecharConta(e, ctx, g, true);
    }
    if ((g.fase === "fila" || g.fase === "usando") && g.pac <= 0) foiEmbora(e, ctx, g);
  }

  // fechamento
  if (!e.fechou && e.t >= e.duracao) {
    e.fechou = true;
    for (const g of e.grupos) {
      if (g.fase === "agendado" || g.fase === "fila") {
        g.fase = "fim";
        g.saiu = "fechou";
      } else if (g.fase === "usando") {
        g.fase = "cobrar";
        g.chamado = null;
        liberarMaquinas(e, g);
      }
    }
    avisar(e, AVISOS_SALAO.fechou, "info");
  }
  if (e.fechou && e.t >= e.duracao + D.gracaFechamentoSeg) {
    for (const g of e.grupos) if (g.fase === "cobrar") fecharConta(e, ctx, g, true);
    e.fim = true;
  }
  if (!e.fim) agirFuncionarios(e, ctx);
}

function clonar(e: DiaEstado): DiaEstado {
  return structuredClone(e);
}

/** Avança o tempo em passos fixos (o mesmo resultado em qualquer computador). */
export function passo(e0: DiaEstado, ctx: Ctx, dt: number): DiaEstado {
  if (e0.fim) return e0;
  const e = clonar(e0);
  let resto = dt;
  while (resto > 1e-9 && !e.fim) {
    const h = Math.min(D.passoSeg, resto);
    passoUnico(e, ctx, h);
    resto -= h;
  }
  return e;
}

/**
 * Fecha a lan agora (botão "fechar mais cedo" e testes): ninguém mais entra, a fila vai embora sem contar como
 * cliente irritado, e quem está dentro sai pagando só o que já pagou.
 */
export function encerrar(e0: DiaEstado, ctx: Ctx): DiaEstado {
  if (e0.fim) return e0;
  const e = clonar(e0);
  e.duracao = Math.min(e.duracao, e.t);
  e.t = Math.max(e.t, e.duracao + D.gracaFechamentoSeg) - D.passoSeg;
  return passo(e, ctx, D.passoSeg * 2);
}

export function melhorArquetipo(porArquetipo: ResumoDia["porArquetipo"]): string | null {
  let melhor: string | null = null;
  let sat = -1;
  for (const [slug, v] of Object.entries(porArquetipo)) {
    if (v.n > 0 && v.sat > sat) {
      sat = v.sat;
      melhor = slug;
    }
  }
  return melhor;
}

export function resumoDoDia(e: DiaEstado, ctx: Ctx): ResumoDia {
  return {
    dia: e.dia, servidos: e.servidos, foram: e.foram, minutosVendidos: Math.round(e.minutosVendidos),
    ganhosTempo: e.ganhosTempo, servicos: e.servicos, ganhosServicos: e.ganhosServicos, lanches: e.lanches,
    ganhosLanches: e.ganhosLanches, gorjetas: e.gorjetas, reembolsos: e.reembolsos, formatacoes: e.formatacoes,
    incidentes: e.incidentes, repDelta: Math.round(e.repDelta * 1000) / 1000,
    porArquetipo: Object.fromEntries(Object.entries(e.porArquetipo).map(([k, v]) => [k, { n: v.n, sat: Math.round(v.sat * 1000) / 1000 }])),
    novosFrequentes: e.novosFrequentes,
    maquinas: e.maquinas.map((m) => ({ id: m.id, saude: Math.round(m.saude), sujeira: Math.round(m.sujeira) })),
    tranquilo: ctx.tranquilo,
  };
}
