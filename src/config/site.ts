// Único lugar para links externos e dados de contato.
// Deixe vazio o que ainda não existe: o link some do rodapé e os botões caem na âncora local.
export const site = {
  name: "Alternative Space",
  tagline: "Seu espaço pra ser alternativo.",
  description:
    "Comunidade para geeks, nerds, góticos e a galera underground: blog, desafio do mês, votação de drops e loja.",
  url: "https://alternativespace.com.br",
  links: {
    discord: "",
    instagram: "",
    whatsapp: "",
    email: "",
  },
  nav: [
    { label: "Comunidade", href: "/#comunidade" },
    { label: "Blog", href: "/blog" },
    { label: "Desafio", href: "/#desafio" },
    { label: "Loja", href: "/#loja" },
    { label: "Parceiros", href: "/parceiros" },
  ],
};

export const discordHref = site.links.discord || "/#comunidade";
