// Único lugar para links externos e dados de contato.
// Deixe vazio o que ainda não existe: o link some do rodapé e os botões caem na âncora local.
export const site = {
  name: "Alternative Space",
  tagline: "Seu espaço pra ser alternativo.",
  description:
    "Comunidade para geeks, nerds, góticos e a galera underground: blog, desafio do mês, votação de drops e loja.",
  url: "https://alternativespace.com.br",
  links: {
    instagram: "",
    whatsapp: "",
    email: "",
  },
  // Menu principal. "tambem" acende o link em outras seções (Jogar cobre quizzes e fliperama).
  nav: [
    { label: "Jogar", href: "/jogos", tambem: ["/quiz"] },
    { label: "Fichas", href: "/fichas" },
    { label: "Blog", href: "/blog" },
    { label: "Coleções", href: "/colecoes" },
  ],
  // Fora do menu principal: aparece na gaveta do celular e no rodapé.
  navMais: [{ label: "Parceiros", href: "/parceiros" }],
};

// Destino dos botões de entrada enquanto não há comunidade aberta.
export const joinHref = "/#newsletter";
