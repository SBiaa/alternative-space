// Catálogo do Fliperama: a lista e as páginas de cada jogo leem daqui.

export type Tipo = "Um botão" | "Habilidade" | "Estratégia" | "Rapidinho" | "Criativo";

export type Jogo = {
  slug: string;
  nome: string;
  tipo: Tipo;
  // Uma linha, pra cartões pequenos.
  resumo: string;
  // Duas linhas, pro destaque.
  texto: string;
  // Fundo e desenho da arte do cartão.
  cor: string;
  // Onde o jogo guarda o recorde no navegador, e como mostrar.
  recorde?: { chave: string; formato: (n: number) => string };
};

export const tipos: Tipo[] = ["Um botão", "Habilidade", "Estratégia", "Rapidinho", "Criativo"];

export const jogos: Jogo[] = [
  {
    slug: "defenda-o-navio",
    nome: "Defenda o Navio",
    tipo: "Estratégia",
    resumo: "Tower defense no convés, 12 ondas.",
    texto: "A marinha invade pelo convés. Posicione a tripulação, cada um com seu jeito de lutar, e não deixe levarem o tesouro.",
    cor: "#093f7a",
    recorde: { chave: "defenda-o-navio:recorde", formato: (n) => `onda ${n}` },
  },
  {
    slug: "log-pose-doido",
    nome: "Log Pose Doido",
    tipo: "Habilidade",
    resumo: "As setas giram junto com a bússola.",
    texto: "Guie o navio entre redemoinhos, tempestades e reis do mar. O Log Pose muda de ideia o tempo todo.",
    cor: "#0e5a6b",
    recorde: { chave: "log-pose-doido:recorde", formato: (n) => `${n} pontos` },
  },
  {
    slug: "picles-no-ralo",
    nome: "Picles no Ralo",
    tipo: "Um botão",
    resumo: "Segura pra subir, solta pra descer.",
    texto: "Leve o Picles Rick pelo esgoto sem virar janta de rato. Um botão só, e o túnel vai apertando.",
    cor: "#2f5a1f",
    recorde: { chave: "picles-no-ralo:recorde", formato: (n) => `${n} m` },
  },
  {
    slug: "corrida-de-chakra",
    nome: "Corrida de Chakra",
    tipo: "Um botão",
    resumo: "Segura, concentra e solta na hora certa.",
    texto: "Suba na árvore, ande na água e monte o Rasengan. Segura pra juntar chakra e solta bem na faixa certa.",
    cor: "#2b2f7a",
    recorde: { chave: "corrida-de-chakra:recorde", formato: (n) => `${n} pontos` },
  },
  {
    slug: "duelo-pirata",
    nome: "Duelo Pirata",
    tipo: "Habilidade",
    resumo: "Luta 1x1, contra a CPU ou um amigo.",
    texto: "Luffy, Zoro, Sanji ou Nami no convés. Contra a CPU ou contra um amigo, melhor de 3.",
    cor: "#7a2620",
  },
  {
    slug: "duelo-ninja",
    nome: "Duelo Ninja",
    tipo: "Habilidade",
    resumo: "Luta 1x1 de ninjas, com jutsus.",
    texto: "Naruto, Sasuke, Sakura ou Kakashi no campo de treino. Rasengan, Chidori e bola de fogo, melhor de 3.",
    cor: "#b4521a",
  },
  {
    slug: "fabrica-de-ajudantes",
    nome: "Fábrica de Ajudantes",
    tipo: "Rapidinho",
    resumo: "Clicker de pedidos absurdos.",
    texto: "Crie ajudantes azuis pra cumprir pedidos absurdos. Se demorar demais, eles entram em pane e a fábrica vira caos.",
    cor: "#1d4f9a",
  },
  {
    slug: "fruta-misteriosa",
    nome: "Fruta Misteriosa",
    tipo: "Habilidade",
    resumo: "Pula de ilha em ilha até o baú.",
    texto: "Atravesse as ilhas até o baú sem encostar na água. Em breve: uma fruta sorteada muda tudo.",
    cor: "#5b2a6e",
  },
  {
    slug: "monte-seu-pirata",
    nome: "Monte seu Pirata",
    tipo: "Criativo",
    resumo: "Vestir bonequinho que vira avatar.",
    texto: "Chapéu, cicatriz, arma, roupa e bichinho. Monta do seu jeito e usa como avatar do perfil.",
    cor: "#8a4a12",
  },
];

export const hrefJogo = (slug: string) => `/jogos/${slug}`;

export function acharJogo(slug: string): Jogo {
  const j = jogos.find((x) => x.slug === slug);
  if (!j) throw new Error(`Jogo desconhecido: ${slug}`);
  return j;
}

// Semana do ano (ISO), pra o destaque trocar sozinho toda segunda.
export function semanaDoAno(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - inicio.getTime()) / 86400000 + 1) / 7);
}

// Monte seu Pirata não é partida, então fica fora do rodízio.
export function jogoDaSemana(d: Date): Jogo {
  const elegiveis = jogos.filter((j) => j.tipo !== "Criativo");
  return elegiveis[semanaDoAno(d) % elegiveis.length];
}

// Outros jogos pra sugerir no fim da página: os seguintes na lista, dando a volta.
export function outrosJogos(slug: string, n = 3): Jogo[] {
  const i = jogos.findIndex((j) => j.slug === slug);
  return Array.from({ length: n }, (_, k) => jogos[(i + 1 + k) % jogos.length]);
}

export function lerRecorde(j: Jogo): number {
  if (!j.recorde) return 0;
  try {
    return Number(localStorage.getItem(j.recorde.chave)) || 0;
  } catch {
    return 0;
  }
}
