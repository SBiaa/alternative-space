// Efeitos sonoros dos jogos de luta, gerados na hora com a Web Audio API (nenhum arquivo de áudio).
// O navegador só deixa tocar som depois de um clique ou tecla: chame destravarSom() num desses eventos.

export type Som =
  | "golpe" // golpe saindo (vento)
  | "acerto"
  | "acertoForte"
  | "bloqueio"
  | "pulo"
  | "queda"
  | "carga" // começo de qualquer especial
  | "rasengan"
  | "chidori"
  | "fogo"
  | "shuriken"
  | "tremor"
  | "corte"
  | "raio"
  | "round"
  | "luta"
  | "ko"
  | "vitoria";

let ac: AudioContext | null = null;
let saida: GainNode | null = null;
let ruidoBuf: AudioBuffer | null = null;
// Liga/desliga, lembrado no navegador. Dá pra assinar (useSyncExternalStore).
const CHAVE = "duelo:som";
let ligado: boolean | null = null;
const ouvintes = new Set<() => void>();

export function somLigado(): boolean {
  if (ligado === null) {
    try {
      ligado = localStorage.getItem(CHAVE) !== "0";
    } catch {
      ligado = true;
    }
  }
  return ligado;
}

export function ligarSom(v: boolean) {
  ligado = v;
  try {
    localStorage.setItem(CHAVE, v ? "1" : "0");
  } catch {}
  for (const f of ouvintes) f();
}

export function assinarSom(f: () => void) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ac) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    saida = ac.createGain();
    saida.gain.value = 0.5;
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
    ruidoBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
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
  s.start(t0, Math.random() * 0.5);
  s.stop(t0 + dur + 0.02);
}

export function tocar(som: Som) {
  if (!somLigado()) return;
  const a = audio();
  if (!a || a.state !== "running") return;
  switch (som) {
    case "golpe":
      chiado(a, { dur: 0.12, vol: 0.12, filtro: "bandpass", de: 700, ate: 2400, q: 1.5 });
      break;
    case "acerto":
      chiado(a, { dur: 0.07, vol: 0.4, de: 3000, ate: 800 });
      tom(a, { de: 170, ate: 60, dur: 0.14, vol: 0.5 });
      break;
    case "acertoForte":
      chiado(a, { dur: 0.12, vol: 0.55, de: 2500, ate: 300 });
      tom(a, { de: 130, ate: 38, dur: 0.28, vol: 0.8 });
      break;
    case "bloqueio":
      tom(a, { de: 1500, dur: 0.05, vol: 0.12, onda: "square" });
      tom(a, { de: 2600, ate: 1900, dur: 0.18, vol: 0.12, onda: "triangle" });
      break;
    case "pulo":
      tom(a, { de: 260, ate: 620, dur: 0.12, vol: 0.15 });
      break;
    case "queda":
      chiado(a, { dur: 0.25, vol: 0.4, de: 500, ate: 120 });
      tom(a, { de: 90, ate: 45, dur: 0.18, vol: 0.4 });
      break;
    case "carga":
      tom(a, { de: 380, ate: 950, dur: 0.25, vol: 0.12, onda: "triangle" });
      break;
    case "rasengan":
      // Zumbido que vai subindo, girando
      tom(a, { de: 140, ate: 420, dur: 0.75, vol: 0.1, onda: "sawtooth" });
      tom(a, { de: 147, ate: 440, dur: 0.75, vol: 0.08, onda: "sawtooth" });
      chiado(a, { dur: 0.75, vol: 0.16, filtro: "bandpass", de: 600, ate: 2200, q: 4 });
      break;
    case "chidori":
      // Chiado elétrico com estalos
      chiado(a, { dur: 0.85, vol: 0.2, filtro: "highpass", de: 2500, ate: 5000 });
      for (let i = 0; i < 9; i++) tom(a, { de: 600 + Math.random() * 2400, dur: 0.03, vol: 0.08, onda: "square", atraso: i * 0.09 + Math.random() * 0.04 });
      break;
    case "fogo":
      chiado(a, { dur: 0.75, vol: 0.45, de: 400, ate: 1800 });
      tom(a, { de: 90, ate: 60, dur: 0.6, vol: 0.2, onda: "sawtooth" });
      break;
    case "shuriken":
      tom(a, { de: 2200, ate: 3200, dur: 0.14, vol: 0.06 });
      chiado(a, { dur: 0.16, vol: 0.12, filtro: "bandpass", de: 3500, ate: 5000, q: 3 });
      break;
    case "tremor":
      tom(a, { de: 75, ate: 28, dur: 0.75, vol: 0.9 });
      chiado(a, { dur: 0.6, vol: 0.6, de: 350, ate: 80 });
      break;
    case "corte":
      chiado(a, { dur: 0.3, vol: 0.3, filtro: "bandpass", de: 2500, ate: 6500, q: 2 });
      break;
    case "raio":
      // O raio cai depois que a nuvem se forma.
      chiado(a, { dur: 0.45, vol: 0.08, de: 300, atraso: 0 });
      chiado(a, { dur: 1, vol: 0.7, de: 2500, ate: 150, atraso: 0.45 });
      tom(a, { de: 70, ate: 30, dur: 0.8, vol: 0.6, atraso: 0.45 });
      break;
    case "round":
      tom(a, { de: 523, dur: 0.14, vol: 0.18, onda: "triangle" });
      tom(a, { de: 784, dur: 0.3, vol: 0.18, onda: "triangle", atraso: 0.15 });
      break;
    case "luta":
      tom(a, { de: 220, dur: 1.1, vol: 0.35 });
      tom(a, { de: 331, dur: 0.9, vol: 0.15 });
      chiado(a, { dur: 0.1, vol: 0.2, de: 2000 });
      break;
    case "ko":
      tom(a, { de: 147, dur: 1.6, vol: 0.45 });
      tom(a, { de: 221, dur: 1.3, vol: 0.18 });
      tom(a, { de: 440, ate: 90, dur: 0.8, vol: 0.12, onda: "triangle" });
      break;
    case "vitoria":
      [523, 659, 784, 1046].forEach((f, i) => tom(a, { de: f, dur: i === 3 ? 0.5 : 0.16, vol: 0.16, onda: "triangle", atraso: i * 0.13 }));
      break;
  }
}
