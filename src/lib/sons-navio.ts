// Sons do "Defenda o Navio", gerados na hora com a Web Audio API (nenhum arquivo de áudio).
// O navegador só libera áudio depois de um clique ou tecla: chame destravarSom() num desses eventos.

import type { SomNavio } from "./navio";

export type SomDefesa =
  | SomNavio
  | "contratar"
  | "melhorar"
  | "dispensar"
  | "negado"
  | "sino" // começo da onda
  | "vitoria"
  | "derrota";

const CHAVE_MUDO = "defenda-o-navio:mudo";
const VOLUME = 0.3;

// Intervalo mínimo entre dois sons iguais: com 10 tripulantes atacando juntos vira barulheira.
const ESPACO: Partial<Record<SomDefesa, number>> = {
  corte: 0.07,
  tiro: 0.08,
  moeda: 0.06,
  arremesso: 0.12,
  panelada: 0.1,
  trovao: 0.25,
  canhao: 0.15,
  explosao: 0.12,
  roubo: 0.3,
};

let ac: AudioContext | null = null;
let saida: GainNode | null = null;
let ruidoBuf: AudioBuffer | null = null;
let mudo: boolean | null = null;
const ultimoEm = new Map<SomDefesa, number>();

export function estaMudo(): boolean {
  if (mudo === null) {
    try {
      mudo = localStorage.getItem(CHAVE_MUDO) === "1";
    } catch {
      mudo = false;
    }
  }
  return mudo;
}

export function mudar(valor: boolean) {
  mudo = valor;
  try {
    localStorage.setItem(CHAVE_MUDO, valor ? "1" : "0");
  } catch {
    // Sem storage: vale só nesta visita.
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ac) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    saida = ac.createGain();
    saida.gain.value = VOLUME;
    saida.connect(ac.destination);
  }
  if (ac.state === "suspended") void ac.resume();
  return ac;
}

export function destravarSom() {
  audio();
}

/** Pode tocar agora? Segura repetições do mesmo som muito em cima uma da outra. */
export function liberado(som: SomDefesa, agora: number, ultimo: Map<SomDefesa, number> = ultimoEm): boolean {
  const espaco = ESPACO[som] ?? 0;
  const antes = ultimo.get(som);
  if (antes !== undefined && agora - antes < espaco) return false;
  ultimo.set(som, agora);
  return true;
}

function ruido(a: AudioContext) {
  if (!ruidoBuf) {
    ruidoBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ruidoBuf;
}

// Volume que sobe rápido e some até o fim.
function envelope(a: AudioContext, t0: number, dur: number, vol: number) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.015, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(saida!);
  return g;
}

type Tom = { de: number; ate?: number; dur: number; vol: number; onda?: OscillatorType; atraso?: number };

function tom(a: AudioContext, { de, ate = de, dur, vol, onda = "sine", atraso = 0 }: Tom) {
  const t0 = a.currentTime + atraso;
  const o = a.createOscillator();
  o.type = onda;
  o.frequency.setValueAtTime(de, t0);
  o.frequency.exponentialRampToValueAtTime(ate, t0 + dur);
  o.connect(envelope(a, t0, dur, vol));
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

type Chiado = { dur: number; vol: number; filtro?: BiquadFilterType; de: number; ate?: number; q?: number; atraso?: number };

function chiado(a: AudioContext, { dur, vol, filtro = "lowpass", de, ate = de, q = 1, atraso = 0 }: Chiado) {
  const t0 = a.currentTime + atraso;
  const s = a.createBufferSource();
  s.buffer = ruido(a);
  s.loop = true;
  const f = a.createBiquadFilter();
  f.type = filtro;
  f.Q.value = q;
  f.frequency.setValueAtTime(de, t0);
  f.frequency.exponentialRampToValueAtTime(ate, t0 + dur);
  s.connect(f);
  f.connect(envelope(a, t0, dur, vol));
  s.start(t0, Math.random());
  s.stop(t0 + dur + 0.02);
}

// Variação pequena de tom pra repetição não cansar.
const v = (f: number) => f * (0.92 + Math.random() * 0.16);

const efeitos: Record<SomDefesa, (a: AudioContext) => void> = {
  corte: (a) => {
    chiado(a, { dur: 0.13, vol: 0.22, filtro: "bandpass", de: v(2200), ate: v(6000), q: 2 });
    tom(a, { de: v(1800), ate: v(1200), dur: 0.08, vol: 0.04, onda: "triangle" });
  },
  tiro: (a) => {
    chiado(a, { dur: 0.12, vol: 0.5, de: v(4000), ate: 400 });
    tom(a, { de: v(220), ate: 70, dur: 0.1, vol: 0.35 });
  },
  arremesso: (a) => {
    tom(a, { de: v(300), ate: v(520), dur: 0.18, vol: 0.08, onda: "triangle" });
    chiado(a, { dur: 0.18, vol: 0.08, filtro: "bandpass", de: 900, ate: 1800, q: 2 });
  },
  panelada: (a) => {
    // Panela batendo (clang) + chiado de fervura
    tom(a, { de: v(620), dur: 0.25, vol: 0.12, onda: "square" });
    tom(a, { de: v(930), dur: 0.2, vol: 0.06, onda: "triangle" });
    chiado(a, { dur: 0.45, vol: 0.14, filtro: "highpass", de: 3000, ate: 5000, atraso: 0.04 });
  },
  trovao: (a) => {
    chiado(a, { dur: 0.08, vol: 0.25, filtro: "highpass", de: 3000 });
    chiado(a, { dur: 0.7, vol: 0.4, de: 1200, ate: 120, atraso: 0.03 });
    tom(a, { de: 70, ate: 35, dur: 0.6, vol: 0.35, atraso: 0.03 });
  },
  canhao: (a) => {
    tom(a, { de: v(110), ate: 40, dur: 0.35, vol: 0.7 });
    chiado(a, { dur: 0.3, vol: 0.5, de: 1500, ate: 150 });
  },
  explosao: (a) => {
    tom(a, { de: v(80), ate: 28, dur: 0.6, vol: 0.8 });
    chiado(a, { dur: 0.55, vol: 0.55, de: 2000, ate: 100 });
  },
  moeda: (a) => {
    const f = v(988);
    tom(a, { de: f, dur: 0.06, vol: 0.1, onda: "square" });
    tom(a, { de: f * 1.335, dur: 0.15, vol: 0.1, onda: "square", atraso: 0.05 });
  },
  roubo: (a) => {
    // Alarme: duas notas descendo, meio desafinadas
    tom(a, { de: 660, dur: 0.16, vol: 0.18, onda: "sawtooth" });
    tom(a, { de: 440, dur: 0.28, vol: 0.18, onda: "sawtooth", atraso: 0.16 });
  },
  ondaVencida: (a) => {
    [523, 659, 784].forEach((f, i) => tom(a, { de: f, dur: i === 2 ? 0.35 : 0.14, vol: 0.16, onda: "triangle", atraso: i * 0.12 }));
  },
  contratar: (a) => {
    // Toc de madeira
    tom(a, { de: 520, ate: 300, dur: 0.07, vol: 0.35, onda: "triangle" });
    tom(a, { de: 780, ate: 450, dur: 0.06, vol: 0.2, onda: "triangle", atraso: 0.07 });
  },
  melhorar: (a) => {
    [523, 784, 1047].forEach((f, i) => tom(a, { de: f, dur: 0.12, vol: 0.12, onda: "square", atraso: i * 0.07 }));
  },
  dispensar: (a) => {
    tom(a, { de: 600, ate: 300, dur: 0.2, vol: 0.15, onda: "triangle" });
  },
  negado: (a) => {
    tom(a, { de: 160, dur: 0.12, vol: 0.2, onda: "square" });
  },
  sino: (a) => {
    // Sino de navio: duas batidas, com harmônicos que somem devagar
    for (const atraso of [0, 0.32]) {
      tom(a, { de: 880, dur: 1.2, vol: 0.18, atraso });
      tom(a, { de: 2390, dur: 0.6, vol: 0.06, atraso });
      tom(a, { de: 1320, dur: 0.9, vol: 0.05, atraso });
    }
  },
  vitoria: (a) => {
    [392, 523, 659, 784, 1047].forEach((f, i) => tom(a, { de: f, dur: i === 4 ? 0.7 : 0.15, vol: 0.16, onda: "square", atraso: i * 0.13 }));
    [262, 330, 392].forEach((f) => tom(a, { de: f, dur: 1.1, vol: 0.08, onda: "triangle", atraso: 0.52 }));
  },
  derrota: (a) => {
    [392, 370, 349, 262].forEach((f, i) => tom(a, { de: f, ate: i === 3 ? 196 : f, dur: i === 3 ? 0.9 : 0.3, vol: 0.18, onda: "triangle", atraso: i * 0.3 }));
  },
};

export function tocar(som: SomDefesa) {
  if (estaMudo()) return;
  const a = audio();
  if (!a || a.state !== "running") return;
  if (!liberado(som, a.currentTime)) return;
  efeitos[som](a);
}
