// Entrega na Chuva: todos os números e textos do jogo. Nada disso fica fixo nos componentes.

export const JOGO = "entrega-na-chuva";

export const ENTREGA = {
  turnoMs: 180_000,
  // O relógio do navegador pode atrasar um pouco no fim do turno.
  toleranciaDuracaoMs: 2_000,
  equipadosMax: 3,
  tile: 32,

  moto: {
    velMax: 250, // px/s
    acel: 320,
    freio: 560,
    re: 80,
    giro: 3.1, // rad/s em velocidade máxima
    aderencia: 7, // quão rápido a velocidade volta pra direção da moto (maior = menos derrapagem)
    perdaChuva: 0.55, // fração da aderência perdida com chuva no máximo
    aderenciaPoca: 0.22, // fator na poça
    nitroVel: 1.45,
    nitroMs: 1_400,
    nitroCargas: 0, // sem implante, sem nitro
  },

  camera: { zoom: 1.5, lerp: 0.12 },

  // Intensidade da chuva ao longo do turno: [fração do turno, intensidade 0..1].
  chuva: {
    curva: [
      [0, 0.35],
      [0.25, 0.8],
      [0.5, 0.45],
      [0.75, 1],
      [1, 0.6],
    ] as [number, number][],
    particulasMax: 260,
    particulasReduzido: 60,
    fpsMinimo: 40,
    segundosFpsBaixo: 3,
  },

  pedido: {
    raio: 40,
    velParada: 30,
    paradaMs: 1_000,
    distanciaMinTiles: 14,
    segPorTile: 0.5,
    prazoBaseS: 10,
    fatorCancelado: 1.6, // passou de prazo × isso: cancela
    fatorRelaxado: 1.5,
    gorjetaBase: [10, 28] as [number, number],
    chanceFragil: 0.25,
  },

  prazo: { noPrazo: 1, atrasado: 0.5 },

  dano: { batida: 12, fragil: 2, intervaloMs: 700 },

  // A partir de quantas entregas seguidas no prazo o multiplicador sobe.
  sequencia: [
    { aPartirDe: 0, mult: 1 },
    { aPartirDe: 3, mult: 1.5 },
    { aPartirDe: 6, mult: 2 },
  ],

  perigos: {
    carroVel: 110,
    droneVel: 85,
    droneAlcance: 170,
    droneSeguraMs: 2_000,
    avisoBase: 0, // segundos de aviso antes do perigo
    avisoPorVisao: 1.2,
  },

  // Teto do turno: o servidor recusa resultados acima disso.
  teto: { paradasMs: 2_000, folga: 1.15 },

  limiteTurnos: { max: 8, janelaSeg: 600 },
};

// Tema "Neon": só no cenário do jogo (placas e reflexos). Derivado de laranja-claro e azul-claro.
export const NEON = { rosa: 0xf27aa8, ciano: 0x6fd3e0 };

// Cores do cenário, tiradas dos tokens do design system.
export const COR = {
  ceu: 0x0b2340,
  ceuFundo: 0x01121e,
  rua: 0x13304f,
  calcada: 0x1d3a5a,
  predio: 0x07192c,
  predioBorda: 0x22364d,
  laranja: 0xdd5d05,
  laranjaClaro: 0xf2a66e,
  creme: 0xece3be,
  poca: 0x2a4a6e,
  carro: 0xd6deec,
  drone: 0xece3be,
};

export const TEXTOS = {
  nome: "Entrega na Chuva",
  resumo: "Arcade de entregas no bairro alagado. Pegue o pedido, desvie dos carros e entregue antes do prazo.",
  comecar: "Começar turno",
  oficina: "Oficina de implantes",
  recorde: "Seu melhor turno",
  semRecorde: "Você ainda não fechou um turno logado.",
  hud: {
    tempo: "TURNO",
    coletar: "COLETAR EM",
    entregar: "ENTREGAR EM",
    prazo: "PRAZO",
    pacote: "PACOTE",
    sequencia: "SEQUÊNCIA x",
    creditos: "CRÉDITOS",
    entregue: "ENTREGUE +",
    atrasado: "⚠ ATRASADO",
    cancelado: "✕ CANCELADO",
    coletado: "▲ COLETADO",
    fragil: "◆ FRÁGIL",
    parado: "PARE AQUI",
    drone: "⛔ DRONE: PRESO",
    perigo: "⚠",
    nitro: "NITRO",
    pausado: "PAUSADO",
  },
  resultado: {
    titulo: "Fim do turno",
    entregas: "Entregas",
    noPrazo: "No prazo",
    atrasadas: "Atrasadas",
    canceladas: "Canceladas",
    gorjetas: "Gorjetas",
    creditos: "Créditos ganhos",
    sequencia: "Maior sequência sem atraso",
    recorde: "Novo recorde!",
    relaxado: "Prazo relaxado: este turno não conta pro recorde.",
    criarConta: "Crie sua conta pra guardar seus créditos e implantes",
    denovo: "Outro turno",
    salvando: "Guardando o turno…",
    salvo: "Créditos guardados na sua carteira.",
  },
  oficina_: {
    aviso: "Créditos do jogo não valem dinheiro e não compram nada na loja.",
    creditos: "Créditos",
    comprar: "Comprar nível",
    nivelMax: "Nível máximo",
    equipar: "Equipar",
    desequipar: "Desequipar",
    equipados: "Equipados",
    semConta: "Entre na sua conta pra comprar e equipar implantes. Sem conta você joga com a moto básica.",
  },
  ajustes: {
    titulo: "Configurações",
    chuva: "Mostrar efeito de chuva (a pista continua molhada)",
    piscar: "Piscar menos",
    relaxado: "Prazo relaxado (não conta pro recorde)",
    teclas: "Teclas",
    aperte: "Aperte uma tecla…",
  },
  entrada: {
    etiqueta: "Arcade · turno de 3 minutos",
    chamada: "Chove sem parar no bairro. Os pedidos não.",
    comoJogar: "Como jogar",
    passos: [
      { icone: "■", titulo: "Pegue o pedido", texto: "Siga a seta até o ponto de coleta e pare dentro do círculo por 1 segundo." },
      { icone: "⌂", titulo: "Entregue no prazo", texto: "No prazo, gorjeta cheia. Atrasado, metade. Muito atrasado, o pedido é cancelado." },
      { icone: "◆", titulo: "Cuide do pacote", texto: "Cada batida tira estado do pacote, e a gorjeta cai junto. Pedido frágil perde o dobro." },
      { icone: "x2", titulo: "Faça sequência", texto: "Entregas seguidas no prazo multiplicam os créditos. Um atraso zera a sequência." },
    ],
    perigosTitulo: "No caminho",
    perigos: [
      { icone: "▬", nome: "Carros", texto: "Rodam em rotas fixas pelas avenidas." },
      { icone: "≈", nome: "Poças", texto: "A moto derrapa. Com chuva forte, a pista toda escorrega mais." },
      { icone: "⛔", nome: "Drones", texto: "Se encostarem, seguram a moto por 2 segundos." },
      { icone: "▥", nome: "Becos", texto: "Atalhos que fecham por alguns segundos." },
    ],
    controlesTitulo: "Controles",
    toque: "No celular: joystick à esquerda, freio e nitro à direita. Jogue com o celular deitado.",
    oficinaTexto: "Gaste os créditos dos turnos em implantes pra moto e pro corpo. Até 3 equipados ao mesmo tempo.",
    semConta: "Sem conta você joga com a moto básica. Crie uma conta pra guardar créditos, recorde e implantes.",
    criarConta: "Criar conta",
    saldo: "Créditos na carteira",
  },
  turno: { girar: "↻ Gire o celular: o turno é jogado em paisagem.", continuar: "▶ Continuar", sair: "Sair do turno", carregando: "Abrindo o bairro…", nivel: "nível" },
  acoes: { cima: "Acelerar", baixo: "Frear / ré", esquerda: "Esquerda", direita: "Direita", nitro: "Nitro", pausa: "Pausar" },
  erros: {
    semConta: "Entre na sua conta pra guardar o turno.",
    invalido: "Esse turno não bate com as regras do jogo.",
    limite: "Muitos turnos seguidos. Tenta de novo daqui a pouco.",
    saldo: "Créditos insuficientes.",
    nivelMax: "Esse implante já está no nível máximo.",
    equipados: "Você já tem o máximo de implantes equipados.",
    naoTem: "Compre o implante antes de equipar.",
    generico: "Não deu agora. Tenta de novo em instantes.",
  },
};

export type Acao = keyof typeof TEXTOS.acoes;
export const ACOES = Object.keys(TEXTOS.acoes) as Acao[];

// Nomes de teclas do Phaser (KeyboardEvent.code sem "Key"/"Arrow").
export const CONTROLES_PADRAO: Record<Acao, string[]> = {
  cima: ["W", "UP"],
  baixo: ["S", "DOWN"],
  esquerda: ["A", "LEFT"],
  direita: ["D", "RIGHT"],
  nitro: ["SPACE"],
  pausa: ["P", "ESC"],
};
