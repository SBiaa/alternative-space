import { CAMINHOS, PARTIDA, SIMBOLOS, TEXTOS } from "./config";
import { dataBR } from "./dia";
import type { Estado } from "./retorno";

// Texto e imagem de compartilhar: só a grade de estrelas, nunca a palavra.

const CODIGO: Record<Estado, string> = { certa: "c", outro: "o", ausente: "a" };
const ESTADO: Record<string, Estado> = { c: "certa", o: "outro", a: "ausente" };

export function textoCompartilhar(args: { dia: string; solved: boolean; retornos: Estado[][]; url: string }): string {
  const t = TEXTOS.compartilhar;
  const resumo = args.solved ? t.resumoAcerto(args.retornos.length, PARTIDA.tentativas) : t.resumoErro(PARTIDA.tentativas);
  const grade = args.retornos.map((linha) => linha.map((e) => SIMBOLOS[e]).join("")).join("\n");
  return `${t.titulo(dataBR(args.dia), resumo)}\n${grade}\n${t.chamada} ${args.url}`;
}

/** Grade em texto curto pra ir na URL da imagem: "cooaa-ccccc". */
export const codificarGrade = (retornos: Estado[][]) => retornos.map((l) => l.map((e) => CODIGO[e]).join("")).join("-");

const GRADE_RE = /^[coa]{5,7}(-[coa]{5,7}){0,5}$/;

export function decodificarGrade(g: unknown): Estado[][] | null {
  if (typeof g !== "string" || !GRADE_RE.test(g)) return null;
  const linhas = g.split("-");
  if (linhas.some((l) => l.length !== linhas[0].length)) return null;
  return linhas.map((l) => [...l].map((c) => ESTADO[c]));
}

export function urlDaImagem(args: { dia: string; solved: boolean; retornos: Estado[][] }): string {
  const q = new URLSearchParams({ g: codificarGrade(args.retornos), d: args.dia, s: args.solved ? "1" : "0" });
  return `${CAMINHOS.imagem}?${q.toString()}`;
}
