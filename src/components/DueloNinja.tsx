"use client";

import { NINJAS } from "@/lib/luta";
import { cenarioVila } from "@/lib/lutaDesenho";
import { DueloLuta } from "./DueloLuta";

export function DueloNinja() {
  return (
    <DueloLuta
      nome="Duelo Ninja"
      chamada="Luta 1 contra 1 no campo de treino. Melhor de 3 rounds."
      elenco={NINJAS}
      palavra="ninja"
      cenario={cenarioVila}
      energia="CHAKRA"
    />
  );
}
