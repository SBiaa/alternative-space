// Sons do Muro Livre, sintetizados na hora (Web Audio), todos originais: chiado de spray, plim de entrega, gota de chuva.
// Nada de música nem amostra de ninguém. O botão de sons do site (estaMudo/mudar) vale aqui também.

import { estaMudo } from "@/lib/sons";

export type SomMuro = "spray" | "rolinho" | "moeda" | "erro" | "chuva" | "entrega" | "lona";

let ctx: AudioContext | null = null;
let mestre: GainNode | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    mestre = ctx.createGain();
    mestre.gain.value = 0.16;
    mestre.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tom(a: AudioContext, tipo: OscillatorType, de: number, ate: number | null, dur: number, atraso = 0, vol = 1) {
  const t = a.currentTime + atraso;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(de, t);
  if (ate) osc.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(mestre!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function chiado(a: AudioContext, dur: number, vol: number, filtro: number, atraso = 0) {
  const t = a.currentTime + atraso;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = filtro;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(mestre!);
  src.start(t);
}

const efeitos: Record<SomMuro, (a: AudioContext) => void> = {
  spray: (a) => chiado(a, 0.22, 0.5, 5200),
  rolinho: (a) => chiado(a, 0.28, 0.35, 900),
  moeda: (a) => {
    tom(a, "square", 988, null, 0.08, 0, 0.3);
    tom(a, "square", 1319, null, 0.16, 0.07, 0.3);
  },
  erro: (a) => tom(a, "triangle", 220, 120, 0.22, 0, 0.5),
  chuva: (a) => chiado(a, 0.6, 0.3, 3000),
  entrega: (a) => [523, 659, 784, 1047].forEach((f, i) => tom(a, "triangle", f, null, 0.18, i * 0.1, 0.4)),
  lona: (a) => chiado(a, 0.35, 0.4, 1400),
};

export function tocarMuro(som: SomMuro) {
  if (estaMudo()) return;
  const a = audio();
  if (a) efeitos[som](a);
}
