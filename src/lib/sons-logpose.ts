// Sons do "Log Pose Doido", gerados na hora com a Web Audio API (nenhum arquivo de áudio).
// O navegador só libera áudio depois de um clique ou tecla: chame destravarSom() num desses eventos.

export type SomLogPose =
  | "zarpar"
  | "moeda"
  | "reparo"
  | "dano"
  | "raio"
  | "tique" // Log Pose prestes a girar
  | "giro"
  | "reiAviso"
  | "rei"
  | "nivel"
  | "naufragio"
  | "recorde";

const CHAVE_MUDO = "log-pose-doido:mudo";
const VOLUME = 0.35;

let ac: AudioContext | null = null;
let saida: GainNode | null = null;
let ruidoBuf: AudioBuffer | null = null;
let ondasGanho: GainNode | null = null;
let mudo: boolean | null = null;
const ouvintes = new Set<() => void>();

// Pra o botão de mudo acompanhar (useSyncExternalStore).
export function assinarMudo(f: () => void) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

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
  if (valor) ondas(false);
  for (const f of ouvintes) f();
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

const efeitos: Record<SomLogPose, (a: AudioContext) => void> = {
  zarpar: (a) => {
    // Buzina de navio: duas notas graves juntas.
    tom(a, { de: 110, dur: 0.9, vol: 0.35, onda: "sawtooth" });
    tom(a, { de: 165, dur: 0.9, vol: 0.2, onda: "sawtooth" });
    chiado(a, { dur: 0.9, vol: 0.05, de: 600 });
  },
  moeda: (a) => {
    tom(a, { de: 988, dur: 0.07, vol: 0.18, onda: "square" });
    tom(a, { de: 1319, dur: 0.18, vol: 0.18, onda: "square", atraso: 0.06 });
  },
  reparo: (a) => {
    // Marteladas + notinha alegre
    tom(a, { de: 700, ate: 400, dur: 0.06, vol: 0.3, onda: "triangle" });
    tom(a, { de: 700, ate: 400, dur: 0.06, vol: 0.3, onda: "triangle", atraso: 0.12 });
    tom(a, { de: 660, dur: 0.12, vol: 0.15, onda: "square", atraso: 0.26 });
    tom(a, { de: 880, dur: 0.2, vol: 0.15, onda: "square", atraso: 0.36 });
  },
  dano: (a) => {
    // Madeira quebrando
    chiado(a, { dur: 0.25, vol: 0.6, filtro: "bandpass", de: 1200, ate: 300, q: 2 });
    tom(a, { de: 160, ate: 55, dur: 0.3, vol: 0.6, onda: "triangle" });
    tom(a, { de: 420, ate: 250, dur: 0.05, vol: 0.25, onda: "square", atraso: 0.04 });
  },
  raio: (a) => {
    chiado(a, { dur: 0.12, vol: 0.5, filtro: "highpass", de: 3000, ate: 5000 });
    chiado(a, { dur: 1, vol: 0.55, de: 2000, ate: 120, atraso: 0.05 });
    tom(a, { de: 60, ate: 28, dur: 0.9, vol: 0.5, atraso: 0.05 });
  },
  tique: (a) => {
    tom(a, { de: 1800, dur: 0.03, vol: 0.12, onda: "square" });
  },
  giro: (a) => {
    // "Vuuum" girando
    chiado(a, { dur: 0.5, vol: 0.35, filtro: "bandpass", de: 400, ate: 2400, q: 3 });
    tom(a, { de: 300, ate: 900, dur: 0.25, vol: 0.12, onda: "triangle" });
    tom(a, { de: 900, ate: 450, dur: 0.25, vol: 0.12, onda: "triangle", atraso: 0.25 });
  },
  reiAviso: (a) => {
    // Bolhas subindo
    for (let i = 0; i < 6; i++) tom(a, { de: 200 + Math.random() * 300, ate: 600 + Math.random() * 400, dur: 0.06, vol: 0.12, atraso: i * 0.17 + Math.random() * 0.05 });
    tom(a, { de: 55, dur: 1.2, vol: 0.25 });
  },
  rei: (a) => {
    // Rugido
    tom(a, { de: 95, ate: 55, dur: 0.9, vol: 0.45, onda: "sawtooth" });
    tom(a, { de: 101, ate: 58, dur: 0.9, vol: 0.35, onda: "sawtooth" });
    chiado(a, { dur: 0.9, vol: 0.45, filtro: "bandpass", de: 500, ate: 200, q: 1.5 });
  },
  nivel: (a) => {
    [523, 659, 784].forEach((f, i) => tom(a, { de: f, dur: 0.14, vol: 0.16, onda: "triangle", atraso: i * 0.1 }));
  },
  naufragio: (a) => {
    chiado(a, { dur: 0.4, vol: 0.6, filtro: "bandpass", de: 1000, ate: 200, q: 2 });
    [392, 349, 311, 262].forEach((f, i) => tom(a, { de: f, dur: 0.3, vol: 0.2, onda: "triangle", atraso: 0.25 + i * 0.22 }));
    // Glub glub
    for (let i = 0; i < 4; i++) tom(a, { de: 180, ate: 420, dur: 0.07, vol: 0.12, atraso: 1.2 + i * 0.15 });
  },
  recorde: (a) => {
    [523, 659, 784, 1047].forEach((f, i) => tom(a, { de: f, dur: i === 3 ? 0.4 : 0.14, vol: 0.16, onda: "square", atraso: 1.6 + i * 0.11 }));
  },
};

export function tocar(som: SomLogPose) {
  if (estaMudo()) return;
  const a = audio();
  if (!a || a.state !== "running") return;
  efeitos[som](a);
}

// Barulho de mar de fundo: ruído grave que sobe e desce devagar, como ondas.
export function ondas(ligar: boolean) {
  const a = ac;
  if (!a) return;
  if (ligar && !estaMudo()) {
    if (!ondasGanho) {
      const s = a.createBufferSource();
      s.buffer = ruido(a);
      s.loop = true;
      const f = a.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 420;
      const balanco = a.createGain();
      balanco.gain.value = 0.5;
      const lfo = a.createOscillator();
      lfo.frequency.value = 0.18;
      const lfoGanho = a.createGain();
      lfoGanho.gain.value = 0.4;
      lfo.connect(lfoGanho).connect(balanco.gain);
      ondasGanho = a.createGain();
      ondasGanho.gain.value = 0;
      s.connect(f).connect(balanco).connect(ondasGanho).connect(saida!);
      s.start();
      lfo.start();
    }
    ondasGanho.gain.setTargetAtTime(0.18, a.currentTime, 0.4);
  } else if (ondasGanho) {
    ondasGanho.gain.setTargetAtTime(0, a.currentTime, 0.15);
  }
}
