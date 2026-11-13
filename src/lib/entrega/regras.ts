// Regras puras do Entrega na Chuva: valem no navegador e no servidor.
import { ENTREGA } from "./config";

type Config = typeof ENTREGA;

export type StatusPedido = "no_prazo" | "atrasado" | "cancelado";

/** Fator do prazo pela hora da entrega. */
export function statusDoPrazo(decorridoS: number, prazoS: number, c: Config = ENTREGA): StatusPedido {
  if (decorridoS <= prazoS) return "no_prazo";
  if (decorridoS <= prazoS * c.pedido.fatorCancelado) return "atrasado";
  return "cancelado";
}

/** Multiplicador pela sequência (entregas seguidas no prazo, contando a atual). */
export function multiplicadorSequencia(sequencia: number, c: Config = ENTREGA): number {
  let m = 1;
  for (const s of c.sequencia) if (sequencia >= s.aPartirDe) m = s.mult;
  return m;
}

/** Gorjeta: base × fator do prazo × estado do pacote (0..100). Cancelado não paga. */
export function gorjeta(base: number, status: StatusPedido, estado: number, c: Config = ENTREGA): number {
  if (status === "cancelado") return 0;
  const fator = status === "no_prazo" ? c.prazo.noPrazo : c.prazo.atrasado;
  return Math.round(base * fator * (clamp(estado, 0, 100) / 100));
}

/** Créditos da entrega: gorjeta × multiplicador da sequência. */
export const creditosDaEntrega = (g: number, sequencia: number, c: Config = ENTREGA) => Math.round(g * multiplicadorSequencia(sequencia, c));

/** Dano de uma batida, com o amortecedor (0..1) e pedidos frágeis. */
export function danoDaBatida(fragil: boolean, amortecedor: number, c: Config = ENTREGA): number {
  return c.dano.batida * (fragil ? c.dano.fragil : 1) * (1 - clamp(amortecedor, 0, 0.9));
}

// ---------- Implantes ----------

export type Efeito = Partial<Record<Atributo, number>>;
export type Atributo = "aderencia" | "velMax" | "visao" | "amortecedor" | "gps" | "nitroCargas";
export type ImplanteEquipado = { slug: string; level: number; effects: Efeito[] };

export type Atributos = {
  velMax: number;
  aderencia: number;
  zoom: number;
  avisoS: number;
  amortecedor: number;
  gps: number;
  nitroCargas: number;
};

/** Soma o efeito de cada implante equipado (no nível dele) aos atributos base da config. */
export function aplicarImplantes(equipados: ImplanteEquipado[], c: Config = ENTREGA): Atributos {
  const soma: Record<Atributo, number> = { aderencia: 0, velMax: 0, visao: 0, amortecedor: 0, gps: 0, nitroCargas: 0 };
  for (const i of equipados.slice(0, c.equipadosMax)) {
    const e = i.effects[clamp(i.level, 1, i.effects.length) - 1] ?? {};
    for (const k of Object.keys(soma) as Atributo[]) soma[k] += Number(e[k] ?? 0);
  }
  return {
    velMax: c.moto.velMax * (1 + soma.velMax),
    aderencia: c.moto.aderencia * (1 + soma.aderencia),
    zoom: c.camera.zoom / (1 + soma.visao),
    avisoS: c.perigos.avisoBase + c.perigos.avisoPorVisao * soma.visao * 5,
    amortecedor: clamp(soma.amortecedor, 0, 0.9),
    gps: Math.round(soma.gps),
    nitroCargas: c.moto.nitroCargas + Math.round(soma.nitroCargas),
  };
}

// ---------- Turno ----------

export type PedidoFeito = { base: number; fragil: boolean; status: StatusPedido; estado: number };
export type TurnoEnviado = { duracaoMs: number; relaxado: boolean; pedidos: PedidoFeito[] };
export type Resumo = {
  deliveries: number;
  onTime: number;
  late: number;
  cancelled: number;
  tipsTotal: number;
  creditsEarned: number;
  bestStreak: number;
  durationMs: number;
  relaxed: boolean;
};

/** Refaz o resumo do turno a partir da lista de pedidos (o servidor não confia nos totais do navegador). */
export function resumir(t: TurnoEnviado, c: Config = ENTREGA): Resumo {
  let seq = 0;
  let melhor = 0;
  const r: Resumo = { deliveries: 0, onTime: 0, late: 0, cancelled: 0, tipsTotal: 0, creditsEarned: 0, bestStreak: 0, durationMs: t.duracaoMs, relaxed: t.relaxado };
  for (const p of t.pedidos) {
    if (p.status === "cancelado") {
      r.cancelled++;
      seq = 0;
      continue;
    }
    r.deliveries++;
    if (p.status === "no_prazo") {
      r.onTime++;
      seq++;
    } else {
      r.late++;
      seq = 0;
    }
    melhor = Math.max(melhor, seq);
    const g = gorjeta(p.base, p.status, p.estado, c);
    r.tipsTotal += g;
    r.creditsEarned += p.status === "no_prazo" ? creditosDaEntrega(g, seq, c) : g;
  }
  r.bestStreak = melhor;
  return r;
}

/** Teto de entregas e créditos possíveis num turno, pelos implantes equipados. */
export function tetoDoTurno(atr: Atributos, c: Config = ENTREGA): { entregas: number; creditos: number } {
  const distMin = c.pedido.distanciaMinTiles * c.tile;
  const velTopo = atr.velMax * (atr.nitroCargas > 0 ? c.moto.nitroVel : 1);
  const msPorEntrega = (distMin / velTopo) * 1000 + c.teto.paradasMs;
  const entregas = Math.ceil((c.turnoMs / msPorEntrega) * c.teto.folga);
  const multMax = Math.max(...c.sequencia.map((s) => s.mult));
  return { entregas, creditos: Math.ceil(entregas * c.pedido.gorjetaBase[1] * multMax) };
}

/** Confere o turno enviado. Devolve o resumo refeito ou o motivo da recusa. */
export function validarTurno(t: unknown, atr: Atributos, c: Config = ENTREGA): { ok: true; resumo: Resumo } | { ok: false; motivo: string } {
  if (!t || typeof t !== "object") return { ok: false, motivo: "formato" };
  const { duracaoMs, relaxado, pedidos } = t as TurnoEnviado;
  if (typeof duracaoMs !== "number" || Math.abs(duracaoMs - c.turnoMs) > c.toleranciaDuracaoMs) return { ok: false, motivo: "duracao" };
  if (typeof relaxado !== "boolean" || !Array.isArray(pedidos)) return { ok: false, motivo: "formato" };
  const [min, max] = c.pedido.gorjetaBase;
  const limpos: PedidoFeito[] = [];
  for (const p of pedidos) {
    if (!p || typeof p !== "object") return { ok: false, motivo: "pedido" };
    const { base, fragil, status, estado } = p as PedidoFeito;
    if (!Number.isInteger(base) || base < min || base > max) return { ok: false, motivo: "gorjeta" };
    if (status !== "no_prazo" && status !== "atrasado" && status !== "cancelado") return { ok: false, motivo: "status" };
    if (typeof estado !== "number" || estado < 0 || estado > 100 || typeof fragil !== "boolean") return { ok: false, motivo: "pedido" };
    limpos.push({ base, fragil, status, estado });
  }
  const resumo = resumir({ duracaoMs, relaxado, pedidos: limpos }, c);
  const teto = tetoDoTurno(atr, c);
  if (resumo.deliveries + resumo.cancelled > teto.entregas || resumo.creditsEarned > teto.creditos) return { ok: false, motivo: "teto" };
  return { ok: true, resumo };
}

// ---------- Oficina ----------

export type ErroOficina = "saldo" | "nivelMax" | "equipados" | "naoTem";

/** Preço do próximo nível, ou o motivo de não poder comprar. */
export function validarCompra(nivelAtual: number, maxLevel: number, precos: number[], saldo: number): { ok: true; preco: number; nivel: number } | { ok: false; erro: ErroOficina } {
  if (nivelAtual >= maxLevel) return { ok: false, erro: "nivelMax" };
  const preco = Number(precos[nivelAtual]);
  if (!Number.isFinite(preco) || preco < 0) return { ok: false, erro: "nivelMax" };
  if (saldo < preco) return { ok: false, erro: "saldo" };
  return { ok: true, preco, nivel: nivelAtual + 1 };
}

export function validarEquipar(temImplante: boolean, jaEquipado: boolean, equipadosAgora: number, c: Config = ENTREGA): ErroOficina | null {
  if (!temImplante) return "naoTem";
  if (!jaEquipado && equipadosAgora >= c.equipadosMax) return "equipados";
  return null;
}

// ---------- Chuva ----------

export function intensidadeChuva(fracao: number, c: Config = ENTREGA): number {
  const k = c.chuva.curva;
  const f = clamp(fracao, 0, 1);
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i][0]) {
      const [x0, y0] = k[i - 1];
      const [x1, y1] = k[i];
      return y0 + ((y1 - y0) * (f - x0)) / (x1 - x0 || 1);
    }
  }
  return k[k.length - 1][1];
}

/** Aderência efetiva: chuva tira um pouco, poça tira muito. */
export function aderenciaEfetiva(base: number, chuva: number, naPoca: boolean, c: Config = ENTREGA): number {
  return base * (1 - c.moto.perdaChuva * clamp(chuva, 0, 1)) * (naPoca ? c.moto.aderenciaPoca : 1);
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
