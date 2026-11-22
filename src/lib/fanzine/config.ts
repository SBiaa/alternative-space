// Números e textos da interface da Fanzine Perdida. Nada disso fica dentro dos componentes.

export const FANZINE = {
  slug: "fanzine",
  versaoSave: 1,
  chaveLocal: (capitulo: string) => `fanzine:${capitulo}`,
  maxDicas: 3,
  // Teto de tamanho de qualquer lista do save, só pra recusar lixo.
  maxItens: 60,
  limiteAcoes: { max: 40, janelaSeg: 60 },
  eventos: { jogada: "game_played", pista: "fanzine_clue_found" },
  zoom: { min: 1, max: 3, passo: 0.5 },
} as const;

export const TEXTOS = {
  titulo: "Fanzine Perdida",
  chamada: "Páginas soltas de uma fanzine feita por uma turma dos anos 90. Examine, junte as pistas e descubra o que aconteceu com ela.",
  voltar: "← Fliperama",
  comoJogar: {
    titulo: "Como jogar",
    passos: [
      "Folheie as páginas e passe a lupa nos detalhes: carimbos, datas, endereços, assinaturas e letras à mão.",
      "Cada detalhe marcado vira uma pista no quadro de cortiça.",
      "Ligue duas pistas que combinam. Se a ligação faz sentido, você ganha uma dedução.",
      "Com as deduções na mão, responda a pergunta do capítulo. Errar não tem castigo: o jogo mostra o que faltou.",
    ],
  },
  capitulos: { titulo: "Capítulos", progresso: (p: number, t: number) => `${p} de ${t} pistas`, resolvido: "Resolvido", emAndamento: "Em andamento", novo: "Novo", abrir: "Abrir capítulo", vazio: "O próximo capítulo sai no mês que vem." },
  conta: { botao: "Crie sua conta pra guardar suas pistas", aviso: "Sem conta, suas pistas ficam só neste aparelho.", migrado: "Suas pistas foram guardadas na conta." },
  folhear: { titulo: "Páginas", anterior: "Página anterior", proxima: "Próxima página", pagina: (n: number, t: number) => `Página ${n} de ${t}`, maisZoom: "Aumentar zoom", menosZoom: "Diminuir zoom", zoom: (z: number) => `Zoom ${Math.round(z * 100)}%`, lerEmTexto: "Ler a página em texto" },
  lupa: { titulo: "Lupa", dica: "Toque nos detalhes da página pra marcar uma pista.", detalhes: "Detalhes desta página", achada: "pista marcada", naoAchada: "ainda não marcada", marcar: "Marcar pista", nova: (r: string) => `Nova pista: ${r}`, jaTinha: "Essa pista você já tinha." },
  quadro: {
    titulo: "Quadro de pistas",
    vazio: "Nenhuma pista ainda. Passe a lupa nas páginas.",
    ligar: "Ligar",
    ligarListaTitulo: "Ligar por lista",
    pistaA: "Pista A",
    pistaB: "Pista B",
    escolher: "Escolher…",
    selecionada: (r: string) => `${r} selecionada. Escolha a outra pista.`,
    arraste: "Toque numa pista e depois em outra pra ligar. Também dá pra arrastar de uma até a outra.",
    certa: "Ligação certa",
    naoFecha: "Essa ligação não fecha. Nada se perde: tente outra combinação.",
    iguais: "Escolha duas pistas diferentes.",
    jaFeita: "Você já fez essa ligação.",
    deducoes: "Deduções",
    nenhumaDeducao: "Nenhuma dedução ainda.",
    ligacaoDe: (a: string, b: string) => `${a} ligada a ${b}`,
  },
  pergunta: { titulo: "A pergunta do capítulo", responder: "Responder", escolha: "Escolha uma opção", faltouTitulo: "Ainda falta:", faltouGenerico: "Reveja as deduções do quadro e tente de novo. Nada foi perdido.", resolvida: "Capítulo resolvido!", resolvidaTexto: "Você descobriu o que aconteceu. O selo já está na sua cabine.", resolvidaSemConta: "Crie uma conta pra guardar o selo na sua cabine.", preencha: "Responda as três partes antes de enviar." },
  dicas: { titulo: "Dicas", pedir: "Pedir uma dica", nivel: (n: number) => `Dica ${n} de ${FANZINE.maxDicas}`, acabaram: "Você já usou as três dicas.", aviso: "Dicas não tiram nada de você." },
  erros: { generico: "Algo deu errado. Tenta de novo daqui a pouco.", limite: "Muitas ações seguidas. Tenta de novo daqui a pouco.", capitulo: "Esse capítulo não existe.", pista: "Essa pista não existe nesse capítulo.", semPista: "Você ainda não marcou as duas pistas." },
  cabine: { titulo: "Selos · Fanzine Perdida", abrir: "Ver capítulos", capitulo: (n: number) => `Capítulo ${n}` },
} as const;
