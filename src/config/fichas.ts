// Sistemas de ficha de personagem. Cada um vive em /fichas/<slug>; as fichas salvas ficam na tabela `fichas`
// (db/fichas.sql), com a coluna `sistema` dizendo de qual sistema é.
//
// Pra adicionar um sistema: crie a entrada aqui, a página em src/app/fichas/<slug> e as regras em src/lib/fichas/<sistema>.
export type SistemaFicha = {
  slug: string;
  // Valor da coluna `sistema` no banco.
  id: string;
  name: string;
  tagline: string;
  text: string;
};

export const sistemasFicha: SistemaFicha[] = [
  {
    slug: "shadowrun",
    id: "sr5",
    name: "Shadowrun 5ª edição",
    tagline: "Cyberpunk, magia e corridas nas sombras.",
    text: "Criador guiado pelo sistema de prioridades, passo a passo e pensado pra quem nunca jogou.",
  },
  {
    slug: "pathfinder",
    id: "pf2e",
    name: "Pathfinder 2ª edição",
    tagline: "Fantasia heroica, masmorras e escolhas que importam.",
    text: "Monte seu herói por ancestralidade, antecedente e classe, com os boosts de atributo calculados pra você.",
  },
];
