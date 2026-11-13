// O Corre: tudo o que é número, nome ou texto do jogo mora aqui. Componentes e motor só leem.
// Dinheiro em centavos (inteiros), tempo em minutos do jogo, peças/cansaço/combustível em % (0–100).
// Bairros, lugares, restaurantes e o app são inventados. Nenhuma marca real.

export type Bairro = { id: string; nome: string; x: number; y: number };
export type Restaurante = { id: string; nome: string; bairro: string };
export type TipoLugar = "posto" | "oficina" | "comida" | "descanso";
export type Lugar = { id: string; nome: string; tipo: TipoLugar; bairro: string };
export type Peca = "pneu" | "freio" | "oleo";

export type Efeito = {
  minutos?: number;
  custo?: number;
  cansaco?: number;
  moto?: Partial<Record<Peca, number>>; // negativo = desgaste
  avaliacao?: number;
  cancela?: boolean; // a entrega não acontece (sem pagamento)
};
export type OpcaoEvento = { id: string; texto: string; efeito: Efeito; risco?: { chance: number; efeito: Efeito; texto: string } };
export type EventoViagem = {
  id: string;
  titulo: string;
  texto: string;
  peso: number;
  soComChuva?: boolean;
  opcoes: OpcaoEvento[];
};

export const CORRE = {
  versaoSave: 2,
  nomeApp: "Corre Já",

  tempo: {
    msPorHora: 40_000, // 1 hora do jogo ≈ 40 s reais
    velocidades: [1, 2, 4],
    inicioDia: 7 * 60,
    fimDia: 24 * 60, // meia-noite: volta pra casa sozinho
  },

  semana: { diasTrabalho: 6, diasTotal: 7 },

  casa: { bairro: "vila-aurora", nome: "Casa" },

  bairros: [
    { id: "vila-aurora", nome: "Vila Aurora", x: 18, y: 70 },
    { id: "centro-velho", nome: "Centro Velho", x: 50, y: 48 },
    { id: "jardim-paineiras", nome: "Jardim Paineiras", x: 78, y: 22 },
    { id: "alto-da-serra", nome: "Alto da Serra", x: 22, y: 20 },
    { id: "baixada-do-rio", nome: "Baixada do Rio", x: 48, y: 82 },
    { id: "parque-ipe", nome: "Parque Ipê", x: 82, y: 62 },
    { id: "bela-cruz", nome: "Bela Cruz", x: 62, y: 30 },
    { id: "porto-seco", nome: "Porto Seco", x: 84, y: 86 },
  ] satisfies Bairro[],

  // Unidades do mapa → km.
  kmPorUnidade: 0.16,

  restaurantes: [
    { id: "cantina-zita", nome: "Cantina da Dona Zita", bairro: "centro-velho" },
    { id: "pastel-hiro", nome: "Pastelaria do Seu Hiro", bairro: "centro-velho" },
    { id: "boa-mesa", nome: "Marmitaria Boa Mesa", bairro: "bela-cruz" },
    { id: "acai-norte", nome: "Açaí Ponto Norte", bairro: "jardim-paineiras" },
    { id: "brasa-viva", nome: "Espetinho Brasa Viva", bairro: "baixada-do-rio" },
    { id: "lanche-serra", nome: "Lanchonete da Serra", bairro: "alto-da-serra" },
    { id: "padaria-ipe", nome: "Padaria Flor do Ipê", bairro: "parque-ipe" },
    { id: "sushi-cais", nome: "Temakeria do Cais", bairro: "porto-seco" },
  ] satisfies Restaurante[],

  lugares: [
    { id: "posto-avenida", nome: "Posto da Avenida", tipo: "posto", bairro: "centro-velho" },
    { id: "posto-ipe", nome: "Posto Ipê", tipo: "posto", bairro: "parque-ipe" },
    { id: "oficina-tonho", nome: "Oficina do Tonho", tipo: "oficina", bairro: "vila-aurora" },
    { id: "moto-pecas-cruz", nome: "Moto Peças Bela Cruz", tipo: "oficina", bairro: "bela-cruz" },
    { id: "pf-da-esquina", nome: "PF da Esquina", tipo: "comida", bairro: "baixada-do-rio" },
    { id: "lanche-ponto", nome: "Lanche do Ponto", tipo: "comida", bairro: "bela-cruz" },
    { id: "praca-paineiras", nome: "Ponto de apoio da Praça", tipo: "descanso", bairro: "jardim-paineiras" },
    { id: "sombra-centro", nome: "Banco à sombra do Centro", tipo: "descanso", bairro: "centro-velho" },
  ] satisfies Lugar[],

  servicos: {
    posto: { minutos: 10, precoPorPorcento: 30 }, // tanque cheio (100%) ≈ R$ 30
    oficina: { minutos: 50, precoPorPorcento: 6 }, // cada ponto de peça reparado
    comida: { minutos: 30, preco: 2200, cansaco: -12 },
    descanso: { minutos: 60, preco: 0, cansaco: -22 },
  },

  viagem: {
    velocidadeKmH: 28,
    minutosColeta: 6,
    minutosEntregaPorta: 3,
    // Trânsito por hora do dia (multiplica o tempo).
    transito: (hora: number) => (hora >= 7 && hora < 9 ? 1.45 : hora >= 17 && hora < 20 ? 1.55 : hora >= 11 && hora < 14 ? 1.2 : 1),
    fatorChuva: 1.3,
    // Peça abaixo do limite deixa a viagem mais lenta.
    motoLimite: 40,
    motoPenalidadeMax: 0.35,
    // Cansaço acima do limite: penalidade cresce em curva.
    cansacoLimite: 55,
    cansacoPenalidadeMax: 0.6,
  },

  moto: {
    modeloInicial: "Moto 160 usada (parcelada)",
    desgastePorKm: { pneu: 0.32, freio: 0.26, oleo: 0.22 } satisfies Record<Peca, number>,
    consumoPorKm: 0.85, // % do tanque por km
    pecaInicial: { pneu: 80, freio: 75, oleo: 70 } satisfies Record<Peca, number>,
    combustivelInicial: 70,
  },

  cansaco: {
    porHoraRodando: 7,
    porHoraParado: 2,
    multChuva: 1.5,
    limite: 95, // aqui o dia acaba sozinho
    alerta: 70,
    recuperaNoite: 70,
    recuperaFolga: 100,
  },

  ofertas: {
    porHoraBase: 5,
    janelaMinutos: 20,
    janelaTranquilo: 40,
    valorBase: 600,
    valorPorKm: 150,
    bonusChuva: 400,
    bonusPico: 300,
    horasPico: [
      [11, 14],
      [18, 21],
    ] as [number, number][],
    folgaPrazo: 1.3, // prazo = tempo ideal × folga
    gorjetaChance: 0.25,
    gorjetaValor: [200, 800] as [number, number],
    // Avaliação alta libera ofertas melhores.
    avaliacaoPremium: 4.6,
    multPremium: 1.25,
  },

  aceitacao: {
    inicial: 80,
    ganhoAceitar: 0.06, // aproxima de 100 em 6%
    perdaRecusar: 4,
    perdaExpirar: 5,
    minimoFator: 0.35, // com 0% de aceitação, ainda chegam 35% das ofertas
  },

  avaliacao: {
    inicial: 4.5,
    ganhoNoPrazo: 0.06, // aproxima de 5 em 6%
    perdaAtraso: 0.22,
    perdaCancelada: 0.3,
  },

  eventos: {
    chanceBase: 0.12,
    chanceChuva: 0.12,
    chanceMotoRuim: 0.18, // multiplicado por quanto a pior peça está abaixo do limite
    chanceCansaco: 0.2, // multiplicado por quanto o cansaço passou do limite
    lista: [
      {
        id: "rua-alagada",
        titulo: "Rua alagada",
        texto: "A rua do caminho virou rio. Dá pra dar a volta pela avenida ou tentar passar.",
        peso: 3,
        soComChuva: true,
        opcoes: [
          { id: "volta", texto: "Dar a volta", efeito: { minutos: 14, cansaco: 2 } },
          {
            id: "arriscar",
            texto: "Arriscar passar",
            efeito: { minutos: 2 },
            risco: { chance: 0.45, efeito: { minutos: 25, moto: { freio: -12 }, cansaco: 6 }, texto: "A água entrou no freio e você teve que esperar escorrer." },
          },
        ],
      },
      {
        id: "pneu-furado",
        titulo: "Pneu furado",
        texto: "Pneu murchou. Tem uma borracharia cara aqui do lado e uma mais barata a umas quadras.",
        peso: 2,
        opcoes: [
          { id: "cara", texto: "Borracharia daqui (R$ 45)", efeito: { minutos: 12, custo: 4500, moto: { pneu: 10 } } },
          { id: "barata", texto: "Empurrar até a barata (R$ 20)", efeito: { minutos: 32, custo: 2000, cansaco: 8, moto: { pneu: 10 } } },
        ],
      },
      {
        id: "cliente-nao-atende",
        titulo: "Cliente não atende",
        texto: "Você chegou, interfone mudo, telefone na caixa.",
        peso: 2,
        opcoes: [
          { id: "esperar", texto: "Esperar mais 10 min", efeito: { minutos: 10 } },
          { id: "devolver", texto: "Devolver o pedido", efeito: { minutos: 15, cancela: true } },
        ],
      },
      {
        id: "pedido-atrasado",
        titulo: "Cozinha atrasada",
        texto: "O restaurante pediu mais uns minutinhos pra fechar o pedido.",
        peso: 2,
        opcoes: [
          { id: "aguardar", texto: "Aguardar", efeito: { minutos: 12 } },
          { id: "cancelar", texto: "Cancelar a corrida", efeito: { cancela: true, avaliacao: 0.15 } },
        ],
      },
    ] satisfies EventoViagem[],
  },

  // Minigames curtos na coleta e na entrega. Sempre dá pra pular (tempo padrão, sem bônus e sem punição).
  minigames: {
    coletaEm: 0.35, // fração da viagem em que o motoboy chega no restaurante
    nivelCansaco: 55, // acima disso os puzzles ficam mais cheios (mais itens e mais portas)
    coleta: {
      itens: [
        { nome: "Marmita grande", troca: "Marmita pequena" },
        { nome: "Refri de guaraná", troca: "Refri de laranja" },
        { nome: "Pastel de carne", troca: "Pastel de queijo" },
        { nome: "Açaí 500 ml", troca: "Açaí 300 ml" },
        { nome: "Suco de acerola", troca: "Suco de caju" },
        { nome: "Espetinho de frango", troca: "Espetinho de coração" },
        { nome: "Pão de queijo", troca: "Pão de sal" },
        { nome: "Temaki de salmão", troca: "Temaki de atum" },
        { nome: "Brigadeiro", troca: "Beijinho" },
        { nome: "Água sem gás", troca: "Água com gás" },
      ],
      quantidade: [3, 5] as [number, number], // [normal, cansado]
      chanceErro: 0.7,
      efeitos: {
        perfeito: { minutos: -2, gorjeta: 300 },
        erro: { minutos: 3 },
      },
    },
    entrega: {
      portas: [4, 6] as [number, number], // [normal, cansado]
      casas: ["verde", "azul", "amarela", "branca", "rosa", "cinza"],
      portoes: ["preto", "branco", "marrom", "azul"],
      efeitos: {
        perfeito: { minutos: -4, chanceGorjeta: 0.3 },
        ok: { minutos: 0, chanceGorjeta: 0 },
        erro: { minutos: 8, chanceGorjeta: 0 },
      },
    },
    penalidadeIncompleto: 0.2, // avaliação perdida quando o pedido sai incompleto
  },

  contas: [
    { id: "parcela-moto", nome: "Parcela da moto", valor: 38000 },
    { id: "plano-celular", nome: "Plano do celular", valor: 6000 },
    { id: "aluguel", nome: "Parte do aluguel", valor: 45000 },
    { id: "mercado", nome: "Mercado da semana", valor: 30000 },
  ],
  jurosDivida: 0.05, // conta que ficou pra trás cresce 5% na semana

  dinheiroInicial: 25000,

  objetivo: { id: "quitar-moto", nome: "Quitar a moto", valor: 300000, metaSemanal: 10000 },

  mensagens: {
    boasVindas: "Bom dia! As ofertas chegam quando você sair de casa.",
    chuvaChegando: "Chuva chegando na próxima hora. Ofertas com bônus, mas tudo fica mais lento.",
    chuvaParou: "A chuva parou.",
    pneuBaixo: "Pneu gasto ({valor}%). Viagem mais lenta e mais risco de furar.",
    freioBaixo: "Freio gasto ({valor}%). Bom passar na oficina.",
    oleoBaixo: "Óleo vencido ({valor}%). A moto pede oficina.",
    combustivelBaixo: "Combustível em {valor}%. Hora de abastecer.",
    cansacoAlto: "Cansaço em {valor}%. Comer ou descansar agora rende mais do que forçar.",
    cansacoLimite: "Você chegou no limite. O dia acabou e você foi pra casa.",
    meiaNoite: "Meia-noite. Hora de ir pra casa.",
    contaVencendo: "As contas da semana chegam depois de amanhã: {valor}.",
    contaAmanha: "As contas da semana chegam no fim do dia de amanhã: {valor}.",
    semCombustivel: "Sem combustível pra essa corrida. Abasteça antes.",
  },

  textos: {
    minigames: {
      pular: "Pular (tempo padrão, sem bônus)",
      coletaTitulo: "Conferir o pedido",
      coletaDica: "Compare a nota com a sacola. Marque o item errado ou diga que está tudo certo.",
      notaRotulo: "Nota do restaurante",
      sacolaRotulo: "Sacola",
      tudoCerto: "Tudo certo, pode sair",
      marcarErrado: "Esse está errado",
      faltando: "(faltando)",
      coletaPerfeito: "Conferiu direito: pedido inteiro e saída mais rápida.",
      coletaErro: "Conferência errada. Perdeu uns minutos.",
      coletaIncompleto: "O pedido saiu com um item errado. O cliente pode reclamar.",
      entregaTitulo: "Achar a porta",
      entregaDica: "Use a pista do cliente. Você tem duas tentativas.",
      entregaErrou: "Não é essa. Tenta de novo.",
      entregaPerfeito: "Achou de primeira: tempo ganho e chance de gorjeta.",
      entregaOk: "Achou na segunda tentativa.",
      entregaErro: "Perdeu um tempo procurando a porta.",
    },
    titulo: "O Corre",
    chamada: "Sua semana sobre duas rodas. Aceite pedidos, cuide da moto, do dinheiro e de você, e feche a semana com as contas pagas.",
    novoJogo: "Novo jogo",
    continuar: "Continuar",
    criarConta: "Crie sua conta pra guardar seu corre em qualquer aparelho",
    avisoDinheiro: "O dinheiro do jogo não vale dinheiro de verdade e não compra nada na loja.",
    ritmoTranquilo: "Ritmo tranquilo (ofertas esperam mais)",
    folga: "Domingo é folga. Descanso faz parte do corre.",
  },
} as const;

export const bairroPorId = (id: string) => CORRE.bairros.find((b) => b.id === id);
export const restaurantePorId = (id: string) => CORRE.restaurantes.find((r) => r.id === id);
export const lugarPorId = (id: string) => CORRE.lugares.find((l) => l.id === id);
export const eventoPorId = (id: string) => CORRE.eventos.lista.find((e) => e.id === id) as EventoViagem | undefined;
export const totalContas = () => CORRE.contas.reduce((s, c) => s + c.valor, 0);

export const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const relogio = (minuto: number) => {
  const m = Math.max(0, Math.floor(minuto));
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export const texto = (t: string, valor: string | number) => t.replace("{valor}", String(valor));
