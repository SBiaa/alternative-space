import { PARTIDA } from "./config";
import { retornoPorLetra, type Estado } from "./retorno";

// Regras da partida em TypeScript puro. O servidor chama estas funções; o navegador só recebe a visão pública.

/** Tira acento e põe em maiúsculas. Só A-Z entram no jogo. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}

export const palavraValida = (p: string) => /^[A-Z]+$/.test(p) && PARTIDA.tamanhos.includes(p.length);

export type Partida = {
  palpites: string[];
  retornos: Estado[][];
  solved: boolean;
  finalizada: boolean;
};

/**
 * Reconstrói a partida a partir dos palpites guardados. Para no primeiro palpite que não vale
 * (tamanho errado, fora da lista) e depois de acertar ou de esgotar as tentativas.
 */
export function avaliarPartida(resposta: string, palpites: readonly string[], validas: ReadonlySet<string>): Partida {
  const aceitos: string[] = [];
  const retornos: Estado[][] = [];
  let solved = false;
  for (const bruto of palpites) {
    if (solved || aceitos.length >= PARTIDA.tentativas) break;
    const p = normalizar(bruto);
    if (p.length !== resposta.length || (p !== resposta && !validas.has(p))) break;
    aceitos.push(p);
    retornos.push(retornoPorLetra(resposta, p));
    solved = p === resposta;
  }
  return { palpites: aceitos, retornos, solved, finalizada: solved || aceitos.length >= PARTIDA.tentativas };
}

export type ErroPalpite = "tamanho" | "invalida" | "finalizada";
export type ResultadoPalpite = { ok: true; partida: Partida } | { ok: false; erro: ErroPalpite };

/** Confere um palpite novo em cima dos anteriores. */
export function processarPalpite(args: {
  resposta: string;
  validas: ReadonlySet<string>;
  anteriores: readonly string[];
  palpite: string;
}): ResultadoPalpite {
  const { resposta, validas, anteriores } = args;
  const atual = avaliarPartida(resposta, anteriores, validas);
  if (atual.finalizada) return { ok: false, erro: "finalizada" };
  const p = normalizar(args.palpite);
  if (p.length !== resposta.length) return { ok: false, erro: "tamanho" };
  if (p !== resposta && !validas.has(p)) return { ok: false, erro: "invalida" };
  return { ok: true, partida: avaliarPartida(resposta, [...atual.palpites, p], validas) };
}

/** O que o navegador pode ver. A resposta só aparece quando a partida acabou. */
export type VisaoPartida = {
  palpites: string[];
  retornos: Estado[][];
  solved: boolean;
  finalizada: boolean;
  tentativas: number;
  resposta: string | null;
};

export function visaoPublica(resposta: string, p: Partida): VisaoPartida {
  return {
    palpites: p.palpites,
    retornos: p.retornos,
    solved: p.solved,
    finalizada: p.finalizada,
    tentativas: p.palpites.length,
    resposta: p.finalizada ? resposta : null,
  };
}
