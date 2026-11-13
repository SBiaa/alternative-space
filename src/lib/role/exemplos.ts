import type { TipoPeca } from "./config";
import { colocarPeca, pistaVazia, type Peca, type Pista } from "./pista";

// Três picos de exemplo (fácil, médio, difícil), montados com as mesmas funções do editor.
// Usados pelo seed de desenvolvimento e pelos testes.

function montar(width: number, timeLimit: number, pecas: [TipoPeca, number, number, boolean?][]): Pista {
  let pista: Pista = { ...pistaVazia(width), timeLimit };
  for (const [type, x, y, flip] of pecas) {
    const r = colocarPeca(pista, { type, x, y, flip: Boolean(flip) } as Peca);
    if (!r.ok) throw new Error(`Exemplo inválido: ${type} em ${x},${y} (${r.motivo})`);
    pista = r.pista;
  }
  return pista;
}

const chao = (de: number, ate: number, y = 0): [TipoPeca, number, number][] =>
  Array.from({ length: ate - de }, (_, i) => ["ground", de + i, y] as [TipoPeca, number, number]);

export const EXEMPLOS: { slug: string; titulo: string; descricao: string; pista: Pista }[] = [
  {
    slug: "praca-do-poste",
    titulo: "Praça do Poste",
    descricao: "Reta tranquila com rampinha, caixote e um corrimão baixo.",
    pista: montar(48, 45, [
      ["start", 0, 0],
      ...chao(2, 46),
      ["ramp_small", 10, 1],
      ["box", 18, 1],
      ["rail", 26, 1],
      ["ramp_small", 34, 1],
      ["finish", 46, 0],
    ]),
  },
  {
    slug: "escadaria-da-padaria",
    titulo: "Escadaria da Padaria",
    descricao: "Banco, borda e uma escada de três com corrimão.",
    pista: montar(72, 60, [
      ["start", 0, 3],
      ...chao(2, 14, 3),
      ["bench", 6, 4],
      ["stairs3", 14, 0],
      ["rail_down", 14, 0],
      ...chao(17, 70),
      ["ledge", 24, 1],
      ["ramp_big", 34, 1],
      ["gap", 38, 0],
      ["box", 48, 1],
      ["ramp_big", 60, 1],
      ["finish", 70, 0],
    ].filter(([t, x]) => !(t === "ground" && (x === 38 || x === 39))) as [TipoPeca, number, number, boolean?][]),
  },
  {
    slug: "viaduto-de-madrugada",
    titulo: "Viaduto de Madrugada",
    descricao: "Escada de cinco, buracos e corrimão comprido. Pra quem já pegou o jeito.",
    pista: montar(96, 75, [
      ["start", 0, 5],
      ...chao(2, 12, 5),
      ["stairs5", 12, 0],
      ...chao(17, 94),
      ["ramp_small", 22, 1],
      ["gap", 26, 0],
      ["rail", 32, 1],
      ["rail", 35, 1],
      ["ramp_big", 42, 1],
      ["gap", 46, 0],
      ["ledge", 56, 1],
      ["box", 64, 1],
      ["ramp_small", 70, 1],
      ["bench", 76, 1],
      ["ramp_big", 86, 1],
      ["finish", 94, 0],
    ].filter(([t, x]) => !(t === "ground" && [26, 27, 46, 47].includes(x as number))) as [TipoPeca, number, number, boolean?][]),
  },
];
