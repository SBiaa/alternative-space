// Regras de personagem do Pathfinder 2ª edição (Remaster, Player Core), níveis 1 a 20.
// Atributos são modificadores (começam em 0). Cada boost dá +1 e cada falha tira 1.
// Dentro de um mesmo grupo de boosts (ancestralidade, antecedente, livres, aumento de nível) não dá pra repetir atributo.
// Nos aumentos dos níveis 5/10/15/20, um atributo que já está em +4 ou mais só sobe +1 a cada dois aumentos.

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

export type Heranca = { id: string; nome: string; texto: string; pv?: number };

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
};

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
  return {
    attr,
    graus: gd,
    pv: pvAnc + ((cls?.pv ?? 0) + attr.con) * n,
    ca: 10 + attr.des + bonus(gd.defesa, 0, n),
    percepcao: bonus(gd.percepcao, attr.sab, n),
    fortitude: bonus(gd.fortitude, attr.con, n),
    reflexos: bonus(gd.reflexos, attr.des, n),
    vontade: bonus(gd.vontade, attr.sab, n),
    cdClasse: f.chave ? 10 + bonus(gd.cd, attr[f.chave], n) : null,
    deslocamento: anc?.deslocamento ?? 25,
    tamanho: anc?.tamanho ?? "Médio",
    sentidos: f.heranca === "elfo-caverna" || f.heranca === "gnomo-umbral" || f.heranca === "leshy-fungo" ? "Visão no escuro" : anc?.sentidos ?? null,
    idiomas: anc?.idiomas ?? null,
    saber: ant?.saber ?? null,
    saberBonus: bonus("treinado", attr.int, n),
    recursos: (cls?.recursos ?? []).filter(([r]) => r <= n).sort((a, b) => a[0] - b[0]),
    pericias: PERICIAS.map((p) => ({ ...p, prof: graus[p.id], bonus: bonus(graus[p.id], attr[p.attr], n) })),
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
  });
}
