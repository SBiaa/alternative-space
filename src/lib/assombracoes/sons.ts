// Sons do Assombrações da Vila: sintetizados no navegador (originais, sem arquivo de áudio).
// Começam desligados. No "modo sem sustos" os sons de mistério viram sons suaves, e o som de erro some.

export type SomEvento = "sinal" | "acerto" | "erro";
export type AjustesSom = { sons: boolean; semSustos: boolean };

let ctx: AudioContext | null = null;

function nota(c: AudioContext, freq: number, ini: number, dur: number, vol: number, tipo: OscillatorType = "sine") {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + ini);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + ini + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ini + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + ini);
  o.stop(c.currentTime + ini + dur + 0.05);
}

/** Notas de cada evento: [frequência, início, duração]. Pura, pra poder testar. */
export function notasDe(evento: SomEvento, a: AjustesSom): [number, number, number][] {
  if (!a.sons) return [];
  if (evento === "erro") return a.semSustos ? [] : [[220, 0, 0.35]];
  if (evento === "acerto") return [[523.25, 0, 0.3], [659.25, 0.12, 0.3], [783.99, 0.24, 0.5]];
  // sinal: mistério usa um intervalo mais fechado e grave; suave usa um intervalo alegre.
  return a.semSustos ? [[659.25, 0, 0.25], [880, 0.1, 0.3]] : [[196, 0, 0.4], [233.08, 0.14, 0.5]];
}

export function tocar(evento: SomEvento, a: AjustesSom): void {
  const notas = notasDe(evento, a);
  if (notas.length === 0 || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    for (const [f, i, d] of notas) nota(ctx, f, i, d, 0.08);
  } catch {
    // sem áudio disponível: segue em silêncio
  }
}
