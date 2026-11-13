// Gasto de tinta, spray e rolinho, e desgaste do bico. Muta o estoque que recebe.

import { MURO, TAMANHOS, limitar } from "./config";
import type { Attr } from "./efeitos";
import type { Camada, CorId, Estoque, Tamanho } from "./tipos";

export const usaSpray = (camada: Camada) => camada === "contorno" || camada === "detalhe";

export type Consumo = { ok: true; penal: number } | { ok: false; motivo: "tinta" | "spray" };

/** Gasta o material pra pintar `delta`% de uma camada. Se faltar tinta ou lata da cor, nada é gasto e a camada não anda. */
export function consumir(e: Estoque, attr: Attr, size: Tamanho, camada: Camada, delta: number, cor: CorId): Consumo {
  const t = TAMANHOS[size];
  const m = MURO.material;
  const parte = (delta / 100) * MURO.partilha[camada];
  let penal = 0;
  if (usaSpray(camada)) {
    const lata = t.spray * parte * attr.desperdicio;
    if (e.spray[cor] <= 1e-6) return { ok: false, motivo: "spray" };
    const gasto = Math.min(lata, e.spray[cor]);
    const fracao = e.spray[cor] % 1;
    const baixa = fracao > 0 && fracao < m.bicoLataMin;
    e.spray[cor] = Math.max(0, e.spray[cor] - gasto);
    e.bico.saude -= gasto * m.entopeBase * attr.entope * (baixa ? m.entopeLataBaixa : 1);
    if (e.bico.saude <= 0) {
      if (e.bico.reserva > 0) {
        e.bico.reserva -= 1;
        e.bico.saude = 100 + e.bico.saude;
      } else e.bico.saude = 0;
    }
    penal += Math.max(0, m.bicoQualidadeMin - e.bico.saude) * 0.6;
    if (gasto < lata) penal += m.semTintaPerdeQualidade;
  } else {
    const tinta = t.tinta * parte * attr.gastoTinta * attr.desperdicio;
    if (e.tinta[cor] <= 1e-6) return { ok: false, motivo: "tinta" };
    const gasto = Math.min(tinta, e.tinta[cor]);
    e.tinta[cor] = Math.max(0, e.tinta[cor] - gasto);
    if (gasto < tinta) penal += m.semTintaPerdeQualidade;
    e.rolinho.saude -= t.rolinho * parte * attr.desgasteRolinho;
    if (e.rolinho.saude <= 0) {
      if (e.rolinho.reserva > 0) {
        e.rolinho.reserva -= 1;
        e.rolinho.saude = 100 + e.rolinho.saude;
      } else e.rolinho.saude = 0;
    }
    penal += Math.max(0, m.rolinhoSaudeMin - e.rolinho.saude);
  }
  return { ok: true, penal: limitar(penal, 0, 60) };
}

export const capacidadeTinta = (attr: Attr) => MURO.material.capacidadeTinta * (1 + attr.estoqueExtra);
export const capacidadeSpray = (attr: Attr) => Math.round(MURO.material.capacidadeSpray * (1 + attr.estoqueExtra));
export const capacidadeReserva = (attr: Attr) => Math.round(MURO.material.capacidadeReserva * (1 + attr.estoqueExtra));
export const capacidadeLonas = (attr: Attr) => Math.round(MURO.material.capacidadeLonas * (1 + attr.estoqueExtra));

export function estoqueInicial(): Estoque {
  const i = MURO.material.estoqueInicial;
  const zero = { laranja: 0, azul: 0, creme: 0, tijolo: 0, preto: 0 };
  return {
    tinta: { ...zero, laranja: i.tinta, azul: i.tinta, creme: i.tinta, tijolo: i.tinta, preto: i.tinta },
    spray: { ...zero, laranja: i.spray, azul: i.spray, creme: i.spray, tijolo: i.spray, preto: i.spray },
    rolinho: { saude: i.rolinho, reserva: MURO.material.reservaInicial.rolinho },
    bico: { saude: i.bico, reserva: MURO.material.reservaInicial.bico },
    lonas: i.lonas,
  };
}
