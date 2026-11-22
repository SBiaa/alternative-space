// Clima, pombo e vizinho do dia: tudo sai de (seed, dia), então a mesma seed dá sempre o mesmo dia.

import { escolherPeso, sortear } from "../gestao/rng";
import { CLIMAS, LAJE, TROCAS, type Clima, type TrocaConfig } from "./config";
import { HORA, MIN, inicioDoDia } from "./tempo";

export type DiaDeClima = { dia: number; clima: Clima; chuvaIni: number | null; chuvaFim: number | null };

export function climaDoDia(seed: string, dia: number): DiaDeClima {
  const c = LAJE.clima;
  const clima = escolherPeso(CLIMAS, CLIMAS.map((k) => c.pesos[k]), sortear(seed, dia, "clima"));
  if (clima !== "chuva") return { dia, clima, chuvaIni: null, chuvaFim: null };
  const hora = c.chuva.horaMin + sortear(seed, dia, "chuva-hora") * (c.chuva.horaMax - c.chuva.horaMin);
  const ini = inicioDoDia(dia) + Math.floor(hora * HORA);
  return { dia, clima, chuvaIni: ini, chuvaFim: ini + c.chuva.duracaoMin * MIN };
}

export type DiaDePombo = { dia: number; aparece: boolean; inicio: number; fim: number };

export function pomboDoDia(seed: string, dia: number, comEspantalho: boolean): DiaDePombo {
  const p = LAJE.pombo;
  const chance = comEspantalho ? p.chanceComEspantalho : p.chance;
  const aparece = sortear(seed, dia, "pombo") < chance;
  const hora = p.horaMin + sortear(seed, dia, "pombo-hora") * (p.horaMax - p.horaMin);
  const inicio = inicioDoDia(dia) + Math.floor(hora * HORA);
  return { dia, aparece, inicio, fim: inicio + p.janelaMin * MIN };
}

export function propostaDoDia(seed: string, dia: number): TrocaConfig {
  return TROCAS[Math.floor(sortear(seed, dia, "vizinho") * TROCAS.length)];
}
