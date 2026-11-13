// Catálogo embutido do Muro Livre: melhorias, arquétipos de artista, clientes e diálogos de autorização.
// É o mesmo conteúdo que o seed grava no banco; se o banco estiver vazio ou fora, o jogo usa este.
// Marcas, lugares e gente: tudo inventado.

import { TEMPLATES } from "./templates";
import type { ArquetipoArtista, Catalogo, Dialogo, ItemCatalogo, Tamanho } from "./tipos";

export const ITENS: ItemCatalogo[] = [
  { slug: "tinta-qualidade", kind: "material", name: "Tinta de mais qualidade", description: "Linha Arco-Vivo: cobre melhor, seca mais rápido e rende mais acabamento. O refil fica mais caro.", maxLevel: 2, prices: [180, 420],
    effects: [{ gastoTinta: 0.88, secagem: 0.85, qualidade: 4, precoTinta: 1.4, tinta: 1 }, { gastoTinta: 0.75, secagem: 0.7, qualidade: 8, precoTinta: 1.9, tinta: 2 }], minCrewLevel: 2, position: 10 },
  { slug: "spray-bico", kind: "material", name: "Spray com bico melhor", description: "Bicos Fino-Certo: o bico entope menos e o contorno sai mais limpo.", maxLevel: 2, prices: [120, 300],
    effects: [{ entope: 0.7, qualidadeContorno: 4 }, { entope: 0.45, qualidadeContorno: 8 }], minCrewLevel: 2, position: 20 },
  { slug: "rolinho-pro", kind: "material", name: "Rolinho profissional", description: "Rolo Pé-de-Boi: dura mais e cobre fundo mais depressa.", maxLevel: 2, prices: [140, 320],
    effects: [{ desgasteRolinho: 0.7, velFundo: 1.1 }, { desgasteRolinho: 0.5, velFundo: 1.2 }], minCrewLevel: 2, position: 30 },
  { slug: "andaime", kind: "andaime", name: "Andaime de cano", description: "Sobe o alcance da crew: nível 1 chega a 3,5 m, nível 2 a 4,5 m.", maxLevel: 2, prices: [150, 320],
    effects: [{ alcance: 1 }, { alcance: 2 }], minCrewLevel: 1, position: 40 },
  { slug: "andaime-alto", kind: "andaime", name: "Andaime alto", description: "Nível 3 chega a 5,5 m e o 4 a 8 m. Exige crew grande pra montar.", maxLevel: 2, prices: [650, 1200],
    effects: [{ alcance: 3 }, { alcance: 4 }], minCrewLevel: 3, position: 50 },
  { slug: "andaime-tubular", kind: "andaime", name: "Andaime tubular rápido", description: "Encaixa em vez de amarrar: monta o andaime em bem menos tempo.", maxLevel: 1, prices: [260],
    effects: [{ montagem: 0.4 }], minCrewLevel: 2, position: 60 },
  { slug: "lona-maior", kind: "protecao", name: "Lona maior", description: "Cobre uma área maior do muro quando a chuva chega.", maxLevel: 2, prices: [90, 250],
    effects: [{ lonaM2: 14 }, { lonaM2: 30 }], minCrewLevel: 2, position: 70 },
  { slug: "tenda-secagem", kind: "protecao", name: "Tenda de secagem", description: "A tinta fica fresca por menos tempo, então a chuva pega menos.", maxLevel: 2, prices: [160, 380],
    effects: [{ secagemTenda: 0.75 }, { secagemTenda: 0.55 }], minCrewLevel: 3, position: 80 },
  { slug: "atelie-armario", kind: "espaco", name: "Ateliê com armário", description: "Tudo guardado no lugar: menos tinta e spray desperdiçados.", maxLevel: 2, prices: [120, 280],
    effects: [{ desperdicio: 0.9 }, { desperdicio: 0.8 }], minCrewLevel: 2, position: 90 },
  { slug: "deposito", kind: "espaco", name: "Depósito", description: "Cabe mais material no estoque.", maxLevel: 2, prices: [100, 240],
    effects: [{ estoqueExtra: 0.5 }, { estoqueExtra: 1 }], minCrewLevel: 2, position: 100 },
  { slug: "mesa-croqui", kind: "planejamento", name: "Mesa de croqui", description: "Croqui melhor e revisão de autorização mais rápida.", maxLevel: 2, prices: [110, 260],
    effects: [{ croqui: 0.1, negociacao: 0.3 }, { croqui: 0.2, negociacao: 0.6 }], minCrewLevel: 2, position: 110 },
  { slug: "projetor", kind: "planejamento", name: "Projetor de croqui", description: "Projeta o desenho no muro: o traço guia fica mais preciso.", maxLevel: 2, prices: [130, 300],
    effects: [{ precisaoGuia: 0.05 }, { precisaoGuia: 0.1 }], minCrewLevel: 3, position: 120 },
  { slug: "treino", kind: "equipe", name: "Treino da crew", description: "Oficina de técnica: +1 de técnica pra todo mundo, por nível.", maxLevel: 3, prices: [150, 320, 600],
    effects: [{ treino: 1 }, { treino: 2 }, { treino: 3 }], minCrewLevel: 2, position: 130 },
  { slug: "vagas", kind: "equipe", name: "Mais espaço na crew", description: "Uma vaga de artista a mais por nível.", maxLevel: 2, prices: [200, 500],
    effects: [{ vagas: 1 }, { vagas: 2 }], minCrewLevel: 3, position: 140 },
];

export const ARQUETIPOS: ArquetipoArtista[] = [
  { slug: "contorno-firme", nome: "Mão firme no contorno", descricao: "Traço seguro. Rende mais no contorno, mais devagar no resto.", especialidade: "contorno", hab: { tecnica: 4, velocidade: 3, estilo: 3, resistencia: 3 }, salario: 52, contratacao: 80, nivelMin: 1, negociacao: 0, desperdicio: 1 },
  { slug: "fundo-rapido", nome: "Fundo rápido", descricao: "Cobre parede grande depressa. Rolinho é com ela.", especialidade: "fundo", hab: { tecnica: 3, velocidade: 5, estilo: 2, resistencia: 4 }, salario: 46, contratacao: 70, nivelMin: 1, negociacao: 0, desperdicio: 1 },
  { slug: "detalhe-fino", nome: "Detalhe fino", descricao: "Brilho, sombra e acabamento. Devagar, mas bonito.", especialidade: "detalhe", hab: { tecnica: 4, velocidade: 2, estilo: 5, resistencia: 2 }, salario: 58, contratacao: 90, nivelMin: 2, negociacao: 0, desperdicio: 1 },
  { slug: "papo-com-cliente", nome: "Sabe lidar com cliente", descricao: "Ajuda na conversa de autorização e deixa o briefing mais claro.", especialidade: null, hab: { tecnica: 3, velocidade: 3, estilo: 3, resistencia: 3 }, salario: 50, contratacao: 80, nivelMin: 2, negociacao: 1.2, desperdicio: 1 },
  { slug: "cuida-do-material", nome: "Cuida do material", descricao: "Não deixa lata nem rolinho se perder: menos desperdício de tinta.", especialidade: null, hab: { tecnica: 3, velocidade: 3, estilo: 2, resistencia: 4 }, salario: 44, contratacao: 70, nivelMin: 1, negociacao: 0, desperdicio: 0.8 },
];

export type Cliente = {
  slug: string;
  tipo: "comercial" | "comunitario";
  rotulo: string;
  nomes: string[];
  dialogo: string | null; // kind do diálogo, quando o muro não é do cliente
  tamanhos: Tamanho[];
  temas: string[];
  palavras: string[];
  obs: string[];
  exige: { clientes: number; quebrada: number };
};

export const CLIENTES: Cliente[] = [
  { slug: "padaria", tipo: "comercial", rotulo: "Padaria", nomes: ["Padaria Forno Manso", "Pães da Vó Tica", "Padaria Miolo Quente"], dialogo: null, tamanhos: ["porta", "fachada"],
    temas: ["pão saindo do forno", "manhã no bairro", "café com leite"], palavras: ["FORNADA", "QUENTINHO", "PÃO NOVO"], obs: ["Quero algo que dê fome quem passa.", "Pode ter cor forte, mas o nome tem que aparecer."], exige: { clientes: 0, quebrada: 0 } },
  { slug: "barbearia", tipo: "comercial", rotulo: "Barbearia", nomes: ["Barbearia Fio Fino", "Corte Mansinho", "Barbearia Navalha Doce"], dialogo: null, tamanhos: ["porta", "fachada"],
    temas: ["espelho e tesoura", "rua à noite", "cadeira giratória"], palavras: ["NA RÉGUA", "FIO FINO", "CORTE"], obs: ["Gosto de cor escura com um detalhe vivo.", "A porta é o cartão de visita."], exige: { clientes: 0, quebrada: 0 } },
  { slug: "mercadinho", tipo: "comercial", rotulo: "Mercadinho", nomes: ["Mercadinho Cantinho Bom", "Armazém Dois Irmãos", "Mercadinho Sol Nascente"], dialogo: null, tamanhos: ["fachada", "quadra"],
    temas: ["feira e frutas", "vizinhança", "cesta cheia"], palavras: ["FRESQUINHO", "DE TUDO", "PERTO DE VOCÊ"], obs: ["Quero colorido, parece feira.", "Tem que dar pra ler de longe."], exige: { clientes: 1.5, quebrada: 0 } },
  { slug: "oficina", tipo: "comercial", rotulo: "Oficina", nomes: ["Oficina Roda Mansa", "Auto Parafuso Feliz"], dialogo: null, tamanhos: ["fachada", "quadra", "longo"],
    temas: ["engrenagens", "estrada ao pôr do sol", "chave inglesa"], palavras: ["REVISÃO", "NO PONTO", "BOA VIAGEM"], obs: ["Cor de ferrugem e azul, de preferência.", "Muro grande, capricha."], exige: { clientes: 2.5, quebrada: 0 } },
  { slug: "escola", tipo: "comunitario", rotulo: "Escola", nomes: ["Escola Estadual Pé de Manga", "Escola Municipal Cantares"], dialogo: "diretor", tamanhos: ["quadra", "fachada"],
    temas: ["esporte e recreio", "bairro que aprende", "livros e bola"], palavras: ["RECREIO", "TURMA", "BAIRRO QUE APRENDE"], obs: ["Tem que ser tema que a criançada possa ver sem susto.", "A diretoria precisa aprovar o croqui antes."], exige: { clientes: 0, quebrada: 1 } },
  { slug: "associacao", tipo: "comunitario", rotulo: "Associação de moradores", nomes: ["Associação Vila Rebocada Unida", "Associação Moradores do Beco Azul"], dialogo: "associacao", tamanhos: ["longo", "quadra", "porta"],
    temas: ["memória do bairro", "festa de rua", "mutirão"], palavras: ["NOSSA VILA", "JUNTOS", "BAIRRO"], obs: ["Quem mora aqui vai olhar esse muro todo dia.", "Queremos a cara do bairro, sem nome de ninguém."], exige: { clientes: 0, quebrada: 2 } },
  { slug: "predio", tipo: "comunitario", rotulo: "Prédio vizinho", nomes: ["Edifício Alameda Clara", "Condomínio Beira-Rua"], dialogo: "sindico", tamanhos: ["fachada", "quadra"],
    temas: ["jardim na parede", "cidade vista de cima", "janela aberta"], palavras: ["BOM DIA", "VIZINHANÇA", "ALAMEDA"], obs: ["O condomínio quer algo calmo.", "Combinar horário com o síndico."], exige: { clientes: 1.5, quebrada: 1.5 } },
];

const opc = (texto: string, pontos: number, resposta: string, extra: Partial<Dialogo["steps"][0]["opcoes"][0]> = {}) => ({ texto, pontos, resposta, ...extra });

export const DIALOGOS: Dialogo[] = [
  {
    slug: "dialogo-diretor", kind: "diretor", requirements: { aprova: 6.2, mudanca: 4.2, mudancaTema: "tema do bairro, sem texto grande" },
    steps: [
      { fala: "Boa tarde. Soube que vocês querem pintar o muro da quadra. Me explica o que é esse projeto.", opcoes: [
        opc("Mandar o croqui da tag e do desenho", 1.8, "Interessante. Dá pra ver que foi pensado.", { croqui: 0.15 }),
        opc("Propor um tema do bairro", 1.4, "Gostei da ideia de ter a cara daqui."),
        opc("Dizer que a crew já tem experiência", 0.8, "Experiência é bom, mas preciso ver o desenho."),
        opc("Dizer que é só um muro, e pronto", -1, "Calma, o muro é da escola, não é só um muro."),
      ] },
      { fala: "E o prazo? A quadra não pode ficar muito tempo interditada.", opcoes: [
        opc("Pedir mais prazo, com calma", 0.3, "Tudo bem, mais uns dias.", { prazo: 2 }),
        opc("Prometer terminar no prazo", 1.2, "Fechado, então."),
        opc("Propor pintar só nos fins de semana", 0.9, "Funciona. Menos barulho em aula."),
        opc("Ignorar a pergunta e mudar de assunto", -0.8, "Preciso de uma resposta clara."),
      ] },
      { fala: "E quanto isso vai custar pra escola? A verba é curta.", opcoes: [
        opc("Oferecer um preço melhor", 1.6, "Isso ajuda bastante. Obrigado.", { preco: 0.15 }),
        opc("Manter o preço e mostrar o que está incluso", 0.9, "Entendi o que vem no pacote."),
        opc("Dizer que o bairro vai gostar muito", 0.7, "Espero que sim.", { minQuebrada: 1.5 }),
        opc("Cobrar mais caro, que é muro grande", -0.9, "Aí fica difícil.", {}),
      ] },
    ],
  },
  {
    slug: "dialogo-sindico", kind: "sindico", requirements: { aprova: 6.6, mudanca: 4.6, mudancaTema: "cores neutras e sem figuras grandes" },
    steps: [
      { fala: "Olá. O condomínio ainda não decidiu se quer um mural na parede lateral. Me conta o que vão pintar.", opcoes: [
        opc("Mostrar o croqui com medidas", 1.8, "Ficou claro. Dá pra apresentar na reunião.", { croqui: 0.15 }),
        opc("Propor tema calmo, de jardim", 1.3, "Combina mais com o prédio."),
        opc("Contar casos de outros murais", 0.6, "Legal, mas preciso ver o desenho."),
        opc("Dizer que não precisa de reunião", -1.2, "Precisa, sim. É assembleia."),
      ] },
      { fala: "A assembleia pergunta: quem se responsabiliza se a tinta escorrer na calçada?", opcoes: [
        opc("Garantir lona e limpeza da calçada", 1.6, "Isso ajuda a convencer os moradores."),
        opc("Pedir mais prazo pra decidir isso", 0.2, "Tudo bem, mais uns dias.", { prazo: 2 }),
        opc("Dizer que é raro acontecer", -0.5, "Não é o que a assembleia quer ouvir."),
        opc("Oferecer um preço melhor pelo trabalho", 1, "Pode ser, vou levar isso à reunião.", { preco: 0.1 }),
      ] },
      { fala: "Última pergunta: o prédio vai ter voz no desenho?", opcoes: [
        opc("Sim, mando o croqui antes de começar", 1.5, "Perfeito.", { croqui: 0.1 }),
        opc("Podem escolher as cores", 1.1, "Isso agrada."),
        opc("Vocês confiam no nosso olho", 0.3, "Hmm. Talvez."),
        opc("Não dá pra mudar depois", -0.8, "Aí complica."),
      ] },
    ],
  },
  {
    slug: "dialogo-associacao", kind: "associacao", requirements: { aprova: 5.6, mudanca: 3.8, mudancaTema: "memória do bairro, com os moradores" },
    steps: [
      { fala: "Oi! A gente quer ver o muro da associação com mais cara de bairro. Qual é a ideia?", opcoes: [
        opc("Propor tema da história do bairro", 1.8, "Que lindo, vai fazer sentido pra todo mundo."),
        opc("Mostrar o croqui da tag", 1.2, "Dá pra ver a assinatura de vocês.", { croqui: 0.1 }),
        opc("Pedir ajuda dos moradores", 1.5, "Boa! Chamo o pessoal."),
        opc("Dizer que vai ser do jeito da crew", -0.5, "Hum, a ideia era ser nossa também."),
      ] },
      { fala: "A gente não tem muita verba. Como fica o preço?", opcoes: [
        opc("Oferecer um preço melhor", 1.6, "Isso ajuda muito.", { preco: 0.2 }),
        opc("Trocar por divulgação da crew no bairro", 1, "Pode ser, a gente divulga."),
        opc("Manter o preço", 0.5, "Dá pra fechar parcelado."),
        opc("Pedir adiantado", -1, "Aí não rola.", {}),
      ] },
      { fala: "E o prazo, quando começa?", opcoes: [
        opc("Pedir mais prazo", 0.3, "Combinado.", { prazo: 2 }),
        opc("Prometer começar essa semana", 1.2, "Maravilha."),
        opc("Pintar no domingo, com a vizinhança", 1.3, "Vai ser uma festa."),
        opc("Marcar sem data", -0.6, "Precisa de uma data."),
      ] },
    ],
  },
];

export const CATALOGO_PADRAO: Catalogo = { itens: ITENS, arquetipos: ARQUETIPOS, templates: TEMPLATES, dialogos: DIALOGOS };
