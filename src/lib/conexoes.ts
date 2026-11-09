// Conexões Shinobi: 16 nomes, 4 grupos escondidos (estilo Connections).

export type Grupo = { tema: string; nomes: string[]; nivel: 0 | 1 | 2 | 3 };
export type Puzzle = { grupos: Grupo[] };

export const MAX_ERROS = 4;

// Cada puzzle tem pegadinhas (nomes que caberiam em mais de um grupo),
// mas só uma divisão fecha os quatro.
export const PUZZLES: Puzzle[] = [
  {
    grupos: [
      { tema: "Time 7", nomes: ["Naruto", "Sasuke", "Sakura", "Sai"], nivel: 0 },
      { tema: "Akatsuki", nomes: ["Itachi", "Kisame", "Deidara", "Sasori"], nivel: 1 },
      { tema: "Sabem modo sábio", nomes: ["Jiraiya", "Minato", "Kabuto", "Hashirama"], nivel: 2 },
      { tema: "Usam Sharingan", nomes: ["Shisui", "Fugaku", "Izuna", "Danzo"], nivel: 3 },
    ],
  },
  {
    grupos: [
      { tema: "Time Guy", nomes: ["Neji", "Lee", "Tenten", "Guy"], nivel: 0 },
      { tema: "Hokages", nomes: ["Hashirama", "Tobirama", "Hiruzen", "Tsunade"], nivel: 1 },
      { tema: "Jinchuuriki", nomes: ["Gaara", "Killer Bee", "Kushina", "Yugito"], nivel: 2 },
      { tema: "Alunos do Jiraiya", nomes: ["Nagato", "Yahiko", "Minato", "Naruto"], nivel: 3 },
    ],
  },
  {
    grupos: [
      { tema: "Clã Hyuga", nomes: ["Hinata", "Neji", "Hiashi", "Hanabi"], nivel: 0 },
      { tema: "Time 10", nomes: ["Ino", "Shikamaru", "Choji", "Asuma"], nivel: 1 },
      { tema: "Família do Kazekage", nomes: ["Gaara", "Temari", "Kankuro", "Rasa"], nivel: 2 },
      { tema: "Espadachins da Névoa", nomes: ["Zabuza", "Kisame", "Mangetsu", "Chojuro"], nivel: 3 },
    ],
  },
];

export type Estado = {
  puzzle: number;
  restantes: string[]; // ordem atual na grade
  achados: Grupo[];
  selecao: string[];
  erros: number;
  tentativas: string[]; // chaves já tentadas (não conta erro repetido)
  status: "jogando" | "venceu" | "perdeu";
};

export function embaralhar<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function novoEstado(puzzle: number, rnd?: () => number): Estado {
  const p = PUZZLES[puzzle];
  return {
    puzzle,
    restantes: embaralhar(p.grupos.flatMap((g) => g.nomes), rnd),
    achados: [],
    selecao: [],
    erros: 0,
    tentativas: [],
    status: "jogando",
  };
}

export function alternar(e: Estado, nome: string): Estado {
  if (e.status !== "jogando") return e;
  if (e.selecao.includes(nome)) return { ...e, selecao: e.selecao.filter((n) => n !== nome) };
  if (e.selecao.length >= 4) return e;
  return { ...e, selecao: [...e.selecao, nome] };
}

export type Resultado = "acertou" | "quase" | "errou" | "repetido" | "invalido";

export function enviar(e: Estado): { estado: Estado; resultado: Resultado } {
  if (e.status !== "jogando" || e.selecao.length !== 4) return { estado: e, resultado: "invalido" };
  const chave = [...e.selecao].sort().join("|");
  if (e.tentativas.includes(chave)) return { estado: e, resultado: "repetido" };
  const pendentes = PUZZLES[e.puzzle].grupos.filter((g) => !e.achados.includes(g));
  const certo = pendentes.find((g) => g.nomes.every((n) => e.selecao.includes(n)));
  if (certo) {
    const achados = [...e.achados, certo];
    return {
      resultado: "acertou",
      estado: {
        ...e,
        achados,
        restantes: e.restantes.filter((n) => !certo.nomes.includes(n)),
        selecao: [],
        tentativas: [...e.tentativas, chave],
        status: achados.length === 4 ? "venceu" : "jogando",
      },
    };
  }
  const melhor = Math.max(...pendentes.map((g) => g.nomes.filter((n) => e.selecao.includes(n)).length));
  const erros = e.erros + 1;
  const perdeu = erros >= MAX_ERROS;
  return {
    resultado: melhor === 3 ? "quase" : "errou",
    estado: {
      ...e,
      erros,
      tentativas: [...e.tentativas, chave],
      status: perdeu ? "perdeu" : "jogando",
      // Ao perder, revela o que faltou.
      achados: perdeu ? [...e.achados, ...pendentes] : e.achados,
      restantes: perdeu ? [] : e.restantes,
      selecao: perdeu ? [] : e.selecao,
    },
  };
}
