"use client";

// Sons da feira: bipes curtos gerados na hora (sem arquivo). O jogador pode desligar; a escolha fica no aparelho.

import { BANCA } from "@/lib/banca/config";

export type Opcoes = { som: boolean };

export function lerOpcoes(): Opcoes {
  try {
    const bruto = JSON.parse(localStorage.getItem(BANCA.chaveOpcoes) ?? "{}");
    return { som: bruto.som !== false };
  } catch {
    return { som: true };
  }
}

export function guardarOpcoes(o: Opcoes) {
  try {
    localStorage.setItem(BANCA.chaveOpcoes, JSON.stringify(o));
  } catch {}
}

let ctx: AudioContext | null = null;

/** Toca um bipe. Só depois de um toque do usuário (o navegador exige) e só se o som estiver ligado. */
export function bipe(tipo: "venda" | "erro" | "fim", ligado: boolean) {
  if (!ligado || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const notas = tipo === "venda" ? [660, 880] : tipo === "erro" ? [220] : [523, 659, 784];
    notas.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.frequency.value = f;
      o.type = "triangle";
      g.gain.setValueAtTime(0.0001, ctx!.currentTime + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.12, ctx!.currentTime + i * 0.09 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx!.currentTime + i * 0.09 + 0.12);
      o.connect(g).connect(ctx!.destination);
      o.start(ctx!.currentTime + i * 0.09);
      o.stop(ctx!.currentTime + i * 0.09 + 0.14);
    });
  } catch {}
}
