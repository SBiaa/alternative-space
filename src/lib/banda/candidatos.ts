// Candidatos a integrante e montagem da banda. Tudo sai da seed: o servidor refaz os mesmos candidatos
// e não confia no que o navegador diz sobre eles.

import { hash, sortear } from "../gestao/rng";
import { BANDA, ESTILOS, MANIAS, PAPEIS } from "./config";
import { NOMES_CANDIDATOS } from "./conteudo";
import type { Candidato, Integrante, Montagem, Papel, Progresso } from "./tipos";

const inteiro = (seed: string, rotulo: string, min: number, max: number) => min + Math.floor(sortear(seed, 0, rotulo) * (max - min + 1));

/** Nomes embaralhados pela seed: uma permutação, então dois candidatos nunca repetem o nome. */
function nomesEmbaralhados(seed: string): string[] {
  return [...NOMES_CANDIDATOS].sort((a, b) => hash(`${seed}|${a}`) - hash(`${seed}|${b}`) || a.localeCompare(b));
}

/** `offset` desloca na lista de nomes (candidatos da banda e substitutos não repetem nome). */
export function gerarCandidatos(seed: string, papel: Papel, n: number = BANDA.candidatosPorPapel, offset = 0): Candidato[] {
  const nomes = nomesEmbaralhados(seed);
  const base = PAPEIS.indexOf(papel) * BANDA.candidatosPorPapel;
  const { min, max, humorMin, humorMax } = BANDA.candidato;
  return Array.from({ length: n }, (_, i) => {
    const k = `${papel}:${i}:${offset}`;
    const destaque = inteiro(seed, `${k}:destaque`, 0, 2);
    const atributo = (campo: number, rotulo: string) => Math.min(100, inteiro(seed, `${k}:${rotulo}`, min, max) + (destaque === campo ? 10 : 0));
    return {
      id: `${papel}-${offset}-${i}`,
      nome: nomes[(base + i + offset * 3) % nomes.length],
      papel,
      tecnica: atributo(0, "tecnica"),
      presenca: atributo(1, "presenca"),
      criatividade: atributo(2, "criatividade"),
      humor: inteiro(seed, `${k}:humor`, humorMin, humorMax),
      mania: MANIAS[inteiro(seed, `${k}:mania`, 0, MANIAS.length - 1)].id,
      silhueta: inteiro(seed, `${k}:silhueta`, 0, BANDA.silhuetas - 1),
    };
  });
}

export const comoIntegrante = (c: Candidato): Integrante => ({ ...c, cansaco: 0, avisoSemana: null });

const corValida = (c: string) => (BANDA.logo.cores as readonly string[]).includes(c);

/** Valida a montagem (nome, estilo, logo e os quatro escolhidos entre os candidatos da seed) e devolve a banda nova. */
export function novaBanda(seed: string, m: Montagem): Progresso | null {
  const nome = typeof m?.nome === "string" ? m.nome.trim().replace(/\s+/g, " ") : "";
  if (typeof seed !== "string" || seed.length < 1 || seed.length > 40) return null;
  if (nome.length < 1 || nome.length > BANDA.nomeMax || /[\u0000-\u001f]/.test(nome)) return null;
  if (!ESTILOS.some((e) => e.id === m.estilo)) return null;
  const logo = m.logo;
  if (!logo || !(BANDA.logo.formas as readonly string[]).includes(logo.forma) || !corValida(logo.corFundo) || !corValida(logo.corForma)) return null;
  const membros: Integrante[] = [];
  for (const papel of PAPEIS) {
    const c = gerarCandidatos(seed, papel).find((x) => x.id === m.escolhidos?.[papel]);
    if (!c) return null;
    membros.push(comoIntegrante(c));
  }
  return {
    v: BANDA.versaoSave,
    nome,
    estilo: m.estilo,
    logo: { forma: logo.forma, corFundo: logo.corFundo, corForma: logo.corForma },
    dinheiro: BANDA.dinheiroInicial,
    fama: BANDA.famaInicial,
    entrosamento: BANDA.entrosamentoInicial,
    semana: 1,
    dia: 0,
    agenda: [],
    divulgacao: 0,
    demo: false,
    seed,
    membros,
    equipamento: { instrumentos: BANDA.equipamentoInicial, amplificador: BANDA.equipamentoInicial, cabos: BANDA.equipamentoInicial },
    musicas: [],
    shows: [],
  };
}
