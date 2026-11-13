import { baixo, duracaoExemplo, EXEMPLO, melodia, percussao } from "./faixaExemplo";

// Áudio do Riff Estelar. Um AudioContext só, criado num gesto do tripulante (regra dos navegadores).
// Músicas com audio_url "synth:<slug>" são geradas aqui mesmo (só a faixa de exemplo de desenvolvimento).

let ctx: AudioContext | null = null;
const cache = new Map<string, Promise<AudioBuffer>>();

export async function contexto(): Promise<AudioContext> {
  if (!ctx || ctx.state === "closed") ctx = new AudioContext({ latencyHint: "interactive" });
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

export function carregarMusica(url: string): Promise<AudioBuffer> {
  let p = cache.get(url);
  if (!p) {
    p = (async () => {
      if (url === `synth:${EXEMPLO.slug}`) return sintetizarExemplo();
      if (url.startsWith("synth:")) throw new Error("Sintetizador desconhecido");
      const c = await contexto();
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Não deu pra baixar a música");
      return c.decodeAudioData(await resp.arrayBuffer());
    })();
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** Toca o buffer no tempo `quandoS` do relógio do áudio. */
export function tocarBuffer(c: AudioContext, buffer: AudioBuffer, quandoS: number, aPartirDeS = 0): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(c.destination);
  src.start(quandoS, aPartirDeS);
  return src;
}

/** Clique curto (metrônomo da calibração e do editor). */
export function clique(c: AudioContext, quandoS: number, forte = true) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = forte ? 1500 : 1000;
  g.gain.setValueAtTime(0.0001, quandoS);
  g.gain.exponentialRampToValueAtTime(0.4, quandoS + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, quandoS + 0.05);
  o.connect(g).connect(c.destination);
  o.start(quandoS);
  o.stop(quandoS + 0.06);
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

async function sintetizarExemplo(): Promise<AudioBuffer> {
  const taxa = 44100;
  const off = new OfflineAudioContext(2, Math.ceil((duracaoExemplo / 1000) * taxa), taxa);
  const mestre = off.createGain();
  mestre.gain.value = 0.7;
  const compressor = off.createDynamicsCompressor();
  mestre.connect(compressor).connect(off.destination);

  const ruido = off.createBuffer(1, taxa, taxa);
  const dados = ruido.getChannelData(0);
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;

  const env = (g: GainNode, t: number, pico: number, dur: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };

  for (const p of percussao()) {
    const t = p.t / 1000;
    if (p.tipo === "bumbo") {
      const o = off.createOscillator();
      const g = off.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      env(g, t, 0.9, 0.25);
      o.connect(g).connect(mestre);
      o.start(t);
      o.stop(t + 0.3);
    } else {
      const s = off.createBufferSource();
      s.buffer = ruido;
      const f = off.createBiquadFilter();
      f.type = p.tipo === "caixa" ? "bandpass" : "highpass";
      f.frequency.value = p.tipo === "caixa" ? 1800 : 7000;
      const g = off.createGain();
      env(g, t, p.tipo === "caixa" ? 0.5 : 0.12, p.tipo === "caixa" ? 0.18 : 0.04);
      s.connect(f).connect(g).connect(mestre);
      s.start(t, Math.random() * 0.5);
      s.stop(t + 0.2);
    }
  }

  for (const b of baixo()) {
    const t = b.t / 1000;
    const o = off.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = hz(b.midi);
    const f = off.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 500;
    const g = off.createGain();
    env(g, t, 0.28, b.dur / 1000);
    o.connect(f).connect(g).connect(mestre);
    o.start(t);
    o.stop(t + b.dur / 1000 + 0.02);
  }

  for (const n of melodia()) {
    const t = n.t / 1000;
    const o = off.createOscillator();
    o.type = "triangle";
    o.frequency.value = hz(n.midi + 12);
    const g = off.createGain();
    env(g, t, n.forte ? 0.32 : 0.22, n.dur / 1000);
    o.connect(g).connect(mestre);
    o.start(t);
    o.stop(t + n.dur / 1000 + 0.02);
  }

  return off.startRendering();
}
