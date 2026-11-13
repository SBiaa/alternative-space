// Catálogo de melhorias e os 8 arquétipos da Lan House 2005. É a fonte do seed (npm run seed:lan): o jogo lê do banco
// e só cai nisto aqui se o seed ainda não rodou. Todas as marcas e nomes são inventados.

import type { Arquetipo, Efeito, ItemCatalogo, TipoItem } from "./tipos";

const item = (kind: TipoItem, slug: string, name: string, description: string, position: number, minLanLevel: number, prices: number[], effects: Efeito[]): ItemCatalogo => ({
  kind, slug, name, description, position, minLanLevel, prices, effects, maxLevel: prices.length,
});

/** Cada nível de uma máquina é mais uma máquina daquele tipo no salão. */
const pc = (slug: string, name: string, description: string, position: number, minLanLevel: number, prices: number[]) =>
  item("maquina", slug, name, description, position, minLanLevel, prices, prices.map(() => ({ pcs: 1 })));

const lanche = (slug: string, name: string, description: string, position: number, minLanLevel: number, prices: number[], capacidade: number[], preco: number[], custo: number[], satisfacao: number[]) =>
  item("balcao", slug, name, description, position, minLanLevel, prices, prices.map((_, i) => ({ capacidade: capacidade[i], preco: preco[i], custo: custo[i], satisfacao: satisfacao[i] })));

export const CATALOGO_ITENS: ItemCatalogo[] = [
  // Máquinas
  pc("pc-basica", "Máquina básica", "Gabinete bege, monitor de tubo e teclado com a letra Ç gasta. Cada nível é mais uma máquina.", 1, 1, [0, 0, 0, 90, 110, 130, 150, 170]),
  pc("pc-media", "Máquina média", "Roda o Tanquinho e a Corrida Turbo sem engasgar. Cada nível é mais uma máquina.", 2, 2, [180, 210, 240, 270, 300, 330]),
  pc("pc-gamer", "Máquina gamer", "Placa de vídeo nova e gabinete com luz. A galera do tiro briga por ela. Cada nível é mais uma máquina.", 3, 3, [320, 360, 400, 440, 480, 520]),
  item("maquina", "monitor-fino", "Monitores de tela fina", "Troca todos os tubos por tela fina: mais conforto, menos luz gasta.", 4, 2, [260], [{ telaFina: 1, conforto: 0.15 }]),
  item("maquina", "mouse-optico", "Mouse óptico", "Adeus bolinha suja. A máquina nunca mais pede limpeza de mouse.", 5, 1, [120], [{ mouseOptico: 1 }]),
  item("maquina", "fone", "Fones de ouvido", "Um fone por máquina. Cada um no seu som, menos briga por barulho.", 6, 1, [70], [{ fone: 1, satisfacao: 0.03, barulhoMult: 0.85 }]),

  // Internet
  item("internet", "internet", "Plano de internet", "Da discada que chia até a banda larga boa. Jogo on-line só a partir da banda larga.", 10, 1, [0, 220, 480], [
    { plano: 0, online: 0, quedaMult: 1, conta: 20 },
    { plano: 1, online: 1, quedaMult: 0.5, conta: 45 },
    { plano: 2, online: 1, quedaMult: 0.2, conta: 75 },
  ]),

  // Energia
  item("energia", "nobreak", "Nobreak", "Segura as máquinas ligadas quando a luz pisca. O segundo nível é um nobreak geral.", 15, 1, [90, 260], [{ nobreakSeg: 6 }, { nobreakSeg: 20 }]),

  // Software
  item("software", "antivirus", "Antivírus", "Menos vírus. No segundo nível, a varredura é bem mais rápida.", 20, 1, [60, 150], [{ virusMult: 0.5, antivirusRapido: 0 }, { virusMult: 0.3, antivirusRapido: 1 }]),
  item("software", "congelar", "Congelar máquina", "Tudo que alguém instalar some ao reiniciar. O fuçador perde a graça.", 21, 2, [180], [{ congelar: 1 }]),
  item("software", "atualizacao", "Atualização dos jogos", "Jogos na última versão: a galera fica mais satisfeita.", 22, 1, [80, 160], [{ jogoBonus: 0.08 }, { jogoBonus: 0.15 }]),

  // Serviços
  item("servico", "impressora", "Impressora", "Preto e branco no primeiro nível, colorida no segundo.", 30, 1, [70, 190], [{ impressora: 1 }, { impressora: 2 }]),
  item("servico", "gravador", "Gravador de CD", "Pra gravar CD de fotos da família e trabalhos.", 31, 1, [110], [{ gravador: 1 }]),
  item("servico", "scanner", "Scanner", "Digitaliza foto antiga e documento.", 32, 2, [120], [{ scanner: 1 }]),
  item("servico", "xerox", "Xerox", "Cópia rápida no balcão. Estudante adora.", 33, 2, [160], [{ xerox: 1 }]),

  // Balcão: o nível 1 libera o produto; os seguintes aumentam o estoque do dia e a qualidade.
  lanche("refri", "Refri Borbulha", "Gelado no freezer do balcão.", 40, 1, [0, 60, 140], [10, 18, 28], [3, 3, 4], [1, 1, 1], [0.6, 0.75, 0.9]),
  lanche("salgadinho", "Salgadinho Crocante da Vila", "Pacotinho que faz barulho na hora da partida.", 41, 1, [40, 90, 170], [10, 18, 26], [2, 2, 3], [1, 1, 1], [0.55, 0.7, 0.85]),
  lanche("bala", "Bala Estalo", "Pote de bala no balcão. Margem pequena, todo mundo leva.", 42, 1, [20, 50], [20, 35], [1, 1], [0, 0], [0.5, 0.65]),
  lanche("misto", "Misto quente da casa", "Sanduicheira no canto do balcão. Melhor lanche da lan.", 43, 2, [120, 220], [8, 14], [5, 6], [2, 2], [0.8, 0.95]),

  // Conforto
  item("conforto", "cadeira", "Cadeiras", "Da cadeira de plástico à cadeira gamer: mais conforto, paciência cai mais devagar.", 50, 1, [0, 150, 340], [
    { conforto: 0.1, pacienciaMult: 1 },
    { conforto: 0.4, pacienciaMult: 0.88 },
    { conforto: 0.7, pacienciaMult: 0.78 },
  ]),
  item("conforto", "ventilacao", "Ventilação", "Ventilador de teto e, depois, ar-condicionado. Mais conforto, mais conta de luz.", 51, 1, [50, 300], [{ conforto: 0.1, luz: 1 }, { conforto: 0.3, luz: 6 }]),

  // Ambiente
  item("ambiente", "divisoria", "Divisória", "Separa o setor gamer do escritório. O barulho não passa pro outro lado.", 60, 1, [100], [{ divisoria: 1 }]),
  item("ambiente", "poster", "Pôsteres dos jogos", "Pôster da Operação Tática e de Reinos Online na parede.", 61, 1, [40, 90], [{ satisfacao: 0.02, reputacao: 0.002 }, { satisfacao: 0.04, reputacao: 0.004 }]),
  item("ambiente", "placa", "Placa de \"fale baixo\"", "Escrita à mão, presa com fita crepe. Funciona mais do que parece.", 62, 1, [30], [{ barulhoMult: 0.6 }]),

  // Expansão: tamanho absoluto da grade em cada nível.
  item("expansao", "espaco", "Mais espaço", "Aluga a sala do lado e abre espaço pra mais máquinas.", 70, 1, [0, 200, 420, 700], [
    { colunas: 4, linhas: 3 },
    { colunas: 5, linhas: 3 },
    { colunas: 5, linhas: 4 },
    { colunas: 6, linhas: 4 },
  ]),
  item("expansao", "corujao", "Corujão", "Abre de madrugada, das 22h às 4h. Público próprio, mais lucro e mais desgaste.", 71, 3, [350], [{ corujao: 1 }]),
  item("expansao", "sala-gamer", "Sala gamer", "As máquinas gamer ficam numa sala com porta: o barulho delas quase não sai.", 72, 4, [600], [{ salaGamer: 1 }]),
];

const p = (manha: number, tarde: number, noite: number, madrugada: number) => ({ manha, tarde, noite, madrugada });

export const CATALOGO_ARQUETIPOS: Arquetipo[] = [
  {
    slug: "galera-tiro", name: "Galera do tiro em equipe", icone: "🎯",
    wants: { atividade: "jogar", jogo: "operacao-tatica", horas: 2, grupo: [3, 5], tier: "media", online: false, lanche: 0.6, periodos: p(0.2, 1, 1.4, 0.3) },
    patience: 30, spend: 1.2, tip: 0.1, noiseTolerance: 1, makesNoise: true,
    quirk: { id: "vizinhas", rotulo: "Quer máquinas vizinhas e boas, e grita na partida" }, unlock: { reputacao: 0, nivel: 1 },
  },
  {
    slug: "rei-mensageiro", name: "Rei do mensageiro", icone: "💬",
    wants: { atividade: "mensageiro", horas: 2, grupo: [1, 1], tier: "basica", online: false, lanche: 0.3, periodos: p(0.5, 1, 1, 0.2) },
    patience: 40, spend: 0.8, tip: 0.05, noiseTolerance: 0.2, makesNoise: false,
    quirk: { id: "silencio", rotulo: "Aceita qualquer máquina, mas se irrita com barulho" }, unlock: { reputacao: 0, nivel: 1 },
  },
  {
    slug: "estudante", name: "Estudante do trabalho", icone: "📚",
    wants: { atividade: "servico", servicos: ["pesquisa", "impressao"], horas: 1, grupo: [1, 2], tier: "basica", online: false, lanche: 0.2, periodos: p(1.2, 1, 0.3, 0) },
    patience: 32, spend: 1, tip: 0.05, noiseTolerance: 0.4, makesNoise: false,
    quirk: { id: "pressa-fim-tarde", rotulo: "Tem pressa no fim da tarde", hora: 16, mult: 1.6 }, unlock: { reputacao: 0, nivel: 1 },
  },
  {
    slug: "curriculo", name: "Pessoa do currículo", icone: "📄",
    wants: { atividade: "servico", servicos: ["curriculo"], horas: 1, grupo: [1, 1], tier: "basica", online: false, lanche: 0.1, periodos: p(1.4, 0.6, 0.1, 0) },
    patience: 36, spend: 1, tip: 0.3, noiseTolerance: 0.4, makesNoise: false,
    quirk: { id: "precisa-impressora", rotulo: "Precisa de impressora funcionando; gorjeta boa se sair bonito" }, unlock: { reputacao: 0, nivel: 1 },
  },
  {
    slug: "tio", name: "Tio que não sabe usar", icone: "🧓",
    wants: { atividade: "mensageiro", horas: 1, grupo: [1, 1], tier: "basica", online: false, lanche: 0.4, periodos: p(1, 0.8, 0.3, 0) },
    patience: 45, spend: 1.4, tip: 0.2, noiseTolerance: 0.5, makesNoise: false,
    quirk: { id: "pede-ajuda", rotulo: "Pede ajuda (ocupa você); bem atendido, dá reputação", bonus: 0.05 }, unlock: { reputacao: 2.2, nivel: 1 },
  },
  {
    slug: "fotografo", name: "Fotógrafo de família", icone: "📷",
    wants: { atividade: "servico", servicos: ["cd", "impressao"], horas: 1, grupo: [1, 2], tier: "basica", online: false, lanche: 0.2, periodos: p(1, 1, 0.4, 0) },
    patience: 38, spend: 1.2, tip: 0.15, noiseTolerance: 0.5, makesNoise: false,
    quirk: { id: "precisa-gravador", rotulo: "Grava CD de fotos e imprime; precisa de gravador" }, unlock: { reputacao: 2.5, nivel: 2 },
  },
  {
    slug: "jogador-mmo", name: "Jogador do MMO", icone: "🏰",
    wants: { atividade: "jogar", jogo: "reinos-online", horas: 3, grupo: [1, 2], tier: "media", online: true, lanche: 0.5, periodos: p(0.1, 0.6, 1, 2.5) },
    patience: 34, spend: 1.1, tip: 0.08, noiseTolerance: 0.7, makesNoise: false,
    quirk: { id: "odeia-queda", rotulo: "Fica horas e odeia queda de internet" }, unlock: { reputacao: 2.8, nivel: 2 },
  },
  {
    slug: "fucador", name: "Fuçador", icone: "🧰",
    wants: { atividade: "jogar", jogo: "tanquinho", horas: 1.5, grupo: [1, 1], tier: "basica", online: false, lanche: 0.3, periodos: p(0.4, 1, 0.8, 0.3) },
    patience: 34, spend: 0.9, tip: 0.05, noiseTolerance: 0.8, makesNoise: false,
    quirk: { id: "instala-coisas", rotulo: "Tenta instalar coisas: mais chance de vírus" }, unlock: { reputacao: 3, nivel: 2 },
  },
];
