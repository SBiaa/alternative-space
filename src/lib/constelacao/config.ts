// Constelação do Dia: números, limites e textos. Nada disso fica dentro dos componentes.

export const JOGO = "constelacao";
export const FUSO = "America/Sao_Paulo";
export const ESTADO_VERSAO = 1;

export const PARTIDA = {
  tentativas: 6,
  // Tamanhos aceitos na agenda (cada dia escolhe o seu pelo tamanho da palavra).
  tamanhos: [5, 6, 7] as readonly number[],
  // Quantos dias o navegador guarda de quem joga sem conta.
  diasNoNavegador: 30,
};

export const LIMITES = {
  // Palpites por janela, por IP e por usuário.
  palpitesIp: { max: 60, janelaS: 600 },
  palpitesUsuario: { max: 40, janelaS: 600 },
  leituraIp: { max: 120, janelaS: 600 },
  migracao: { max: 6, janelaS: 3600 },
  // Só mostra a distribuição de tentativas quando há partidas suficientes.
  minimoParaDistribuicao: 10,
  agendaDiasAviso: 14,
};

export const TEMAS = {
  anime: "Anime",
  rpg: "RPG",
  "ficcao-cientifica": "Ficção científica",
  games: "Games",
  quadrinhos: "Quadrinhos",
} as const;
export type Tema = keyof typeof TEMAS;
export const TEMAS_LISTA = Object.keys(TEMAS) as Tema[];

// Símbolos do texto de compartilhar (sem a palavra).
export const SIMBOLOS = { certa: "★", outro: "☆", ausente: "·" } as const;

export const CAMINHOS = {
  jogo: "/jogos/constelacao",
  imagem: "/jogos/constelacao/imagem",
  cadastro: "/cadastro",
  entrar: "/entrar",
  admin: "/admin/constelacao",
};

export const TEXTOS = {
  titulo: "Constelação do Dia",
  descricao: "Adivinhe a palavra geek do dia em até 6 tentativas. Cada letra certa acende uma estrela.",
  voltar: "← Fliperama",
  carregando: "Acendendo as estrelas…",
  tema: (t: string) => `Tema da semana: ${t}`,
  dica: (d: string) => `Dica: ${d}`,
  tamanho: (n: number) => `${n} letras`,
  tentativa: (n: number, total: number) => `Tentativa ${n} de ${total}`,
  semDesafio: "Hoje não tem desafio. Volte amanhã para a próxima constelação.",
  semDesafioDetalhe: "A agenda de hoje está vazia.",
  grade: "Grade de tentativas",
  linha: (n: number) => `Tentativa ${n}`,
  linhaVazia: (n: number) => `Tentativa ${n}, vazia`,
  casaVazia: "vazia",
  casa: (letra: string, estado: "certa" | "outro" | "ausente" | "digitando") =>
    estado === "certa"
      ? `${letra}, no lugar certo`
      : estado === "outro"
        ? `${letra}, existe em outro lugar`
        : estado === "ausente"
          ? `${letra}, não existe na palavra`
          : `${letra}, digitada`,
  estados: { certa: "certa", outro: "outro lugar", ausente: "não existe" },
  legenda: "Estrela acesa: no lugar certo · Contorno tracejado: em outro lugar · Apagada: não existe",
  teclado: "Teclado",
  apagar: "Apagar",
  apagarRotulo: "Apagar última letra",
  enviar: "Enviar",
  enviarRotulo: "Enviar palpite",
  tecla: (l: string, estado: string | null) => (estado ? `${l}, ${estado}` : l),
  erros: {
    tamanho: (n: number) => `O palpite precisa ter ${n} letras.`,
    invalida: "Essa palavra não está na lista.",
    finalizada: "A partida de hoje já terminou.",
    muitos: "Muitos palpites seguidos. Tente de novo daqui a pouco.",
    semDesafio: "Hoje não tem desafio.",
    generico: "Não deu pra conferir agora. Tente de novo.",
  },
  resultado: {
    acertou: (n: number) => (n === 1 ? "Acertou de primeira!" : `Acertou em ${n} tentativas.`),
    errou: "Não foi dessa vez.",
    resposta: (r: string) => `A palavra era ${r}.`,
    sequencia: "Sequência",
    sequenciaAtual: "Atual",
    melhor: "Melhor",
    dias: (n: number) => (n === 1 ? "1 dia" : `${n} dias`),
    distribuicao: "Como a tripulação acertou",
    distribuicaoItem: (n: number, total: number) => `${n} tentativa${n === 1 ? "" : "s"}: ${total}`,
    falhas: "Não acertaram",
    proximo: "Próximo desafio em",
    compartilhar: "Compartilhar",
    copiar: "Copiar resultado",
    copiado: "Resultado copiado.",
    naoCopiou: "Não deu pra copiar. Selecione o texto abaixo.",
    imagem: "Baixar imagem",
    constelacao: "Sua constelação de hoje",
  },
  conta: {
    texto: "Crie sua conta pra guardar na cabine",
    detalhe: "Sua sequência e suas partidas ficam salvas na conta.",
    migrado: "Suas partidas foram guardadas na cabine.",
  },
  compartilhar: {
    titulo: (dia: string, resumo: string) => `Constelação do Dia ${dia} · ${resumo}`,
    resumoAcerto: (n: number, total: number) => `${n}/${total}`,
    resumoErro: (total: number) => `X/${total}`,
    chamada: "Jogue também:",
  },
  cabine: { titulo: "Constelação do Dia", atual: "Sequência atual", melhor: "Melhor sequência" },
  admin: {
    titulo: "Constelação do Dia: agenda",
    voltar: "← Painel",
    avisoTitulo: "Dias sem palavra agendada",
    avisoOk: "Os próximos dias estão todos agendados.",
    semPalavra: "sem palavra",
    novo: "Agendar palavra",
    data: "Data",
    palavra: "Palavra (5 a 7 letras, sem acento)",
    tema: "Tema da semana",
    dica: "Dica (opcional)",
    salvar: "Salvar",
    remover: "Remover",
    proximos: "Agenda",
    passados: "Últimos dias",
    vazio: "Nenhuma palavra agendada.",
    salvo: "Palavra salva.",
    removido: "Palavra removida.",
    erroPalavra: "Use só letras de A a Z, de 5 a 7 letras.",
    erroData: "Data inválida.",
    erroTema: "Tema inválido.",
    erroPassado: "Não dá pra mudar a palavra de hoje nem de dias que já passaram.",
    erroGenerico: "Não deu pra salvar.",
    revisao: "Revise a palavra antes de publicar: genérica da cultura geek, sem marcas, franquias ou personagens e nada ofensivo.",
  },
};
