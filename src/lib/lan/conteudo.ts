// Textos da Lan House 2005. Tudo inventado: jogos, mensageiro, sites, marcas, provedores e lanches não existem.
// Nenhuma marca, programa ou jogo real aparece aqui. Clientes não têm nome próprio no MVP.

import type { Incidente, Papel, Periodo, Produto, Servico, TipoItem, TipoPc } from "./tipos";

export const TEXTOS = {
  titulo: "Lan House 2005",
  chamada: "Abra uma lan house no bairro, venda tempo de máquina, conserte PC travando e use o lucro pra sair da discada e montar o setor gamer.",
  continuar: "Continuar",
  nova: "Nova lan house",
  confirmarNova: "Isso fecha a lan atual pra sempre. Abrir outra?",
  avisoDinheiro: "O dinheiro da lan só vale dentro do jogo: não é dinheiro de verdade e não compra nada na loja.",
  contaGuardar: "Crie sua conta pra guardar sua lan em qualquer aparelho",
  guardadaAparelho: "Sua lan fica guardada neste aparelho.",
  procurando: "Ligando o estabilizador…",
  carregandoSalao: "Discando pro provedor…",
  regras: [
    "Cada dia dura uns 4 minutos, das 8h às 22h. Dá pra pausar e acelerar quando quiser.",
    "Receba no balcão, venda o tempo, escolha a máquina, resolva os chamados e cobre na saída.",
    "De manhã é impressão e currículo. De tarde e de noite chega a galera dos jogos.",
    "A cada 7 dias chegam o aluguel, a luz e a internet. Fechar a semana no azul é a meta.",
  ],
  cyberTitulo: "Abrir um cyber no centro",
  cyberTexto: "Uma segunda loja, maior, na avenida. Precisa de fama no bairro e de uma lan no nível máximo.",
  emBreve: "Em breve",
  diaTranquilo: "Dia tranquilo",
  diaTranquiloAjuda: "A paciência cai mais devagar e as máquinas dão menos problema. Fica marcado no resumo.",
  sons: "Sons do modem e do mensageiro",
} as const;

/** Jogos fictícios dos PCs, por gênero. Nenhum nome, mapa ou personagem lembra jogo real. */
export const JOGOS: Record<string, { nome: string; genero: string; online: boolean }> = {
  "operacao-tatica": { nome: "Operação Tática", genero: "tiro em equipe", online: true },
  "reinos-online": { nome: "Reinos Online", genero: "aventura on-line sem fim", online: true },
  tanquinho: { nome: "Tanquinho", genero: "artilharia por turnos", online: true },
  "corrida-turbo": { nome: "Corrida Turbo", genero: "corrida", online: false },
};

/** Sites e programas fictícios citados nos textos. */
export const SITES = { mensageiro: "ConversaNet", rede: "Rodinha", busca: "AchaTudo", provedor: "NetVila" } as const;

export const NOME_PC: Record<TipoPc, string> = { basica: "Básica", media: "Média", gamer: "Gamer" };

export const NOME_PERIODO: Record<Periodo, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite", madrugada: "Corujão" };

export const PRODUTOS: Record<Produto, { nome: string; icone: string }> = {
  refri: { nome: "Refri Borbulha", icone: "🥤" },
  salgadinho: { nome: "Salgadinho Crocante da Vila", icone: "🍿" },
  bala: { nome: "Bala Estalo", icone: "🍬" },
  misto: { nome: "Misto quente da casa", icone: "🥪" },
};

export const SERVICOS: Record<Servico, { nome: string; icone: string }> = {
  pesquisa: { nome: "Pesquisa", icone: "🔎" },
  impressao: { nome: "Impressão", icone: "🖨️" },
  curriculo: { nome: "Currículo", icone: "📄" },
  cd: { nome: "CD de fotos", icone: "💿" },
  xerox: { nome: "Xerox", icone: "📑" },
  scanner: { nome: "Scanner", icone: "🖼️" },
};

/** Problema da máquina: ícone + texto (nunca só cor). */
export const PROBLEMAS: Record<Incidente, { rotulo: string; icone: string; curto: string }> = {
  travou: { rotulo: "Travou", icone: "⏸", curto: "TRAVOU" },
  mouse: { rotulo: "Mouse de bolinha sujo", icone: "🖱", curto: "MOUSE" },
  virus: { rotulo: "Vírus", icone: "☣", curto: "VÍRUS" },
  erro: { rotulo: "Tela de erro", icone: "⚠", curto: "ERRO" },
  internet: { rotulo: "Internet caiu", icone: "📵", curto: "SEM NET" },
  energia: { rotulo: "Queda de energia", icone: "⚡", curto: "SEM LUZ" },
};

/** Rótulos desenhados no salão (canvas). {p} = preço da hora da máquina básica. */
export const ROTULOS_SALAO = {
  cartaz: "HORA R$ {p} · IMPRIME",
  divisoria: "divisória",
  porta: "porta",
  chamadoLanche: "✋ lanche",
  chamadoAjuda: "✋ ajuda",
  cobrar: "💰 cobrar",
  formatando: "💽 FORMATANDO",
  reiniciando: "↻ REINICIANDO",
} as const;

/** Tela de erro própria da lan (não imita nenhum sistema). */
export const TELA_ERRO = ["Ops! O computador ficou confuso.", "Código: BEGE-2005", "Chame o dono da lan."];

export const ACOES_CONSERTO: Record<string, string> = {
  reiniciar: "Reiniciar",
  limpar: "Limpar a bolinha",
  antivirus: "Passar o antivírus",
  formatar: "Formatar",
};

export const EQUIPE_TEXTO: Record<Papel, { nome: string; descricao: string; icone: string }> = {
  caixa: { nome: "Caixa", descricao: "Recebe a fila, vende o tempo, escolhe a máquina, vende lanche e cobra na saída.", icone: "🧾" },
  tecnico: { nome: "Técnico", descricao: "Resolve os chamados de máquina sozinho: reinicia, limpa, passa antivírus e formata.", icone: "🔧" },
  monitor: { nome: "Monitor do salão", descricao: "Pede pra galera falar baixo e ajuda quem não sabe usar o computador.", icone: "🤫" },
};

export const ROTULO_KIND: Record<TipoItem, string> = {
  maquina: "Máquinas",
  internet: "Internet",
  energia: "Energia",
  software: "Software",
  servico: "Serviços",
  balcao: "Balcão",
  conforto: "Conforto",
  ambiente: "Ambiente",
  expansao: "Expansão",
};

export const TEXTOS_ERRO = {
  semConta: "Entre na sua conta pra guardar a lan.",
  saldo: "Falta dinheiro pra isso.",
  nivelMax: "Já está no nível máximo.",
  nivelLan: "A lan ainda não tem o nível pra isso.",
  semVaga: "Sem vaga de funcionário neste nível da lan.",
  jaContratado: "Essa pessoa já trabalha na lan.",
  semEspaco: "Não cabe mais máquina no salão. Amplie o espaço primeiro.",
  invalido: "Não deu pra conferir esse dia. Ele não foi guardado.",
  limite: "Muitas gravações seguidas. Tenta de novo daqui a pouco.",
  generico: "Não deu pra guardar agora. Tenta de novo em instantes.",
  layout: "Essa disposição não cabe no salão.",
} as const;

/** Mensagens curtas do salão (barra de avisos). {g} = arquétipo. */
export const AVISOS_SALAO = {
  pago: "{g} pagou e saiu",
  foi: "{g} cansou de esperar e foi embora",
  reembolso: "{g} foi embora e pediu o dinheiro de volta",
  recusou: "{g} foi atendido em outro lugar",
  semEquipamento: "{g} precisava de um equipamento que a lan não tem",
  internet: "A internet caiu!",
  internetVoltou: "A internet voltou.",
  energia: "Acabou a luz!",
  energiaNobreak: "Piscou a luz, mas o nobreak segurou.",
  energiaVoltou: "A luz voltou. Reiniciando tudo…",
  fechou: "A lan fechou. Cobre quem ainda está dentro.",
} as const;

// ---------------- ConversaNet ----------------

/** Status do mensageiro: ícone + texto, nunca só cor. */
export const STATUS = {
  online: { rotulo: "Disponível", icone: "●" },
  ocupado: { rotulo: "Ocupado", icone: "■" },
  ausente: { rotulo: "Ausente", icone: "◐" },
  jogando: { rotulo: "Jogando", icone: "▶" },
} as const;
export type Status = keyof typeof STATUS;

export const CONVERSANET = {
  nome: "ConversaNet",
  titulo: "ConversaNet · você está Disponível",
  meuApelido: "~*DoNo dA LaN*~",
  chamarAtencao: "chamou sua atenção!",
  vazio: "Ninguém mandou recado ainda. Os clientes que saem felizes viram contato aqui.",
  abrir: "ConversaNet",
  fechar: "Minimizar",
  semRecados: "Sem recados novos",
  novo: "novo",
  /** Remetentes dos avisos da lan (não são clientes). */
  sistema: {
    contas: { apelido: "Seu Proprietário (aluguel)", status: "ocupado" as Status },
    provedor: { apelido: `Suporte ${SITES.provedor}`, status: "online" as Status },
    energia: { apelido: "Companhia de Luz do Bairro", status: "ausente" as Status },
    campeonato: { apelido: "[ORG] Camp de Sábado", status: "online" as Status },
  },
  avisos: {
    contaChegando: ["Passando pra lembrar: amanhã vence o aluguel, a luz e a internet. Deixa separado, viu?"],
    contaPaga: ["Recebido, obrigado! Semana que vem tem mais."],
    contaAtrasada: ["Faltou dinheiro pras contas... o pessoal do bairro ficou sabendo."],
    internetCaiu: ["Estamos com instabilidade na região. Já já volta, não desliga o modem!", "Caiu aí também? Tamo vendo aqui."],
    energiaCaiu: ["Manutenção na rede do bairro. Pode piscar a luz hoje."],
    sabado: ["Sábado é dia de camp! A galera vai querer máquinas lado a lado.", "Camp de sábado confirmado. Prepara as máquinas boas!"],
  },
  /** Apelidos com símbolos e status de cada arquétipo frequente. */
  contatos: {
    "galera-tiro": [{ apelido: "xX_ClaNdoBairro_Xx", status: "jogando" }, { apelido: "[TaTiCo]Mira", status: "jogando" }],
    "jogador-mmo": [{ apelido: "~*Paladino*Errante*~", status: "jogando" }, { apelido: "LvL99_nAo_DoRmE", status: "ausente" }],
    "rei-mensageiro": [{ apelido: "♥ sEmPrE oNlInE ♥", status: "online" }, { apelido: "¤º°`°º¤ tC aKi ¤º°`°º¤", status: "online" }],
    estudante: [{ apelido: "trabalho_de_geo_SOCORRO", status: "ocupado" }],
    curriculo: [{ apelido: "Procurando Emprego :)", status: "online" }],
    tio: [{ apelido: "Tio da Banca", status: "ausente" }],
    fotografo: [{ apelido: "Fotos da Família ✿", status: "online" }],
    fucador: [{ apelido: "h4ck3r_d0_b41rr0", status: "ocupado" }],
  } as Record<string, { apelido: string; status: Status }[]>,
  /** Recado que o frequente manda depois de sair feliz. */
  recados: {
    "galera-tiro": ["camp sábado? guarda as máquinas do canto pra gnt!!!", "ontem foi histórico kkkkk", "aquela máquina 3 tá voando"],
    "jogador-mmo": ["se a net cair eu perco o evento do reino, segura essa net pfv", "abre o corujão que eu levo a guilda toda"],
    "rei-mensageiro": ["oiii tô indo aí :)", "a máquina do cantinho tava ótima, longe da gritaria", "/me mudou o apelido"],
    estudante: ["salvou meu trabalho!!! obrigado", "amanhã tem trabalho de novo, abre cedo?"],
    curriculo: ["o currículo ficou lindo, já mandei pra três lugares", "consegui a entrevista!! valeu pela impressão"],
    tio: ["Obrigado pela paciência, filho. Aprendi a mandar foto pro meu neto.", "Volto amanhã pra ver o e-mail."],
    fotografo: ["Os CDs ficaram ótimos, a família amou", "Semana que vem tem aniversário, vou trazer mais fotos"],
    fucador: ["essa máquina tá blindada hein kkk", "descobri um atalho novo, depois te mostro"],
  } as Record<string, string[]>,
  /** Pedidos especiais: só recado, sem mecânica no MVP. */
  pedidos: [
    "Tem como guardar duas máquinas lado a lado pra mais tarde?",
    "Vocês têm o misto quente hoje? Tô indo com fome.",
    "Dá pra imprimir colorido aí? É convite de aniversário.",
    "Tem fone sobrando? Esqueci o meu.",
  ],
};

/** Escreve um aviso trocando {g} pelo nome do arquétipo. */
export const preencher = (t: string, g: string) => t.replace("{g}", g);
