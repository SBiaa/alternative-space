import { MANOBRA, MANOBRAS, TECLAS_PADRAO, type Direcao, type Gesto, type Manobra, type Onde } from "./config";

// Entradas do jogo: teclas e gestos viram manobras conforme o lugar (chão ou ar).

export type Acao = { tipo: "dir"; d: Direcao } | { tipo: "gesto"; g: Gesto };

export function resolverManobra(a: Acao, onde: Onde): Manobra | null {
  for (const m of MANOBRAS) {
    const def = MANOBRA[m];
    if (def.onde !== onde) continue;
    if (a.tipo === "dir" ? def.direcao === a.d : def.gesto === a.g) return m;
  }
  return null;
}

export type Teclas = Record<Direcao, string>;

export function direcaoDaTecla(teclas: Teclas, key: string): Direcao | null {
  for (const d of Object.keys(teclas) as Direcao[]) if (teclas[d].toLowerCase() === key.toLowerCase()) return d;
  return null;
}

export function normalizarTeclas(v: unknown): Teclas {
  const t = { ...TECLAS_PADRAO };
  if (v && typeof v === "object") {
    for (const d of Object.keys(t) as Direcao[]) {
      const k = (v as Record<string, unknown>)[d];
      if (typeof k === "string" && k.length > 0 && k.length <= 20) t[d] = k;
    }
  }
  // Duas direções na mesma tecla não valem: volta pro padrão.
  return new Set(Object.values(t)).size === 4 ? t : { ...TECLAS_PADRAO };
}

// Classifica um traço do dedo. Pontos em pixels de tela (y pra baixo).
// Devolve null pra toques curtos (que são "segurar" pra remar ou frear).
export function classificarGesto(pts: { x: number; y: number }[], minimo = 24): Gesto | null {
  if (pts.length < 2) return null;
  const a = pts[0];
  const b = pts[pts.length - 1];
  let caminho = 0;
  let cruz = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    caminho += Math.hypot(dx, dy);
    if (i >= 2) {
      const ux = pts[i - 1].x - pts[i - 2].x;
      const uy = pts[i - 1].y - pts[i - 2].y;
      cruz += ux * dy - uy * dx;
    }
  }
  if (caminho < minimo) return null;
  const reta = Math.hypot(b.x - a.x, b.y - a.y);
  // Semicírculo: o caminho é bem maior que a distância em linha reta.
  if (caminho > reta * 1.35 && Math.abs(cruz) > caminho * 2) return cruz > 0 ? "arc_cw" : "arc_ccw";
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? "swipe_up" : "swipe_down";
  return dx < 0 ? "swipe_left" : "swipe_right";
}
