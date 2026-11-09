// Equipamento do Player Core (Remaster) — dados resumidos, textos em palavras próprias.
import type { Arma, Armadura, Escudo, Item } from "../tipos";

type Cat = Arma["categoria"];
type Dano = Arma["tipoDano"];
type Maos = Arma["maos"];

function cac(id: string, nome: string, categoria: Cat, dano: string, tipoDano: Dano, maos: Maos, grupo: string, tracos: string[], preco: string, volume: string, alcance?: number): Arma {
  const a: Arma = { id, nome, categoria, tipo: "corpo-a-corpo", dano, tipoDano, maos, grupo, tracos, preco, volume };
  if (alcance !== undefined) a.alcance = alcance;
  return a;
}
function dist(id: string, nome: string, categoria: Cat, dano: string, tipoDano: Dano, maos: Maos, grupo: string, tracos: string[], preco: string, volume: string, alcance: number, recarga: number): Arma {
  return { id, nome, categoria, tipo: "distancia", dano, tipoDano, maos, grupo, tracos, preco, volume, alcance, recarga };
}

export const ARMAS: Arma[] = [
  // Desarmado
  cac("desarmado", "Ataque desarmado (punho)", "desarmado", "1d4", "C", "1", "pugilato", ["ágil", "acuidade", "não letal", "desarmado"], "—", "—"),
  // Simples corpo a corpo
  cac("clava", "Clava (Club)", "simples", "1d6", "C", "1", "clava", ["arremesso 10 pés"], "0", "1", 10),
  cac("adaga", "Adaga (Dagger)", "simples", "1d4", "P", "1", "faca", ["ágil", "acuidade", "arremesso 10 pés", "versátil E"], "2 pp", "L", 10),
  cac("manopla", "Manopla (Gauntlet)", "simples", "1d4", "C", "1", "pugilato", ["ágil", "mão livre"], "2 pp", "L"),
  cac("maca-leve", "Maça Leve (Light Mace)", "simples", "1d4", "C", "1", "clava", ["ágil", "acuidade", "empurrar"], "4 pp", "L"),
  cac("lanca-longa", "Lança Longa (Longspear)", "simples", "1d8", "P", "2", "haste", ["alcance"], "5 pp", "2"),
  cac("maca", "Maça (Mace)", "simples", "1d6", "C", "1", "clava", ["empurrar"], "1 po", "1"),
  cac("maca-estrela", "Maça-estrela (Morningstar)", "simples", "1d6", "C", "1", "clava", ["versátil P"], "1 po", "1"),
  cac("foice-curta", "Foice Curta (Sickle)", "simples", "1d4", "E", "1", "faca", ["ágil", "acuidade", "derrubar"], "2 pp", "L"),
  cac("lanca", "Lança (Spear)", "simples", "1d6", "P", "1", "lança", ["arremesso 20 pés"], "1 pp", "1", 20),
  cac("manopla-com-cravos", "Manopla com Cravos (Spiked Gauntlet)", "simples", "1d4", "P", "1", "pugilato", ["ágil", "mão livre"], "3 pp", "L"),
  cac("bordao", "Bordão (Staff)", "simples", "1d4", "C", "1", "clava", ["duas mãos d8", "monge"], "0", "1"),
  // Simples à distância
  dist("besta", "Besta (Crossbow)", "simples", "1d8", "P", "2", "besta", [], "3 po", "1", 120, 1),
  dist("dardo", "Dardo (Dart)", "simples", "1d4", "P", "1", "dardo", ["ágil", "arremesso"], "1 pc", "L", 20, 0),
  dist("besta-de-mao", "Besta de Mão (Hand Crossbow)", "simples", "1d6", "P", "1", "besta", [], "3 po", "L", 60, 1),
  dist("besta-pesada", "Besta Pesada (Heavy Crossbow)", "simples", "1d10", "P", "2", "besta", [], "4 po", "2", 120, 2),
  dist("azagaia", "Azagaia (Javelin)", "simples", "1d6", "P", "1", "dardo", ["arremesso"], "1 pp", "L", 30, 0),
  dist("funda", "Funda (Sling)", "simples", "1d6", "C", "1", "funda", ["propulsão"], "0", "L", 50, 1),
  dist("zarabatana", "Zarabatana (Blowgun)", "simples", "1", "P", "1", "zarabatana", ["ágil", "não letal"], "1 pp", "L", 20, 1),
  // Marciais corpo a corpo
  cac("espada-bastarda", "Espada Bastarda (Bastard Sword)", "marcial", "1d8", "E", "1", "espada", ["duas mãos d12"], "4 po", "1"),
  cac("machado-de-batalha", "Machado de Batalha (Battle Axe)", "marcial", "1d8", "E", "1", "machado", ["varredura"], "1 po", "1"),
  cac("bo", "Bô (Bo Staff)", "marcial", "1d8", "C", "2", "clava", ["aparar", "alcance", "derrubar", "monge"], "2 pp", "2"),
  cac("falcione", "Falcione (Falchion)", "marcial", "1d10", "E", "2", "espada", ["impetuoso", "varredura"], "3 po", "2"),
  cac("mangual", "Mangual (Flail)", "marcial", "1d6", "C", "1", "mangual", ["desarmar", "varredura", "derrubar"], "8 pp", "1"),
  cac("glaive", "Glaive", "marcial", "1d8", "E", "2", "haste", ["letal d8", "impetuoso", "alcance"], "1 po", "2"),
  cac("machado-grande", "Machado Grande (Greataxe)", "marcial", "1d12", "E", "2", "machado", ["varredura"], "2 po", "2"),
  cac("clava-grande", "Clava Grande (Greatclub)", "marcial", "1d10", "C", "2", "clava", ["golpe de volta", "empurrar"], "1 po", "2"),
  cac("espada-grande", "Espada Grande (Greatsword)", "marcial", "1d12", "E", "2", "espada", ["versátil P"], "2 po", "2"),
  cac("guisarme", "Guisarme", "marcial", "1d10", "E", "2", "haste", ["alcance", "derrubar"], "2 po", "2"),
  cac("alabarda", "Alabarda (Halberd)", "marcial", "1d10", "P", "2", "haste", ["alcance", "versátil E"], "2 po", "2"),
  cac("martelo-leve", "Martelo Leve (Light Hammer)", "marcial", "1d6", "C", "1", "martelo", ["ágil", "arremesso 20 pés"], "3 pp", "L", 20),
  cac("picareta-leve", "Picareta Leve (Light Pick)", "marcial", "1d4", "P", "1", "picareta", ["ágil", "fatal d8"], "4 pp", "L"),
  cac("espada-longa", "Espada Longa (Longsword)", "marcial", "1d8", "E", "1", "espada", ["versátil P"], "1 po", "1"),
  cac("main-gauche", "Main-gauche", "marcial", "1d4", "P", "1", "faca", ["ágil", "desarmar", "acuidade", "aparar", "versátil E"], "5 pp", "L"),
  cac("malho", "Malho (Maul)", "marcial", "1d12", "C", "2", "martelo", ["empurrar"], "3 po", "2"),
  cac("picareta", "Picareta de Guerra (Pick)", "marcial", "1d6", "P", "1", "picareta", ["fatal d10"], "7 pp", "1"),
  cac("ranseur", "Ranseur", "marcial", "1d10", "P", "2", "haste", ["desarmar", "alcance"], "2 po", "2"),
  cac("florete", "Florete (Rapier)", "marcial", "1d6", "P", "1", "espada", ["letal d8", "desarmar", "acuidade"], "2 po", "1"),
  cac("porrete", "Porrete (Sap)", "marcial", "1d6", "C", "1", "clava", ["ágil", "não letal"], "1 pp", "L"),
  cac("cimitarra", "Cimitarra (Scimitar)", "marcial", "1d6", "E", "1", "espada", ["impetuoso", "varredura"], "1 po", "1"),
  cac("gadanha", "Gadanha (Scythe)", "marcial", "1d10", "E", "2", "haste", ["letal d10", "derrubar"], "2 po", "2"),
  cac("espada-curta", "Espada Curta (Shortsword)", "marcial", "1d6", "P", "1", "espada", ["ágil", "acuidade", "versátil E"], "9 pp", "L"),
  cac("faca-estrela", "Faca-estrela (Starknife)", "marcial", "1d4", "P", "1", "faca", ["ágil", "letal d6", "acuidade", "arremesso 20 pés"], "2 po", "L", 20),
  cac("tridente", "Tridente (Trident)", "marcial", "1d8", "P", "1", "lança", ["arremesso 20 pés"], "1 po", "1", 20),
  cac("mangual-de-guerra", "Mangual de Guerra (War Flail)", "marcial", "1d10", "C", "2", "mangual", ["desarmar", "varredura", "derrubar"], "2 po", "2"),
  cac("martelo-de-guerra", "Martelo de Guerra (Warhammer)", "marcial", "1d8", "C", "1", "martelo", ["empurrar"], "1 po", "1"),
  cac("chicote", "Chicote (Whip)", "marcial", "1d4", "E", "1", "mangual", ["desarmar", "acuidade", "não letal", "alcance", "derrubar"], "1 pp", "1"),
  // Marciais à distância
  dist("arco-longo-composto", "Arco Longo Composto (Composite Longbow)", "marcial", "1d8", "P", "1+", "arco", ["letal d10", "propulsão", "rajada 30 pés"], "20 po", "2", 100, 0),
  dist("arco-curto-composto", "Arco Curto Composto (Composite Shortbow)", "marcial", "1d6", "P", "1+", "arco", ["letal d10", "propulsão"], "14 po", "1", 60, 0),
  dist("arco-longo", "Arco Longo (Longbow)", "marcial", "1d8", "P", "1+", "arco", ["letal d10", "rajada 30 pés"], "6 po", "2", 100, 0),
  dist("arco-curto", "Arco Curto (Shortbow)", "marcial", "1d6", "P", "1+", "arco", ["letal d10"], "3 po", "1", 60, 0),
];

export const ARMADURAS: Armadura[] = [
  { id: "sem-armadura", nome: "Sem armadura", categoria: "sem", bonusCA: 0, tetoDes: null, penalidade: 0, penDeslocamento: 0, forca: null, tracos: [], preco: "—", volume: "—" },
  { id: "roupas-de-explorador", nome: "Roupas de Explorador (Explorer's Clothing)", categoria: "sem", bonusCA: 0, tetoDes: 5, penalidade: 0, penDeslocamento: 0, forca: null, tracos: ["confortável"], preco: "1 pp", volume: "L" },
  { id: "acolchoada", nome: "Armadura Acolchoada (Padded)", categoria: "leve", bonusCA: 1, tetoDes: 3, penalidade: 0, penDeslocamento: 0, forca: 0, tracos: ["confortável"], preco: "2 pp", volume: "L" },
  { id: "couro", nome: "Armadura de Couro (Leather)", categoria: "leve", bonusCA: 1, tetoDes: 4, penalidade: -1, penDeslocamento: 0, forca: 0, tracos: [], preco: "2 po", volume: "1" },
  { id: "couro-batido", nome: "Couro Batido (Studded Leather)", categoria: "leve", bonusCA: 2, tetoDes: 3, penalidade: -1, penDeslocamento: 0, forca: 1, tracos: [], preco: "3 po", volume: "1" },
  { id: "camisao-de-malha", nome: "Camisão de Malha (Chain Shirt)", categoria: "leve", bonusCA: 2, tetoDes: 3, penalidade: -1, penDeslocamento: 0, forca: 1, tracos: ["flexível", "ruidosa"], preco: "5 po", volume: "1" },
  { id: "gibao-de-peles", nome: "Gibão de Peles (Hide)", categoria: "media", bonusCA: 3, tetoDes: 2, penalidade: -2, penDeslocamento: -5, forca: 2, tracos: [], preco: "2 po", volume: "2" },
  { id: "brunea", nome: "Brunea (Scale Mail)", categoria: "media", bonusCA: 3, tetoDes: 2, penalidade: -2, penDeslocamento: -5, forca: 2, tracos: [], preco: "4 po", volume: "2" },
  { id: "cota-de-malha", nome: "Cota de Malha (Chain Mail)", categoria: "media", bonusCA: 4, tetoDes: 1, penalidade: -2, penDeslocamento: -5, forca: 3, tracos: ["flexível", "ruidosa"], preco: "6 po", volume: "2" },
  { id: "peitoral", nome: "Peitoral (Breastplate)", categoria: "media", bonusCA: 4, tetoDes: 1, penalidade: -2, penDeslocamento: -5, forca: 3, tracos: [], preco: "8 po", volume: "2" },
  { id: "cota-de-talas", nome: "Cota de Talas (Splint Mail)", categoria: "pesada", bonusCA: 5, tetoDes: 1, penalidade: -3, penDeslocamento: -10, forca: 3, tracos: [], preco: "13 po", volume: "3" },
  { id: "meia-armadura", nome: "Meia-armadura (Half Plate)", categoria: "pesada", bonusCA: 5, tetoDes: 1, penalidade: -3, penDeslocamento: -10, forca: 3, tracos: [], preco: "18 po", volume: "3" },
  { id: "armadura-completa", nome: "Armadura Completa (Full Plate)", categoria: "pesada", bonusCA: 6, tetoDes: 0, penalidade: -3, penDeslocamento: -10, forca: 4, tracos: ["baluarte"], preco: "30 po", volume: "4" },
];

export const ESCUDOS: Escudo[] = [
  { id: "broquel", nome: "Broquel (Buckler)", bonusCA: 1, dureza: 3, pv: 6, preco: "1 po", volume: "L" },
  { id: "escudo-de-madeira", nome: "Escudo de Madeira (Wooden Shield)", bonusCA: 2, dureza: 3, pv: 12, preco: "1 po", volume: "1" },
  { id: "escudo-de-aco", nome: "Escudo de Aço (Steel Shield)", bonusCA: 2, dureza: 5, pv: 20, preco: "2 po", volume: "1" },
  { id: "escudo-de-corpo", nome: "Escudo de Corpo (Tower Shield)", bonusCA: 2, dureza: 5, pv: 20, preco: "10 po", volume: "4" },
];

export const ITENS: Item[] = [
  { id: "mochila", nome: "Mochila", preco: "1 pp", volume: "L", texto: "Carrega até 4 volumes; os 2 primeiros não contam enquanto ela está nas costas." },
  { id: "saco-de-dormir", nome: "Saco de Dormir", preco: "1 pc", volume: "L", texto: "Para descansar com algum conforto ao relento." },
  { id: "corda", nome: "Corda (50 pés)", preco: "5 pp", volume: "L", texto: "Corda resistente para escalar, amarrar ou descer." },
  { id: "tocha", nome: "Tocha", preco: "1 pc", volume: "L", texto: "Ilumina por cerca de uma hora; pode ser usada como arma improvisada com fogo." },
  { id: "racao", nome: "Rações (1 semana)", preco: "4 pp", volume: "L", texto: "Comida seca suficiente para uma semana de viagem." },
  { id: "kit-de-curandeiro", nome: "Kit de Curandeiro", preco: "5 po", volume: "1", texto: "Bandagens e ervas necessárias para usar Medicina em Primeiros Socorros e Tratar Ferimentos." },
  { id: "ferramentas-de-ladrao", nome: "Ferramentas de Ladrão", preco: "3 po", volume: "L", texto: "Gazuas e ferramentas finas para abrir fechaduras e desarmar armadilhas." },
  { id: "kit-de-reparos", nome: "Kit de Reparos", preco: "2 po", volume: "1", texto: "Ferramentas básicas para Reparar itens danificados." },
  { id: "pe-de-cabra", nome: "Pé de Cabra", preco: "5 pp", volume: "L", texto: "Dá vantagem ao forçar portas, baús e tampas." },
  { id: "pocao-de-cura-menor", nome: "Poção de Cura Menor", preco: "4 po", volume: "L", texto: "Ao beber, recupera 1d8 Pontos de Vida." },
  { id: "elixir-da-vida-menor", nome: "Elixir da Vida Menor", preco: "3 po", volume: "L", texto: "Elixir alquímico que restaura um pouco de vida e reforça contra doenças e venenos." },
  { id: "flechas", nome: "Flechas (10)", preco: "1 pp", volume: "L", texto: "Munição para arcos." },
  { id: "virotes", nome: "Virotes (10)", preco: "1 pp", volume: "L", texto: "Munição para bestas." },
  { id: "balas-de-funda", nome: "Balas de Funda (10)", preco: "1 pc", volume: "L", texto: "Munição para fundas." },
  { id: "dardos-de-zarabatana", nome: "Dardos de Zarabatana (10)", preco: "5 pc", volume: "L", texto: "Munição para zarabatanas." },
  { id: "bolsa-de-componentes", nome: "Bolsa de Componentes Materiais", preco: "5 pp", volume: "L", texto: "Pequenos ingredientes usados para conjurar magias com componentes materiais." },
  { id: "simbolo-religioso", nome: "Símbolo Religioso (madeira)", preco: "1 pp", volume: "L", texto: "Emblema da divindade, usado como foco por conjuradores divinos." },
  { id: "grimorio", nome: "Grimório (em branco)", preco: "1 po", volume: "L", texto: "Livro onde magos registram suas magias." },
  { id: "instrumento-musical", nome: "Instrumento Musical (portátil)", preco: "8 pp", volume: "1", texto: "Instrumento para Atuar; bardos o usam como foco." },
  { id: "cantil", nome: "Cantil", preco: "1 pc", volume: "—", texto: "Recipiente para água." },
  { id: "pederneira", nome: "Pederneira e Isqueiro", preco: "2 pc", volume: "—", texto: "Acende fogo em alguns segundos de esforço." },
  { id: "giz", nome: "Giz (10 peças)", preco: "1 pc", volume: "—", texto: "Para marcar caminhos e paredes." },
  { id: "lanterna-coberta", nome: "Lanterna Coberta", preco: "7 pp", volume: "L", texto: "Ilumina ao redor; a cobertura pode ser fechada para esconder a luz." },
  { id: "oleo", nome: "Óleo (1 frasco)", preco: "1 pc", volume: "L", texto: "Combustível para lanternas, ou pode ser espalhado e incendiado." },
  { id: "kit-de-alpinismo", nome: "Kit de Alpinismo", preco: "5 pp", volume: "1", texto: "Pitons, martelo e equipamento que ajudam a escalar." },
  { id: "kit-de-disfarce", nome: "Kit de Disfarce", preco: "2 po", volume: "L", texto: "Maquiagem e acessórios para se passar por outra pessoa." },
  { id: "ferramentas-de-artesao", nome: "Ferramentas de Artesão", preco: "4 po", volume: "2", texto: "Ferramentas para Criar itens de um ofício." },
  { id: "kit-de-alquimista", nome: "Ferramentas de Alquimista", preco: "3 po", volume: "2", texto: "Equipamento para preparar itens alquímicos." },
  { id: "grilhoes", nome: "Grilhões", preco: "5 pp", volume: "L", texto: "Algemas de metal para prender um prisioneiro." },
  { id: "espelho", nome: "Espelho", preco: "1 po", volume: "L", texto: "Espelho pequeno de metal polido." },
  { id: "luneta", nome: "Luneta", preco: "20 po", volume: "L", texto: "Permite enxergar detalhes a grande distância." },
  { id: "sabao", nome: "Sabão", preco: "2 pc", volume: "—", texto: "Para higiene ou deixar superfícies escorregadias." },
  { id: "tenda-pequena", nome: "Barraca (2 pessoas)", preco: "8 pp", volume: "1", texto: "Abrigo simples para duas pessoas." },
  { id: "vela", nome: "Velas (10)", preco: "1 pc", volume: "—", texto: "Luz fraca por algumas horas cada." },
  { id: "bolsa-de-cinto", nome: "Bolsa de Cinto", preco: "4 pc", volume: "—", texto: "Guarda pequenos objetos à mão." },
  { id: "aljava", nome: "Aljava", preco: "—", volume: "L", texto: "Porta-flechas preso ao corpo." },
  { id: "bainha", nome: "Bainha", preco: "1 pc", volume: "—", texto: "Guarda uma arma de lâmina na cintura ou costas." },
  { id: "material-de-escrita", nome: "Material de Escrita", preco: "1 pp", volume: "L", texto: "Pena, tinta e pergaminho." },
  { id: "kit-de-aventureiro", nome: "Kit de Aventureiro", preco: "7 pp", volume: "1", texto: "Conjunto básico: mochila, saco de dormir, rações, corda, tochas, pederneira, cantil, giz e sabão." },
  { id: "frasco-de-fogo-alquimico-menor", nome: "Fogo Alquímico Menor", preco: "3 po", volume: "L", texto: "Bomba de arremesso que explode em chamas e causa dano persistente de fogo." },
  { id: "antidoto-menor", nome: "Antídoto Menor", preco: "3 po", volume: "L", texto: "Ajuda a resistir a venenos por um tempo." },
];
