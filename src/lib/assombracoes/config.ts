// Config do Assombrações da Vila. Nenhum texto, nome ou limite fica fixo nos componentes.

export const VILA = {
  slug: "assombracoes",
  versaoSave: 1,
  // Nome provisório da vila (inventada). Conferir que não é lugar real antes de publicar.
  nome: "Vila do Cajueiro Torto",
  // Chaves do navegador.
  chaveLocal: "assombracoes:progresso",
  chaveSons: "assombracoes:sons",
  chaveSemSustos: "assombracoes:sem-sustos",
  // Rate limit (por IP, via tabela limites).
  limiteResposta: { max: 20, janelaS: 600 },
  limiteAcao: { max: 200, janelaS: 600 },
  // Tamanhos máximos do que o navegador pode mandar.
  maxSinaisPorCaso: 40,
  maxDepoimentosPorCaso: 60,
  maxTentativas: 1000,
} as const;

export const TIPOS_SINAL = ["pegada", "redemoinho", "som", "objeto"] as const;
export type TipoSinal = (typeof TIPOS_SINAL)[number];

export const LUGAR_IDS = ["praca", "igreja", "rio", "mata", "sitio", "venda"] as const;
export type LugarId = (typeof LUGAR_IDS)[number];

export const LUGARES: Record<LugarId, { nome: string; descricao: string }> = {
  praca: { nome: "Praça", descricao: "O coreto, o cajueiro velho e o banco onde todo mundo conta causo." },
  igreja: { nome: "Igreja velha", descricao: "Paredes grossas, sino rachado e um adro cheio de sombra." },
  rio: { nome: "Rio", descricao: "Água calma de dia, cheia de segredo no fim da tarde." },
  mata: { nome: "Mata", descricao: "Árvores altas, trilhas que somem e muito silêncio." },
  sitio: { nome: "Sítio", descricao: "Quintal grande, bambuzal, cavalo e o vento de sempre." },
  venda: { nome: "Venda", descricao: "Balcão de madeira, vidros de bala e o dono que sabe da vida de todos." },
};

export const TIPOS: Record<TipoSinal, { nome: string }> = {
  pegada: { nome: "Pegada" },
  redemoinho: { nome: "Redemoinho" },
  som: { nome: "Som" },
  objeto: { nome: "Objeto sumido" },
};

export const TEXTOS = {
  titulo: "Assombrações da Vila",
  chamada: "Casos estranhos numa vila do interior. Converse, olhe com calma e descubra quem está por trás. No fim, a história é entendida, não vencida.",
  aviso: "Terror leve, tipo causo contado na varanda. Sem sangue, sem morte e sem susto alto. Livre / 10+.",
  comoJogarTitulo: "Como jogar",
  comoJogar: [
    "Escolha um caso no mapa da vila.",
    "Converse com os moradores e visite os lugares. Cada pista vai pro seu caderno.",
    "Marque quem está por trás e o que a criatura quer. Depois, enfrente o encontro com a escolha certa.",
  ],
  comoJogarNota: "Se errar, não tem punição: você ganha uma dica e tenta de novo.",
  casos: "Casos",
  semCasos: "Ainda não há casos abertos.",
  abrirCaso: "Abrir caso",
  continuarCaso: "Continuar",
  casoResolvido: "Caso resolvido",
  mapa: "Mapa da vila",
  mapaDica: "Toque num lugar. O ponto laranja marca onde tem caso aberto.",
  casoAberto: "caso aberto",
  verMapa: "Ver o mapa",
  bestiario: "Bestiário",
  bestiarioVazio: "Nenhuma criatura conhecida ainda. Resolva um caso pra abrir a primeira página.",
  bestiarioDesconhecida: "Criatura ainda não conhecida",
  conhecidas: (n: number, total: number) => `${n} de ${total} criaturas conhecidas`,
  voltar: "Voltar",
  lugares: "Lugares",
  moradores: "Moradores",
  sinais: "Sinais",
  olharLugar: "Olhar em volta",
  nadaNovo: "Nada de novo por aqui, por enquanto.",
  perguntar: "Perguntar",
  jaPerguntado: "Já perguntado",
  sinalNovo: "Sinal novo no caderno",
  depoimentoNovo: "Depoimento anotado",
  caderno: "Caderno de causos",
  cadernoVazioSinais: "Nenhum sinal coletado ainda.",
  cadernoVazioDepoimentos: "Nenhum depoimento anotado ainda.",
  quemE: "Quem está por trás?",
  oQueQuer: "O que ela quer?",
  marcar: "Marcar",
  irParaEncontro: "Ir para o encontro",
  faltamSinais: (n: number) => `Colete mais ${n} ${n === 1 ? "sinal" : "sinais"} antes do encontro.`,
  encontro: "Encontro",
  oQueFazer: "O que você faz?",
  confirmar: "Confirmar",
  conferindo: "Conferindo…",
  dicaTitulo: "Uma dica",
  tentarDeNovo: "Voltar a investigar",
  acertou: "Você entendeu a história.",
  origemTitulo: "Da onde vem essa história",
  fontes: "Fontes",
  revisadoPor: (nome: string) => `Texto revisado por ${nome}.`,
  semRevisao: "Texto em revisão: só aparece em testes.",
  criaturaConhecida: "Nova página no Bestiário",
  criarConta: "Crie sua conta pra guardar seu Bestiário",
  criarContaTexto: "Sem conta, o progresso fica só neste navegador.",
  entrar: "Entrar",
  cadastrar: "Criar conta",
  sons: "Sons",
  semSustos: "Modo sem sustos",
  semSustosAjuda: "Troca os sons de mistério por sons suaves.",
  ligado: "ligado",
  desligado: "desligado",
  erros: {
    generico: "Não deu pra conferir agora. Tenta de novo em instantes.",
    muitos: "Muitas tentativas seguidas. Respira, olha o caderno e tenta daqui a pouco.",
    invalido: "Algo não bateu com o caso. Recarrega a página e tenta de novo.",
    naoEncontrado: "Esse caso não existe.",
    semSinais: "Ainda faltam sinais pra decidir.",
  },
  cabine: { titulo: "Bestiário da Vila", abrir: "Abrir Bestiário" },
} as const;
