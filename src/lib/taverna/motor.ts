// Simulação da noite na taverna. Lógica pura: recebe estado + ação (ou tempo) + contexto e devolve o novo estado.
// Sem React, sem Phaser, sem relógio, sem Math.random: a chegada dos grupos sai da seed (seed do save + noite),
// então a mesma taverna na mesma noite recebe sempre os mesmos clientes.

import type { Atributos } from "./atributos";
import { TAVERNA } from "./config";
import { escolherPeso, sortear } from "./rng";
import type { Arquetipo, Papel, ResumoNoite } from "./tipos";

const N = TAVERNA.noite;

export type Ctx = {
  seed: string;
  noite: number; // a noite que vai ser jogada (noites fechadas + 1)
  nivel: number;
  reputacao: number;
  tranquila: boolean;
  attr: Atributos;
  arquetipos: Arquetipo[];
};

export type Motivo = "paciencia" | "fuga" | "recusou" | "fechou";

export type Cliente = {
  id: number;
  arq: string;
  pedido: string;
  pac: number;
  pacMax: number;
  /** null = ainda no jogo. */
  saiu: null | Motivo | "pago";
  sat: number;
};

export type FaseGrupo = "agendado" | "fila" | "sentado" | "pediu" | "comendo" | "cobrar" | "fim";

export type Grupo = {
  id: number;
  chegaEm: number;
  clientes: Cliente[];
  fase: FaseGrupo;
  mesaId: string | null;
  prontoEm: number;
  retirado: boolean;
  comendoAte: number;
  cobrarDesde: number;
};

export type MesaEstado = { id: string; suja: boolean; grupoId: number | null };
export type Agente = { papel: Papel; ocupadoAte: number };
export type Aviso = { n: number; t: number; tipo: "pago" | "foi" | "quebrou" | "fugiu" | "recusou"; grupoId: number; valor?: number };

export type NoiteEstado = {
  v: 1;
  noite: number;
  t: number;
  duracao: number;
  grupos: Grupo[];
  mesas: MesaEstado[];
  agentes: Agente[];
  jogadorOcupadoAte: number;
  combo: number;
  seguidos: number;
  servidos: number;
  foram: number;
  vendas: Record<string, number>;
  ganhos: number;
  gorjetas: number;
  reparos: number;
  repDelta: number;
  porArq: Record<string, { n: number; soma: number }>;
  avisos: Aviso[];
  avisoN: number;
  fechada: boolean;
  fim: boolean;
};

export type Acao =
  | { tipo: "acomodar"; grupoId: number; mesaId: string }
  | { tipo: "anotar" | "buscar" | "servir" | "cobrar" | "limpar"; mesaId: string };

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const arqDe = (ctx: Ctx, slug: string) => ctx.arquetipos.find((a) => a.slug === slug);

export const liberados = (arqs: Arquetipo[], reputacao: number, nivel: number) =>
  arqs.filter((a) => reputacao >= a.unlock.reputacao && nivel >= a.unlock.nivel);

// ---------- chegadas ----------

/** Agenda a noite inteira de uma vez: quem chega, quando, com quem e o que vai pedir. Só depende da seed. */
export function criarNoite(ctx: Ctx): NoiteEstado {
  const c = TAVERNA.chegadas;
  const r = (rot: string | number) => sortear(ctx.seed, ctx.noite, rot);
  const abertos = liberados(ctx.arquetipos, ctx.reputacao, ctx.nivel);
  const maiorMesa = ctx.attr.mesas.reduce((m, x) => Math.max(m, x.lugares), 1);
  const maxTam = Math.max(1, Math.min(c.grupoMaxPorNivel[clamp(ctx.nivel, 1, 5) - 1], maiorMesa));
  const tamanhos = [1, 2, 3, 4].filter((n) => n <= maxTam);
  const pesosTam = tamanhos.map((n) => c.pesoTamanho[n - 1]);
  const total = Math.max(1, Math.round(c.gruposBase + ctx.nivel * c.gruposPorNivel + ctx.reputacao * c.gruposPorReputacao));
  const ultima = N.duracaoSeg * N.chegadasAteFracao;
  const receitas = Object.keys(ctx.attr.receitas);

  let cid = 0;
  const grupos: Grupo[] = [];
  for (let i = 0; i < total; i++) {
    const chegaEm = N.primeiraChegadaSeg + (ultima - N.primeiraChegadaSeg) * ((i + r(`t${i}`)) / total);
    const n = escolherPeso(tamanhos, pesosTam, r(`s${i}`));
    const clientes: Cliente[] = [];
    let primeiro = "";
    for (let k = 0; k < n && abertos.length > 0; k++) {
      const arq = k > 0 && r(`m${i}.${k}`) < c.chanceMesmoArquetipo ? primeiro : escolherPeso(abertos, abertos.map(() => 1), r(`a${i}.${k}`)).slug;
      if (k === 0) primeiro = arq;
      const def = arqDe(ctx, arq)!;
      const opcoes = def.orders.filter((o) => receitas.includes(o));
      const lista = opcoes.length > 0 ? opcoes : receitas;
      const pedido = lista[Math.min(lista.length - 1, Math.floor(r(`o${i}.${k}`) * lista.length))];
      clientes.push({ id: ++cid, arq, pedido, pac: def.patience, pacMax: def.patience, saiu: null, sat: 0 });
    }
    if (clientes.length > 0) grupos.push({ id: i + 1, chegaEm, clientes, fase: "agendado", mesaId: null, prontoEm: 0, retirado: false, comendoAte: 0, cobrarDesde: 0 });
  }

  const agentes: Agente[] = (["atendente", "garcom", "ajudante"] as Papel[]).filter((p) => ctx.attr.equipe[p]).map((papel) => ({ papel, ocupadoAte: 0 }));
  return {
    v: 1, noite: ctx.noite, t: 0, duracao: N.duracaoSeg, grupos,
    mesas: ctx.attr.mesas.map((m) => ({ id: m.id, suja: false, grupoId: null })),
    agentes, jogadorOcupadoAte: 0, combo: 0, seguidos: 0, servidos: 0, foram: 0, vendas: {}, ganhos: 0, gorjetas: 0, reparos: 0, repDelta: 0,
    porArq: {}, avisos: [], avisoN: 0, fechada: false, fim: false,
  };
}

// ---------- consultas ----------

const ativos = (g: Grupo) => g.clientes.filter((c) => c.saiu === null);
const mesaDe = (e: NoiteEstado, id: string | null) => e.mesas.find((m) => m.id === id);
const posDe = (ctx: Ctx, id: string | null) => ctx.attr.mesas.find((m) => m.id === id);
const urgencia = (g: Grupo) => Math.min(1, ...ativos(g).map((c) => c.pac / c.pacMax));

function mesaPronta(e: NoiteEstado, g: Grupo) {
  return g.fase === "pediu" && e.t >= g.prontoEm;
}

/** Próxima ação que um toque na mesa faz, ou null se ela está esperando (preparo, comida). */
export function proximaAcao(e: NoiteEstado, mesaId: string): { tipo: "anotar" | "buscar" | "servir" | "cobrar" | "limpar"; rotulo: string } | null {
  const m = mesaDe(e, mesaId);
  if (!m) return null;
  if (m.suja) return { tipo: "limpar", rotulo: "Limpar" };
  const g = e.grupos.find((x) => x.id === m.grupoId);
  if (!g) return null;
  if (g.fase === "sentado") return { tipo: "anotar", rotulo: "Anotar pedido" };
  if (g.fase === "pediu" && mesaPronta(e, g)) return g.retirado ? { tipo: "servir", rotulo: "Servir" } : { tipo: "buscar", rotulo: "Buscar no balcão" };
  if (g.fase === "cobrar") return { tipo: "cobrar", rotulo: "Cobrar" };
  return null;
}

export const gruposNaPorta = (e: NoiteEstado) => e.grupos.filter((g) => g.fase === "fila");

export const terminou = (e: NoiteEstado) => e.fim;

/** Quanto falta pra noite fechar (0 depois). */
export const restante = (e: NoiteEstado) => Math.max(0, e.duracao - e.t);

// ---------- efeitos ----------

function registrarAviso(e: NoiteEstado, tipo: Aviso["tipo"], grupoId: number, valor?: number) {
  e.avisos.push({ n: ++e.avisoN, t: e.t, tipo, grupoId, valor });
  if (e.avisos.length > 24) e.avisos.shift();
}

function fecharGrupoSeTodosSairam(e: NoiteEstado, g: Grupo) {
  if (ativos(g).length > 0) return;
  const m = mesaDe(e, g.mesaId);
  if (m && m.grupoId === g.id) {
    m.grupoId = null;
    m.suja = true;
  }
  g.fase = "fim";
}

function sairCliente(e: NoiteEstado, ctx: Ctx, g: Grupo, c: Cliente, motivo: Motivo) {
  c.saiu = motivo;
  const sentado = g.fase !== "fila";
  const conta = motivo !== "fechou" || sentado;
  if (conta) {
    e.foram++;
    e.repDelta -= TAVERNA.satisfacao.reputacaoPorFuga * (motivo === "recusou" || motivo === "fechou" ? 0.5 : 1);
    e.combo = 0;
    e.seguidos = 0;
  }
  if (motivo === "paciencia" && arqDe(ctx, c.arq)?.quirk.id === "quebra-cadeira" && sentado && !ctx.attr.seguranca) {
    e.reparos += TAVERNA.custoReparoCadeira;
    registrarAviso(e, "quebrou", g.id, TAVERNA.custoReparoCadeira);
  } else if (motivo === "fuga") registrarAviso(e, "fugiu", g.id);
  else if (motivo === "recusou") registrarAviso(e, "recusou", g.id);
  else if (conta) registrarAviso(e, "foi", g.id);
  fecharGrupoSeTodosSairam(e, g);
}

function maniaAtendida(e: NoiteEstado, ctx: Ctx, g: Grupo, c: Cliente): number {
  const q = arqDe(ctx, c.arq)?.quirk;
  const mesa = posDe(ctx, g.mesaId);
  if (!q || !mesa) return 1;
  if (q.id === "exige-conforto") return clamp(ctx.attr.conforto + mesa.conforto, 0, 1) >= Number(q.confortoMin) ? 1 : 0;
  if (q.id === "longe-de-barulho") {
    const dist = Number(q.distancia);
    for (const o of e.grupos) {
      if (o.id === g.id || o.fase === "agendado" || o.fase === "fila" || o.fase === "fim") continue;
      const om = posDe(ctx, o.mesaId);
      if (!om || Math.abs(om.x - mesa.x) + Math.abs(om.y - mesa.y) > dist) continue;
      if (ativos(o).some((x) => x.arq === "bardo" || x.arq === "barbaro")) return 0;
    }
  }
  return 1;
}

function cobrarGrupo(e: NoiteEstado, ctx: Ctx, g: Grupo) {
  const S = TAVERNA.satisfacao;
  const mesa = posDe(ctx, g.mesaId);
  const comboMult = 1 + Math.min(e.combo, TAVERNA.combo.max) * TAVERNA.combo.bonusPorPonto;
  for (const c of ativos(g)) {
    const r = ctx.attr.receitas[c.pedido];
    const arq = arqDe(ctx, c.arq);
    if (!r || !arq) continue;
    const valor = Math.round(r.preco * arq.spend);
    const conforto = clamp(ctx.attr.conforto + (mesa?.conforto ?? 0), 0, 1);
    c.sat = clamp(
      S.pesos.rapidez * clamp(c.pac / c.pacMax, 0, 1) + S.pesos.qualidade * r.satisfacao + S.pesos.conforto * conforto + S.pesos.manias * maniaAtendida(e, ctx, g, c) + ctx.attr.satisfacaoBonus,
      0,
      1,
    );
    const gorjeta = c.sat >= S.gorjetaMinSat ? Math.round(valor * arq.tip * c.sat * comboMult) : 0;
    e.servidos++;
    e.vendas[c.pedido] = (e.vendas[c.pedido] ?? 0) + 1;
    e.ganhos += valor;
    e.gorjetas += gorjeta;
    e.repDelta += (c.sat - S.pontoNeutro) * S.reputacaoPorCliente + ctx.attr.reputacaoBonus + (arq.quirk.id === "bonus-reputacao" ? Number(arq.quirk.bonus) : 0);
    const a = (e.porArq[c.arq] ??= { n: 0, soma: 0 });
    a.n++;
    a.soma += c.sat;
    c.saiu = "pago";
    registrarAviso(e, "pago", g.id, valor + gorjeta);
  }
  const m = mesaDe(e, g.mesaId);
  if (m) {
    m.grupoId = null;
    m.suja = true;
  }
  g.fase = "fim";
}

// ---------- ações ----------

const duracaoDe = (tipo: string) => TAVERNA.tempoAcao[tipo] ?? 1;

/** Aplica a ação no estado (mutando). Devolve uma mensagem de erro, ou null se deu certo. */
function aplicar(e: NoiteEstado, ctx: Ctx, a: Acao): string | null {
  if (a.tipo === "acomodar") {
    const g = e.grupos.find((x) => x.id === a.grupoId);
    const m = mesaDe(e, a.mesaId);
    const lugares = posDe(ctx, a.mesaId)?.lugares ?? 0;
    if (!g || g.fase !== "fila") return "Esse grupo não está na porta.";
    if (!m || m.suja || m.grupoId !== null) return "Essa mesa não está livre.";
    if (lugares < ativos(g).length) return "O grupo não cabe nessa mesa.";
    g.fase = "sentado";
    g.mesaId = m.id;
    m.grupoId = g.id;
    return null;
  }
  const m = mesaDe(e, a.mesaId);
  if (!m) return "Mesa não encontrada.";
  if (a.tipo === "limpar") {
    if (!m.suja) return "A mesa já está limpa.";
    m.suja = false;
    return null;
  }
  const g = e.grupos.find((x) => x.id === m.grupoId);
  if (!g) return "Não tem ninguém nessa mesa.";

  if (a.tipo === "anotar") {
    if (g.fase !== "sentado") return "Esse pedido já foi anotado.";
    for (const c of [...ativos(g)]) {
      const q = arqDe(ctx, c.arq)?.quirk;
      if (q?.id === "so-cerveja-boa" && c.pedido === "cerveja" && (ctx.attr.receitas.cerveja?.nivel ?? 0) < Number(q.nivelMin)) sairCliente(e, ctx, g, c, "recusou");
    }
    if ((g.fase as FaseGrupo) === "fim") return null;
    const coz = ctx.attr.equipe.cozinheiro?.velocidade ?? 1;
    const prep = Math.max(0, ...ativos(g).map((c) => (ctx.attr.receitas[c.pedido]?.prep ?? 0) / coz));
    g.fase = "pediu";
    g.prontoEm = e.t + prep;
    g.retirado = false;
    return null;
  }
  if (a.tipo === "buscar") {
    if (!mesaPronta(e, g)) return "O pedido ainda não ficou pronto.";
    if (g.retirado) return "Esse pedido já está com você.";
    g.retirado = true;
    return null;
  }
  if (a.tipo === "servir") {
    if (g.fase !== "pediu" || !g.retirado) return "Busque o pedido no balcão antes.";
    const pedidos = ativos(g).map((c) => c.pedido);
    if (new Set(pedidos).size < pedidos.length) e.combo += TAVERNA.combo.porPedidoIgual;
    if (e.seguidos > 0) e.combo += TAVERNA.combo.porGrupoSeguido;
    e.seguidos++;
    e.combo = Math.min(e.combo, TAVERNA.combo.max);
    g.fase = "comendo";
    g.comendoAte = e.t + N.comerSeg;
    return null;
  }
  if (g.fase !== "cobrar") return "Ainda não dá pra cobrar.";
  cobrarGrupo(e, ctx, g);
  return null;
}

/** Ação do tripulante. Só vale se ele não estiver ocupado com outra. */
export function agir(e: NoiteEstado, ctx: Ctx, a: Acao): { estado: NoiteEstado; erro: string | null } {
  if (e.fim) return { estado: e, erro: "A noite acabou." };
  if (e.t < e.jogadorOcupadoAte) return { estado: e, erro: "Você ainda está ocupado." };
  const novo = structuredClone(e);
  const erro = aplicar(novo, ctx, a);
  if (erro) return { estado: e, erro };
  novo.jogadorOcupadoAte = novo.t + duracaoDe(a.tipo);
  return { estado: novo, erro: null };
}

// ---------- funcionários ----------

function escolherMesaLivre(e: NoiteEstado, ctx: Ctx, g: Grupo): string | null {
  const n = ativos(g).length;
  const livres = ctx.attr.mesas.filter((m) => {
    const es = mesaDe(e, m.id);
    return es && !es.suja && es.grupoId === null && m.lugares >= n;
  });
  if (livres.length === 0) return null;
  const querSilencio = ativos(g).some((c) => arqDe(ctx, c.arq)?.quirk.id === "longe-de-barulho");
  const barulhentas = querSilencio
    ? e.grupos.filter((o) => o.mesaId && o.fase !== "fim" && ativos(o).some((c) => c.arq === "bardo" || c.arq === "barbaro")).map((o) => posDe(ctx, o.mesaId)!).filter(Boolean)
    : [];
  const folga = (m: (typeof livres)[number]) => (barulhentas.length ? Math.min(...barulhentas.map((b) => Math.abs(b.x - m.x) + Math.abs(b.y - m.y))) : 0);
  livres.sort((a, b) => folga(b) - folga(a) || a.lugares - b.lugares);
  return livres[0].id;
}

function trabalhar(e: NoiteEstado, ctx: Ctx, ag: Agente) {
  const vel = ctx.attr.equipe[ag.papel]?.velocidade ?? 1;
  type Tarefa = { urg: number; fazer: () => number };
  const tarefas: Tarefa[] = [];

  if (ag.papel === "atendente") {
    for (const g of e.grupos.filter((x) => x.fase === "fila")) {
      const mesaId = escolherMesaLivre(e, ctx, g);
      if (mesaId) tarefas.push({ urg: urgencia(g), fazer: () => (aplicar(e, ctx, { tipo: "acomodar", grupoId: g.id, mesaId }), duracaoDe("acomodar")) });
    }
    for (const g of e.grupos.filter((x) => x.fase === "sentado" && x.mesaId)) {
      tarefas.push({ urg: urgencia(g), fazer: () => (aplicar(e, ctx, { tipo: "anotar", mesaId: g.mesaId! }), duracaoDe("anotar")) });
    }
  } else if (ag.papel === "garcom") {
    for (const g of e.grupos.filter((x) => mesaPronta(e, x) && x.mesaId)) {
      tarefas.push({
        urg: urgencia(g),
        fazer: () => {
          if (!g.retirado) aplicar(e, ctx, { tipo: "buscar", mesaId: g.mesaId! });
          aplicar(e, ctx, { tipo: "servir", mesaId: g.mesaId! });
          return duracaoDe("buscar") + duracaoDe("servir");
        },
      });
    }
  } else if (ag.papel === "ajudante") {
    for (const m of e.mesas.filter((x) => x.suja)) tarefas.push({ urg: 1, fazer: () => (aplicar(e, ctx, { tipo: "limpar", mesaId: m.id }), duracaoDe("limpar")) });
  }

  if (tarefas.length === 0) return;
  tarefas.sort((a, b) => a.urg - b.urg);
  ag.ocupadoAte = e.t + tarefas[0].fazer() / vel;
}

// ---------- tempo ----------

function ritmo(e: NoiteEstado, ctx: Ctx, g: Grupo, c: Cliente, bardoNoSalao: boolean) {
  let k = 1;
  if (ctx.tranquila) k *= TAVERNA.paciencia.tranquilaMult;
  if (g.fase !== "fila") k *= ctx.attr.pacienciaMult;
  if (bardoNoSalao && c.arq !== "bardo") k *= TAVERNA.paciencia.bardoClienteMult;
  k *= ctx.attr.bardoCasaMult;
  if (c.arq === "barbaro" && ctx.attr.seguranca) k *= TAVERNA.paciencia.segurancaBarbaroMult;
  return k;
}

function subpasso(e: NoiteEstado, ctx: Ctx, dt: number) {
  e.t += dt;

  for (const g of e.grupos) if (g.fase === "agendado" && g.chegaEm <= e.t && !e.fechada) g.fase = "fila";
  for (const g of e.grupos) {
    if (g.fase === "comendo" && e.t >= g.comendoAte) {
      g.fase = "cobrar";
      g.cobrarDesde = e.t;
    }
  }

  for (const ag of e.agentes) if (ag.ocupadoAte <= e.t) trabalhar(e, ctx, ag);

  const bardoNoSalao = e.grupos.some((g) => g.fase !== "agendado" && g.fase !== "fila" && g.fase !== "fim" && ativos(g).some((c) => c.arq === "bardo"));
  for (const g of e.grupos) {
    if (g.fase === "agendado" || g.fase === "fim") continue;
    for (const c of [...ativos(g)]) {
      if (g.fase === "comendo") continue;
      c.pac -= dt * ritmo(e, ctx, g, c, bardoNoSalao);
      if (c.pac <= 0) {
        c.pac = 0;
        sairCliente(e, ctx, g, c, "paciencia");
      } else if (g.fase === "cobrar" && c.arq === "ladino" && !ctx.attr.seguranca && e.t - g.cobrarDesde > N.ladinoToleranciaSeg) {
        sairCliente(e, ctx, g, c, "fuga");
      }
    }
  }

  if (!e.fechada && e.t >= e.duracao) {
    e.fechada = true;
    for (const g of e.grupos) {
      if (g.fase === "agendado") g.fase = "fim";
      else if (g.fase === "fila") for (const c of [...ativos(g)]) sairCliente(e, ctx, g, c, "fechou");
    }
  }
  if (e.fechada) {
    const dentro = e.grupos.some((g) => g.fase !== "fim");
    if (!dentro) e.fim = true;
    else if (e.t >= e.duracao + N.gracaFechamentoSeg) {
      for (const g of e.grupos) if (g.fase !== "fim") for (const c of [...ativos(g)]) sairCliente(e, ctx, g, c, "fechou");
      e.fim = true;
    }
  }
}

/** Avança o relógio da noite `dt` segundos, em passos fixos (o resultado não depende da taxa de quadros). */
export function passo(e: NoiteEstado, ctx: Ctx, dt: number): NoiteEstado {
  if (e.fim || dt <= 0) return e;
  const novo = structuredClone(e);
  let resto = dt;
  while (resto > 1e-9 && !novo.fim) {
    const d = Math.min(N.passoSeg, resto);
    subpasso(novo, ctx, d);
    resto -= d;
  }
  return novo;
}

export function resumoDaNoite(e: NoiteEstado, ctx: Ctx): ResumoNoite {
  const porArquetipo: ResumoNoite["porArquetipo"] = {};
  for (const [slug, v] of Object.entries(e.porArq)) porArquetipo[slug] = { n: v.n, sat: Math.round((v.soma / v.n) * 1000) / 1000 };
  const max = TAVERNA.satisfacao.reputacaoNoiteMax;
  return {
    noite: e.noite,
    servidos: e.servidos,
    foram: e.foram,
    vendas: { ...e.vendas },
    ganhos: e.ganhos,
    gorjetas: e.gorjetas,
    reparos: e.reparos,
    repDelta: Math.round(clamp(e.repDelta, -max, max) * 100) / 100,
    porArquetipo,
    tranquila: ctx.tranquila,
  };
}

/** Arquétipo mais satisfeito (média de satisfação, com ao menos um cliente atendido). */
export function melhorArquetipo(porArquetipo: ResumoNoite["porArquetipo"]): string | null {
  let melhor: string | null = null;
  let nota = -1;
  for (const [slug, v] of Object.entries(porArquetipo).sort(([a], [b]) => a.localeCompare(b))) {
    if (v.n > 0 && v.sat > nota) {
      nota = v.sat;
      melhor = slug;
    }
  }
  return melhor;
}
