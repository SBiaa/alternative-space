// Sons da Lan House 2005, sintetizados na hora (Web Audio), todos originais: um "chiado de modem" inventado,
// o plim do ConversaNet e o zumbido do "chamar atenção". Nenhum som de sistema ou programa real.
// O tripulante pode desligar o modem e o mensageiro separadamente (opções guardadas no aparelho).

import { LAN } from "./config";

export type SomLan = "modem" | "mensagem" | "atencao" | "moeda" | "erro";
export type OpcoesSom = { modem: boolean; mensagem: boolean; efeitos: boolean };
const PADRAO: OpcoesSom = { modem: true, mensagem: true, efeitos: true };

let ctx: AudioContext | null = null;
let mestre: GainNode | null = null;

export function lerOpcoes(): OpcoesSom {
  try {
    const bruto = localStorage.getItem(LAN.chaveOpcoes);
    return bruto ? { ...PADRAO, ...(JSON.parse(bruto) as Partial<OpcoesSom>) } : PADRAO;
  } catch {
    return PADRAO;
  }
}
export function guardarOpcoes(o: OpcoesSom) {
  try {
    localStorage.setItem(LAN.chaveOpcoes, JSON.stringify(o));
  } catch {}
}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    mestre = ctx.createGain();
    mestre.gain.value = 0.18;
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

function ruido(a: AudioContext, dur: number, atraso: number, filtro: number, vol: number) {
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

const efeitos: Record<SomLan, (a: AudioContext) => void> = {
  // Chiado de conexão inventado: dois bipes, um trinado e um chiado curto.
  modem: (a) => {
    tom(a, "sine", 1200, null, 0.18, 0, 0.5);
    tom(a, "sine", 1650, null, 0.18, 0.22, 0.5);
    for (let i = 0; i < 6; i++) tom(a, "square", i % 2 ? 980 : 1430, null, 0.06, 0.5 + i * 0.07, 0.25);
    ruido(a, 0.6, 0.95, 2200, 0.35);
  },
  // Plim de mensagem: duas notas subindo.
  mensagem: (a) => {
    tom(a, "triangle", 660, null, 0.12, 0, 0.7);
    tom(a, "triangle", 990, null, 0.18, 0.1, 0.7);
  },
  // Chamar atenção: zumbido grave que vibra.
  atencao: (a) => {
    for (let i = 0; i < 4; i++) tom(a, "sawtooth", 140, 110, 0.08, i * 0.1, 0.35);
  },
  moeda: (a) => {
    tom(a, "square", 880, null, 0.06, 0, 0.3);
    tom(a, "square", 1320, null, 0.1, 0.06, 0.3);
  },
  erro: (a) => tom(a, "square", 220, 160, 0.2, 0, 0.3),
};

export function tocar(som: SomLan, o: OpcoesSom) {
  if (som === "modem" ? !o.modem : som === "mensagem" || som === "atencao" ? !o.mensagem : !o.efeitos) return;
  const a = audio();
  if (a) efeitos[som](a);
}
