import rickAndRick from "../../content/colecoes/rick-and-rick.json";

export type Piece = { name: string; tag: string; artist: string; price: string; text: string; image: string | null };

export type Colecao = {
  name: string;
  status: string; // etiqueta: "Nova", "Em breve"...
  date: string;
  tagline: string;
  text: string;
  color: string; // mesma paleta de resultTheme
  preview: number; // quantas peças quem não tem conta vê
  pieces: Piece[];
};

// Para adicionar uma coleção: crie o JSON em content/colecoes e registre aqui. A primeira é a mais nova.
export const colecoes: Record<string, Colecao> = {
  "rick-and-rick": rickAndRick,
};

export const getColecao = (slug: string): Colecao | undefined => colecoes[slug];
