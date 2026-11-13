// Puzzles dos minigames (lógica pura). O sorteio vem de uma função rand() do motor, então é reproduzível pela seed.
// O motor guarda o puzzle no estado e confere a resposta: a interface só mostra e devolve o que o jogador escolheu.

import { CORRE } from "./config";

export type PuzzleColeta = {
  tipo: "coleta";
  nota: string[]; // o que o cliente pediu
  sacola: (string | null)[]; // o que foi colocado (null = faltando)
  erro: number; // posição errada na sacola, ou -1 se está tudo certo
};
export type Porta = { casa: string; portao: string; numero: number };
export type PuzzleEntrega = {
  tipo: "entrega";
  portas: Porta[];
  pista: { casa: string; portao: string; paridade: "par" | "ímpar" };
  correta: number;
  erradas: number[]; // portas já tentadas
};
export type Puzzle = PuzzleColeta | PuzzleEntrega;
export type ResultadoMinigame = "perfeito" | "ok" | "erro" | "pulou";

type Rand = () => number;
const pick = <T,>(lista: readonly T[], r: Rand): T => lista[Math.floor(r() * lista.length)];
const nivelDe = (cansaco: number) => (cansaco > CORRE.minigames.nivelCansaco ? 1 : 0);

export function gerarColeta(rand: Rand, cansaco: number): PuzzleColeta {
  const c = CORRE.minigames.coleta;
  const qtd = c.quantidade[nivelDe(cansaco)];
  // Embaralha (Fisher–Yates) e pega os primeiros.
  const itens = [...c.itens];
  for (let i = itens.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [itens[i], itens[j]] = [itens[j], itens[i]];
  }
  const escolhidos = itens.slice(0, qtd);
  const nota = escolhidos.map((i) => i.nome);
  const sacola: (string | null)[] = [...nota];
  let erro = -1;
  if (rand() < c.chanceErro) {
    erro = Math.floor(rand() * qtd);
    sacola[erro] = rand() < 0.5 ? null : escolhidos[erro].troca;
  }
  return { tipo: "coleta", nota, sacola, erro };
}

export function gerarEntrega(rand: Rand, cansaco: number): PuzzleEntrega {
  const c = CORRE.minigames.entrega;
  const n = c.portas[nivelDe(cansaco)];
  const correta = Math.floor(rand() * n);
  const alvo: Porta = { casa: pick(c.casas, rand), portao: pick(c.portoes, rand), numero: 1 + Math.floor(rand() * 98) };
  const pista = { casa: alvo.casa, portao: alvo.portao, paridade: (alvo.numero % 2 === 0 ? "par" : "ímpar") as "par" | "ímpar" };
  const usados = new Set<number>([alvo.numero]);
  const portas: Porta[] = [];
  for (let i = 0; i < n; i++) {
    if (i === correta) {
      portas.push(alvo);
      continue;
    }
    let numero = 1 + Math.floor(rand() * 98);
    while (usados.has(numero)) numero = (numero % 98) + 1;
    usados.add(numero);
    const casa = pick(c.casas, rand);
    let portao = pick(c.portoes, rand);
    // Nenhuma outra porta pode bater com a pista inteira.
    if (casa === pista.casa && portao === pista.portao && (numero % 2 === 0) === (pista.paridade === "par")) {
      portao = c.portoes[(c.portoes.indexOf(portao) + 1) % c.portoes.length];
    }
    portas.push({ casa, portao, numero });
  }
  return { tipo: "entrega", portas, pista, correta, erradas: [] };
}

/** Quantos candidatos batem com a pista? Tem que ser exatamente 1. */
export function candidatas(p: PuzzleEntrega): number[] {
  return p.portas.flatMap((d, i) =>
    d.casa === p.pista.casa && d.portao === p.pista.portao && (d.numero % 2 === 0 ? "par" : "ímpar") === p.pista.paridade ? [i] : [],
  );
}
