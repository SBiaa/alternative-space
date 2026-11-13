// Números e textos do Rolê Noturno. Nada disso fica fixo nos componentes.

export const LAYOUT_VERSION = 1;

// ---------- Pista ----------
export const PISTA = {
  // Tamanho de uma célula da grade, em pixels do mundo.
  celula: 32,
  altura: 16,
  larguraMin: 24,
  larguraMax: 240,
  larguraPadrao: 80,
  maxPecas: 300,
  tempoMin: 30,
  tempoMax: 120,
  tempoPadrao: 60,
  tituloMax: 48,
  descricaoMax: 160,
} as const;

// ---------- Conta, publicação e ranking ----------
export const PICOS = {
  maxRascunhos: 30,
  rankingTamanho: 10,
  listaTamanho: 12,
  autosaveMs: 1500,
  // Gravação de corridas: no máximo N por janela de S segundos (por IP).
  limiteCorridas: { max: 20, janelaS: 60 },
  limiteJogadas: { max: 30, janelaS: 60 },
  limiteRascunhos: { max: 60, janelaS: 60 },
} as const;

// Filtro de palavras para nome e descrição do pico (comparado sem acento e sem caixa, por palavra).
export const PALAVRAS_BLOQUEADAS = [
  "porra", "caralho", "buceta", "puta", "puto", "viado", "arrombado", "cuzao", "fdp", "foda", "fuder", "foder",
  "piroca", "rola", "xoxota", "vagabunda", "corno", "retardado", "macaco", "nazi", "nazista", "hitler", "estupro",
  "fuck", "shit", "bitch", "cunt", "nigger", "faggot", "whore",
];

// ---------- Peças ----------
// Coordenadas em células, origem no canto de baixo à esquerda, y pra cima.
// `camada`: peças sólidas não podem se sobrepor entre si; corrimãos ficam na frente e podem passar por cima.
export type Camada = "solida" | "corrimao";

export const TIPOS_PECA = [
  "ground",
  "gap",
  "step",
  "stairs3",
  "stairs5",
  "ramp_small",
  "ramp_big",
  "quarter",
  "rail",
  "rail_down",
  "box",
  "bench",
  "ledge",
  "start",
  "finish",
] as const;
export type TipoPeca = (typeof TIPOS_PECA)[number];
export const ehTipoPeca = (v: unknown): v is TipoPeca => TIPOS_PECA.includes(v as TipoPeca);

export type DefPeca = {
  nome: string;
  grupo: "chao" | "rampas" | "obstaculos" | "linha";
  w: number;
  h: number;
  camada: Camada;
  // Pode ser grindada (corrimão, borda, caixote, banco).
  grind: boolean;
};

export const PECAS: Record<TipoPeca, DefPeca> = {
  ground: { nome: "Chão", grupo: "chao", w: 1, h: 1, camada: "solida", grind: false },
  gap: { nome: "Buraco", grupo: "chao", w: 2, h: 1, camada: "solida", grind: false },
  step: { nome: "Degrau", grupo: "chao", w: 1, h: 1, camada: "solida", grind: false },
  stairs3: { nome: "Escada de 3", grupo: "chao", w: 3, h: 3, camada: "solida", grind: false },
  stairs5: { nome: "Escada de 5", grupo: "chao", w: 5, h: 5, camada: "solida", grind: false },
  ramp_small: { nome: "Rampa pequena", grupo: "rampas", w: 2, h: 1, camada: "solida", grind: false },
  ramp_big: { nome: "Rampa grande", grupo: "rampas", w: 3, h: 2, camada: "solida", grind: false },
  quarter: { nome: "Quarter pipe", grupo: "rampas", w: 3, h: 3, camada: "solida", grind: false },
  rail: { nome: "Corrimão", grupo: "obstaculos", w: 3, h: 1, camada: "corrimao", grind: true },
  rail_down: { nome: "Corrimão de escada", grupo: "obstaculos", w: 3, h: 5, camada: "corrimao", grind: true },
  box: { nome: "Caixote", grupo: "obstaculos", w: 2, h: 1, camada: "solida", grind: true },
  bench: { nome: "Banco", grupo: "obstaculos", w: 2, h: 1, camada: "solida", grind: true },
  ledge: { nome: "Borda", grupo: "obstaculos", w: 3, h: 1, camada: "solida", grind: true },
  start: { nome: "Largada", grupo: "linha", w: 2, h: 3, camada: "solida", grind: false },
  finish: { nome: "Chegada", grupo: "linha", w: 2, h: 3, camada: "solida", grind: false },
};

export const GRUPOS_PECA: { id: DefPeca["grupo"]; nome: string }[] = [
  { id: "linha", nome: "Linha" },
  { id: "chao", nome: "Chão" },
  { id: "rampas", nome: "Rampas" },
  { id: "obstaculos", nome: "Obstáculos" },
];

// ---------- Manobras ----------
export type Direcao = "up" | "down" | "left" | "right";
export type Gesto = "swipe_up" | "swipe_down" | "swipe_left" | "swipe_right" | "arc_cw" | "arc_ccw";
export type Onde = "chao" | "ar";

export const MANOBRAS = ["ollie", "kickflip", "heelflip", "shove_it", "grind_5050", "manual"] as const;
export type Manobra = (typeof MANOBRAS)[number];

export type DefManobra = {
  nome: string;
  pontos: number;
  onde: Onde;
  // Tecla de direção que dispara a manobra (remapeável nos ajustes).
  direcao: Direcao;
  gesto: Gesto;
  // Quanto tempo a animação leva. Aterrissar antes disso é aterrissar torto.
  duracaoMs: number;
};

export const MANOBRA: Record<Manobra, DefManobra> = {
  ollie: { nome: "Ollie", pontos: 50, onde: "chao", direcao: "up", gesto: "swipe_up", duracaoMs: 0 },
  kickflip: { nome: "Kickflip", pontos: 150, onde: "ar", direcao: "left", gesto: "arc_ccw", duracaoMs: 380 },
  heelflip: { nome: "Heelflip", pontos: 150, onde: "ar", direcao: "right", gesto: "arc_cw", duracaoMs: 380 },
  shove_it: { nome: "Shove-it", pontos: 100, onde: "ar", direcao: "up", gesto: "swipe_up", duracaoMs: 300 },
  grind_5050: { nome: "50-50", pontos: 200, onde: "ar", direcao: "down", gesto: "swipe_down", duracaoMs: 0 },
  manual: { nome: "Manual", pontos: 80, onde: "chao", direcao: "down", gesto: "swipe_down", duracaoMs: 0 },
};

// Teclas padrão de cada direção. O tripulante pode trocar nos ajustes.
export const TECLAS_PADRAO: Record<Direcao, string> = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };

// ---------- Física e corrida ----------
export const FISICA = {
  passoMs: 1000 / 60,
  maxPassosPorQuadro: 5,
  gravidade: 1.6,
  raioSkatista: 0.38, // em células
  velocidadeBase: 4.2, // px por passo
  velocidadeRemando: 7,
  velocidadeFreando: 1.4,
  aceleracao: 0.08,
  impulsoOllie: 9.2,
  // Depois de grudar no corrimão, quanto tempo (ms) o "pra baixo" ainda vale.
  janelaGrindMs: 260,
  // Aterrissar com o skatista inclinado mais que isso (rad) é tombo.
  inclinacaoMaxima: 0.9,
  // Depois de aterrissar limpo, quanto tempo (ms) uma nova manobra ainda continua o combo.
  respiroComboMs: 450,
  // Sem tocar o chão parado mais que isso, o manual cai.
  manualMaxMs: 3000,
  penalidadeTomboMs: 2000,
  // Depois do tombo, volta pra onde estava este número de passos de chão plano atrás.
  passosPontoSeguro: 110,
  // Parado (sem frear) por mais passos que isso = bateu e caiu.
  passosTravado: 20,
  // Quanto tempo o boneco fica caído antes de voltar.
  tomboMs: 1100,
} as const;

export const COMBO = {
  // Multiplicador = número de manobras no combo, até este teto.
  multiplicadorMax: 10,
} as const;

export const PONTUACAO = {
  bonusPorSegundoRestante: 25,
  // Teto: nenhuma corrida honesta faz mais que isso de pontos de manobra por segundo.
  maxPontosPorSegundo: 2500,
  // Duração mínima: a pista inteira na velocidade máxima, com folga.
  folgaDuracao: 0.8,
} as const;

// ---------- Textos ----------
export const TEXTOS = {
  jogo: {
    combo: (n: number) => `COMBO x${n}`,
    manobra: (nome: string, pts: number) => `${nome.toUpperCase()} +${pts}`,
    tombo: "TOMBO!",
    torto: "TORTO",
    chegou: "CHEGOU!",
    tempoAcabou: "TEMPO!",
    pontos: "PONTOS",
    tempo: "TEMPO",
    remar: "Remar",
    frear: "Frear",
    ajudaTeclado: "→ rema, ← freia. No chão: ↑ ollie, ↓ manual. No ar: ← kickflip, → heelflip, ↑ shove-it, ↓ perto do corrimão ou da borda faz grind.",
    ajudaToque: "Segure à direita pra remar e à esquerda pra frear. Deslize pra cima: ollie. Semicírculo: flip. Pra baixo perto do corrimão: grind.",
  },
  editor: {
    testar: "Testar",
    voltar: "Voltar pro editor",
    desfazer: "Desfazer",
    refazer: "Refazer",
    limpar: "Limpar tudo",
    confirmarLimpar: "Apagar todas as peças da pista?",
    espelhar: "Espelhar",
    apagar: "Apagar",
    borracha: "Borracha",
    paleta: "Peças",
    abrirPaleta: "Abrir peças",
    fecharPaleta: "Fechar peças",
    largura: "Largura (células)",
    tempo: "Tempo limite (s)",
    ajudaTeclado:
      "Setas movem o cursor na grade. Enter coloca a peça, Delete apaga, F espelha, [ e ] trocam de peça, Ctrl+Z desfaz e Ctrl+Y refaz.",
    rascunhoLocal: "Rascunho salvo neste navegador.",
    semConta: "Crie sua conta pra publicar seu pico",
    pistaOk: "Pista pronta pra testar.",
    terminou: "Você terminou a pista. Pode publicar.",
  },
  resultado: {
    titulo: "Fim do rolê",
    manobras: "Pontos de manobra",
    bonus: "Bônus de tempo",
    total: "Total",
    maxCombo: "Maior combo",
    tombos: "Tombos",
    deNovo: "De novo",
  },
  pico: {
    lista: "Picos",
    recentes: "Picos recentes",
    jogados: "Mais jogados",
    meus: "Meus picos",
    montar: "Montar um pico",
    jogar: "Jogar",
    editar: "Editar",
    duplicar: "Duplicar como rascunho",
    apagar: "Apagar",
    confirmarApagar: "Apagar este pico? O ranking dele some junto.",
    rascunho: "Rascunho",
    publicado: "Publicado",
    escondido: "Escondido pela moderação. Só você vê este pico.",
    semTitulo: "Pico sem nome",
    semCriador: "Tripulação",
    por: (nome: string) => `por ${nome}`,
    jogadas: (n: number) => `${n} ${n === 1 ? "jogada" : "jogadas"}`,
    recordeCriador: "Recorde de quem montou",
    ranking: "Ranking do pico",
    seuRecorde: "Seu recorde",
    pontos: (n: number) => `${n} pts`,
    nome: "Nome do pico",
    descricao: "Descrição curta",
    publicar: "Publicar",
    publicando: "Publicando…",
    precisaTerminar: "Termine a pista no Testar pra poder publicar. Essa corrida vira o primeiro recorde.",
    travado: "Este pico já foi publicado e está travado pra proteger o ranking. Pra mudar, duplique como novo rascunho.",
    salvando: "Salvando…",
    salvo: "Rascunho salvo na sua conta.",
    erroSalvar: "Não deu pra salvar o rascunho agora.",
    verPico: "Ver página do pico",
    entrarRanking: "Crie sua conta pra entrar no ranking",
    corridaGuardada: "Corrida guardada no ranking.",
    novoRecorde: "Novo recorde seu neste pico!",
    pendenteGuardada: (t: string) => `Sua corrida em ${t} foi guardada no ranking.`,
    rascunhoMigrado: "Seu rascunho deste navegador agora está na sua conta.",
    nenhum: "Nenhum pico publicado ainda. Que tal montar o primeiro?",
  },
  denuncia: {
    botao: "Denunciar pico",
    titulo: "O que tem de errado neste pico?",
    motivos: ["Nome ou descrição ofensivos", "Desenho ofensivo com as peças", "Spam ou propaganda", "Outro motivo"],
    enviar: "Enviar denúncia",
    cancelar: "Cancelar",
    obrigado: "Valeu! A moderação vai dar uma olhada.",
    jaEnviada: "Você já denunciou este pico.",
  },
  admin: {
    titulo: "Rolê Noturno: picos denunciados",
    link: "Moderação do Rolê Noturno",
    vazio: "Nenhum pico denunciado.",
    denuncias: (n: number) => `${n} ${n === 1 ? "denúncia" : "denúncias"}`,
    esconder: "Esconder",
    liberar: "Liberar",
    ver: "Ver pico",
    entradas: (n: number) => `Recorde top 1 com ${n} entradas gravadas`,
    verEntradas: "Ver entradas do top 1",
  },
  cabine: {
    picos: "Picos do Rolê Noturno",
    melhor: "Melhor recorde",
    semRecorde: "Sem recorde ainda",
    titulo: (nome: string) => `Cabine de ${nome}`,
  },
  compartilhar: {
    botao: "Compartilhar pico",
    copiado: "Link copiado!",
    texto: (titulo: string, recorde: number | null) =>
      recorde !== null ? `Bate meu recorde de ${recorde} pts no pico ${titulo} no Rolê Noturno?` : `Anda no pico ${titulo} no Rolê Noturno!`,
  },
  erros: {
    semConta: "Entre na sua conta pra isso.",
    naoEncontrado: "Pico não encontrado.",
    naoEDono: "Esse pico não é seu.",
    travado: "Pico publicado não muda. Duplique como rascunho.",
    corridaInvalida: "Essa corrida não bate com a pista.",
    naoTerminou: "Termine a pista antes de publicar.",
    titulo: `Dê um nome de 3 a ${PISTA.tituloMax} caracteres.`,
    descricao: `A descrição pode ter até ${PISTA.descricaoMax} caracteres.`,
    palavra: "Tem palavra que não rola aqui. Troque o nome ou a descrição.",
    muitosRascunhos: "Você chegou no limite de rascunhos. Apague algum antes.",
    muitos: "Muitos envios seguidos. Tenta de novo daqui a pouco.",
    generico: "Não deu agora. Tenta de novo em instantes.",
  },
  ajustes: {
    titulo: "Controles",
    botoesNaTela: "Botões de manobra na tela",
    tecla: { up: "Cima", down: "Baixo", left: "Esquerda", right: "Direita" } as Record<Direcao, string>,
    aperte: "Aperte uma tecla…",
    padrao: "Voltar ao padrão",
  },
  pagina: {
    titulo: "Rolê Noturno",
    voltar: "← Fliperama",
    editorTitulo: "Editor de pico",
    editorDescricao: "Monte a pista na grade, teste na hora e bata o próprio recorde.",
    listaDescricao: "Skate 2D de madrugada. Monte o seu pico com rampas, corrimãos e caixotes, publique e desafie a tripulação a bater seu recorde.",
    carregando: "Montando a pista…",
  },
} as const;

export const MOTIVO_PISTA = {
  json: "A pista não está num formato válido.",
  versao: "Versão de pista desconhecida.",
  largura: `A largura tem que ficar entre ${PISTA.larguraMin} e ${PISTA.larguraMax} células.`,
  altura: `A altura da pista é sempre ${PISTA.altura} células.`,
  tempo: `O tempo limite tem que ficar entre ${PISTA.tempoMin} e ${PISTA.tempoMax} segundos.`,
  muitasPecas: `A pista pode ter no máximo ${PISTA.maxPecas} peças.`,
  tipo: "Tem uma peça que não existe.",
  foraDaGrade: "Tem peça fora da grade.",
  sobreposicao: "Tem peças uma em cima da outra.",
  largada: "A pista precisa de exatamente uma largada.",
  chegada: "A pista precisa de exatamente uma chegada.",
  ordem: "A largada precisa ficar antes da chegada.",
} as const;
export type MotivoPista = keyof typeof MOTIVO_PISTA;
