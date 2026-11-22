// Sons curtos gerados na hora (Web Audio, nenhum arquivo). Só tocam depois de um toque do jogador e dá pra desligar.
// O estado ligado/desligado fica no navegador.

import { CONFIG } from "./config";

export type SomConves = "carta" | "golpe" | "bloqueio" | "fim" | "vitoria" | "derrota" | "erro";

let ac: AudioContext | null = null;
let ligado: boolean | null = null;

export function somLigado(): boolean {
  if (ligado === null) {
    try {
      ligado = localStorage.getItem(CONFIG.chaveSom) !== "0";
    } catch {
      ligado = true;
    }
  }
  return ligado;
}

export function definirSom(v: boolean) {
  ligado = v;
  try {
    localStorage.setItem(CONFIG.chaveSom, v ? "1" : "0");
  } catch {}
}

const notas: Record<SomConves, { f: number[]; d: number; tipo: OscillatorType; v: number }> = {
  carta: { f: [440, 520], d: 0.08, tipo: "triangle", v: 0.05 },
  golpe: { f: [180, 120], d: 0.12, tipo: "square", v: 0.04 },
  bloqueio: { f: [300, 360], d: 0.1, tipo: "sine", v: 0.06 },
  fim: { f: [330, 262], d: 0.14, tipo: "triangle", v: 0.05 },
  vitoria: { f: [392, 494, 587, 784], d: 0.16, tipo: "triangle", v: 0.06 },
  derrota: { f: [294, 220, 165], d: 0.2, tipo: "sawtooth", v: 0.035 },
  erro: { f: [160, 140], d: 0.09, tipo: "square", v: 0.03 },
};

export function tocar(som: SomConves) {
  if (typeof window === "undefined" || !somLigado()) return;
  try {
    ac ??= new AudioContext();
    if (ac.state === "suspended") void ac.resume();
    const { f, d, tipo, v } = notas[som];
    const t0 = ac.currentTime;
    f.forEach((freq, i) => {
      const o = ac!.createOscillator();
      const g = ac!.createGain();
      o.type = tipo;
      o.frequency.value = freq;
      g.gain.setValueAtTime(v, t0 + i * d);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * d);
      o.connect(g).connect(ac!.destination);
      o.start(t0 + i * d);
      o.stop(t0 + (i + 1) * d + 0.02);
    });
  } catch {}
}
