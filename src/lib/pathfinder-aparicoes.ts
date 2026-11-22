// Aparições do Animista: espíritos com quem ele se sintoniza a cada dia.
// Ele se sintoniza com 2 aparições no nível 1, 3 no 7 e 4 no 15. Uma delas é a primária:
// a magia de receptáculo dela é a magia de foco do dia.

export type Aparicao = { id: string; nome: string; texto: string };

export const APARICOES: Aparicao[] = [
  { id: "guardiao-bosques", nome: "Guardião dos Bosques e Jardins", texto: "Espírito das plantas que crescem e protegem." },
  { id: "eco-momentos", nome: "Eco dos Momentos Perdidos", texto: "Memórias esquecidas e o peso do passado." },
  { id: "impostor-ocultos", nome: "Impostor em Lugares Ocultos", texto: "Enganos, disfarces e segredos." },
  { id: "espreitador-escuridao", nome: "Espreitador na Escuridão Devoradora", texto: "Fome e sombras que engolem tudo." },
  { id: "monarca-feerico", nome: "Monarca das Cortes Feéricas", texto: "A nobreza caprichosa do Primeiro Mundo." },
  { id: "foliao-alegria", nome: "Folião da Alegria Perdida", texto: "Festa, risadas e a tristeza depois delas." },
  { id: "cacador-galhos", nome: "Caçador em Galhos Sombrios", texto: "O predador silencioso da floresta." },
  { id: "zelador-pedra-fogo", nome: "Zelador de Pedra e Fogo", texto: "A forja, a lareira e as montanhas." },
  { id: "vanguarda-aguas", nome: "Vanguarda das Águas Rugientes", texto: "Rios, marés e tempestades." },
  { id: "testemunha-batalhas", nome: "Testemunha de Batalhas Antigas", texto: "Os ecos de guerreiros e guerras." },
];

export const acharAparicao = (id: string) => APARICOES.find((a) => a.id === id);

// Quantas aparições o Animista sintoniza por dia, conforme o nível.
export const aparicoesPorDia = (nivel: number) => (nivel >= 15 ? 4 : nivel >= 7 ? 3 : 2);
