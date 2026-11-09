"use client";

import { PERSONAGENS } from "@/lib/luta";
import { cenario } from "@/lib/lutaDesenho";
import { DueloLuta } from "./DueloLuta";

export function DueloPirata() {
  return <DueloLuta nome="Duelo Pirata" chamada="Luta 1 contra 1 no convés. Melhor de 3 rounds." elenco={PERSONAGENS} palavra="pirata" cenario={cenario} />;
}
