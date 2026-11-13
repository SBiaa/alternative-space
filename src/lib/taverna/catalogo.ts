// Catálogo de melhorias e arquétipos. É a fonte do seed (npm run seed:taverna): o jogo lê do banco,
// e só cai nisto aqui se o seed ainda não rodou. Nomes de bebidas, pratos e lugares são inventados.

import type { Arquetipo, ItemCatalogo } from "./tipos";

const receita = (
  slug: string, name: string, description: string, position: number, minTavernLevel: number,
  prices: number[], preco: number[], ingrediente: number[], satisfacao: number[], prep: number[], bebida: boolean,
): ItemCatalogo => ({
  slug, kind: "receita", name, description, maxLevel: prices.length, prices, minTavernLevel, position,
  effects: prices.map((_, i) => ({ preco: preco[i], ingrediente: ingrediente[i], satisfacao: satisfacao[i], prep: prep[i], bebida: bebida ? 1 : 0 })),
});

export const CATALOGO_ITENS: ItemCatalogo[] = [
  // Mobília: cada nível de mesa é mais uma mesa daquele tipo; as cadeiras valem pro salão todo.
  { slug: "mesa-2", kind: "mobilia", name: "Mesa de dois", description: "Cabe um casal de aventureiros. Cada nível é mais uma mesa.", maxLevel: 4, prices: [0, 60, 90, 130], minTavernLevel: 1, position: 1, effects: [{ lugares: 2 }, { lugares: 2 }, { lugares: 2 }, { lugares: 2 }] },
  { slug: "mesa-4", kind: "mobilia", name: "Mesa de quatro", description: "Cabe um grupo inteiro. Cada nível é mais uma mesa.", maxLevel: 4, prices: [0, 110, 160, 220], minTavernLevel: 1, position: 2, effects: [{ lugares: 4 }, { lugares: 4 }, { lugares: 4 }, { lugares: 4 }] },
  { slug: "mesa-redonda", kind: "mobilia", name: "Mesa redonda grande", description: "Seis lugares em volta de uma tábua só. Cada nível é mais uma mesa.", maxLevel: 3, prices: [220, 300, 380], minTavernLevel: 3, position: 3, effects: [{ lugares: 6, conforto: 0.05 }, { lugares: 6, conforto: 0.05 }, { lugares: 6, conforto: 0.05 }] },
  {
    slug: "cadeiras", kind: "mobilia", name: "Cadeiras", description: "Do banco duro à poltrona: quanto melhor, mais devagar a paciência cai e mais conforto na conta.",
    maxLevel: 3, prices: [0, 140, 320], minTavernLevel: 1, position: 4,
    effects: [{ paciencia: 1, conforto: 0.1 }, { paciencia: 0.85, conforto: 0.5 }, { paciencia: 0.72, conforto: 0.9 }],
  },

  // Bebidas e cardápio: o nível 1 é "liberar a receita", os seguintes melhoram.
  receita("cerveja", "Cerveja do Carvalho", "Cerveja escura de barril. A anã ferreira só aceita a partir do nível 2.", 10, 1, [0, 80, 180], [8, 11, 15], [3, 4, 6], [0.45, 0.7, 0.95], [0, 0, 0], true),
  receita("hidromel", "Hidromel Dourada-Lenta", "Mel fermentado de colmeia velha. Os magos e bardos gostam.", 11, 1, [70, 130, 240], [12, 16, 21], [4, 6, 8], [0.5, 0.75, 0.95], [0, 0, 0], true),
  receita("vinho", "Vinho Vale-Tinto", "Safra rara do vale. Quem entende de vinho paga bem.", 12, 2, [160, 260, 400], [18, 24, 31], [7, 9, 12], [0.5, 0.75, 0.95], [0, 0, 0], true),
  receita("cha", "Chá de Brasa-Mansa", "Ervas quentes pra quem não bebe. Sai na hora.", 13, 1, [50, 100, 190], [7, 9, 12], [2, 3, 4], [0.5, 0.72, 0.9], [0, 0, 0], true),
  receita("ensopado", "Ensopado do Caldeirão Torto", "Ensopado grosso de raízes e carne. Leva um tempo no fogo.", 14, 1, [0, 90, 190], [14, 18, 23], [5, 7, 9], [0.5, 0.72, 0.92], [8, 6, 5], false),
  receita("assado", "Assado da Casa Cansada", "Assado farto do dia. Demora, mas vale cada moeda.", 15, 2, [180, 280, 420], [24, 30, 38], [9, 12, 15], [0.55, 0.78, 0.96], [14, 11, 9], false),
  receita("torta", "Torta de Amora-Sombra", "Torta doce de fruta do pântano. Todo mundo perdoa a demora.", 16, 3, [200, 300, 440], [16, 21, 27], [5, 7, 9], [0.55, 0.78, 0.96], [10, 8, 6], false),

  // Ambiente: bônus pequeno de satisfação e reputação por cliente.
  { slug: "lareira", kind: "ambiente", name: "Lareira", description: "Fogo bom no inverno do salão. Sobe um pouco a satisfação e a reputação.", maxLevel: 3, prices: [90, 180, 320], minTavernLevel: 1, position: 20, effects: [{ satisfacao: 0.02, reputacao: 0.002 }, { satisfacao: 0.04, reputacao: 0.004 }, { satisfacao: 0.06, reputacao: 0.006 }] },
  { slug: "iluminacao", kind: "ambiente", name: "Iluminação", description: "Velas, candeeiros e um lustre de ferro.", maxLevel: 3, prices: [70, 150, 260], minTavernLevel: 2, position: 21, effects: [{ satisfacao: 0.015, reputacao: 0.002 }, { satisfacao: 0.03, reputacao: 0.004 }, { satisfacao: 0.045, reputacao: 0.006 }] },
  { slug: "decoracao", kind: "ambiente", name: "Decoração", description: "Tapeçarias, troféus de caça e um mapa velho na parede.", maxLevel: 3, prices: [100, 200, 340], minTavernLevel: 3, position: 22, effects: [{ satisfacao: 0.015, reputacao: 0.003 }, { satisfacao: 0.03, reputacao: 0.005 }, { satisfacao: 0.045, reputacao: 0.008 }] },

  // Expansão do salão: tamanho absoluto da grade em cada nível; o segundo andar soma linhas.
  { slug: "salao", kind: "expansao", name: "Ampliar o salão", description: "Derruba uma parede e abre espaço na grade pra mais mesas.", maxLevel: 3, prices: [150, 320, 560], minTavernLevel: 2, position: 30, effects: [{ colunas: 5, linhas: 3 }, { colunas: 5, linhas: 4 }, { colunas: 6, linhas: 4 }] },
  { slug: "segundo-andar", kind: "expansao", name: "Segundo andar", description: "Um mezanino com vista pro salão: duas linhas a mais na grade.", maxLevel: 1, prices: [900], minTavernLevel: 5, position: 31, effects: [{ linhasExtra: 2 }] },
];

export const CATALOGO_ARQUETIPOS: Arquetipo[] = [
  { slug: "guerreiro", name: "Guerreiro", icone: "⚔️", orders: ["assado", "cerveja", "ensopado"], patience: 38, spend: 1.2, tip: 0.15, quirk: { id: "nenhuma", rotulo: "Sem manias, gasta bem" }, unlock: { reputacao: 0, nivel: 1 } },
  { slug: "barbaro", name: "Bárbaro", icone: "🪓", orders: ["cerveja", "assado", "ensopado"], patience: 22, spend: 1.5, tip: 0.08, quirk: { id: "quebra-cadeira", rotulo: "Quebra a cadeira se perder a paciência" }, unlock: { reputacao: 0, nivel: 1 } },
  { slug: "bardo", name: "Bardo", icone: "🎶", orders: ["cerveja", "cha"], patience: 36, spend: 0.8, tip: 0.12, quirk: { id: "acalma-salao", rotulo: "Os outros esperam com mais calma" }, unlock: { reputacao: 1.8, nivel: 1 } },
  { slug: "ladino", name: "Ladino", icone: "🗡️", orders: ["cerveja", "torta", "ensopado"], patience: 30, spend: 0.7, tip: 0.05, quirk: { id: "foge-sem-pagar", rotulo: "Tenta sair sem pagar se ninguém cobrar" }, unlock: { reputacao: 2.4, nivel: 1 } },
  { slug: "mago", name: "Mago", icone: "🔮", orders: ["vinho", "hidromel"], patience: 34, spend: 1.3, tip: 0.35, quirk: { id: "longe-de-barulho", rotulo: "Quer mesa longe de bardo e bárbaro", distancia: 2 }, unlock: { reputacao: 2.8, nivel: 2 } },
  { slug: "clerigo", name: "Clérigo", icone: "✨", orders: ["cha", "ensopado"], patience: 40, spend: 0.9, tip: 0.04, quirk: { id: "bonus-reputacao", rotulo: "A visita dá reputação", bonus: 0.06 }, unlock: { reputacao: 3, nivel: 2 } },
  { slug: "ana-ferreira", name: "Anã ferreira", icone: "🔨", orders: ["cerveja", "assado"], patience: 32, spend: 1.2, tip: 0.4, quirk: { id: "so-cerveja-boa", rotulo: "Só aceita cerveja de boa qualidade", nivelMin: 2 }, unlock: { reputacao: 3.4, nivel: 3 } },
  { slug: "elfa-cacadora", name: "Elfa caçadora", icone: "🏹", orders: ["vinho", "torta"], patience: 30, spend: 1.4, tip: 0.3, quirk: { id: "exige-conforto", rotulo: "Exige mesa limpa e cadeira confortável", confortoMin: 0.5 }, unlock: { reputacao: 3.8, nivel: 4 } },
];
