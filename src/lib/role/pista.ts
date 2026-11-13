import { z } from "zod";
import { LAYOUT_VERSION, MOTIVO_PISTA, PECAS, PISTA, TIPOS_PECA, type MotivoPista, type TipoPeca } from "./config";

// Formato da pista salvo no banco e lido pelo motor (jogo e editor).

export type Peca = { type: TipoPeca; x: number; y: number; flip: boolean };
export type Pista = { version: number; width: number; height: number; timeLimit: number; pieces: Peca[] };

const inteiro = z.number().int();

export const pistaSchema = z.object({
  version: z.literal(LAYOUT_VERSION),
  width: inteiro.min(PISTA.larguraMin).max(PISTA.larguraMax),
  height: z.literal(PISTA.altura),
  timeLimit: inteiro.min(PISTA.tempoMin).max(PISTA.tempoMax),
  pieces: z
    .array(
      z.object({
        type: z.enum(TIPOS_PECA),
        x: inteiro.min(0),
        y: inteiro.min(0),
        flip: z.boolean(),
      }).strict(),
    )
    .max(PISTA.maxPecas),
}).strict();

export function pistaVazia(width: number = PISTA.larguraPadrao): Pista {
  return { version: LAYOUT_VERSION, width, height: PISTA.altura, timeLimit: PISTA.tempoPadrao, pieces: [] };
}

// Células (x,y) que a peça ocupa.
export function celulasDe(p: Peca): [number, number][] {
  const { w, h } = PECAS[p.type];
  const out: [number, number][] = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([p.x + i, p.y + j]);
  return out;
}

const cabe = (p: Peca, width: number, height: number) => {
  const { w, h } = PECAS[p.type];
  return p.x >= 0 && p.y >= 0 && p.x + w <= width && p.y + h <= height;
};

// Peças sólidas não se sobrepõem; corrimãos podem ficar na frente das sólidas, mas não de outro corrimão.
function sobrepoe(pecas: Peca[]): boolean {
  const ocupado = new Set<string>();
  for (const p of pecas) {
    const camada = PECAS[p.type].camada;
    for (const [x, y] of celulasDe(p)) {
      const k = `${camada}:${x}:${y}`;
      if (ocupado.has(k)) return true;
      ocupado.add(k);
    }
  }
  return false;
}

export type Validacao = { ok: true; pista: Pista } | { ok: false; motivo: MotivoPista; texto: string };

const falha = (motivo: MotivoPista): Validacao => ({ ok: false, motivo, texto: MOTIVO_PISTA[motivo] });

// Validação completa. Roda no servidor antes de gravar e no editor antes de testar.
export function validarPista(dado: unknown): Validacao {
  if (!dado || typeof dado !== "object") return falha("json");
  const bruto = dado as Record<string, unknown>;
  if (bruto.version !== LAYOUT_VERSION) return falha("versao");
  if (typeof bruto.width !== "number" || !Number.isInteger(bruto.width) || bruto.width < PISTA.larguraMin || bruto.width > PISTA.larguraMax) return falha("largura");
  if (bruto.height !== PISTA.altura) return falha("altura");
  if (typeof bruto.timeLimit !== "number" || !Number.isInteger(bruto.timeLimit) || bruto.timeLimit < PISTA.tempoMin || bruto.timeLimit > PISTA.tempoMax) return falha("tempo");
  if (Array.isArray(bruto.pieces) && bruto.pieces.length > PISTA.maxPecas) return falha("muitasPecas");
  if (Array.isArray(bruto.pieces) && bruto.pieces.some((p) => !TIPOS_PECA.includes((p as Peca)?.type))) return falha("tipo");
  const r = pistaSchema.safeParse(dado);
  if (!r.success) return falha("json");
  const pista = r.data as Pista;
  if (pista.pieces.some((p) => !cabe(p, pista.width, pista.height))) return falha("foraDaGrade");
  if (sobrepoe(pista.pieces)) return falha("sobreposicao");
  const largadas = pista.pieces.filter((p) => p.type === "start");
  const chegadas = pista.pieces.filter((p) => p.type === "finish");
  if (largadas.length !== 1) return falha("largada");
  if (chegadas.length !== 1) return falha("chegada");
  if (largadas[0].x >= chegadas[0].x) return falha("ordem");
  return { ok: true, pista };
}

// ---------- Edição (usada pelo editor; tudo imutável pra facilitar desfazer/refazer) ----------

export function pecaEm(pista: Pista, x: number, y: number): Peca | null {
  // Corrimão por cima ganha (é o que aparece na frente).
  const achadas = pista.pieces.filter((p) => celulasDe(p).some(([cx, cy]) => cx === x && cy === y));
  return achadas.find((p) => PECAS[p.type].camada === "corrimao") ?? achadas[0] ?? null;
}

export type Colocacao = { ok: true; pista: Pista } | { ok: false; motivo: MotivoPista };

export function colocarPeca(pista: Pista, nova: Peca): Colocacao {
  if (!cabe(nova, pista.width, pista.height)) return { ok: false, motivo: "foraDaGrade" };
  let pieces = pista.pieces;
  // Largada e chegada são únicas: colocar outra move a antiga.
  if (nova.type === "start" || nova.type === "finish") pieces = pieces.filter((p) => p.type !== nova.type);
  if (pieces.length >= PISTA.maxPecas) return { ok: false, motivo: "muitasPecas" };
  if (sobrepoe([...pieces, nova])) return { ok: false, motivo: "sobreposicao" };
  return { ok: true, pista: { ...pista, pieces: [...pieces, nova] } };
}

export function removerPeca(pista: Pista, alvo: Peca): Pista {
  return { ...pista, pieces: pista.pieces.filter((p) => p !== alvo) };
}

export function espelharPeca(pista: Pista, alvo: Peca): Pista {
  return { ...pista, pieces: pista.pieces.map((p) => (p === alvo ? { ...p, flip: !p.flip } : p)) };
}

// Mudar a largura descarta o que ficaria fora da grade.
export function mudarLargura(pista: Pista, width: number): Pista {
  const w = Math.max(PISTA.larguraMin, Math.min(PISTA.larguraMax, Math.round(width)));
  return { ...pista, width: w, pieces: pista.pieces.filter((p) => cabe(p, w, pista.height)) };
}

export function mudarTempo(pista: Pista, s: number): Pista {
  return { ...pista, timeLimit: Math.max(PISTA.tempoMin, Math.min(PISTA.tempoMax, Math.round(s))) };
}

// Rascunho: mesmo formato e mesmas regras de grade, mas pode estar sem largada ou chegada ainda.
const SO_PRA_PUBLICAR: MotivoPista[] = ["largada", "chegada", "ordem"];

export function validarRascunho(dado: unknown): { ok: true; pista: Pista } | { ok: false; texto: string } {
  const v = validarPista(dado);
  if (v.ok) return v;
  if (SO_PRA_PUBLICAR.includes(v.motivo)) return { ok: true, pista: pistaSchema.parse(dado) as Pista };
  return { ok: false, texto: v.texto };
}
