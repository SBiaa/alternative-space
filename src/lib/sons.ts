// Efeitos sonoros sintetizados na hora (Web Audio): sem arquivos pra baixar.
// O navegador só libera áudio depois de um toque/tecla, então o contexto
// nasce no primeiro tocar() e fica guardado.

const CHAVE_MUDO = "sons:mudo";
const VOLUME = 0.25;

let ctx: AudioContext | null = null;
let mestre: GainNode | null = null;
let mudo: boolean | null = null;

export function estaMudo() {
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

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    mestre = ctx.createGain();
    mestre.gain.value = VOLUME;
    mestre.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tom = {
  tipo?: OscillatorType;
  de: number; // frequência inicial (Hz)
  ate?: number; // frequência final
  dur: number; // segundos
  vol?: number;
  atraso?: number;
};

function tom(a: AudioContext, { tipo = "square", de, ate, dur, vol = 1, atraso = 0 }: Tom) {
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

function ruido(a: AudioContext, dur: number, vol: number, filtro: number, atraso = 0) {
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

export type Som = "pulo" | "puloDuplo" | "pergaminho" | "golpe" | "queda" | "fim" | "recorde";

const efeitos: Record<Som, (a: AudioContext) => void> = {
  pulo: (a) => {
    tom(a, { tipo: "triangle", de: 300, ate: 620, dur: 0.14, vol: 0.6 });
    ruido(a, 0.1, 0.15, 2500);
  },
  puloDuplo: (a) => {
    tom(a, { tipo: "triangle", de: 450, ate: 900, dur: 0.16, vol: 0.6 });
    ruido(a, 0.14, 0.2, 4000);
  },
  pergaminho: (a) => {
    tom(a, { tipo: "square", de: 988, dur: 0.08, vol: 0.35 });
    tom(a, { tipo: "square", de: 1319, dur: 0.16, vol: 0.35, atraso: 0.07 });
  },
  golpe: (a) => {
    ruido(a, 0.18, 0.7, 3200);
    tom(a, { tipo: "sawtooth", de: 220, ate: 70, dur: 0.22, vol: 0.5 });
  },
  queda: (a) => {
    tom(a, { tipo: "triangle", de: 520, ate: 60, dur: 0.6, vol: 0.6 });
    ruido(a, 0.3, 0.4, 300, 0.5);
  },
  fim: (a) => {
    [392, 330, 262].forEach((f, i) => tom(a, { tipo: "triangle", de: f, dur: 0.22, vol: 0.5, atraso: i * 0.16 }));
  },
  recorde: (a) => {
    [523, 659, 784, 1047].forEach((f, i) => tom(a, { tipo: "square", de: f, dur: 0.16, vol: 0.3, atraso: i * 0.1 }));
  },
};

export function tocar(som: Som) {
  if (estaMudo()) return;
  const a = audio();
  if (!a) return;
  efeitos[som](a);
}
