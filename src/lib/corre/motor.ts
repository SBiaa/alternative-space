// Simulação do O Corre: lógica pura. reduzir(estado, ação) devolve um estado novo e nunca mexe no antigo.
// Toda aleatoriedade sai de sortear(seed, dia, passo), então a mesma seed reproduz o mesmo dia.

import {
  bairroPorId,
  CORRE,
  eventoPorId,
  lugarPorId,
  restaurantePorId,
  texto,
  totalContas,
  type Efeito,
  type EventoViagem,
  type Peca,
} from "./config";
import { sortear } from "./rng";

export type Moto = Record<Peca, number>;
export type Oferta = {
  id: string;
  restaurante: string;
  destino: string;
  km: number;
  valor: number;
  bonusChuva: number;
  bonusPico: number;
  prazo: number; // minutos a partir do aceite
  expira: number; // minuto do dia
  premium: boolean;
};
export type Viagem = {
  tipo: "entrega" | "servico" | "casa";
  pontos: string[]; // bairros do caminho
  km: number;
  duracao: number;
  decorrido: number;
  oferta?: Oferta;
  lugar?: string;
  evento?: { id: string; em: number; resolvido: boolean };
  cancelada?: boolean;
};
export type Mensagem = { id: string; minuto: number; texto: string; tipo: "info" | "alerta" };
export type Fase = "casa" | "rodando" | "viagem" | "evento" | "resumoDia" | "resumoSemana";

export type ContagemDia = {
  dinheiroInicio: number;
  ganhos: number;
  gastos: number;
  guardado: number;
  entregas: number;
  noPrazo: number;
  atrasadas: number;
  recusadas: number;
  canceladas: number;
  km: number;
};
export type ResumoDia = {
  dia: number;
  ganhos: number;
  gastos: number;
  saldo: number;
  entregas: number;
  noPrazo: number;
  atrasadas: number;
  recusadas: number;
  avaliacao: number;
  cansaco: number;
  moto: Moto;
  combustivel: number;
  motivo: "casa" | "cansaco" | "meiaNoite";
  ritmoTranquilo: boolean;
};
export type ResumoSemana = {
  semana: number;
  contas: { id: string; nome: string; valor: number }[];
  dividaAnterior: number;
  totalCobrado: number;
  pago: number;
  divida: number;
  contasPagas: boolean;
  saldo: number;
  guardadoSemana: number;
  metaCumprida: boolean;
  progressoObjetivo: number; // %
};

export type Estado = {
  versao: number;
  seed: string;
  dia: number;
  semana: number;
  minuto: number;
  fase: Fase;
  passo: number;
  posicao: string;
  dinheiro: number;
  divida: number;
  combustivel: number;
  moto: Moto;
  modeloMoto: string;
  cansaco: number;
  avaliacao: number;
  aceitacao: number;
  objetivo: { id: string; guardado: number };
  clima: boolean[];
  oferta: Oferta | null;
  viagem: Viagem | null;
  evento: { id: string } | null;
  mensagens: Mensagem[];
  avisos: string[];
  diaAtual: ContagemDia;
  semanaAtual: { guardado: number };
  ritmoTranquilo: boolean;
  resumoDia: ResumoDia | null;
  resumoSemana: ResumoSemana | null;
  ultimoResultado: string | null;
};

export type Acao =
  | { tipo: "tick"; minutos: number }
  | { tipo: "sair" }
  | { tipo: "aceitar" }
  | { tipo: "recusar" }
  | { tipo: "escolher"; opcao: string }
  | { tipo: "irPara"; lugar: string }
  | { tipo: "voltarPraCasa" }
  | { tipo: "guardar"; valor: number }
  | { tipo: "ritmo"; ligado: boolean }
  | { tipo: "continuar" };

const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));
const arred1 = (v: number) => Math.round(v * 10) / 10;
export const diaDaSemana = (dia: number) => ((dia - 1) % CORRE.semana.diasTotal) + 1;
export const semanaDoDia = (dia: number) => Math.ceil(dia / CORRE.semana.diasTotal);

// ——— Funções puras de regra (testadas uma a uma) ———

export function distanciaKm(a: string, b: string): number {
  const p = bairroPorId(a);
  const q = bairroPorId(b);
  if (!p || !q || a === b) return a === b ? 0.6 : 0; // mesmo bairro ainda tem chão
  return arred1(Math.hypot(p.x - q.x, p.y - q.y) * CORRE.kmPorUnidade);
}

export function fatorMoto(moto: Moto): number {
  const { motoLimite, motoPenalidadeMax } = CORRE.viagem;
  const pior = Math.min(moto.pneu, moto.freio, moto.oleo);
  if (pior >= motoLimite) return 1;
  return 1 + ((motoLimite - pior) / motoLimite) * motoPenalidadeMax;
}

export function fatorCansaco(cansaco: number): number {
  const { cansacoLimite, cansacoPenalidadeMax } = CORRE.viagem;
  if (cansaco <= cansacoLimite) return 1;
  const x = (cansaco - cansacoLimite) / (100 - cansacoLimite);
  return 1 + x * x * cansacoPenalidadeMax;
}

/** Minutos rodando: distância × trânsito × chuva × moto × cansaço. */
export function tempoViagem(km: number, hora: number, chuva: boolean, moto: Moto, cansaco: number): number {
  const base = (km / CORRE.viagem.velocidadeKmH) * 60;
  return base * CORRE.viagem.transito(hora) * (chuva ? CORRE.viagem.fatorChuva : 1) * fatorMoto(moto) * fatorCansaco(cansaco);
}

export function desgastar(moto: Moto, km: number): Moto {
  const d = CORRE.moto.desgastePorKm;
  return { pneu: clamp(moto.pneu - d.pneu * km), freio: clamp(moto.freio - d.freio * km), oleo: clamp(moto.oleo - d.oleo * km) };
}

export function fatorOfertas(aceitacao: number): number {
  const m = CORRE.aceitacao.minimoFator;
  return m + (1 - m) * (clamp(aceitacao) / 100);
}

export const aceitar = (ac: number) => clamp(ac + (100 - ac) * CORRE.aceitacao.ganhoAceitar);
export const recusar = (ac: number, expirou = false) => clamp(ac - (expirou ? CORRE.aceitacao.perdaExpirar : CORRE.aceitacao.perdaRecusar));

export function chanceEvento(chuva: boolean, moto: Moto, cansaco: number): number {
  const ev = CORRE.eventos;
  const pior = Math.min(moto.pneu, moto.freio, moto.oleo);
  const motoRuim = pior < CORRE.viagem.motoLimite ? (CORRE.viagem.motoLimite - pior) / CORRE.viagem.motoLimite : 0;
  const cansado = cansaco > CORRE.viagem.cansacoLimite ? (cansaco - CORRE.viagem.cansacoLimite) / (100 - CORRE.viagem.cansacoLimite) : 0;
  return clamp(ev.chanceBase + (chuva ? ev.chanceChuva : 0) + motoRuim * ev.chanceMotoRuim + cansado * ev.chanceCansaco, 0, 0.9);
}

export function gerarClima(seed: string, dia: number): boolean[] {
  const clima = Array<boolean>(24).fill(false);
  if (sortear(seed, dia, "clima") < 0.45) {
    const inicio = 9 + Math.floor(sortear(seed, dia, "clima-inicio") * 12);
    const dur = 1 + Math.floor(sortear(seed, dia, "clima-dur") * 4);
    for (let h = inicio; h < Math.min(24, inicio + dur); h++) clima[h] = true;
  }
  return clima;
}

const ehPico = (hora: number) => CORRE.ofertas.horasPico.some(([a, b]) => hora >= a && hora < b);
const horaDe = (minuto: number) => Math.floor(minuto / 60) % 24;

// ——— Estado inicial e dia novo ———

const contagemZerada = (dinheiro: number): ContagemDia => ({
  dinheiroInicio: dinheiro,
  ganhos: 0,
  gastos: 0,
  guardado: 0,
  entregas: 0,
  noPrazo: 0,
  atrasadas: 0,
  recusadas: 0,
  canceladas: 0,
  km: 0,
});

export function criarEstado(seed: string): Estado {
  const e: Estado = {
    versao: CORRE.versaoSave,
    seed,
    dia: 1,
    semana: 1,
    minuto: CORRE.tempo.inicioDia,
    fase: "casa",
    passo: 0,
    posicao: CORRE.casa.bairro,
    dinheiro: CORRE.dinheiroInicial,
    divida: 0,
    combustivel: CORRE.moto.combustivelInicial,
    moto: { ...CORRE.moto.pecaInicial },
    modeloMoto: CORRE.moto.modeloInicial,
    cansaco: 0,
    avaliacao: CORRE.avaliacao.inicial,
    aceitacao: CORRE.aceitacao.inicial,
    objetivo: { id: CORRE.objetivo.id, guardado: 0 },
    clima: gerarClima(seed, 1),
    oferta: null,
    viagem: null,
    evento: null,
    mensagens: [],
    avisos: [],
    diaAtual: contagemZerada(CORRE.dinheiroInicial),
    semanaAtual: { guardado: 0 },
    ritmoTranquilo: false,
    resumoDia: null,
    resumoSemana: null,
    ultimoResultado: null,
  };
  mensagensDoDia(e);
  return e;
}

function mensagensDoDia(e: Estado) {
  avisar(e, CORRE.mensagens.boasVindas);
  const dds = diaDaSemana(e.dia);
  const total = totalContas() + Math.round(e.divida * (1 + CORRE.jurosDivida));
  const valor = (total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (dds === CORRE.semana.diasTrabalho - 2) avisar(e, texto(CORRE.mensagens.contaVencendo, valor), "alerta");
  if (dds === CORRE.semana.diasTrabalho - 1) avisar(e, texto(CORRE.mensagens.contaAmanha, valor), "alerta");
}

function novoDia(e: Estado, dia: number) {
  const depoisDaFolga = diaDaSemana(dia) === 1 && dia > 1;
  e.dia = dia;
  e.semana = semanaDoDia(dia);
  e.minuto = CORRE.tempo.inicioDia;
  e.fase = "casa";
  e.passo = 0;
  e.posicao = CORRE.casa.bairro;
  e.cansaco = depoisDaFolga ? 0 : clamp(e.cansaco - CORRE.cansaco.recuperaNoite);
  e.clima = gerarClima(e.seed, dia);
  e.oferta = null;
  e.viagem = null;
  e.evento = null;
  e.mensagens = [];
  e.avisos = [];
  e.diaAtual = contagemZerada(e.dinheiro);
  if (depoisDaFolga) e.semanaAtual = { guardado: 0 };
  e.resumoDia = null;
  e.resumoSemana = null;
  e.ultimoResultado = null;
  mensagensDoDia(e);
}

// ——— Auxiliares mutáveis (só dentro do rascunho do reduzir) ———

function rand(e: Estado) {
  return sortear(e.seed, e.dia, e.passo++);
}

function avisar(e: Estado, t: string, tipo: Mensagem["tipo"] = "info") {
  e.mensagens = [{ id: `${e.dia}-${e.minuto}-${e.mensagens.length}`, minuto: e.minuto, texto: t, tipo }, ...e.mensagens].slice(0, 30);
}

function avisarUmaVez(e: Estado, chave: string, t: string, tipo: Mensagem["tipo"] = "alerta") {
  if (e.avisos.includes(chave)) return;
  e.avisos.push(chave);
  avisar(e, t, tipo);
}

function gastar(e: Estado, valor: number) {
  valor = Math.max(0, Math.round(valor));
  e.dinheiro -= valor;
  e.diaAtual.gastos += valor;
}

function aplicarEfeito(e: Estado, ef: Efeito) {
  if (ef.custo) gastar(e, Math.min(ef.custo, Math.max(0, e.dinheiro)));
  if (ef.cansaco) e.cansaco = clamp(e.cansaco + ef.cansaco);
  if (ef.avaliacao) e.avaliacao = clamp(e.avaliacao - ef.avaliacao, 1, 5);
  if (ef.moto) for (const [p, v] of Object.entries(ef.moto) as [Peca, number][]) e.moto[p] = clamp(e.moto[p] + v);
  if (e.viagem) {
    if (ef.minutos) e.viagem.decorrido += ef.minutos;
    if (ef.cancela) e.viagem.cancelada = true;
  }
}

function checarMoto(e: Estado) {
  const m = CORRE.mensagens;
  if (e.moto.pneu < 30) avisarUmaVez(e, "pneu", texto(m.pneuBaixo, Math.round(e.moto.pneu)));
  if (e.moto.freio < 30) avisarUmaVez(e, "freio", texto(m.freioBaixo, Math.round(e.moto.freio)));
  if (e.moto.oleo < 30) avisarUmaVez(e, "oleo", texto(m.oleoBaixo, Math.round(e.moto.oleo)));
  if (e.combustivel < 20) avisarUmaVez(e, "combustivel", texto(m.combustivelBaixo, Math.round(e.combustivel)));
}

function rodarKm(e: Estado, km: number) {
  e.moto = desgastar(e.moto, km);
  e.combustivel = clamp(e.combustivel - km * CORRE.moto.consumoPorKm);
  e.diaAtual.km = arred1(e.diaAtual.km + km);
  checarMoto(e);
}

function gerarOferta(e: Estado): Oferta {
  const o = CORRE.ofertas;
  const hora = horaDe(e.minuto);
  const chuva = e.clima[hora];
  const rest = CORRE.restaurantes[Math.floor(rand(e) * CORRE.restaurantes.length)];
  const destinos = CORRE.bairros.filter((b) => b.id !== rest.bairro);
  const destino = destinos[Math.floor(rand(e) * destinos.length)];
  const km = arred1(distanciaKm(e.posicao, rest.bairro) + distanciaKm(rest.bairro, destino.id));
  const premium = e.avaliacao >= o.avaliacaoPremium && rand(e) < 0.4;
  const qualidade = 0.85 + (e.avaliacao - 3) * 0.1;
  const valor = Math.round(((o.valorBase + o.valorPorKm * km) * qualidade * (premium ? o.multPremium : 1)) / 10) * 10;
  const ideal = tempoViagem(km, hora, chuva, { pneu: 100, freio: 100, oleo: 100 }, 0) + CORRE.viagem.minutosColeta + CORRE.viagem.minutosEntregaPorta;
  return {
    id: `${e.dia}-${e.passo}`,
    restaurante: rest.id,
    destino: destino.id,
    km,
    valor,
    bonusChuva: chuva ? o.bonusChuva : 0,
    bonusPico: ehPico(hora) ? o.bonusPico : 0,
    prazo: Math.ceil(ideal * o.folgaPrazo),
    expira: e.minuto + (e.ritmoTranquilo ? o.janelaTranquilo : o.janelaMinutos),
    premium,
  };
}

function iniciarViagem(e: Estado, v: Omit<Viagem, "duracao" | "decorrido">, extraMin: number) {
  const hora = horaDe(e.minuto);
  const duracao = Math.ceil(tempoViagem(v.km, hora, e.clima[hora], e.moto, e.cansaco) + extraMin);
  e.viagem = { ...v, duracao, decorrido: 0 };
  rodarKm(e, v.km);
  e.fase = "viagem";
}

function chegar(e: Estado) {
  const v = e.viagem!;
  e.posicao = v.pontos[v.pontos.length - 1];
  e.viagem = null;
  e.fase = "rodando";
  if (v.tipo === "casa") return encerrarDia(e, "casa");
  if (v.tipo === "servico" && v.lugar) return servir(e, v.lugar);
  const o = v.oferta!;
  const rest = restaurantePorId(o.restaurante)?.nome ?? "";
  if (v.cancelada) {
    e.diaAtual.canceladas++;
    e.ultimoResultado = `Pedido de ${rest} não foi entregue. Sem pagamento.`;
    return;
  }
  const noPrazo = v.decorrido <= o.prazo;
  let ganho = o.valor + o.bonusChuva + o.bonusPico;
  if (noPrazo) {
    e.diaAtual.noPrazo++;
    e.avaliacao = clamp(e.avaliacao + (5 - e.avaliacao) * CORRE.avaliacao.ganhoNoPrazo, 1, 5);
    const chance = CORRE.ofertas.gorjetaChance * (e.avaliacao >= 4.5 ? 1.5 : 1);
    if (rand(e) < chance) {
      const [a, b] = CORRE.ofertas.gorjetaValor;
      ganho += Math.round((a + rand(e) * (b - a)) / 50) * 50;
    }
  } else {
    e.diaAtual.atrasadas++;
    e.avaliacao = clamp(e.avaliacao - CORRE.avaliacao.perdaAtraso, 1, 5);
  }
  e.diaAtual.entregas++;
  e.dinheiro += ganho;
  e.diaAtual.ganhos += ganho;
  e.ultimoResultado = `${noPrazo ? "Entregue no prazo" : "Entregue com atraso"}: +${(ganho / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}

function servir(e: Estado, lugarId: string) {
  const l = lugarPorId(lugarId);
  if (!l) return;
  const s = CORRE.servicos;
  if (l.tipo === "posto") {
    const falta = 100 - e.combustivel;
    const podePagar = Math.floor(Math.max(0, e.dinheiro) / s.posto.precoPorPorcento);
    const enche = Math.min(Math.ceil(falta), podePagar);
    gastar(e, Math.round(enche * s.posto.precoPorPorcento));
    e.combustivel = clamp(e.combustivel + enche);
    e.minuto += s.posto.minutos;
    e.avisos = e.avisos.filter((a) => a !== "combustivel");
    e.ultimoResultado = `${l.nome}: tanque em ${Math.round(e.combustivel)}%.`;
  } else if (l.tipo === "oficina") {
    let orcamento = Math.max(0, e.dinheiro);
    let custo = 0;
    for (const p of ["oleo", "freio", "pneu"] as Peca[]) {
      const pontos = Math.min(Math.ceil(100 - e.moto[p]), Math.floor(orcamento / s.oficina.precoPorPorcento));
      e.moto[p] = clamp(e.moto[p] + pontos);
      orcamento -= pontos * s.oficina.precoPorPorcento;
      custo += pontos * s.oficina.precoPorPorcento;
    }
    gastar(e, custo);
    e.minuto += s.oficina.minutos;
    e.avisos = e.avisos.filter((a) => !["pneu", "freio", "oleo"].includes(a));
    e.ultimoResultado = `${l.nome}: pneu ${Math.round(e.moto.pneu)}%, freio ${Math.round(e.moto.freio)}%, óleo ${Math.round(e.moto.oleo)}%.`;
  } else {
    const sv = l.tipo === "comida" ? s.comida : s.descanso;
    if (e.dinheiro < sv.preco) {
      e.ultimoResultado = "Saldo não dá pra isso agora.";
      return;
    }
    gastar(e, sv.preco);
    e.cansaco = clamp(e.cansaco + sv.cansaco);
    e.minuto += sv.minutos;
    e.avisos = e.avisos.filter((a) => a !== "cansaco");
    e.ultimoResultado = `${l.nome}: cansaço em ${Math.round(e.cansaco)}%.`;
  }
  if (e.minuto >= CORRE.tempo.fimDia) encerrarDia(e, "meiaNoite");
}

function encerrarDia(e: Estado, motivo: ResumoDia["motivo"]) {
  if (motivo === "cansaco") avisar(e, CORRE.mensagens.cansacoLimite, "alerta");
  if (motivo === "meiaNoite") avisar(e, CORRE.mensagens.meiaNoite, "alerta");
  if (e.oferta) {
    e.oferta = null;
  }
  e.viagem = null;
  e.evento = null;
  e.posicao = CORRE.casa.bairro;
  const d = e.diaAtual;
  e.resumoDia = {
    dia: e.dia,
    ganhos: d.ganhos,
    gastos: d.gastos,
    saldo: d.ganhos - d.gastos,
    entregas: d.entregas,
    noPrazo: d.noPrazo,
    atrasadas: d.atrasadas,
    recusadas: d.recusadas,
    avaliacao: Math.round(e.avaliacao * 100) / 100,
    cansaco: Math.round(e.cansaco),
    moto: { pneu: Math.round(e.moto.pneu), freio: Math.round(e.moto.freio), oleo: Math.round(e.moto.oleo) },
    combustivel: Math.round(e.combustivel),
    motivo,
    ritmoTranquilo: e.ritmoTranquilo,
  };
  e.fase = "resumoDia";
}

export function fecharSemana(e: Estado): ResumoSemana {
  const dividaAnterior = e.divida;
  const contas = CORRE.contas.map((c) => ({ ...c }));
  const totalCobrado = totalContas() + Math.round(dividaAnterior * (1 + CORRE.jurosDivida));
  const pago = Math.min(Math.max(0, e.dinheiro), totalCobrado);
  e.dinheiro -= pago;
  e.divida = totalCobrado - pago;
  const contasPagas = e.divida === 0;
  const progresso = Math.min(100, Math.round((e.objetivo.guardado / CORRE.objetivo.valor) * 10000) / 100);
  return {
    semana: e.semana,
    contas,
    dividaAnterior,
    totalCobrado,
    pago,
    divida: e.divida,
    contasPagas,
    saldo: e.dinheiro,
    guardadoSemana: e.semanaAtual.guardado,
    metaCumprida: contasPagas && e.semanaAtual.guardado >= CORRE.objetivo.metaSemanal,
    progressoObjetivo: progresso,
  };
}

function tick(e: Estado, minutos: number) {
  for (let i = 0; i < minutos; i++) {
    if (e.fase !== "rodando" && e.fase !== "viagem") return;
    const horaAntes = horaDe(e.minuto);
    e.minuto++;
    const hora = horaDe(e.minuto);
    const chuva = e.clima[hora];
    const rodando = e.fase === "viagem";
    e.cansaco = clamp(e.cansaco + ((rodando ? CORRE.cansaco.porHoraRodando : CORRE.cansaco.porHoraParado) / 60) * (chuva ? CORRE.cansaco.multChuva : 1));

    if (hora !== horaAntes) {
      if (!chuva && e.clima[(hora + 1) % 24]) avisar(e, CORRE.mensagens.chuvaChegando, "alerta");
      if (!chuva && e.clima[horaAntes]) avisar(e, CORRE.mensagens.chuvaParou);
    }
    if (e.cansaco >= CORRE.cansaco.alerta) avisarUmaVez(e, "cansaco", texto(CORRE.mensagens.cansacoAlto, Math.round(e.cansaco)));

    if (e.fase === "viagem" && e.viagem) {
      const v = e.viagem;
      v.decorrido++;
      if (v.evento && !v.evento.resolvido && v.decorrido >= v.evento.em) {
        e.evento = { id: v.evento.id };
        e.fase = "evento";
        return;
      }
      if (v.decorrido >= v.duracao) chegar(e);
    } else if (e.fase === "rodando") {
      if (e.oferta && e.minuto >= e.oferta.expira) {
        e.oferta = null;
        e.aceitacao = recusar(e.aceitacao, true);
        e.diaAtual.recusadas++;
      }
      if (!e.oferta) {
        const porMin = (CORRE.ofertas.porHoraBase / 60) * fatorOfertas(e.aceitacao) * (ehPico(hora) ? 1.4 : 1) * (chuva ? 1.3 : 1);
        if (rand(e) < porMin) e.oferta = gerarOferta(e);
      }
    }

    if ((e.fase as Fase) === "resumoDia") return;
    if (e.cansaco >= CORRE.cansaco.limite) return encerrarDia(e, "cansaco");
    if (e.minuto >= CORRE.tempo.fimDia) return encerrarDia(e, "meiaNoite");
  }
}

function sortearEvento(e: Estado, chuva: boolean): EventoViagem | null {
  if (rand(e) >= chanceEvento(chuva, e.moto, e.cansaco)) return null;
  const lista = CORRE.eventos.lista.filter((ev) => chuva || !("soComChuva" in ev && ev.soComChuva)) as EventoViagem[];
  const total = lista.reduce((s, ev) => s + ev.peso, 0);
  let r = rand(e) * total;
  for (const ev of lista) {
    r -= ev.peso;
    if (r < 0) return ev;
  }
  return lista[lista.length - 1] ?? null;
}

// ——— Redutor ———

export function reduzir(estado: Estado, acao: Acao): Estado {
  const e: Estado = structuredClone(estado);
  switch (acao.tipo) {
    case "tick":
      tick(e, Math.max(0, Math.floor(acao.minutos)));
      break;
    case "sair":
      if (e.fase === "casa") e.fase = "rodando";
      break;
    case "ritmo":
      e.ritmoTranquilo = acao.ligado;
      break;
    case "recusar":
      if (e.fase === "rodando" && e.oferta) {
        e.oferta = null;
        e.aceitacao = recusar(e.aceitacao);
        e.diaAtual.recusadas++;
      }
      break;
    case "aceitar": {
      if (e.fase !== "rodando" || !e.oferta) break;
      const o = e.oferta;
      if (e.combustivel < o.km * CORRE.moto.consumoPorKm) {
        avisar(e, CORRE.mensagens.semCombustivel, "alerta");
        break;
      }
      e.oferta = null;
      e.aceitacao = aceitar(e.aceitacao);
      e.ultimoResultado = null;
      const rest = restaurantePorId(o.restaurante)!;
      const chuva = e.clima[horaDe(e.minuto)];
      const ev = sortearEvento(e, chuva);
      iniciarViagem(e, { tipo: "entrega", pontos: [e.posicao, rest.bairro, o.destino], km: o.km, oferta: o }, CORRE.viagem.minutosColeta + CORRE.viagem.minutosEntregaPorta);
      if (ev && e.viagem) e.viagem.evento = { id: ev.id, em: Math.max(1, Math.floor(e.viagem.duracao * 0.5)), resolvido: false };
      break;
    }
    case "escolher": {
      if (e.fase !== "evento" || !e.evento || !e.viagem?.evento) break;
      const ev = eventoPorId(e.evento.id);
      const op = ev?.opcoes.find((x) => x.id === acao.opcao);
      if (!op) break;
      aplicarEfeito(e, op.efeito);
      e.ultimoResultado = null;
      if (op.risco && rand(e) < op.risco.chance) {
        aplicarEfeito(e, op.risco.efeito);
        avisar(e, op.risco.texto, "alerta");
      }
      e.viagem.evento.resolvido = true;
      e.evento = null;
      e.fase = "viagem";
      if (e.viagem.decorrido >= e.viagem.duracao) chegar(e);
      break;
    }
    case "irPara": {
      const l = lugarPorId(acao.lugar);
      if (e.fase !== "rodando" || !l) break;
      if (e.oferta) {
        e.oferta = null;
        e.aceitacao = recusar(e.aceitacao);
        e.diaAtual.recusadas++;
      }
      iniciarViagem(e, { tipo: "servico", pontos: [e.posicao, l.bairro], km: distanciaKm(e.posicao, l.bairro), lugar: l.id }, 0);
      break;
    }
    case "voltarPraCasa":
      if (e.fase === "casa") {
        encerrarDia(e, "casa");
        break;
      }
      if (e.fase !== "rodando") break;
      if (e.oferta) {
        e.oferta = null;
        e.aceitacao = recusar(e.aceitacao);
        e.diaAtual.recusadas++;
      }
      iniciarViagem(e, { tipo: "casa", pontos: [e.posicao, CORRE.casa.bairro], km: distanciaKm(e.posicao, CORRE.casa.bairro) }, 0);
      break;
    case "guardar": {
      const v = Math.floor(acao.valor);
      if (v <= 0 || v > e.dinheiro || e.fase === "resumoSemana") break;
      e.dinheiro -= v;
      e.objetivo.guardado += v;
      e.diaAtual.guardado += v;
      e.semanaAtual.guardado += v;
      break;
    }
    case "continuar":
      if (e.fase === "resumoDia") {
        if (diaDaSemana(e.dia) === CORRE.semana.diasTrabalho) {
          e.dia += 1; // domingo: folga
          e.cansaco = clamp(e.cansaco - CORRE.cansaco.recuperaFolga);
          e.resumoSemana = fecharSemana(e);
          e.resumoDia = null;
          e.fase = "resumoSemana";
        } else novoDia(e, e.dia + 1);
      } else if (e.fase === "resumoSemana") novoDia(e, e.dia + 1);
      break;
  }
  return e;
}

/** O saldo do dia bate com ganhos − gastos e com o dinheiro que mudou? */
export function conferirDia(e: Estado): boolean {
  const r = e.resumoDia;
  if (!r) return false;
  const d = e.diaAtual;
  return r.saldo === r.ganhos - r.gastos && r.ganhos === d.ganhos && r.gastos === d.gastos && e.dinheiro === d.dinheiroInicio + d.ganhos - d.gastos - d.guardado;
}

/** Fração (0–1) do caminho, pro marcador no mapa. */
export function progressoViagem(v: Viagem | null): number {
  if (!v || v.duracao <= 0) return 0;
  return Math.min(1, v.decorrido / v.duracao);
}
