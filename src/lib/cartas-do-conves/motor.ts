// Motor da travessia: TypeScript puro e determinístico (sem React, sem rede, sem Math.random).
// Mesma seed + mesmo ofício + mesma lista de ações = mesmo resultado, no navegador e no servidor.
// Cada ação passa por aplicar(): ou devolve o novo estado, ou um código de erro e o estado fica como estava.

import { CONFIG } from "./config";
import { CONTEUDO, inimigoDe } from "./conteudo";
import { acharNo, gerarMapa, proximosNos } from "./mapa";
import { embaralhar, escolherPeso, inteiroEntre, sortear } from "./rng";
import type { Acao, Carta, Combate, Conteudo, Efeito, ErroAcao, EfeitoEvento, Estado, Gatilho, InimigoEmCampo, Intencao, Resumo, Status } from "./tipos";

export type Resultado = { ok: true; estado: Estado } | { ok: false; erro: ErroAcao };

// ---------- Consultas (a UI também usa) ----------

/** A carta precisa de um inimigo como alvo? (dano em um inimigo ou status "no alvo") */
export function precisaAlvo(c: Carta): boolean {
  return c.efeitos.some((e) => e.tipo === "dano" || (e.tipo === "status" && (e.em === undefined || e.em === "inimigo")));
}

export const vivo = (i: InimigoEmCampo) => i.folego > 0;

/** A intenção que o inimigo vai executar no fim deste turno. Ele a mostra antes de o jogador agir. */
export function intencaoDe(i: InimigoEmCampo, C: Conteudo = CONTEUDO): Intencao {
  const ciclo = inimigoDe(C, i.slug).ciclo;
  return ciclo[i.passo % ciclo.length];
}

/** Cartas que podem aparecer de recompensa, na loja e em eventos: as iniciais e as liberadas na conta. */
export function reservaDe(e: Pick<Estado, "colecao">, C: Conteudo = CONTEUDO): Carta[] {
  return C.listaCartas.filter((c) => c.liberacao.tipo === "inicio" || e.colecao.includes(c.slug));
}

export function resumir(e: Estado): Resumo {
  return { resultado: e.resultado, trecho: e.trechoMax, oficio: e.oficio, derrotados: [...e.derrotados], jogadas: { ...e.jogadas } };
}

// ---------- Começo ----------

export function novaPartida(seed: string, oficioId: string, colecao: string[] = [], C: Conteudo = CONTEUDO): Estado | null {
  const oficio = C.oficios.find((o) => o.id === oficioId);
  if (!oficio) return null;
  return {
    v: CONFIG.versaoEstado,
    seed,
    oficio: oficio.id,
    colecao: [...colecao],
    rngN: 0,
    folego: CONFIG.folegoInicial,
    folegoMax: CONFIG.folegoInicial,
    ouro: CONFIG.ouroInicial,
    baralho: [...oficio.baralho],
    reliquias: [],
    mapa: gerarMapa(seed),
    trecho: 1,
    trechoMax: 1,
    pos: null,
    visitados: [],
    fase: "mapa",
    combate: null,
    recompensa: null,
    evento: null,
    porto: null,
    eventosVistos: [],
    derrotados: [],
    jogadas: {},
    resultado: "andamento",
    passos: 0,
  };
}

// ---------- Auxiliares internos ----------

const rn = (e: Estado, rotulo: string) => () => sortear(e.seed, e.rngN++, rotulo);

function gatilhos(e: Estado, C: Conteudo, g: Gatilho): Efeito[] {
  const out: Efeito[] = [];
  const oficio = C.oficios.find((o) => o.id === e.oficio);
  if (oficio && oficio.passiva.gatilho === g) out.push(...oficio.passiva.efeitos);
  for (const slug of e.reliquias) {
    const rel = C.reliquias[slug];
    if (rel && rel.gatilho === g) out.push(...rel.efeitos);
  }
  return out;
}

function danoAoInimigo(i: InimigoEmCampo, valor: number) {
  const v = (i.status.encharcado ?? 0) > 0 ? Math.floor(valor * CONFIG.status.encharcadoMult) : valor;
  const absorvido = Math.min(i.bloqueio, v);
  i.bloqueio -= absorvido;
  i.folego = Math.max(0, i.folego - (v - absorvido));
}

function somar(s: Status, k: keyof Status, v: number) {
  s[k] = (s[k] ?? 0) + v;
}

function comprarCartas(e: Estado, n: number) {
  const c = e.combate!;
  const r = rn(e, "reembaralhar");
  for (let k = 0; k < n; k++) {
    if (c.mao.length >= CONFIG.maoMax) break;
    if (c.compra.length === 0) {
      if (c.descarte.length === 0) break;
      c.compra = embaralhar(c.descarte, r);
      c.descarte = [];
    }
    c.mao.push(c.compra.shift()!);
  }
}

function curar(e: Estado, v: number) {
  e.folego = Math.min(e.folegoMax, e.folego + v);
}

function efeito(e: Estado, ef: Efeito, alvo: number | null) {
  const c = e.combate;
  switch (ef.tipo) {
    case "dano": {
      const t = alvo === null ? undefined : c?.inimigos[alvo];
      for (let k = 0; k < (ef.vezes ?? 1) && t && vivo(t); k++) danoAoInimigo(t, ef.valor);
      break;
    }
    case "dano_todos":
      c?.inimigos.filter(vivo).forEach((i) => danoAoInimigo(i, ef.valor));
      break;
    case "bloqueio":
      if (c) c.bloqueio += ef.valor + (c.status.firme ?? 0);
      break;
    case "curar":
      curar(e, ef.valor);
      break;
    case "comprar":
      if (c) comprarCartas(e, ef.valor);
      break;
    case "energia":
      if (c) c.energia += ef.valor;
      break;
    case "status": {
      if (!c) break;
      if (ef.em === "si") somar(c.status, ef.status, ef.valor);
      else if (ef.em === "todos") c.inimigos.filter(vivo).forEach((i) => somar(i.status, ef.status, ef.valor));
      else if (alvo !== null && c.inimigos[alvo] && vivo(c.inimigos[alvo])) somar(c.inimigos[alvo].status, ef.status, ef.valor);
      break;
    }
    case "folego_max":
      e.folegoMax += ef.valor;
      e.folego += ef.valor;
      break;
  }
}

function sortearCartas(e: Estado, C: Conteudo, n: number, rotulo: string): string[] {
  const r = rn(e, rotulo);
  const reserva = reservaDe(e, C);
  const pesos = CONFIG.recompensa.pesosRaridade[Math.min(e.trecho, CONFIG.trechos)];
  const raridades = ["comum", "incomum", "rara"] as const;
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const rar = escolherPeso([...raridades], raridades.map((x) => pesos[x]), r());
    let cand = reserva.filter((c) => c.raridade === rar && !out.includes(c.slug));
    if (cand.length === 0) cand = reserva.filter((c) => !out.includes(c.slug));
    if (cand.length === 0) break;
    out.push(cand[Math.floor(r() * cand.length)].slug);
  }
  return out;
}

function pegarReliquia(e: Estado, C: Conteudo, slug: string) {
  e.reliquias.push(slug);
  for (const ef of C.reliquias[slug].efeitos) if (C.reliquias[slug].gatilho === "ao_pegar") efeito(e, ef, null);
}

/** Dá uma relíquia que ainda não tem. Sem relíquia sobrando, devolve ouro no lugar. */
function relicariaAleatoria(e: Estado, C: Conteudo, rotulo: string) {
  const faltam = C.listaReliquias.filter((r) => !e.reliquias.includes(r.slug));
  if (faltam.length === 0) {
    e.ouro += CONFIG.tesouro.semReliquiaOuro;
    return;
  }
  const r = rn(e, rotulo);
  pegarReliquia(e, C, faltam[Math.floor(r() * faltam.length)].slug);
}

function derrota(e: Estado) {
  e.resultado = "derrota";
  e.fase = "fim";
}

function concluirNo(e: Estado) {
  const no = e.pos ? acharNo(e.mapa, e.pos) : null;
  e.evento = null;
  e.porto = null;
  e.recompensa = null;
  e.fase = "mapa";
  if (no && no.camada === CONFIG.mapa.camadas - 1) {
    e.trecho += 1;
    e.trechoMax = Math.max(e.trechoMax, e.trecho);
    e.pos = null;
  }
}

// ---------- Combate ----------

function iniciarCombate(e: Estado, C: Conteudo, noId: string, slugs: string[], chefe: boolean) {
  const r = rn(e, "embaralhar");
  e.combate = {
    no: noId,
    chefe,
    turno: 0,
    energia: 0,
    bloqueio: 0,
    status: {},
    mao: [],
    compra: embaralhar(e.baralho, r),
    descarte: [],
    exaurida: [],
    inimigos: slugs.map((s) => {
      const d = inimigoDe(C, s);
      return { slug: s, folego: d.folego, folegoMax: d.folego, bloqueio: 0, status: {}, passo: 0 };
    }),
  };
  e.fase = "combate";
  iniciarTurno(e, C);
}

function iniciarTurno(e: Estado, C: Conteudo) {
  const c = e.combate!;
  c.turno += 1;
  c.bloqueio = 0;
  c.energia = Math.max(0, CONFIG.energiaPorTurno - ((c.status.enjoado ?? 0) > 0 ? CONFIG.status.enjoadoEnergia : 0));
  comprarCartas(e, CONFIG.maoInicial);
  if (c.turno === 1) for (const ef of gatilhos(e, C, "inicio_combate")) efeito(e, ef, null);
  for (const ef of gatilhos(e, C, "inicio_turno")) efeito(e, ef, null);
}

function faseDosInimigos(e: Estado) {
  const c = e.combate!;
  const novos = new Set<string>();
  for (const i of c.inimigos.filter(vivo)) {
    i.bloqueio = 0;
    const it = intencaoDe(i);
    if (it.tipo === "atacar") {
      for (let k = 0; k < (it.vezes ?? 1); k++) {
        let v = it.valor;
        if ((i.status.enjoado ?? 0) > 0) v = Math.floor(v * CONFIG.status.enjoadoInimigoMult);
        if ((c.status.encharcado ?? 0) > 0) v = Math.floor(v * CONFIG.status.encharcadoMult);
        const absorvido = Math.min(c.bloqueio, v);
        c.bloqueio -= absorvido;
        e.folego -= v - absorvido;
      }
      if (e.folego <= 0) {
        e.folego = 0;
        derrota(e);
        return;
      }
    } else if (it.tipo === "defender") {
      i.bloqueio += it.valor + (i.status.firme ?? 0);
    } else {
      somar(c.status, it.status, it.valor);
      novos.add(it.status);
    }
    i.passo += 1;
  }
  // Os status passam 1 rodada. Os que o inimigo acabou de aplicar em você só começam a contar na rodada seguinte.
  for (const k of Object.keys(c.status) as (keyof Status)[]) {
    if (novos.has(k)) continue;
    c.status[k] = (c.status[k] ?? 0) - 1;
    if ((c.status[k] ?? 0) <= 0) delete c.status[k];
  }
  for (const i of c.inimigos.filter(vivo)) {
    for (const k of Object.keys(i.status) as (keyof Status)[]) {
      i.status[k] = (i.status[k] ?? 0) - 1;
      if ((i.status[k] ?? 0) <= 0) delete i.status[k];
    }
  }
}

function vencerCombate(e: Estado, C: Conteudo) {
  const c = e.combate!;
  for (const i of c.inimigos) if (!e.derrotados.includes(i.slug)) e.derrotados.push(i.slug);
  for (const ef of gatilhos(e, C, "fim_combate")) efeito(e, ef, null);
  const chefe = c.chefe;
  const r = rn(e, "ouro");
  const ouro = c.inimigos.reduce((s, i) => {
    const [a, b] = inimigoDe(C, i.slug).ouro;
    return s + inteiroEntre(r, a, b);
  }, 0);
  e.ouro += ouro;
  e.combate = null;
  if (chefe) {
    e.resultado = "vitoria";
    e.fase = "fim";
    return;
  }
  e.recompensa = { ouro, opcoes: sortearCartas(e, C, CONFIG.recompensa.opcoes, "recompensa") };
  e.fase = "recompensa";
}

// ---------- Nós do mapa ----------

function entrarNo(e: Estado, C: Conteudo, id: string) {
  const no = acharNo(e.mapa, id)!;
  e.pos = id;
  e.visitados.push(id);
  const r = rn(e, `no:${id}`);
  switch (no.tipo) {
    case "encontro": {
      const opcoes = C.encontros.filter((x) => x.trecho === e.trecho);
      const enc = escolherPeso(opcoes, opcoes.map((x) => x.peso), r());
      iniciarCombate(e, C, id, enc.inimigos, false);
      break;
    }
    case "chefe":
      iniciarCombate(e, C, id, [C.chefe.slug], true);
      break;
    case "evento": {
      const novos = C.eventos.filter((x) => !e.eventosVistos.includes(x.slug));
      const lista = novos.length ? novos : C.eventos;
      const ev = lista[Math.floor(r() * lista.length)];
      e.eventosVistos.push(ev.slug);
      e.evento = ev.slug;
      e.fase = "evento";
      break;
    }
    case "porto": {
      const loja = sortearCartas(e, C, CONFIG.porto.lojaCartas, "loja").map((slug) => ({ slug, preco: CONFIG.porto.precos[C.cartas[slug].raridade], vendido: false }));
      e.porto = { loja, curou: false, removeu: false };
      e.fase = "porto";
      break;
    }
    case "tesouro":
      e.fase = "tesouro";
      break;
  }
}

function efeitoDeEvento(e: Estado, C: Conteudo, ef: EfeitoEvento) {
  if (ef.tipo === "folego") {
    if (ef.valor >= 0) curar(e, ef.valor);
    else e.folego = Math.max(0, e.folego + ef.valor);
  } else if (ef.tipo === "ouro") e.ouro = Math.max(0, e.ouro + ef.valor);
  else if (ef.tipo === "carta_aleatoria") e.baralho.push(...sortearCartas(e, C, 1, "evento-carta"));
  else relicariaAleatoria(e, C, "evento-reliquia");
}

// ---------- A ação ----------

const inteiro = (n: unknown): n is number => Number.isInteger(n);

function executar(e: Estado, a: Acao, C: Conteudo): ErroAcao | null {
  if (e.resultado !== "andamento") return "partida_encerrada";
  if (e.passos >= CONFIG.maxAcoes) return "limite_de_acoes";

  switch (a.t) {
    case "no": {
      if (e.fase !== "mapa") return "fase_errada";
      if (typeof a.id !== "string" || !proximosNos(e.mapa, e.trecho, e.pos).some((n) => n.id === a.id)) return "no_invalido";
      entrarNo(e, C, a.id);
      break;
    }
    case "jogar": {
      if (e.fase !== "combate" || !e.combate) return "fase_errada";
      const c = e.combate;
      if (!inteiro(a.c) || a.c < 0 || a.c >= c.mao.length) return "carta_invalida";
      const carta = C.cartas[c.mao[a.c]];
      if (!carta) return "carta_invalida";
      if (carta.custo > c.energia) return "sem_energia";
      let alvo: number | null = null;
      if (precisaAlvo(carta)) {
        if (!inteiro(a.a) || a.a < 0 || a.a >= c.inimigos.length || !vivo(c.inimigos[a.a])) return "alvo_invalido";
        alvo = a.a;
      }
      c.energia -= carta.custo;
      c.mao.splice(a.c, 1);
      e.jogadas[carta.slug] = (e.jogadas[carta.slug] ?? 0) + 1;
      for (const ef of carta.efeitos) efeito(e, ef, alvo);
      (carta.exaurir ? c.exaurida : c.descarte).push(carta.slug);
      if (c.inimigos.every((i) => !vivo(i))) vencerCombate(e, C);
      break;
    }
    case "fim": {
      if (e.fase !== "combate" || !e.combate) return "fase_errada";
      const c = e.combate;
      c.descarte.push(...c.mao);
      c.mao = [];
      faseDosInimigos(e);
      if (e.resultado === "andamento") iniciarTurno(e, C);
      break;
    }
    case "escolher": {
      if (e.fase !== "recompensa" || !e.recompensa) return "fase_errada";
      if (a.i !== null) {
        if (!inteiro(a.i) || a.i < 0 || a.i >= e.recompensa.opcoes.length) return "escolha_invalida";
        e.baralho.push(e.recompensa.opcoes[a.i]);
      }
      concluirNo(e);
      break;
    }
    case "evento": {
      if (e.fase !== "evento" || !e.evento) return "fase_errada";
      const ev = C.eventos.find((x) => x.slug === e.evento)!;
      if (!inteiro(a.i) || a.i < 0 || a.i >= ev.escolhas.length) return "escolha_invalida";
      const esc = ev.escolhas[a.i];
      if (esc.exige && e.ouro < esc.exige.ouro) return "sem_ouro";
      for (const ef of esc.efeitos) efeitoDeEvento(e, C, ef);
      if (e.folego <= 0) {
        derrota(e);
        break;
      }
      concluirNo(e);
      break;
    }
    case "curar": {
      if (e.fase !== "porto" || !e.porto) return "fase_errada";
      if (e.porto.curou) return "ja_feito";
      e.porto.curou = true;
      curar(e, Math.ceil(e.folegoMax * CONFIG.porto.curarFracao));
      break;
    }
    case "comprar": {
      if (e.fase !== "porto" || !e.porto) return "fase_errada";
      const item = inteiro(a.i) ? e.porto.loja[a.i] : undefined;
      if (!item || item.vendido) return "escolha_invalida";
      if (e.ouro < item.preco) return "sem_ouro";
      e.ouro -= item.preco;
      item.vendido = true;
      e.baralho.push(item.slug);
      break;
    }
    case "remover": {
      if (e.fase !== "porto" || !e.porto) return "fase_errada";
      if (e.porto.removeu) return "ja_feito";
      if (!inteiro(a.c) || a.c < 0 || a.c >= e.baralho.length) return "carta_invalida";
      if (e.baralho.length <= CONFIG.baralhoMinimo) return "baralho_minimo";
      if (e.ouro < CONFIG.porto.remover) return "sem_ouro";
      e.ouro -= CONFIG.porto.remover;
      e.baralho.splice(a.c, 1);
      e.porto.removeu = true;
      break;
    }
    case "sair": {
      if (e.fase !== "porto") return "fase_errada";
      concluirNo(e);
      break;
    }
    case "abrir": {
      if (e.fase !== "tesouro") return "fase_errada";
      const r = rn(e, "tesouro");
      e.ouro += inteiroEntre(r, CONFIG.tesouro.ouro[0], CONFIG.tesouro.ouro[1]);
      relicariaAleatoria(e, C, "tesouro-reliquia");
      concluirNo(e);
      break;
    }
    default:
      return "acao_desconhecida";
  }
  e.passos += 1;
  return null;
}

/** Aplica uma ação. Nunca muda o estado recebido. */
export function aplicar(estado: Estado, acao: Acao, C: Conteudo = CONTEUDO): Resultado {
  const e = structuredClone(estado);
  const erro = executar(e, acao, C);
  return erro ? { ok: false, erro } : { ok: true, estado: e };
}

export type { Combate };
