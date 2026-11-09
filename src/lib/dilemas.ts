// Dilemas Shinobi: perguntas "o que você faria?". Os votos ficam na tabela dilema_votos (db/dilemas.sql).
// O id de cada dilema é fixo: mudar o id zera os votos dele. Pode mexer no texto à vontade.

export type Dilema = { id: string; pergunta: string; opcoes: [string, string, ...string[]] };

export const DILEMAS: Dilema[] = [
  {
    id: "itachi-ordem",
    pergunta: "Você recebe a mesma ordem que o Itachi recebeu: eliminar o próprio clã pra evitar uma guerra. O que você faz?",
    opcoes: ["Cumpro a ordem, a vila vem primeiro", "Recuso e aviso o clã", "Fujo com a família e largo tudo"],
  },
  {
    id: "sasuke-volta",
    pergunta: "Seu melhor amigo foge da vila atrás de poder. Você é o único que alcança ele.",
    opcoes: ["Trago à força, nem que quebre os ossos", "Deixo ir, a escolha é dele", "Vou junto pra cuidar dele de perto"],
  },
  {
    id: "kakashi-regra",
    pergunta: "Missão em andamento, e um colega do time é capturado. Seguir a missão ou voltar por ele?",
    opcoes: ["Volto pelo colega", "Termino a missão primeiro"],
  },
  {
    id: "kyuubi-poder",
    pergunta: "Te oferecem o chakra da Kyuubi, mas a vila inteira vai te olhar torto pra sempre.",
    opcoes: ["Aceito, poder é poder", "Recuso, quero ser aceito"],
  },
  {
    id: "time-escolha",
    pergunta: "Você pode escolher seu sensei. Quem?",
    opcoes: ["Kakashi", "Jiraiya", "Tsunade", "Guy"],
  },
  {
    id: "edo-tensei",
    pergunta: "Um jutsu traz de volta alguém que você perdeu, mas só por um dia e com a alma presa. Você usa?",
    opcoes: ["Uso, só pra me despedir", "Não, deixo descansar"],
  },
  {
    id: "hokage-ou-paz",
    pergunta: "Virar Hokage ou viver em paz numa vila pequena, sem ninguém saber seu nome?",
    opcoes: ["Hokage, quero ser reconhecido", "Paz e anonimato"],
  },
  {
    id: "pain-dor",
    pergunta: "O Pain diz que só a dor ensina a paz. Ele tem um pouco de razão?",
    opcoes: ["Tem, infelizmente", "Não, isso é desculpa pra violência", "Depende de quem sofre"],
  },
];

export const dilemaValido = (id: unknown, opcao: unknown): boolean => {
  const d = DILEMAS.find((x) => x.id === id);
  return !!d && Number.isInteger(opcao) && (opcao as number) >= 0 && (opcao as number) < d.opcoes.length;
};

export type Placar = { total: number; contagem: number[] };

// Porcentagens que somam 100 (maior resto leva o ponto que sobra). Sem votos, tudo zero.
export function porcentagens(contagem: number[]): number[] {
  const total = contagem.reduce((a, b) => a + b, 0);
  if (total === 0) return contagem.map(() => 0);
  const brutas = contagem.map((c) => (c * 100) / total);
  const base = brutas.map(Math.floor);
  let falta = 100 - base.reduce((a, b) => a + b, 0);
  const ordem = brutas.map((b, i) => [b - Math.floor(b), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of ordem) {
    if (falta-- <= 0) break;
    base[i]++;
  }
  return base;
}

// Só mostra número quando alguém além de você votou. Seu voto (se contou) sai da conta pra decidir isso.
export function temOutrosVotos(placar: Placar, meuVotoContou: boolean): boolean {
  return placar.total - (meuVotoContou ? 1 : 0) > 0;
}
