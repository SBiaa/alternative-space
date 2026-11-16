// Regras de personagem do Pathfinder 2ª edição (Remaster, Player Core), níveis 1 a 20.
// Atributos são modificadores (começam em 0). Cada boost dá +1 e cada falha tira 1.
// Dentro de um mesmo grupo de boosts (ancestralidade, antecedente, livres, aumento de nível) não dá pra repetir atributo.
// Nos aumentos dos níveis 5/10/15/20, um atributo que já está em +4 ou mais só sobe +1 a cada dois aumentos.

import { JOGO_VAZIO, normalizarJogo, type Jogo } from "./pathfinder-condicoes";
import { CONJURACAO, MAX_FOCO, TRADICOES, circuloMaximo, vagasMagia, type Tradicao } from "./pathfinder-magia";
import { acharArma, acharArmadura, acharEscudo, COMBATE_CLASSE, type Arma } from "./pathfinder-equip";

export const ATRIBUTOS = ["for", "des", "con", "int", "sab", "car"] as const;
export type Atributo = (typeof ATRIBUTOS)[number];

export const NOME_ATRIBUTO: Record<Atributo, string> = {
  for: "Força",
  des: "Destreza",
  con: "Constituição",
  int: "Inteligência",
  sab: "Sabedoria",
  car: "Carisma",
};

export const PROFS = ["destreinado", "treinado", "especialista", "mestre", "lendario"] as const;
export type Prof = (typeof PROFS)[number];
const BONUS_PROF: Record<Prof, number> = { destreinado: 0, treinado: 2, especialista: 4, mestre: 6, lendario: 8 };
export const NOME_PROF: Record<Prof, string> = { destreinado: "D", treinado: "T", especialista: "E", mestre: "M", lendario: "L" };
export const NOME_PROF_LONGO: Record<Prof, string> = {
  destreinado: "Destreinado",
  treinado: "Treinado",
  especialista: "Especialista",
  mestre: "Mestre",
  lendario: "Lendário",
};
// Nível mínimo pra chegar em cada grau numa perícia.
const NIVEL_MIN_PROF: Partial<Record<Prof, number>> = { especialista: 2, mestre: 7, lendario: 15 };
const subir = (p: Prof): Prof => PROFS[Math.min(PROFS.indexOf(p) + 1, PROFS.length - 1)];
const maior = (a: Prof, b: Prof): Prof => (PROFS.indexOf(a) >= PROFS.indexOf(b) ? a : b);

export const NIVEL_MAX = 20;
export const NIVEIS_AUMENTO = [5, 10, 15, 20] as const;
export const AUMENTOS_POR_NIVEL = 4;

export const PERICIAS = [
  { id: "acrobatismo", nome: "Acrobatismo", attr: "des" },
  { id: "arcanismo", nome: "Arcanismo", attr: "int" },
  { id: "atletismo", nome: "Atletismo", attr: "for" },
  { id: "diplomacia", nome: "Diplomacia", attr: "car" },
  { id: "dissimulacao", nome: "Dissimulação", attr: "car" },
  { id: "furtividade", nome: "Furtividade", attr: "des" },
  { id: "intimidacao", nome: "Intimidação", attr: "car" },
  { id: "ladroagem", nome: "Ladroagem", attr: "des" },
  { id: "medicina", nome: "Medicina", attr: "sab" },
  { id: "natureza", nome: "Natureza", attr: "sab" },
  { id: "ocultismo", nome: "Ocultismo", attr: "int" },
  { id: "performance", nome: "Performance", attr: "car" },
  { id: "religiao", nome: "Religião", attr: "sab" },
  { id: "sobrevivencia", nome: "Sobrevivência", attr: "sab" },
  { id: "sociedade", nome: "Sociedade", attr: "int" },
  { id: "manufatura", nome: "Manufatura", attr: "int" },
] as const satisfies readonly { id: string; nome: string; attr: Atributo }[];
export type Pericia = (typeof PERICIAS)[number]["id"];

export type Heranca = { id: string; nome: string; texto: string; pv?: number; sentidos?: string };

export type Ancestralidade = {
  id: string;
  nome: string;
  texto: string;
  pv: number;
  tamanho: "Pequeno" | "Médio";
  deslocamento: number;
  boosts: Atributo[];
  livres: number;
  falha?: Atributo;
  sentidos?: string;
  idiomas: string;
  herancas: Heranca[];
};

const h = (id: string, nome: string, texto: string, pv?: number): Heranca => ({ id, nome, texto, ...(pv ? { pv } : {}) });

export const ANCESTRALIDADES: Ancestralidade[] = [
  {
    id: "humano", nome: "Humano", texto: "Versáteis e ambiciosos, cabem em qualquer papel.", pv: 8, tamanho: "Médio", deslocamento: 25, boosts: [], livres: 2,
    idiomas: "Comum + 1 extra",
    herancas: [
      h("humano-versatil", "Humano Versátil", "Ganha um talento geral extra no nível 1."),
      h("humano-habilidoso", "Humano Habilidoso", "Treinado numa perícia à escolha; vira especialista nela no nível 5."),
      h("aiuvarin", "Aiuvarin", "Sangue élfico: visão na penumbra e acesso a talentos de elfo."),
      h("dromaar", "Dromaar", "Sangue orc: visão na penumbra e acesso a talentos de orc."),
    ],
  },
  {
    id: "anao", nome: "Anão", texto: "Teimosos, resistentes e mestres da pedra e do metal.", pv: 10, tamanho: "Médio", deslocamento: 20, boosts: ["con", "sab"], livres: 1, falha: "car",
    sentidos: "Visão no escuro", idiomas: "Comum, Anão",
    herancas: [
      h("anao-rocha", "Anão da Rocha", "Firme como pedra: +2 contra Empurrar, Derrubar e Reposicionar."),
      h("anao-forjado", "Anão Forjado", "Resistência a fogo igual à metade do nível (mínimo 1)."),
      h("anao-guardiao", "Anão Guardião da Morte", "Bônus contra efeitos de necromancia e vitalidade negativa."),
      h("anao-forte", "Anão Forte de Sangue", "Resistência a veneno e se recupera rápido de envenenamento."),
    ],
  },
  {
    id: "elfo", nome: "Elfo", texto: "Longevos, ágeis e ligados à magia antiga.", pv: 6, tamanho: "Médio", deslocamento: 30, boosts: ["des", "int"], livres: 1, falha: "con",
    sentidos: "Visão na penumbra", idiomas: "Comum, Élfico",
    herancas: [
      h("elfo-caverna", "Elfo da Caverna", "Visão no escuro no lugar da visão na penumbra."),
      h("elfo-floresta", "Elfo da Floresta", "Escala árvores e se esconde na folhagem com facilidade."),
      h("elfo-vidente", "Elfo Vidente", "Detectar Magia como truque inato e +1 pra identificar magia."),
      h("elfo-antigo", "Elfo Antigo", "Ganha uma dedicação de classe de graça no nível 1."),
    ],
  },
  {
    id: "gnomo", nome: "Gnomo", texto: "Curiosos, vindos do Primeiro Mundo, sempre atrás de novidade.", pv: 8, tamanho: "Pequeno", deslocamento: 25, boosts: ["con", "car"], livres: 1, falha: "for",
    sentidos: "Visão na penumbra", idiomas: "Comum, Gnomo, Feérico",
    herancas: [
      h("gnomo-sensivel", "Gnomo Sensível", "Faro impreciso de 30 pés e bônus pra Buscar criaturas."),
      h("gnomo-feerico", "Gnomo Tocado pelas Fadas", "Um truque primal inato à escolha."),
      h("gnomo-umbral", "Gnomo Umbral", "Visão no escuro."),
      h("gnomo-vivido", "Gnomo Vívido", "Treinado num Saber extra e cores que mudam com o humor."),
    ],
  },
  {
    id: "goblin", nome: "Goblin", texto: "Caóticos, criativos e muito mais espertos do que parecem.", pv: 6, tamanho: "Pequeno", deslocamento: 25, boosts: ["des", "car"], livres: 1, falha: "sab",
    sentidos: "Visão no escuro", idiomas: "Comum, Goblin",
    herancas: [
      h("goblin-chamuscado", "Goblin Pele-Chamuscada", "Resistência a fogo e apaga chamas no corpo mais fácil."),
      h("goblin-tripa", "Goblin Tripa-de-Ferro", "Come qualquer coisa sem passar mal."),
      h("goblin-navalha", "Goblin Dente-de-Navalha", "Ataque desarmado de mordida (1d6 perfurante)."),
      h("goblin-inquebravel", "Goblin Inquebrável", "PV da ancestralidade sobe pra 10 e cai com menos dano.", 10),
    ],
  },
  {
    id: "halfling", nome: "Halfling", texto: "Sortudos, discretos e bons de estrada.", pv: 6, tamanho: "Pequeno", deslocamento: 25, boosts: ["des", "sab"], livres: 1, falha: "for",
    sentidos: "Sentidos aguçados", idiomas: "Comum, Halfling",
    herancas: [
      h("halfling-corajoso", "Halfling Corajoso", "Sucesso contra medo vira sucesso crítico."),
      h("halfling-colina", "Halfling da Colina", "Cura mais PV quando é tratado ou descansa."),
      h("halfling-nomade", "Halfling Nômade", "Dois idiomas extras e acostumado à estrada."),
      h("halfling-crepusculo", "Halfling do Crepúsculo", "Visão na penumbra."),
    ],
  },
  {
    id: "leshy", nome: "Leshy", texto: "Espíritos da natureza num corpo de planta.", pv: 8, tamanho: "Pequeno", deslocamento: 25, boosts: ["con", "sab"], livres: 1, falha: "int",
    sentidos: "Visão na penumbra", idiomas: "Comum, Feérico",
    herancas: [
      h("leshy-cacto", "Leshy Cacto", "Espinhos: ataque desarmado de 1d6 perfurante."),
      h("leshy-fruta", "Leshy Fruta", "Brota uma fruta que cura quem come."),
      h("leshy-fungo", "Leshy Fungo", "Visão no escuro, mas sofre na luz do sol."),
      h("leshy-videira", "Leshy Videira", "Escala com facilidade usando as próprias vinhas."),
    ],
  },
  {
    id: "catfolk", nome: "Catfolk (Amurrun)", texto: "Gente-gato curiosa e ágil, que sempre cai de pé.", pv: 8, tamanho: "Médio", deslocamento: 25, boosts: ["des", "car"], livres: 1, falha: "sab",
    sentidos: "Visão na penumbra", idiomas: "Comum, Amurrun",
    herancas: [
      h("catfolk-garras", "Catfolk Garras-Afiadas", "Ataque desarmado de garras (1d6 cortante, ágil, acuidade)."),
      h("catfolk-cacador", "Catfolk Caçador", "Faro impreciso de 30 pés e bônus pra Rastrear."),
      h("catfolk-selva", "Catfolk da Selva", "Ignora terreno difícil de vegetação."),
      h("catfolk-nove-vidas", "Catfolk Nove Vidas", "Uma vez por dia, um golpe crítico que te derrubaria vira golpe normal."),
      h("catfolk-inverno", "Catfolk do Inverno", "Resistência a frio igual à metade do nível (mínimo 1)."),
    ],
  },
  {
    id: "orc", nome: "Orc", texto: "Fortes, resistentes e orgulhosos das cicatrizes.", pv: 10, tamanho: "Médio", deslocamento: 25, boosts: [], livres: 2,
    sentidos: "Visão no escuro", idiomas: "Comum, Orc",
    herancas: [
      h("orc-marcado", "Orc Marcado", "PV da ancestralidade sobe pra 12.", 12),
      h("orc-terras-aridas", "Orc das Terras Áridas", "Anda mais rápido em viagem e aguenta calor extremo."),
      h("orc-profundo", "Orc Profundo", "Bônus pra lutar e se virar em túneis."),
      h("orc-chuva", "Orc da Chuva", "Bônus contra doenças e se cura melhor."),
    ],
  },
  {
    id: "kobold", nome: "Kobold", texto: "Pequenos parentes dos dragões, engenhosos com armadilhas.", pv: 6, tamanho: "Pequeno", deslocamento: 25, boosts: ["des", "car"], livres: 1, falha: "con",
    sentidos: "Visão no escuro", idiomas: "Comum, Dracônico",
    herancas: [
      h("kobold-draconico", "Kobold Dracônico", "Escamas de um tipo de dragão e resistência ao dano dele."),
      h("kobold-mandibula", "Kobold Mandíbula-Forte", "Ataque desarmado de mordida (1d6 perfurante)."),
      h("kobold-cauda-veneno", "Kobold Cauda-Venenosa", "Cauda com veneno que soma dano num golpe."),
      h("kobold-escavador", "Kobold Escavador", "Velocidade de escavação de 5 pés."),
    ],
  },
  {
    id: "tengu", nome: "Tengu", texto: "Gente-corvo esperta, colecionadora e boa de lâmina.", pv: 6, tamanho: "Médio", deslocamento: 25, boosts: ["des"], livres: 1,
    sentidos: "Visão na penumbra", idiomas: "Comum, Tengu",
    herancas: [
      h("tengu-montanha", "Tengu da Montanha", "Truque divino inato e treinado em Religião."),
      h("tengu-tempestade", "Tengu da Tempestade", "Resistência a eletricidade."),
      h("tengu-taiga", "Tengu da Taiga", "Ignora terreno difícil de neve e floresta."),
      h("tengu-salto", "Tengu Planador", "Cai devagar e plana com as asas."),
    ],
  },
  {
    id: "ysoki", nome: "Ratfolk (Ysoki)", texto: "Gente-rato sociável, que guarda tudo nas bochechas.", pv: 6, tamanho: "Pequeno", deslocamento: 25, boosts: ["des", "int"], livres: 1, falha: "for",
    sentidos: "Visão no escuro", idiomas: "Comum, Ysoki",
    herancas: [
      h("ysoki-deserto", "Ysoki do Deserto", "Aguenta calor e pode andar de quatro mais rápido."),
      h("ysoki-cauda", "Ysoki Cauda-Longa", "Usa a cauda pra se equilibrar e Agarrar."),
      h("ysoki-esgoto", "Ysoki do Esgoto", "Imune a doenças comuns e bônus contra elas."),
      h("ysoki-sombra", "Ysoki Sombrio", "Bônus pra se esconder no escuro."),
    ],
  },
  {
    id: "kitsune", nome: "Kitsune", texto: "Raposas mágicas que podem assumir forma humana.", pv: 8, tamanho: "Médio", deslocamento: 25, boosts: ["car"], livres: 1,
    sentidos: "Visão na penumbra", idiomas: "Comum, Sakvroth",
    herancas: [
      h("kitsune-celestial", "Kitsune Celestial", "Magia divina inata e resistência a dano espiritual."),
      h("kitsune-sombra", "Kitsune Raposa-Sombria", "Truque ocultista inato e bônus pra enganar."),
      h("kitsune-vento-gelado", "Kitsune do Vento Gelado", "Resistência a frio."),
      h("kitsune-ceu-vazio", "Kitsune do Céu Vazio", "Truque ocultista inato ligado aos espíritos."),
    ],
  },
  {
    id: "hobgoblin", nome: "Hobgoblin", texto: "Disciplinados, engenhosos e bons de estratégia.", pv: 8, tamanho: "Médio", deslocamento: 25, boosts: ["con", "int"], livres: 1, falha: "sab",
    sentidos: "Visão no escuro", idiomas: "Comum, Goblin",
    herancas: [
      h("hobgoblin-elfo-sangue", "Hobgoblin Sangue-de-Elfo", "Bônus pra Percepção e iniciativa."),
      h("hobgoblin-forjado", "Hobgoblin Forjado", "Resistência a fogo."),
      h("hobgoblin-tirano", "Hobgoblin Pele-de-Couro", "Bônus contra veneno e doença."),
      h("hobgoblin-runico", "Hobgoblin Rúnico", "Bônus pra identificar magia."),
    ],
  },
  {
    id: "iruxi", nome: "Homem-Lagarto (Iruxi)", texto: "Povo réptil antigo, paciente e sábio.", pv: 8, tamanho: "Médio", deslocamento: 25, boosts: ["for", "sab"], livres: 1, falha: "int",
    idiomas: "Comum, Iruxi",
    herancas: [
      h("iruxi-pantano", "Iruxi do Pântano", "Nada bem e segura o fôlego por mais tempo."),
      h("iruxi-areia", "Iruxi da Areia", "Aguenta calor e se camufla em areia."),
      h("iruxi-nuvem", "Iruxi Céu-de-Nuvem", "Plana ao cair."),
      { id: "iruxi-caverna", nome: "Iruxi das Cavernas", texto: "Visão no escuro.", sentidos: "Visão no escuro" },
    ],
  },
  {
    id: "kholo", nome: "Kholo", texto: "Gente-hiena unida pelo clã e pela caça.", pv: 8, tamanho: "Médio", deslocamento: 25, boosts: ["for", "int"], livres: 1, falha: "sab",
    sentidos: "Visão na penumbra", idiomas: "Comum, Kholo",
    herancas: [
      h("kholo-listrado", "Kholo Listrado", "Bônus pra se esconder em terreno aberto."),
      h("kholo-malhado", "Kholo Malhado", "Mordida mais forte (1d8 perfurante)."),
      h("kholo-marrom", "Kholo Marrom", "Faro e bônus pra Rastrear."),
      h("kholo-doce", "Kholo Fala-Doce", "Bônus pra imitar vozes e enganar."),
    ],
  },
];

export type Antecedente = { id: string; nome: string; texto: string; opcoes: [Atributo, Atributo]; pericia: Pericia; saber: string };

export const ANTECEDENTES: Antecedente[] = [
  { id: "acolito", nome: "Acólito", texto: "Cresceu num templo, entre ritos e livros sagrados.", opcoes: ["int", "sab"], pericia: "religiao", saber: "Saber (Escrita)" },
  { id: "acrobata", nome: "Acrobata", texto: "Viveu de saltos e piruetas num circo itinerante.", opcoes: ["for", "des"], pericia: "acrobatismo", saber: "Saber (Circo)" },
  { id: "artesao", nome: "Artesão", texto: "Aprendiz de uma guilda, sabe fazer coisas com as mãos.", opcoes: ["for", "int"], pericia: "manufatura", saber: "Saber (Guilda)" },
  { id: "artista", nome: "Artista", texto: "Ganhou a vida no palco, cantando ou atuando.", opcoes: ["des", "car"], pericia: "performance", saber: "Saber (Teatro)" },
  { id: "camponês", nome: "Camponês", texto: "Trabalhou a terra de sol a sol.", opcoes: ["con", "sab"], pericia: "atletismo", saber: "Saber (Agricultura)" },
  { id: "caçador", nome: "Caçador", texto: "Rastreou presas nos ermos pra comer e vender peles.", opcoes: ["des", "sab"], pericia: "sobrevivencia", saber: "Saber (Curtume)" },
  { id: "criminoso", nome: "Criminoso", texto: "Viveu do outro lado da lei, nas sombras da cidade.", opcoes: ["des", "int"], pericia: "furtividade", saber: "Saber (Submundo)" },
  { id: "erudito", nome: "Erudito", texto: "Passou anos estudando numa academia.", opcoes: ["int", "sab"], pericia: "arcanismo", saber: "Saber (Academia)" },
  { id: "guarda", nome: "Guarda", texto: "Patrulhou muralhas e manteve a ordem.", opcoes: ["for", "car"], pericia: "intimidacao", saber: "Saber (Leis)" },
  { id: "herbalista", nome: "Herbalista", texto: "Conhece ervas, chás e unguentos que curam.", opcoes: ["con", "sab"], pericia: "medicina", saber: "Saber (Herbalismo)" },
  { id: "mercador", nome: "Mercador", texto: "Comprou barato, vendeu caro e conhece todo mundo.", opcoes: ["int", "car"], pericia: "diplomacia", saber: "Saber (Comércio)" },
  { id: "soldado", nome: "Soldado", texto: "Marchou num exército e conhece a guerra de perto.", opcoes: ["for", "con"], pericia: "intimidacao", saber: "Saber (Guerra)" },
];

export const DEFESAS = ["percepcao", "fortitude", "reflexos", "vontade", "defesa", "cd"] as const;
export type Defesa = (typeof DEFESAS)[number];
// [nível, o que melhora, novo grau]. Resumo das tabelas de progressão do Player Core.
type Marco = [number, Defesa, Prof];

export type Classe = {
  id: string;
  nome: string;
  texto: string;
  chave: Atributo[];
  pv: number;
  percepcao: Prof;
  fortitude: Prof;
  reflexos: Prof;
  vontade: Prof;
  pericias: Pericia[];
  extras: number;
  // Ladino ganha talento de perícia e aumento de perícia todo nível.
  ladina?: boolean;
  marcos: Marco[];
  recursos: [number, string][];
};

// Progressão típica de conjurador puro.
const CONJURADOR: Marco[] = [[5, "reflexos", "especialista"], [9, "fortitude", "especialista"], [11, "percepcao", "especialista"], [13, "defesa", "especialista"], [17, "vontade", "mestre"]];
const conjuracao = (tradicao: string): [number, string][] => [[1, `Conjuração ${tradicao}`], [7, "Conjurador especialista"], [15, "Conjurador mestre"], [19, "Conjurador lendário"]];

export const CLASSES: Classe[] = [
  {
    id: "alquimista", nome: "Alquimista", texto: "Bombas, elixires e venenos feitos na hora.", chave: ["int"], pv: 8, percepcao: "treinado", fortitude: "especialista", reflexos: "especialista", vontade: "treinado", pericias: ["manufatura"], extras: 3,
    marcos: [[7, "percepcao", "especialista"], [9, "cd", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "especialista"], [15, "reflexos", "mestre"], [17, "cd", "mestre"], [17, "vontade", "especialista"]],
    recursos: [[1, "Alquimia"], [1, "Campo de pesquisa"], [1, "Itens versáteis"], [5, "Campo de descoberta"], [7, "Alquimia potente"], [11, "Mutação perpétua"]],
  },
  {
    id: "barbaro", nome: "Bárbaro", texto: "Fúria pura: bate forte e aguenta muito.", chave: ["for"], pv: 12, percepcao: "especialista", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: ["atletismo"], extras: 3,
    marcos: [[7, "fortitude", "mestre"], [9, "reflexos", "especialista"], [11, "cd", "especialista"], [13, "fortitude", "lendario"], [13, "defesa", "especialista"], [15, "vontade", "mestre"], [17, "percepcao", "mestre"], [19, "defesa", "mestre"], [19, "cd", "mestre"]],
    recursos: [[1, "Fúria"], [1, "Instinto"], [3, "Passos furiosos"], [5, "Brutalidade"], [7, "Colosso"], [9, "Resistência furiosa"], [11, "Fúria poderosa"], [15, "Vontade indomável"], [17, "Fúria implacável"], [19, "Fúria devastadora"]],
  },
  {
    id: "bardo", nome: "Bardo", texto: "Magia ocultista feita de música e inspiração.", chave: ["car"], pv: 8, percepcao: "especialista", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["ocultismo", "performance"], extras: 4,
    marcos: [[3, "fortitude", "especialista"], [9, "reflexos", "especialista"], [11, "percepcao", "mestre"], [13, "defesa", "especialista"], [17, "vontade", "mestre"]],
    recursos: [...conjuracao("ocultista"), [1, "Musa"], [1, "Composições"], [3, "Bom de memória"]],
  },
  {
    id: "campeao", nome: "Campeão", texto: "Guerreiro sagrado que protege os aliados.", chave: ["for", "des"], pv: 10, percepcao: "treinado", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: ["religiao"], extras: 2,
    marcos: [[3, "percepcao", "especialista"], [7, "defesa", "especialista"], [9, "reflexos", "especialista"], [9, "cd", "especialista"], [11, "vontade", "mestre"], [11, "fortitude", "mestre"], [13, "defesa", "mestre"], [17, "defesa", "lendario"], [17, "cd", "mestre"]],
    recursos: [[1, "Causa e santificação"], [1, "Reação de campeão"], [1, "Escudo divino"], [3, "Bênção da divindade"], [9, "Perícia de campeão"], [11, "Vontade divina"], [19, "Herói da fé"]],
  },
  {
    id: "clerigo", nome: "Clérigo", texto: "Canaliza o poder de uma divindade pra curar e punir.", chave: ["sab"], pv: 8, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["religiao"], extras: 2,
    marcos: CONJURADOR,
    recursos: [...conjuracao("divina"), [1, "Divindade"], [1, "Doutrina"], [1, "Fonte divina"]],
  },
  {
    id: "druida", nome: "Druida", texto: "Magia primal, ligada aos bichos e às plantas.", chave: ["sab"], pv: 8, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["natureza"], extras: 2,
    marcos: CONJURADOR,
    recursos: [...conjuracao("primal"), [1, "Ordem druídica"], [1, "Anátema"], [1, "Idioma druídico"]],
  },
  {
    id: "espadachim", nome: "Espadachim", texto: "Duelista cheio de estilo que luta com panache.", chave: ["des"], pv: 10, percepcao: "especialista", fortitude: "treinado", reflexos: "especialista", vontade: "especialista", pericias: ["acrobatismo"], extras: 4,
    marcos: [[3, "fortitude", "especialista"], [7, "reflexos", "mestre"], [9, "cd", "especialista"], [11, "percepcao", "mestre"], [13, "defesa", "especialista"], [15, "reflexos", "lendario"], [17, "cd", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Panache"], [1, "Estilo"], [1, "Finalizações"], [3, "Ímpeto"], [5, "Ataque preciso"], [9, "Investida exemplar"], [15, "Evasão melhorada"]],
  },
  {
    id: "feiticeiro", nome: "Feiticeiro", texto: "A magia está no sangue, não nos livros.", chave: ["car"], pv: 6, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: [], extras: 2,
    marcos: CONJURADOR,
    recursos: [...conjuracao("da linhagem"), [1, "Linhagem"], [1, "Repertório de magias"], [1, "Magia de sangue"]],
  },
  {
    id: "guerreiro", nome: "Guerreiro", texto: "Mestre das armas, o mais preciso no combate.", chave: ["for", "des"], pv: 10, percepcao: "especialista", fortitude: "especialista", reflexos: "especialista", vontade: "treinado", pericias: ["atletismo"], extras: 3,
    marcos: [[3, "vontade", "especialista"], [7, "percepcao", "mestre"], [9, "fortitude", "mestre"], [11, "defesa", "especialista"], [11, "cd", "especialista"], [15, "reflexos", "mestre"], [17, "defesa", "mestre"], [19, "cd", "mestre"]],
    recursos: [[1, "Ataque de oportunidade"], [1, "Bloqueio com escudo"], [3, "Bravura"], [5, "Maestria em armas"], [7, "Vigia do campo de batalha"], [9, "Colosso"], [13, "Lenda das armas"], [15, "Evasão"], [19, "Lenda versátil"]],
  },
  {
    id: "investigador", nome: "Investigador", texto: "Detetive que desvenda mistérios e acha o ponto fraco.", chave: ["int"], pv: 8, percepcao: "especialista", fortitude: "treinado", reflexos: "especialista", vontade: "especialista", pericias: ["sociedade"], extras: 4,
    marcos: [[7, "percepcao", "mestre"], [9, "fortitude", "especialista"], [9, "cd", "especialista"], [11, "reflexos", "mestre"], [13, "percepcao", "lendario"], [13, "defesa", "especialista"], [17, "vontade", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Desvendar"], [1, "Linha de investigação"], [1, "Metodologia"], [1, "Golpe estratégico"], [3, "Aprender rápido"], [5, "Expertise investigativa"], [11, "Mente dedutiva"]],
  },
  {
    id: "ladino", nome: "Ladino", texto: "Ágil, furtivo e cheio de perícias.", chave: ["des"], pv: 8, percepcao: "especialista", fortitude: "treinado", reflexos: "especialista", vontade: "especialista", pericias: ["furtividade"], extras: 7, ladina: true,
    marcos: [[7, "reflexos", "mestre"], [7, "percepcao", "mestre"], [9, "fortitude", "especialista"], [11, "cd", "especialista"], [13, "reflexos", "lendario"], [13, "percepcao", "lendario"], [13, "defesa", "especialista"], [17, "vontade", "mestre"], [19, "defesa", "mestre"], [19, "cd", "mestre"]],
    recursos: [[1, "Ataque furtivo"], [1, "Surpresa"], [1, "Raquete de ladino"], [3, "Desvio"], [5, "Ataque furtivo 2d6"], [7, "Evasão"], [11, "Ataque furtivo 3d6"], [13, "Evasão melhorada"], [17, "Ataque furtivo 4d6"]],
  },
  {
    id: "mago", nome: "Mago", texto: "Estuda magia arcana em grimórios.", chave: ["int"], pv: 6, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["arcanismo"], extras: 2,
    marcos: CONJURADOR,
    recursos: [...conjuracao("arcana"), [1, "Grimório"], [1, "Escola arcana"], [1, "Vínculo arcano"]],
  },
  {
    id: "monge", nome: "Monge", texto: "Luta de mãos vazias, com corpo e mente afiados.", chave: ["for", "des"], pv: 10, percepcao: "treinado", fortitude: "especialista", reflexos: "especialista", vontade: "especialista", pericias: [], extras: 4,
    marcos: [[5, "percepcao", "especialista"], [7, "fortitude", "mestre"], [9, "cd", "especialista"], [11, "reflexos", "mestre"], [13, "defesa", "mestre"], [15, "vontade", "mestre"], [17, "defesa", "lendario"], [17, "cd", "mestre"]],
    recursos: [[1, "Rajada de golpes"], [1, "Ataques desarmados poderosos"], [3, "Ki místico"], [3, "Movimento incrível"], [7, "Caminho da perfeição"], [11, "Segundo caminho"], [15, "Terceiro caminho"]],
  },
  {
    id: "oraculo", nome: "Oráculo", texto: "Carrega um mistério divino que dá poder e maldição.", chave: ["car"], pv: 8, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["religiao"], extras: 3,
    marcos: CONJURADOR,
    recursos: [...conjuracao("divina"), [1, "Mistério"], [1, "Maldição do oráculo"], [1, "Repertório de magias"]],
  },
  {
    id: "patrulheiro", nome: "Patrulheiro", texto: "Caçador dos ermos, escolhe uma presa e não larga.", chave: ["for", "des"], pv: 10, percepcao: "especialista", fortitude: "especialista", reflexos: "especialista", vontade: "treinado", pericias: ["natureza", "sobrevivencia"], extras: 4,
    marcos: [[3, "vontade", "especialista"], [7, "percepcao", "mestre"], [7, "reflexos", "mestre"], [11, "fortitude", "mestre"], [11, "defesa", "especialista"], [11, "cd", "especialista"], [15, "percepcao", "lendario"], [19, "defesa", "mestre"], [19, "cd", "mestre"]],
    recursos: [[1, "Caçar presa"], [1, "Vantagem do caçador"], [3, "Explorador incrível"], [5, "Trilha de rastros"], [7, "Evasão"], [9, "Instinto da natureza"], [17, "Caçador mestre"]],
  },
  {
    id: "bruxo", nome: "Bruxo", texto: "Magia emprestada de um patrono misterioso, via familiar.", chave: ["int"], pv: 6, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: [], extras: 3,
    marcos: CONJURADOR,
    recursos: [...conjuracao("do patrono"), [1, "Patrono"], [1, "Familiar"], [1, "Feitiços"]],
  },
  {
    id: "animista", nome: "Animista", texto: "Faz pacto com espíritos (aparições) que emprestam magia divina e poderes.", chave: ["sab"], pv: 8, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["religiao"], extras: 2,
    marcos: CONJURADOR,
    recursos: [...conjuracao("divina"), [1, "Aparições (2 por dia)"], [1, "Magias de aparição"], [1, "Vínculo espiritual"], [7, "Terceira aparição"], [15, "Quarta aparição"]],
  },
  {
    id: "kineticista", nome: "Kineticista", texto: "Canaliza um elemento (ar, terra, fogo, metal, água, madeira) direto do corpo.", chave: ["con"], pv: 8, percepcao: "treinado", fortitude: "especialista", reflexos: "especialista", vontade: "treinado", pericias: ["natureza"], extras: 3,
    marcos: [[3, "vontade", "especialista"], [7, "cd", "especialista"], [9, "percepcao", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "especialista"], [15, "cd", "mestre"], [17, "reflexos", "mestre"], [19, "cd", "lendario"], [19, "defesa", "mestre"]],
    recursos: [[1, "Portão cinético"], [1, "Aura cinética"], [1, "Impulsos"], [1, "Explosão elemental"], [5, "Bifurcação do portão"], [9, "Limiar do portão"], [13, "Bifurcação maior"], [17, "Limiar maior"]],
  },
  {
    id: "inventor", nome: "Inventor", texto: "Gênio que leva pra luta uma invenção: armadura, arma ou construto.", chave: ["int"], pv: 8, percepcao: "treinado", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: ["manufatura"], extras: 3,
    marcos: [[7, "percepcao", "especialista"], [9, "cd", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "especialista"], [15, "vontade", "mestre"], [17, "cd", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Inovação"], [1, "Superar"], [1, "Explodir"], [3, "Engenhosidade"], [7, "Inovação avançada"], [15, "Inovação revolucionária"]],
  },
  {
    id: "pistoleiro", nome: "Pistoleiro", texto: "Atirador de armas de fogo e bestas com estilo próprio.", chave: ["des"], pv: 8, percepcao: "especialista", fortitude: "especialista", reflexos: "especialista", vontade: "treinado", pericias: [], extras: 3,
    marcos: [[3, "vontade", "especialista"], [9, "cd", "especialista"], [11, "percepcao", "mestre"], [13, "defesa", "especialista"], [15, "reflexos", "mestre"], [17, "cd", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Caminho"], [1, "Mira certeira"], [1, "Recarga rápida"], [5, "Ataque do pistoleiro"], [9, "Ataque do caminho"], [13, "Lenda das armas"]],
  },
  {
    id: "magus", nome: "Magus", texto: "Mistura espada e magia arcana num golpe só.", chave: ["for", "des"], pv: 8, percepcao: "treinado", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: ["arcanismo"], extras: 2,
    marcos: [[5, "percepcao", "especialista"], [9, "reflexos", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "especialista"], [17, "vontade", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Conjuração arcana limitada"], [1, "Arquétipo híbrido"], [1, "Golpe de magia"], [1, "Conflux"], [7, "Conjurador especialista"], [15, "Conjurador mestre"]],
  },
  {
    id: "invocador", nome: "Invocador", texto: "Ligado a um eidolon, um espírito que luta ao seu lado.", chave: ["car"], pv: 10, percepcao: "treinado", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: [], extras: 3,
    marcos: [[5, "percepcao", "especialista"], [9, "reflexos", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "especialista"], [17, "vontade", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Eidolon"], [1, "Ligação"], [1, "Conjuração limitada"], [7, "Conjurador especialista"], [15, "Conjurador mestre"]],
  },
  {
    id: "psiquico", nome: "Psíquico", texto: "Magia ocultista que nasce da própria mente.", chave: ["int", "car"], pv: 6, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["ocultismo"], extras: 3,
    marcos: CONJURADOR,
    recursos: [...conjuracao("ocultista"), [1, "Mente subconsciente"], [1, "Mente consciente"], [1, "Desatar a mente"], [1, "Truques ampliados"]],
  },
  {
    id: "taumaturgo", nome: "Taumaturgo", texto: "Usa amuletos, sinos e superstições pra achar a fraqueza de tudo.", chave: ["car"], pv: 8, percepcao: "especialista", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: ["arcanismo", "natureza", "ocultismo", "religiao"], extras: 3,
    marcos: [[7, "percepcao", "especialista"], [9, "cd", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "especialista"], [15, "vontade", "mestre"], [17, "cd", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Explorar vulnerabilidade"], [1, "Implemento"], [1, "Esotérica"], [5, "Segundo implemento"], [7, "Adepto do implemento"], [15, "Terceiro implemento"]],
  },
  {
    id: "comandante", nome: "Comandante", texto: "Líder tático que dá ordens e coordena o grupo.", chave: ["int"], pv: 8, percepcao: "especialista", fortitude: "treinado", reflexos: "especialista", vontade: "especialista", pericias: ["sociedade"], extras: 2,
    marcos: [[7, "percepcao", "especialista"], [9, "cd", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "especialista"], [15, "vontade", "mestre"], [17, "cd", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Estandarte"], [1, "Táticas"], [1, "Prontidão"], [3, "Liderança"], [7, "Táticas especialistas"], [15, "Táticas lendárias"]],
  },
  {
    id: "guardiao", nome: "Guardião", texto: "Protetor de armadura pesada que atrai e aguenta os golpes.", chave: ["for"], pv: 12, percepcao: "treinado", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: ["atletismo", "intimidacao"], extras: 3,
    marcos: [[3, "defesa", "especialista"], [7, "percepcao", "especialista"], [9, "cd", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "mestre"], [17, "cd", "mestre"], [17, "defesa", "lendario"]],
    recursos: [[1, "Interpor-se"], [1, "Provocação"], [1, "Armadura do guardião"], [5, "Reação extra"], [11, "Fortaleza"]],
  },
  {
    id: "exemplar", nome: "Exemplar", texto: "Herói meio divino que canaliza centelhas de poder em seus ícones.", chave: ["for", "des"], pv: 10, percepcao: "especialista", fortitude: "especialista", reflexos: "especialista", vontade: "especialista", pericias: ["religiao"], extras: 3,
    marcos: [[7, "percepcao", "especialista"], [9, "cd", "especialista"], [11, "fortitude", "mestre"], [13, "defesa", "especialista"], [15, "vontade", "mestre"], [17, "cd", "mestre"], [19, "defesa", "mestre"]],
    recursos: [[1, "Centelha divina"], [1, "Ícones"], [1, "Epítetos"], [3, "Domínio"], [7, "Epíteto dominante"], [15, "Divindade"]],
  },
];

// Tipos de vaga de talento. A herança é escolhida à parte.
export const TIPOS_TALENTO = ["ancestralidade", "classe", "pericia", "geral"] as const;
export type TipoTalento = (typeof TIPOS_TALENTO)[number];
export const NOME_TIPO_TALENTO: Record<TipoTalento, string> = {
  ancestralidade: "Ancestralidade",
  classe: "Classe",
  pericia: "Perícia",
  geral: "Geral",
};

export type Vaga = { chave: string; nivel: number; tipo: TipoTalento };

// Todas as vagas de talento até o nível da ficha, em ordem.
export function vagasTalento(f: Pick<Ficha, "nivel" | "classe" | "heranca">): Vaga[] {
  const cls = acharClasse(f.classe);
  const out: Vaga[] = [];
  const add = (nivel: number, tipo: TipoTalento, chave = `${tipo}-${nivel}`) => out.push({ chave, nivel, tipo });
  for (let n = 1; n <= f.nivel; n++) {
    if (n % 4 === 1) add(n, "ancestralidade");
    if (n === 1 || n % 2 === 0) add(n, "classe");
    if (cls?.ladina || n % 2 === 0) add(n, "pericia");
    if (n === 1 && f.heranca === "humano-versatil") add(1, "geral", "geral-versatil");
    if (n % 4 === 3) add(n, "geral");
  }
  return out;
}

// Níveis em que uma perícia sobe um grau.
export function niveisAumentoPericia(f: Pick<Ficha, "nivel" | "classe">): number[] {
  const cls = acharClasse(f.classe);
  const out: number[] = [];
  for (let n = 2; n <= f.nivel; n++) if (cls?.ladina || n % 2 === 1) out.push(n);
  return out;
}

export type Ficha = {
  nome: string;
  nivel: number;
  ancestralidade: string;
  heranca: string;
  antecedente: string;
  classe: string;
  chave: Atributo | "";
  boostsAncestral: Atributo[];
  boostAntecedente: Atributo | "";
  boostAntecedenteLivre: Atributo | "";
  boostsLivres: Atributo[];
  pericias: Pericia[];
  // Perícia extra do Humano Habilidoso.
  periciaHeranca: Pericia | "";
  // Chave = nível (5, 10, 15, 20).
  aumentos: Record<string, Atributo[]>;
  // Chave = nível; valor = perícia que sobe um grau.
  aumentosPericia: Record<string, Pericia>;
  // Chave = Vaga.chave ("classe-2"); valor = nome do talento (texto livre).
  talentos: Record<string, string>;
  notas: string;
  // Equipamento. Runas: potência +0..+3; golpe/resiliente 0..3.
  armadura: string;
  runasArmadura: { potencia: number; resiliente: number };
  escudo: string;
  armas: ArmaFicha[];
  itens: ItemFicha[];
  // Moedas: platina, ouro, prata, cobre.
  dinheiro: { pp: number; po: number; pa: number; pc: number };
  // Magia. Tradição só vale pra classes em que ela depende da linhagem/patrono.
  tradicao: Tradicao | "";
  // Chave = VagaMagia.chave ("truque-1", "r2-3"); valor = nome da magia.
  magias: Record<string, string>;
  // Magias de foco (texto livre). Cada uma dá 1 ponto de foco, até 3.
  foco: string[];
  // Idiomas além dos da ancestralidade (texto livre).
  idiomasExtras: string[];
  // Estado durante o jogo (PV atuais, condições, recursos gastos).
  jogo: Jogo;
};

export type ArmaFicha = { id: string; potencia: number; golpe: number };
// volume em décimos (1 = L, 10 = 1).
export type ItemFicha = { nome: string; qtd: number; volume: number };

export const FICHA_VAZIA: Ficha = {
  nome: "",
  nivel: 1,
  ancestralidade: "",
  heranca: "",
  antecedente: "",
  classe: "",
  chave: "",
  boostsAncestral: [],
  boostAntecedente: "",
  boostAntecedenteLivre: "",
  boostsLivres: [],
  pericias: [],
  periciaHeranca: "",
  aumentos: {},
  aumentosPericia: {},
  talentos: {},
  notas: "",
  armadura: "",
  runasArmadura: { potencia: 0, resiliente: 0 },
  escudo: "",
  armas: [],
  itens: [],
  dinheiro: { pp: 0, po: 15, pa: 0, pc: 0 },
  tradicao: "",
  magias: {},
  foco: [],
  idiomasExtras: [],
  jogo: JOGO_VAZIO,
};

export const LIVRES_NIVEL_1 = 4;

export const acharAncestralidade = (id: string) => ANCESTRALIDADES.find((a) => a.id === id);
export const acharHeranca = (f: Pick<Ficha, "ancestralidade" | "heranca">) => acharAncestralidade(f.ancestralidade)?.herancas.find((h) => h.id === f.heranca);
export const acharAntecedente = (id: string) => ANTECEDENTES.find((a) => a.id === id);
export const acharClasse = (id: string) => CLASSES.find((c) => c.id === id);

// Atributos só com as escolhas do nível 1.
function atributosNivel1(f: Ficha): Record<Atributo, number> {
  const r = { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 };
  const anc = acharAncestralidade(f.ancestralidade);
  if (anc) {
    for (const a of anc.boosts) r[a]++;
    if (anc.falha) r[anc.falha]--;
  }
  const todos = [...f.boostsAncestral, f.boostAntecedente, f.boostAntecedenteLivre, f.chave, ...f.boostsLivres];
  for (const a of todos) if (a) r[a]++;
  return r;
}

// Atributos finais no nível da ficha. "parcial" marca quem tem meio aumento guardado (+4 ou mais).
export function atributosDetalhe(f: Ficha): { valores: Record<Atributo, number>; parcial: Record<Atributo, boolean> } {
  const valores = atributosNivel1(f);
  const parcial = { for: false, des: false, con: false, int: false, sab: false, car: false };
  for (const n of NIVEIS_AUMENTO) {
    if (n > f.nivel) break;
    for (const a of f.aumentos[n] ?? []) {
      if (valores[a] < 4) valores[a]++;
      else if (parcial[a]) {
        valores[a]++;
        parcial[a] = false;
      } else parcial[a] = true;
    }
  }
  return { valores, parcial };
}

export const atributos = (f: Ficha) => atributosDetalhe(f).valores;

// Perícias que já vêm treinadas (antecedente, classe, herança), sem repetir.
export function periciasFixas(f: Ficha): Pericia[] {
  const fixas = new Set<Pericia>();
  const ant = acharAntecedente(f.antecedente);
  if (ant) fixas.add(ant.pericia);
  for (const p of acharClasse(f.classe)?.pericias ?? []) fixas.add(p);
  if (f.heranca === "humano-habilidoso" && f.periciaHeranca) fixas.add(f.periciaHeranca);
  return [...fixas];
}

// Quantas perícias a pessoa escolhe: as da classe + Inteligência do nível 1 (nunca negativo).
export function periciasParaEscolher(f: Ficha): number {
  const cls = acharClasse(f.classe);
  if (!cls) return 0;
  return Math.max(0, cls.extras + atributosNivel1(f).int);
}

// Grau de cada perícia no nível da ficha + quais aumentos não valem (passaram do limite do nível).
export function grausPericia(f: Ficha): { graus: Record<Pericia, Prof>; invalidos: number[] } {
  const graus = Object.fromEntries(PERICIAS.map((p) => [p.id, "destreinado"])) as Record<Pericia, Prof>;
  for (const p of [...periciasFixas(f), ...f.pericias]) graus[p] = "treinado";
  // Humano Habilidoso vira especialista na perícia da herança no nível 5.
  const invalidos: number[] = [];
  for (const n of niveisAumentoPericia(f)) {
    if (f.heranca === "humano-habilidoso" && f.periciaHeranca && n >= 5 && graus[f.periciaHeranca] === "treinado") graus[f.periciaHeranca] = "especialista";
    const p = f.aumentosPericia[n];
    if (!p) continue;
    const novo = subir(graus[p]);
    if (novo === graus[p] || n < (NIVEL_MIN_PROF[novo] ?? 0)) invalidos.push(n);
    else graus[p] = novo;
  }
  if (f.heranca === "humano-habilidoso" && f.periciaHeranca && f.nivel >= 5) graus[f.periciaHeranca] = maior(graus[f.periciaHeranca], "especialista");
  return { graus, invalidos };
}

const bonus = (prof: Prof, mod: number, nivel: number) => (prof === "destreinado" ? mod : BONUS_PROF[prof] + nivel + mod);

// Grau de percepção, salvamentos, defesa sem armadura e CD de classe no nível da ficha.
export function grausDefesa(f: Ficha): Record<Defesa, Prof> {
  const cls = acharClasse(f.classe);
  const g: Record<Defesa, Prof> = {
    percepcao: cls?.percepcao ?? "treinado",
    fortitude: cls?.fortitude ?? "treinado",
    reflexos: cls?.reflexos ?? "treinado",
    vontade: cls?.vontade ?? "treinado",
    defesa: "treinado",
    cd: "treinado",
  };
  for (const [n, alvo, prof] of cls?.marcos ?? []) if (n <= f.nivel) g[alvo] = maior(g[alvo], prof);
  return g;
}

// Grau com armas simples/marciais no nível da ficha (avançadas: destreinado).
export function grauArma(f: Pick<Ficha, "classe" | "nivel">, arma: Pick<Arma, "cat">): Prof {
  const c = COMBATE_CLASSE[f.classe];
  if (!c || arma.cat === "avancadas" || (arma.cat === "marciais" && !c.marciais)) return "destreinado";
  let g: Prof = "destreinado";
  for (const [n, p] of c.armas) if (n <= f.nivel) g = maior(g, p);
  return g;
}

const ESPECIALIZACAO: Record<Prof, number> = { destreinado: 0, treinado: 0, especialista: 2, mestre: 3, lendario: 4 };
const PERICIAS_PENALIDADE = new Set<string>(["acrobatismo", "atletismo", "furtividade", "ladroagem"]);

// Um ataque da ficha: bônus, MAP e dano já somados.
export function ataque(f: Ficha, arma: ArmaFicha, attr = atributos(f)) {
  const base = acharArma(arma.id);
  if (!base) return null;
  const prof = grauArma(f, base);
  const acuidade = base.tracos.includes("acuidade");
  const mod = base.distancia ? attr.des : acuidade ? Math.max(attr.for, attr.des) : attr.for;
  const agil = base.tracos.includes("ágil");
  const arremesso = base.tracos.some((t) => t.startsWith("arremesso"));
  const propulsiva = base.tracos.includes("propulsiva");
  let danoMod = 0;
  if (!base.distancia || arremesso) danoMod = attr.for;
  else if (propulsiva) danoMod = attr.for > 0 ? Math.floor(attr.for / 2) : attr.for;
  const espec = (COMBATE_CLASSE[f.classe]?.especializacao ?? 99) <= f.nivel ? ESPECIALIZACAO[prof] : 0;
  const total = bonus(prof, mod, f.nivel) + arma.potencia;
  const dados = 1 + arma.golpe;
  const fixo = danoMod + espec;
  return {
    nome: `${arma.potencia ? `+${arma.potencia} ` : ""}${base.nome}${arma.golpe ? ` ${["", "de golpe", "de golpe maior", "de golpe superior"][arma.golpe]}` : ""}`,
    arma: base,
    attr: (base.distancia ? "des" : acuidade && attr.des > attr.for ? "des" : "for") as Atributo,
    prof,
    bonus: total,
    map: agil ? [total, total - 4, total - 8] : [total, total - 5, total - 10],
    dano: `${dados}d${base.dado}${fixo ? (fixo > 0 ? `+${fixo}` : `${fixo}`) : ""} ${base.dano}`,
  };
}

// Volume carregado (em décimos) e limites.
export function volume(f: Ficha, attr = atributos(f)) {
  let d = 0;
  d += acharArmadura(f.armadura)?.volume ?? 0;
  d += acharEscudo(f.escudo)?.volume ?? 0;
  for (const x of f.armas) d += acharArma(x.id)?.volume ?? 0;
  for (const i of f.itens) d += i.volume * i.qtd;
  const moedas = f.dinheiro.pp + f.dinheiro.po + f.dinheiro.pa + f.dinheiro.pc;
  d += Math.floor(moedas / 1000) * 10;
  return { total: d, sobrecarregado: (5 + attr.for) * 10, maximo: (10 + attr.for) * 10 };
}

// Ataque e CD de magia, tradição e espaços. null se a classe não conjura.
export function dadosMagia(f: Ficha, attr = atributos(f)) {
  const c = CONJURACAO[f.classe];
  if (!c) return null;
  const tradicao = c.tradicao === "escolha" ? f.tradicao : c.tradicao;
  const prof: Prof = f.nivel >= 19 ? "lendario" : f.nivel >= 15 ? "mestre" : f.nivel >= 7 ? "especialista" : "treinado";
  const mod = f.chave ? attr[f.chave] : 0;
  const ataque = bonus(prof, mod, f.nivel);
  return { tradicao, tipo: c.tipo, prof, ataque, cd: 10 + ataque, circuloMaximo: circuloMaximo(f.nivel), vagas: vagasMagia(f) };
}

// Pontos de foco: um por magia de foco, até 3.
export function pontosFoco(f: Pick<Ficha, "foco">) {
  return Math.min(MAX_FOCO, f.foco.filter((x) => x.trim()).length);
}

export function calcular(f: Ficha) {
  const attr = atributos(f);
  const anc = acharAncestralidade(f.ancestralidade);
  const her = acharHeranca(f);
  const ant = acharAntecedente(f.antecedente);
  const cls = acharClasse(f.classe);
  const n = f.nivel;
  const gd = grausDefesa(f);
  const { graus } = grausPericia(f);
  const pvAnc = her?.pv ?? anc?.pv ?? 0;
  const armadura = acharArmadura(f.armadura);
  const escudo = acharEscudo(f.escudo);
  const treinadoArmadura = !armadura || (COMBATE_CLASSE[f.classe]?.armaduras ?? []).includes(armadura.cat);
  const grauArmadura: Prof = treinadoArmadura ? gd.defesa : "destreinado";
  const forteBastante = !!armadura && attr.for >= armadura.forca;
  const penalidade = armadura && !forteBastante ? armadura.penalidade : 0;
  const lentidao = armadura ? Math.min(0, armadura.velocidade + (forteBastante ? 5 : 0)) : 0;
  const res = armadura ? f.runasArmadura.resiliente : 0;
  const ca = 10 + Math.min(attr.des, armadura?.desMax ?? 99) + bonus(grauArmadura, 0, n) + (armadura ? armadura.ca + f.runasArmadura.potencia : 0);
  const vol = volume(f, attr);
  const sobrecarregado = vol.total > vol.sobrecarregado;
  return {
    attr,
    graus: { ...gd, defesa: grauArmadura },
    pv: pvAnc + ((cls?.pv ?? 0) + attr.con) * n,
    ca,
    caEscudo: escudo ? ca + escudo.ca : null,
    escudo,
    armadura,
    treinadoArmadura,
    penalidade,
    percepcao: bonus(gd.percepcao, attr.sab, n),
    fortitude: bonus(gd.fortitude, attr.con, n) + res,
    reflexos: bonus(gd.reflexos, attr.des, n) + res,
    vontade: bonus(gd.vontade, attr.sab, n) + res,
    cdClasse: f.chave ? 10 + bonus(gd.cd, attr[f.chave], n) : null,
    deslocamento: (anc?.deslocamento ?? 25) + lentidao - (sobrecarregado ? 10 : 0),
    tamanho: anc?.tamanho ?? "Médio",
    sentidos: her?.sentidos ?? (f.heranca === "elfo-caverna" || f.heranca === "gnomo-umbral" || f.heranca === "leshy-fungo" ? "Visão no escuro" : anc?.sentidos ?? null),
    idiomas: anc?.idiomas ?? null,
    idiomasLivres: Math.max(0, attr.int),
    saber: ant?.saber ?? null,
    saberBonus: bonus("treinado", attr.int, n),
    recursos: (cls?.recursos ?? []).filter(([r]) => r <= n).sort((a, b) => a[0] - b[0]),
    pericias: PERICIAS.map((p) => ({ ...p, prof: graus[p.id], bonus: bonus(graus[p.id], attr[p.attr], n) + (PERICIAS_PENALIDADE.has(p.id) ? penalidade : 0) })),
    ataques: f.armas.map((x) => ataque(f, x, attr)).filter((x): x is NonNullable<typeof x> => !!x),
    volume: vol,
    sobrecarregado,
    magia: dadosMagia(f, attr),
    pontosFoco: pontosFoco(f),
  };
}

const semRepetir = (xs: string[]) => new Set(xs).size === xs.length;

// O que ainda falta pra ficha ficar válida, em ordem. Vazio = pronta.
export function pendencias(f: Ficha): string[] {
  const out: string[] = [];
  const anc = acharAncestralidade(f.ancestralidade);
  const ant = acharAntecedente(f.antecedente);
  const cls = acharClasse(f.classe);
  if (!f.nome.trim()) out.push("Dê um nome ao personagem.");
  if (!anc) out.push("Escolha a ancestralidade.");
  else {
    if (f.boostsAncestral.length !== anc.livres || !semRepetir(f.boostsAncestral) || f.boostsAncestral.some((a) => anc.boosts.includes(a)))
      out.push(`Escolha ${anc.livres === 1 ? "o boost livre" : `os ${anc.livres} boosts livres`} da ancestralidade.`);
    if (!acharHeranca(f)) out.push("Escolha a herança.");
    else if (f.heranca === "humano-habilidoso" && !f.periciaHeranca) out.push("Escolha a perícia do Humano Habilidoso.");
  }
  if (!ant) out.push("Escolha o antecedente.");
  else if (!f.boostAntecedente || !ant.opcoes.includes(f.boostAntecedente) || !f.boostAntecedenteLivre || f.boostAntecedenteLivre === f.boostAntecedente)
    out.push("Escolha os dois boosts do antecedente (atributos diferentes).");
  if (!cls) out.push("Escolha a classe.");
  else if (!f.chave || !cls.chave.includes(f.chave)) out.push("Escolha o atributo-chave da classe.");
  if (f.boostsLivres.length !== LIVRES_NIVEL_1 || !semRepetir(f.boostsLivres)) out.push(`Distribua os ${LIVRES_NIVEL_1} boosts livres em atributos diferentes.`);
  for (const n of NIVEIS_AUMENTO) {
    if (n > f.nivel) break;
    const a = f.aumentos[n] ?? [];
    if (a.length !== AUMENTOS_POR_NIVEL || !semRepetir(a)) out.push(`Escolha os ${AUMENTOS_POR_NIVEL} aumentos de atributo do nível ${n}.`);
  }
  if (cls) {
    const fixas = periciasFixas(f);
    const n = periciasParaEscolher(f);
    if (f.pericias.length !== n || !semRepetir(f.pericias) || f.pericias.some((p) => fixas.includes(p)))
      out.push(`Escolha ${n} perícia${n === 1 ? "" : "s"} treinada${n === 1 ? "" : "s"}.`);
    const { invalidos } = grausPericia(f);
    const vazios = niveisAumentoPericia(f).filter((lv) => !f.aumentosPericia[lv]);
    if (vazios.length) out.push(`Escolha o aumento de perícia do${vazios.length > 1 ? "s" : ""} nível${vazios.length > 1 ? "is" : ""} ${vazios.join(", ")}.`);
    if (invalidos.length) out.push(`Aumento de perícia acima do limite no nível ${invalidos.join(", ")} (mestre só a partir do 7, lendário a partir do 15).`);
    const semTalento = vagasTalento(f).filter((v) => !f.talentos[v.chave]?.trim()).length;
    if (semTalento) out.push(`${semTalento} talento${semTalento > 1 ? "s" : ""} em branco.`);
    const conj = CONJURACAO[f.classe];
    if (conj?.tradicao === "escolha" && !f.tradicao) out.push("Escolha a tradição de magia.");
    const semMagia = vagasMagia(f).filter((v) => !f.magias[v.chave]?.trim()).length;
    if (semMagia) out.push(`${semMagia} magia${semMagia > 1 ? "s" : ""} em branco.`);
  }
  return out;
}

// Ao trocar ancestralidade/antecedente/classe, limpa escolhas que deixaram de valer.
export function ajustar(f: Ficha): Ficha {
  const anc = acharAncestralidade(f.ancestralidade);
  const ant = acharAntecedente(f.antecedente);
  const cls = acharClasse(f.classe);
  const boostsAncestral = anc ? f.boostsAncestral.filter((a) => !anc.boosts.includes(a)).slice(0, anc.livres) : [];
  const heranca = anc?.herancas.some((h) => h.id === f.heranca) ? f.heranca : "";
  const periciaHeranca: Ficha["periciaHeranca"] = heranca === "humano-habilidoso" ? f.periciaHeranca : "";
  const boostAntecedente: Ficha["boostAntecedente"] = ant && f.boostAntecedente && ant.opcoes.includes(f.boostAntecedente) ? f.boostAntecedente : "";
  const chave: Ficha["chave"] = cls ? (cls.chave.length === 1 ? cls.chave[0] : f.chave && cls.chave.includes(f.chave) ? f.chave : "") : "";
  const nivel = Math.min(NIVEL_MAX, Math.max(1, Math.round(f.nivel) || 1));
  const g: Ficha = { ...f, nivel, heranca, periciaHeranca, boostsAncestral, boostAntecedente, chave };
  const fixas = periciasFixas(g);
  const pericias = f.pericias.filter((p) => !fixas.includes(p)).slice(0, periciasParaEscolher(g));
  return { ...g, pericias };
}

export const sinal = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

// Lê uma ficha guardada (localStorage), descartando o que não for válido.
export function lerFicha(json: string | null): Ficha | null {
  if (!json) return null;
  try {
    return normalizarFicha(JSON.parse(json));
  } catch {
    return null;
  }
}

// Limpa uma ficha vinda de fora (navegador, banco). Campo inválido vira vazio.
export function normalizarFicha(o: unknown): Ficha | null {
  if (typeof o !== "object" || !o) return null;
  return normalizarObjeto(o as Record<string, unknown>);
}

// Resumo de uma linha: "Anão · Clérigo 3".
export function resumoFicha(f: Ficha): string {
  const cls = acharClasse(f.classe);
  return [acharAncestralidade(f.ancestralidade)?.nome, cls && `${cls.nome} ${f.nivel}`].filter(Boolean).join(" · ");
}

const inteiro = (x: unknown, min: number, max: number, padrao = min) => (typeof x === "number" && Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : padrao);

function normalizarEquip(o: Record<string, unknown>): Pick<Ficha, "armadura" | "runasArmadura" | "escudo" | "armas" | "itens" | "dinheiro"> {
  const obj = (x: unknown) => (typeof x === "object" && x && !Array.isArray(x) ? (x as Record<string, unknown>) : {});
  const ra = obj(o.runasArmadura);
  const din = typeof o.dinheiro === "object" && o.dinheiro ? obj(o.dinheiro) : null;
  return {
    armadura: typeof o.armadura === "string" && acharArmadura(o.armadura) ? o.armadura : "",
    runasArmadura: { potencia: inteiro(ra.potencia, 0, 3), resiliente: inteiro(ra.resiliente, 0, 3) },
    escudo: typeof o.escudo === "string" && acharEscudo(o.escudo) ? o.escudo : "",
    armas: (Array.isArray(o.armas) ? o.armas : [])
      .map(obj)
      .filter((x) => typeof x.id === "string" && acharArma(x.id))
      .slice(0, 20)
      .map((x) => ({ id: x.id as string, potencia: inteiro(x.potencia, 0, 3), golpe: inteiro(x.golpe, 0, 3) })),
    itens: (Array.isArray(o.itens) ? o.itens : [])
      .map(obj)
      .filter((x) => typeof x.nome === "string")
      .slice(0, 100)
      .map((x) => ({ nome: (x.nome as string).slice(0, 80), qtd: inteiro(x.qtd, 0, 9999, 1), volume: inteiro(x.volume, 0, 1000) })),
    dinheiro: din
      ? { pp: inteiro(din.pp, 0, 1e7), po: inteiro(din.po, 0, 1e7), pa: inteiro(din.pa, 0, 1e7), pc: inteiro(din.pc, 0, 1e7) }
      : { ...FICHA_VAZIA.dinheiro },
  };
}

function normalizarObjeto(o: Record<string, unknown>): Ficha {
  const attr = (x: unknown): Atributo | "" => (ATRIBUTOS.includes(x as Atributo) ? (x as Atributo) : "");
  const lista = (x: unknown) => (Array.isArray(x) ? x.map(attr).filter((a): a is Atributo => !!a) : []);
  const ids = new Set<string>(PERICIAS.map((p) => p.id));
  const pericia = (x: unknown): Pericia | "" => (typeof x === "string" && ids.has(x) ? (x as Pericia) : "");
  const obj = (x: unknown) => (typeof x === "object" && x && !Array.isArray(x) ? (x as Record<string, unknown>) : {});
  const nivelValido = (k: string) => /^\d{1,2}$/.test(k) && +k >= 1 && +k <= NIVEL_MAX;

  const aumentos: Ficha["aumentos"] = {};
  for (const [k, v] of Object.entries(obj(o.aumentos))) if (NIVEIS_AUMENTO.includes(+k as 5)) aumentos[k] = [...new Set(lista(v))].slice(0, AUMENTOS_POR_NIVEL);
  const aumentosPericia: Ficha["aumentosPericia"] = {};
  for (const [k, v] of Object.entries(obj(o.aumentosPericia))) {
    const p = pericia(v);
    if (nivelValido(k) && p) aumentosPericia[k] = p;
  }
  const talentos: Ficha["talentos"] = {};
  for (const [k, v] of Object.entries(obj(o.talentos))) if (/^[a-z]+-[a-z0-9]+$/.test(k) && typeof v === "string" && v.trim()) talentos[k] = v.slice(0, 80);

  return ajustar({
    nome: typeof o.nome === "string" ? o.nome.slice(0, 60) : "",
    nivel: typeof o.nivel === "number" ? o.nivel : 1,
    ancestralidade: typeof o.ancestralidade === "string" && acharAncestralidade(o.ancestralidade) ? o.ancestralidade : "",
    heranca: typeof o.heranca === "string" ? o.heranca : "",
    antecedente: typeof o.antecedente === "string" && acharAntecedente(o.antecedente) ? o.antecedente : "",
    classe: typeof o.classe === "string" && acharClasse(o.classe) ? o.classe : "",
    chave: attr(o.chave),
    boostsAncestral: lista(o.boostsAncestral),
    boostAntecedente: attr(o.boostAntecedente),
    boostAntecedenteLivre: attr(o.boostAntecedenteLivre),
    boostsLivres: lista(o.boostsLivres).slice(0, LIVRES_NIVEL_1),
    pericias: Array.isArray(o.pericias) ? o.pericias.filter((p: unknown): p is Pericia => typeof p === "string" && ids.has(p)) : [],
    periciaHeranca: pericia(o.periciaHeranca),
    aumentos,
    aumentosPericia,
    talentos,
    notas: typeof o.notas === "string" ? o.notas.slice(0, 4000) : "",
    ...normalizarEquip(o),
    tradicao: TRADICOES.includes(o.tradicao as Tradicao) ? (o.tradicao as Tradicao) : "",
    magias: Object.fromEntries(
      Object.entries(typeof o.magias === "object" && o.magias && !Array.isArray(o.magias) ? o.magias : {})
        .filter(([k, v]) => /^(truque|r\d{1,2})-\d{1,2}$/.test(k) && typeof v === "string" && v.trim())
        .map(([k, v]) => [k, (v as string).slice(0, 80)]),
    ),
    idiomasExtras: (Array.isArray(o.idiomasExtras) ? o.idiomasExtras : []).filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 20).map((x) => x.slice(0, 40)),
    jogo: normalizarJogo(o.jogo),
    foco: (Array.isArray(o.foco) ? o.foco : []).filter((x): x is string => typeof x === "string").slice(0, 10).map((x) => x.slice(0, 80)),
  });
}
