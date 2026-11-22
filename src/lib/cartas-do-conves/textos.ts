// Todo texto de tela do Cartas do Convés. Os componentes só montam; nada é digitado direto neles.

import type { Liberacao, TipoNo } from "./tipos";
import type { Conteudo } from "./tipos";
import { inimigoDe } from "./conteudo";

export const TEXTOS = {
  titulo: "Cartas do Convés",
  chamada: "Uma travessia entre ilhas do Mar Sem Fim. Comece com um baralho fraco, enfrente encontros por turnos e melhore o baralho até o chefe.",
  descricaoMeta: "Cartas roguelite no Mar Sem Fim: escolha um ofício, atravesse três trechos de mar e vença o Polvo-Mor. Cartas novas se liberam jogando.",
  voltar: "← Fliperama",

  capa: {
    nova: "Nova travessia",
    continuar: "Continuar travessia",
    comoJogar: "Como jogar",
    colecao: "Coleção de cartas",
    colecaoResumo: (n: number, total: number) => `${n} de ${total} cartas liberadas`,
    bloqueada: "Carta ainda bloqueada",
    comoLiberar: "Como liberar",
    contaTitulo: "Crie sua conta pra guardar sua coleção",
    contaTexto: "Sem conta, a travessia fica só neste aparelho e as cartas liberadas não são guardadas. Ao criar a conta, a partida atual sobe junto.",
    criarConta: "Criar conta",
    entrar: "Já tenho conta",
    migrou: "Sua partida foi guardada na conta.",
    migrouFalhou: "Não deu pra guardar a partida local. Ela continua neste aparelho.",
    avisoOuro: "O ouro é só da travessia: não vale dinheiro e não compra nada na loja do site. Cartas se liberam jogando, nunca pagando.",
    jogando: "Jogando agora",
    carregando: "Abrindo o convés…",
  },

  comoJogar: [
    "Escolha um ofício do Mar Sem Fim. Ele define o baralho inicial de 10 cartas e uma habilidade passiva.",
    "No mapa, escolha o caminho: encontro, evento, porto, tesouro. Cada trecho termina num porto, e o último, no chefe.",
    "No combate você tem 3 de energia por turno e compra 5 cartas. Toque numa carta e depois no alvo, ou arraste a carta até ele.",
    "Cada inimigo mostra o que vai fazer no fim do turno. Use o bloqueio antes de tomar o golpe.",
    "Depois de cada combate, escolha 1 entre 3 cartas. No porto dá pra curar, comprar e remover carta.",
    "Se o Fôlego zerar, a travessia termina, mas as cartas que você liberou ficam na sua coleção.",
  ],
  teclado: ["Teclas 1 a 9: escolhe a carta da mão.", "Enter: joga a carta escolhida (ou a escolhe no alvo).", "Esc: cancela a escolha.", "Tab: passa por cartas, inimigos e botões."],

  oficio: {
    titulo: "Escolha o ofício",
    texto: "Os ofícios são os mesmos do Mar Sem Fim. Cada um começa com 10 cartas e uma passiva.",
    passiva: "Passiva",
    baralho: "Baralho inicial",
    escolher: (nome: string) => `Zarpar como ${nome}`,
    cancelar: "Voltar",
  },

  hud: {
    folego: (a: number, b: number) => `Fôlego ${a}/${b}`,
    ouro: (n: number) => `${n} de ouro`,
    trecho: (n: number, total: number) => `Trecho ${n} de ${total}`,
    som: (ligado: boolean) => (ligado ? "Desligar sons" : "Ligar sons"),
    baralho: (n: number) => `Baralho (${n})`,
    reliquias: "Relíquias",
    sincronizando: "Guardando…",
    sincronizado: "Guardado na conta",
    local: "Só neste aparelho",
    erroSync: "Não deu pra guardar. Tenta de novo.",
    tentar: "Tentar de novo",
  },

  mapa: {
    titulo: (mar: string, ilha: string) => `${mar} · ${ilha}`,
    escolha: "Escolha o próximo ponto da travessia.",
    inicio: "Partida do trecho",
    disponivel: "ao alcance",
    visitado: "já passou",
    fora: "fora do caminho",
    atual: "você está aqui",
    tipos: { encontro: "Encontro", evento: "Evento", porto: "Porto", tesouro: "Tesouro", chefe: "Chefe" } as Record<TipoNo, string>,
    dicas: {
      encontro: "Um combate. Rende ouro e uma carta.",
      evento: "Algo inesperado no mar.",
      porto: "Curar, comprar e remover carta.",
      tesouro: "Uma relíquia e um pouco de ouro.",
      chefe: "O fim da travessia.",
    } as Record<TipoNo, string>,
  },

  combate: {
    turno: (n: number) => `Turno ${n}`,
    energia: (a: number) => `Energia ${a}`,
    bloqueio: (n: number) => `Bloqueio ${n}`,
    fim: "Fim do turno",
    compra: (n: number) => `Compra ${n}`,
    descarte: (n: number) => `Descarte ${n}`,
    exaurida: (n: number) => `Exauridas ${n}`,
    voce: "Você",
    escolhaAlvo: "Toque no inimigo que será o alvo.",
    tocarDeNovo: "Toque de novo na carta pra jogar.",
    escolhaCarta: "Toque numa carta pra escolher.",
    caiu: "derrotado",
    alvo: (nome: string) => `Alvo: ${nome}`,
    intencao: "Vai fazer",
    mao: "Sua mão",
    semMao: "Sem cartas na mão. Termine o turno.",
  },

  intencaoCurta: {
    atacar: (v: number, vezes?: number) => (vezes && vezes > 1 ? `Atacar ${v}×${vezes}` : `Atacar ${v}`),
    defender: (v: number) => `Defender ${v}`,
    status: (nome: string, v: number) => `${nome} ${v}`,
  },

  carta: {
    exaurir: "Exaurir",
    custo: "custo",
    energia: "energia",
  },

  recompensa: {
    titulo: "Combate vencido",
    ouro: (n: number) => `+${n} de ouro`,
    escolha: "Escolha 1 carta pro baralho",
    pular: "Pular recompensa",
    pegar: (nome: string) => `Pegar ${nome}`,
  },

  evento: { titulo: "Evento no mar", exige: (n: number) => `precisa de ${n} de ouro` },

  porto: {
    titulo: "Porto",
    texto: "Um cais tranquilo. Dá pra descansar, comprar cartas e deixar peso pra trás.",
    curar: (n: number) => `Descansar e recuperar ${n} de Fôlego`,
    curado: "Você já descansou neste porto",
    loja: "Mercado do cais",
    comprar: (preco: number) => `Comprar por ${preco}`,
    vendido: "Vendido",
    remover: (preco: number) => `Remover uma carta do baralho (${preco} de ouro)`,
    removido: "Você já removeu uma carta neste porto",
    removerTitulo: "Qual carta sair do baralho?",
    removerCarta: (nome: string) => `Remover ${nome}`,
    cancelar: "Cancelar",
    sair: "Zarpar",
    semOuro: "Ouro insuficiente",
  },

  tesouro: { titulo: "Tesouro", texto: "Um baú salgado, trancado há muito tempo.", abrir: "Abrir o baú", reliquia: "Relíquia" },

  fim: {
    vitoria: "Travessia vencida",
    derrota: "Travessia encerrada",
    textoVitoria: "O Polvo-Mor afundou e o mar ficou quieto. Seu baralho foi até o fim.",
    textoDerrota: "O Fôlego acabou, mas as cartas que você liberou continuam suas.",
    resumo: "Resumo da travessia",
    ofício: "Ofício",
    trecho: "Trecho alcançado",
    derrotados: "Inimigos derrotados",
    cartasNoBaralho: "Cartas no baralho",
    reliquias: "Relíquias",
    liberadas: "Cartas liberadas",
    nenhuma: "Nenhuma carta nova desta vez.",
    previa: "Cartas que você liberaria com conta",
    guardando: "Conferindo a travessia no servidor…",
    erro: "O servidor não confirmou esta travessia.",
    jogarDeNovo: "Nova travessia",
    sair: "Voltar à capa",
    criarConta: "Crie sua conta pra guardar sua coleção",
  },

  baralho: { titulo: "Seu baralho", fechar: "Fechar", vazio: "Sem cartas." },

  erro: { generico: "Algo deu errado. Tenta de novo." },

  selo: {
    titulo: "Selo · Cartas do Convés",
    vencida: "Travessia vencida",
    vitorias: "Travessias vencidas",
    favorita: "Carta favorita",
    abrir: "Jogar uma travessia",
  },
};

/** Como liberar uma carta, em português, a partir da regra do JSON. */
export function textoLiberacao(l: Liberacao, C: Conteudo): string {
  switch (l.tipo) {
    case "inicio":
      return "Já vem liberada.";
    case "derrotar":
      return `Derrote ${inimigoDe(C, l.inimigo)?.nome ?? l.inimigo} numa travessia.`;
    case "trecho":
      return `Chegue ao trecho ${l.trecho} de uma travessia.`;
    case "vitoria_com":
      return `Vença a travessia como ${C.oficios.find((o) => o.id === l.oficio)?.nome ?? l.oficio}.`;
  }
}
