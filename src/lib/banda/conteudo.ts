// Textos, nomes e rótulos da Banda de Garagem. Tudo inventado: nenhuma banda, música, casa de show ou marca real.
// Sem letras de música: só títulos. Sem bebida alcoólica como mecânica.

import type { AcaoDia, ErroJogo, Papel, ParteEquip } from "./tipos";

export const TEXTOS = {
  titulo: "Banda de Garagem",
  chamada: "Monte uma banda no bairro, ensaie, componha, toque nos palcos da região e grave uma demo.",
  regras: [
    "Cada semana tem 6 dias: em cada um você escolhe uma ação (ensaiar, compor, divulgar, trabalhar ou descansar).",
    "No fim de semana a banda toca num palco do bairro. Quanto mais fama, mais palcos se abrem.",
    "Ensaiar e trabalhar sem parar derruba o humor e dá briga. Descansar compensa.",
    "Com 4 músicas boas, dá pra gravar uma demo e abrir os palcos maiores.",
  ],
  procurando: "Procurando a sua banda…",
  continuar: "Continuar",
  nova: "Nova banda",
  comoJogar: "Como jogar",
  confirmarNova: "Já existe uma banda salva. Começar outra apaga a atual.",
  confirmarNovaBotao: "Apagar e começar outra",
  cancelar: "Cancelar",
  avisoDinheiro: "O dinheiro do jogo não vale dinheiro de verdade.",
  guardadaAparelho: "Sua banda está guardada só neste aparelho.",
  contaGuardar: "Crie sua conta pra guardar sua banda",
  voltar: "← Fliperama",
  capa: "← Capa",
  semBanda: "Ainda não há banda por aqui.",
  semana: "Semana",
  dia: "Dia",
  fimDeSemana: "Fim de semana",
  caixa: "Caixa",
  fama: "Fama",
  entrosamento: "Entrosamento",
  divulgacao: "Divulgação",
  equipamento: "Equipamento",
  humor: "Humor",
  cansaco: "Cansaço",
  tecnica: "Técnica",
  presenca: "Presença de palco",
  criatividade: "Criatividade",
  mania: "Mania",
  musicas: "Músicas",
  semMusicas: "Nenhuma música ainda. Dedique um dia a compor.",
  repertorio: "Repertório do show",
  escolhaPalco: "Escolha o palco",
  tocar: "Subir no palco",
  pularShow: "Não tocar esta semana",
  consertar: "Consertar",
  consertarAjuda: "Gasta dinheiro e não gasta um dia.",
  gravarDemo: "Gravar a demo",
  demoGravada: "Demo gravada",
  demoAjuda: "Precisa de 4 músicas boas e de dinheiro. Abre os palcos maiores.",
  palcoFechado: "Fecha até a fama chegar a",
  palcoDemo: "e a demo gravada",
  palcoAberto: "Aberto",
  lotacao: "Lotação",
  cacheBase: "Cachê base",
  maiorPalco: "Maior palco",
  nenhumShow: "Nenhum show ainda",
  proximoDia: "Dia de hoje",
  escolhaAcao: "O que a banda faz hoje?",
  somLigado: "Sons ligados",
  somDesligado: "Sons desligados",
  carregando: "Carregando…",
  ouvindoOPublico: "O show está começando…",
  verResumo: "Ver o resumo",
  proximaSemana: "Próxima semana",
  publico: "Público",
  energia: "Energia",
  cache: "Cachê",
  famaGanha: "Fama",
  nota: "Nota",
  momentos: "Momentos",
  faltou: "Faltou ao show:",
  saiu: "saiu da banda e entrou",
  brigou: "brigou com",
  avisoHumor: "Está por um fio. Dê um descanso antes que saia da banda.",
  avisoFalta: "Pode faltar ao show.",
  alertaCansaco: "Cansado",
  criarBanda: "Criar a banda",
  passoNome: "Nome e estilo",
  passoLogo: "Logo",
  passoMembros: "Os quatro integrantes",
  nomeBanda: "Nome da banda",
  estilo: "Estilo musical",
  formaLogo: "Forma",
  corFundo: "Cor do fundo",
  corForma: "Cor da forma",
  escolher: "Escolher",
  escolhido: "Escolhido",
  proximo: "Próximo",
  anterior: "Voltar",
  composicao: {
    titulo: "Compor",
    estrutura: "Estrutura",
    clima: "Clima",
    tema: "Tema",
    nome: "Nome da música",
    sugestoes: "Sugestões",
    compor: "Compor a música",
    resultado: "Música pronta",
    bpm: "BPM",
    boa: "Boa o bastante pra demo",
    fraca: "Ainda dá pra melhorar",
    semDia: "Não sobrou dia nesta semana pra compor.",
    voltarSemana: "Voltar pra semana",
  },
  demo: {
    titulo: "Demo",
    chamada: "Grave as suas melhores músicas e abra os palcos maiores.",
    custo: "Custo",
    boas: "Músicas boas",
    gravar: "Gravar a demo",
    pronta: "A demo está gravada. Os palcos maiores estão a caminho.",
    precisa: "Precisa de mais músicas boas.",
  },
  comoJogarTexto: [
    "Ensaiar sobe técnica e entrosamento, mas cansa. Compor cria músicas. Divulgar enche o show. Trabalhar paga as contas e o equipamento. Descansar devolve o humor.",
    "O show depende das músicas do repertório, do entrosamento, da presença de palco, do equipamento e da divulgação, com um pouco de sorte.",
    "Quem está de humor baixo pode faltar ao show ou sair da banda. A banda sempre avisa antes.",
  ],
  selo: { titulo: "Banda de Garagem", abrir: "Abrir a banda", musicas: "Músicas", shows: "Shows", maiorPalco: "Maior palco" },
} as const;

export const ERROS: Record<ErroJogo, string> = {
  invalido: "Isso não parece certo. Recarregue a página e tente de novo.",
  diaErrado: "Essa ação não cabe agora.",
  semDia: "Não sobrou dia nesta semana.",
  dinheiro: "Faltou dinheiro.",
  semMusica: "A banda ainda não tem música pra tocar.",
  palcoFechado: "Esse palco ainda está fechado.",
  repertorio: "Escolha músicas do repertório que a banda já compôs.",
  demoRequisito: "A banda precisa de 4 músicas boas pra gravar a demo.",
  demoJa: "A demo já foi gravada.",
  equipOk: "O equipamento está inteiro.",
  titulo: "Dê um nome pra música, de 1 a 40 caracteres.",
  limite: "Muitos envios seguidos. Tenta de novo daqui a pouco.",
  semConta: "Entre na sua conta pra guardar a banda.",
  generico: "Deu ruim aqui. Tenta de novo daqui a pouco.",
};

export const NOME_PAPEL: Record<Papel, string> = { voz: "Voz", guitarra: "Guitarra", baixo: "Baixo", bateria: "Bateria" };
export const NOME_ACAO: Record<AcaoDia, string> = { ensaiar: "Ensaiar", compor: "Compor", divulgar: "Divulgar", trabalhar: "Trabalhar", descansar: "Descansar" };
export const DESCRICAO_ACAO: Record<AcaoDia, string> = {
  ensaiar: "Sobe técnica e entrosamento. Cansa.",
  compor: "Cria uma música nova.",
  divulgar: "Enche o próximo show. Custa um tico.",
  trabalhar: "Dinheiro pro equipamento. Cansa.",
  descansar: "Devolve o humor e tira o cansaço.",
};
export const NOME_PARTE: Record<ParteEquip, string> = { instrumentos: "Instrumentos", amplificador: "Amplificador", cabos: "Cabos" };

export const NOME_ESTILO: Record<string, string> = {
  "rock-de-garagem": "Rock de garagem",
  punk: "Punk",
  indie: "Indie",
  metal: "Metal",
  emo: "Emo",
  "pop-alternativo": "Pop alternativo",
};
export const NOME_CLIMA: Record<string, string> = { energico: "Energético", melancolico: "Melancólico", ensolarado: "Ensolarado", sombrio: "Sombrio" };
export const NOME_TEMA: Record<string, string> = {
  bairro: "O bairro",
  amizade: "Amizade",
  madrugada: "Madrugada",
  saudade: "Saudade",
  estrada: "Estrada",
  recomeco: "Recomeço",
};
export const NOME_ESTRUTURA: Record<string, string> = { direta: "Direta e curta", classica: "Clássica", longa: "Longa, com solo" };
export const NOME_SECAO: Record<string, string> = { intro: "Intro", verso: "Verso", refrao: "Refrão", ponte: "Ponte", solo: "Solo" };
export const NOME_FORMA: Record<string, string> = { circulo: "Círculo", raio: "Raio", estrela: "Estrela", triangulo: "Triângulo", onda: "Onda", chave: "Chave" };

export const NOME_PALCO: Record<string, string> = {
  "garagem-do-tuco": "Garagem do Tuco",
  "bar-tampinha": "Bar Tampinha",
  "festa-ipe-roxo": "Festa da Escola Ipê Roxo",
  "centro-varzea-viva": "Centro Cultural Várzea Viva",
  "festival-quintal-aberto": "Festival Quintal Aberto",
};
export const TIPO_PALCO: Record<string, string> = {
  "garagem-do-tuco": "Garagem de amigo",
  "bar-tampinha": "Bar pequeno",
  "festa-ipe-roxo": "Festa de escola",
  "centro-varzea-viva": "Centro cultural",
  "festival-quintal-aberto": "Festival do bairro",
};

export const NOME_MANIA: Record<string, string> = {
  "sempre-atrasa": "Sempre atrasa",
  "so-musica-propria": "Quer tocar só música própria",
  "empolga-o-publico": "Empolga o público",
  perfeccionista: "Perfeccionista no ensaio",
};

export const TEXTO_MOMENTO: Record<string, string> = {
  "cabo-soltou": "O cabo soltou no meio da música e o show parou por um instante.",
  "amp-chiou": "O amplificador chiou o show inteiro.",
  "publico-cantou": "O público cantou junto o refrão.",
  bis: "Pediram bis e a banda voltou pro palco.",
  "palco-vazio": "O palco estava vazio, mas a banda tocou como se não estivesse.",
  "casa-cheia": "Casa cheia: não cabia mais ninguém.",
  "baterista-quebrou-baqueta": "A baqueta quebrou, e o baterista terminou a música com a outra.",
  dancaram: "A galera dançou da primeira música até a última.",
  "vaia-educada": "O público ficou parado, e só aplaudiu por educação.",
  empolgou: "Alguém da banda empolgou a plateia e a energia subiu.",
  "chegou-atrasado": "Alguém chegou atrasado e a banda começou sem soltar a primeira nota.",
  "show-calmo": "Um show tranquilo, sem grandes sustos.",
};

export const TEXTO_AVISO = {
  humor: (nome: string) => `${nome} está por um fio. Dê um descanso antes que saia da banda.`,
  briga: (a: string, b: string) => `${a} e ${b} brigaram. O entrosamento caiu.`,
  saiu: (nome: string, novo: string) => `${nome} saiu da banda. ${novo} entrou no lugar.`,
  faltou: (nome: string) => `${nome} faltou ao show.`,
  atrasou: (nome: string) => `${nome} chegou atrasado.`,
};

/** Nomes inventados dos candidatos (primeiro nome + apelido). */
export const NOMES_CANDIDATOS: string[] = [
  "Nina", "Beto", "Lia", "Caco", "Duda", "Téo", "Mari", "Rico", "Zeca", "Bia", "Pipo", "Lu",
  "Juca", "Tati", "Gui", "Naná", "Fê", "Raul", "Cris", "Dani", "Ivo", "Lara", "Kiko", "Sol",
];
export const APELIDOS: string[] = ["do Fundão", "Pavio", "Ruído", "Cabeção", "Faísca", "Neblina", "Tampa", "Esquina", "Fuzuê", "Tom"];

/** Sugestões de nome de música, por tema. Títulos inventados, sem letras. */
export const NOMES_MUSICAS: Record<string, string[]> = {
  bairro: ["Esquina das Seis", "Muro Descascado", "Rua Sem Saída", "Luz do Poste", "Quintal de Terra"],
  amizade: ["Quem Fica Até o Fim", "Banco de Trás", "Carona de Última Hora", "Café Requentado", "Mesmo Barco Furado"],
  madrugada: ["Três e Quarenta", "Janela Acesa", "Ônibus Vazio", "Silêncio da Geladeira", "Volume Baixo"],
  saudade: ["Foto Amarelada", "Fita Gasta", "Telefone Sem Fio", "O Que Sobrou da Chuva", "Casa de Vó"],
  estrada: ["Pneu Careca", "Acostamento", "Mapa Dobrado", "Meio Tanque", "Placa Apagada"],
  recomeco: ["Folha em Branco", "Segunda de Novo", "Chave Nova", "Primeira Corda", "Tinta Fresca"],
};
