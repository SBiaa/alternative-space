// Sons curtos feitos na hora com Web Audio (nada gravado, nada de terceiros). O jogador pode desligar.

import { BANDA } from "@/lib/banda/config";

let ctx: AudioContext | null = null;

export function somAtivo(): boolean {
  try {
    return localStorage.getItem(BANDA.chaveOpcoes) !== "off";
  } catch {
    return true;
  }
}

export function definirSom(ligado: boolean) {
  try {
    localStorage.setItem(BANDA.chaveOpcoes, ligado ? "on" : "off");
  } catch {}
}

/** Um bip curto. Só toca depois de um gesto do jogador (regra do navegador) e se o som estiver ligado. */
export function bip(freq: number, duracao = 0.12) {
  if (!somAtivo() || typeof window === "undefined") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracao);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duracao + 0.02);
  } catch {}
}
