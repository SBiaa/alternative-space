// Números do Riff Estelar. Nada disso fica fixo nos componentes.

export const DIFICULDADES = ["facil", "medio", "dificil"] as const;
export type Dificuldade = (typeof DIFICULDADES)[number];
export const NOME_DIFICULDADE: Record<Dificuldade, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
export const ehDificuldade = (v: unknown): v is Dificuldade => DIFICULDADES.includes(v as Dificuldade);

export const TRILHAS = 4;

export const RIFF = {
  // Distância máxima (ms) entre o toque e a nota, já com o offset aplicado.
  janelas: { perfeito: 50, boa: 100 },
  pontos: { perfeito: 100, boa: 50 },
  // Multiplicador pelo número de acertos seguidos (contando o acerto atual). Do maior pro menor.
  combo: [
    { de: 30, x: 4 },
    { de: 20, x: 3 },
    { de: 10, x: 2 },
  ],
  energia: { porPerfeito: 0.05, duracaoMs: 8000, multiplicador: 2 },
  // Contagem 3-2-1 antes da primeira batida, medida no relógio do áudio.
  contagemS: 3,
  // Quanto tempo (ms) a nota leva pra cair do topo até o anel, na velocidade 1.
  quedaMs: 1700,
  velocidades: [0.75, 1, 1.25, 1.5],
  teclasPadrao: ["d", "f", "j", "k"],
  offsetLimiteMs: 300,
  // Precisão mínima (%) pra cada número de estrelas, do maior pro menor.
  estrelas: [
    { min: 95, n: 5 },
    { min: 85, n: 4 },
    { min: 70, n: 3 },
    { min: 50, n: 2 },
  ],
  calibracao: { batidas: 16, intervaloMs: 500, descartarAcimaMs: 80, minimoToques: 6 },
} as const;
