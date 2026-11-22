// Mesa de Bolso: todo número, rótulo e texto de regra mora aqui. O motor e a tela só leem daqui.

export type AtributoId = "corpo" | "mente" | "labia";
export type FaixaId = "sucesso" | "custo" | "falha";

export const ATRIBUTOS: { id: AtributoId; nome: string; dica: string }[] = [
  { id: "corpo", nome: "Corpo", dica: "Força, pontaria, fôlego e jogo de cintura." },
  { id: "mente", nome: "Mente", dica: "Atenção, memória e raciocínio." },
  { id: "labia", nome: "Lábia", dica: "Papo, charme e sangue-frio com gente." },
];

export const ATRIBUTO_IDS = ATRIBUTOS.map((a) => a.id) as [AtributoId, ...AtributoId[]];

// Talentos genéricos, sem relação com nenhum livro de RPG. A aventura diz quais talentos ajudam em cada teste.
export const TALENTOS: { id: string; nome: string; dica: string }[] = [
  { id: "escalar", nome: "Escalar", dica: "Muros, telhados, árvores e cordas." },
  { id: "furtivo", nome: "Furtivo", dica: "Andar sem fazer barulho e passar despercebido." },
  { id: "mecanico", nome: "Mecânico", dica: "Consertar, abrir e desmontar engenhocas." },
  { id: "cuidador", nome: "Cuidador", dica: "Curativos, calma e ajuda a quem precisa." },
  { id: "charmoso", nome: "Charmoso", dica: "Cair nas graças de qualquer um." },
  { id: "blefe", nome: "Blefe", dica: "Contar uma boa história com cara séria." },
  { id: "observador", nome: "Observador", dica: "Notar o detalhe que ninguém viu." },
  { id: "memoria", nome: "Boa memória", dica: "Lembrar nomes, rotas e rostos." },
  { id: "corredor", nome: "Corredor", dica: "Sair na frente quando o caldo entorna." },
  { id: "resistente", nome: "Resistente", dica: "Aguentar frio, fome e susto." },
  { id: "improviso", nome: "Improviso", dica: "Fazer dar certo com o que tem na mão." },
  { id: "contador", nome: "Contador de histórias", dica: "Prender a atenção de uma roda inteira." },
];

export const TALENTO_IDS = TALENTOS.map((t) => t.id);

export const REGRAS = {
  dados: 2,
  faces: 6,
  folegoInicial: 6,
  atributoMin: 1,
  atributoMax: 4,
  // Soma dos três atributos na criação rápida.
  atributoPontos: 7,
  talentosEscolhidos: 2,
  bonusTalento: 1,
  // Sucesso: total >= dificuldade. Custo: até `margemCusto` pontos abaixo. Abaixo disso: falha que avança a história.
  margemCusto: 2,
  dificuldadeMin: 4,
  dificuldadeMax: 14,
  personagensPorConta: 12,
  nomeMax: 28,
  // Quantas cenas a trilha lembra. Baixo de propósito: o estado de quem joga sem conta vai num cookie (limite de 4 KB).
  trilhaMax: 40,
  // Rolagens por janela, por IP.
  limite: { max: 60, janelaS: 60 },
} as const;

export const FAIXAS: Record<FaixaId, { rotulo: string; curto: string; explica: string }> = {
  sucesso: { rotulo: "Sucesso", curto: "sucesso", explica: "Deu certo do jeito que você queria." },
  custo: { rotulo: "Sucesso com custo", curto: "sucesso com custo", explica: "Deu certo, mas custou alguma coisa." },
  falha: { rotulo: "Falha que avança", curto: "falha que avança a história", explica: "Não deu certo, mas a história segue." },
};

export type PecaCor = { id: string; nome: string; cor: string };

// Retrato montado com peças próprias (SVG). Cada lista é um seletor na criação.
export const RETRATO = {
  pele: [
    { id: "p1", nome: "Clara", cor: "#f1c9a5" },
    { id: "p2", nome: "Dourada", cor: "#d9a066" },
    { id: "p3", nome: "Morena", cor: "#a8683c" },
    { id: "p4", nome: "Escura", cor: "#6b4226" },
    { id: "p5", nome: "Cinza-azulada", cor: "#9fb0bf" },
  ] satisfies PecaCor[],
  cabeloCor: [
    { id: "c1", nome: "Preto", cor: "#1d1a1a" },
    { id: "c2", nome: "Castanho", cor: "#5a3a22" },
    { id: "c3", nome: "Ruivo", cor: "#b5542b" },
    { id: "c4", nome: "Loiro", cor: "#d8b45a" },
    { id: "c5", nome: "Prata", cor: "#c8c8d0" },
    { id: "c6", nome: "Azul", cor: "#3d5fa8" },
  ] satisfies PecaCor[],
  roupaCor: [
    { id: "r1", nome: "Laranja", cor: "#dd5d05" },
    { id: "r2", nome: "Azul", cor: "#2f5d9e" },
    { id: "r3", nome: "Verde", cor: "#3f7d5a" },
    { id: "r4", nome: "Vinho", cor: "#8a2f3f" },
    { id: "r5", nome: "Mostarda", cor: "#c9962b" },
  ] satisfies PecaCor[],
  cabelo: [
    { id: "curto", nome: "Curto" },
    { id: "longo", nome: "Longo" },
    { id: "coque", nome: "Coque" },
    { id: "careca", nome: "Sem cabelo" },
  ],
  rosto: [
    { id: "redondo", nome: "Redondo" },
    { id: "oval", nome: "Oval" },
    { id: "quadrado", nome: "Quadrado" },
  ],
  acessorio: [
    { id: "nenhum", nome: "Nenhum" },
    { id: "oculos", nome: "Óculos" },
    { id: "bone", nome: "Boné" },
    { id: "lenco", nome: "Lenço" },
  ],
} as const;

export const TEMAS = { fantasia: "Fantasia", "cidade-noturna": "Cidade noturna" } as const;

export const FINAIS = { bom: "Final bom", custo: "Final com custo", alternativo: "Final alternativo" } as const;

export const TEXTOS = {
  titulo: "Mesa de Bolso",
  chamada: "Aventuras curtas pra jogar sozinho: você escolhe, rola os dados e a história segue, mesmo quando dá errado.",
  comoJogar: [
    "Cada aventura é uma sequência de cenas. Você lê, escolhe o que a sua personagem faz e a história continua.",
    "Quando a escolha é arriscada, tem um teste: rola 2 dados de 6 faces, soma o atributo da sua personagem e compara com a dificuldade da cena.",
    "Se um talento seu ajuda naquele teste, soma mais 1.",
    "Total igual ou maior que a dificuldade: sucesso. Até 2 pontos abaixo: sucesso com custo (dá certo, mas custa algo, em geral Fôlego). Mais baixo que isso: falha que avança a história. Nunca é beco sem saída.",
    "Fôlego é o seu pique. Se zerar, a aventura vai pra um final alternativo, não pra um game over.",
    "Itens e marcas que você ganha ficam no diário da personagem.",
  ],
  semConta: "Crie sua conta pra guardar o diário da sua personagem",
  semContaExplica: "Sem conta, a partida fica só neste navegador. Ao criar a conta, a personagem e as aventuras vêm junto.",
  classificacao: "Livre / 10+",
  rolando: "Rolando os dados…",
  semAventuras: "Ainda não tem aventura por aqui.",
} as const;

export const BOLSO_SLUG = "mesa-de-bolso";
export const BASE = `/jogos/${BOLSO_SLUG}`;
