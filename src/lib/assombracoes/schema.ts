// Formato dos casos (content/assombracoes/casos/*.json) e a conferência de que cada caso é jogável.
// Lógica pura: roda no build/teste e no servidor, sem tela e sem banco.

import { z } from "zod";
import { LUGAR_IDS, TIPOS_SINAL } from "./config";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/);
const texto = z.string().min(1).max(1200);
const curto = z.string().min(1).max(160);

const fala = z.object({
  id,
  pergunta: curto,
  resposta: texto,
  // Só aparece depois de coletar estes sinais / depois de fazer esta pergunta.
  requer: z.array(id).max(8).default([]),
  depoisDe: id.optional(),
  // O que a resposta rende pro caderno.
  sinais: z.array(id).max(4).default([]),
  depoimento: z.string().min(1).max(300).optional(),
});

const morador = z.object({
  id,
  nome: curto,
  papel: curto,
  lugar: z.enum(LUGAR_IDS),
  falas: z.array(fala).min(1).max(8),
});

const sinal = z.object({
  id,
  tipo: z.enum(TIPOS_SINAL),
  nome: curto,
  texto,
  lugar: z.enum(LUGAR_IDS),
  // Só dá pra perceber depois de coletar estes sinais.
  requer: z.array(id).max(8).default([]),
});

const opcao = z.object({ id, texto: curto });

export const schemaPublico = z.object({
  slug: id,
  titulo: curto,
  resumo: texto,
  lugarPrincipal: z.enum(LUGAR_IDS),
  abertura: texto,
  // Quantos sinais coletar antes de poder decidir.
  minSinais: z.number().int().min(1).max(20),
  moradores: z.array(morador).min(2).max(8),
  sinais: z.array(sinal).min(4).max(20),
  criaturas: z.array(z.object({ slug: id, nome: curto })).min(3).max(8),
  motivos: z.array(opcao).min(3).max(6),
  encontro: z.object({ cena: texto, opcoes: z.array(opcao).min(3).max(6) }),
});

const dicas = z.array(texto).min(1).max(4);

export const schemaGabarito = z.object({
  criatura: id,
  motivo: id,
  escolha: id,
  // Quanto cada sinal aponta pra cada criatura (0 a 3).
  pesos: z.record(id, z.record(id, z.number().int().min(0).max(3))),
  // Falas ou sinais que deixam o motivo dedutível (basta um).
  motivoPistas: z.array(id).min(1).max(8),
  // Dica da tentativa errada n (a última vale pras seguintes).
  dicas: z.object({ criatura: dicas, motivo: dicas, escolha: dicas }),
  desfecho: z.array(texto).min(1).max(6),
  bestiario: z.object({ resumo: texto }),
  origem: z.object({
    titulo: curto,
    texto: z.array(texto).min(1).max(6),
    fontes: z.array(z.object({ titulo: curto, autor: curto.optional(), ano: z.number().int().optional(), nota: z.string().max(300).optional() })).max(8),
    // null = ainda sem revisão: o caso não pode ser publicado.
    revisao: z.object({ por: curto, data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).nullable(),
  }),
});

export const schemaCaso = z.object({
  status: z.enum(["rascunho", "publicado"]),
  publico: schemaPublico,
  gabarito: schemaGabarito,
});

export type Publico = z.infer<typeof schemaPublico>;
export type Gabarito = z.infer<typeof schemaGabarito>;
export type Caso = z.infer<typeof schemaCaso>;
export type Sinal = Publico["sinais"][number];
export type Fala = Publico["moradores"][number]["falas"][number];

/** Tudo o que dá pra coletar e quais falas rendem o quê, seguindo as travas até não crescer mais. */
export function alcancaveis(p: Publico): { sinais: Set<string>; falas: Set<string> } {
  const sinais = new Set<string>();
  const falas = new Set<string>();
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const s of p.sinais) {
      if (!sinais.has(s.id) && s.requer.every((r) => sinais.has(r))) {
        sinais.add(s.id);
        mudou = true;
      }
    }
    for (const m of p.moradores)
      for (const f of m.falas) {
        if (falas.has(f.id)) continue;
        if (!f.requer.every((r) => sinais.has(r))) continue;
        if (f.depoisDe && !falas.has(f.depoisDe)) continue;
        falas.add(f.id);
        for (const s of f.sinais) if (!sinais.has(s)) sinais.add(s);
        mudou = true;
      }
  }
  return { sinais, falas };
}

/** Problemas do caso, em texto. Lista vazia = o caso é jogável e dedutível. */
export function problemasDoCaso(c: Caso): string[] {
  const { publico: p, gabarito: g } = c;
  const erros: string[] = [];
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  const dup = (nome: string, xs: string[]) => {
    if (new Set(xs).size !== xs.length) erros.push(`${nome}: ids repetidos`);
  };
  const todasFalas = p.moradores.flatMap((m) => m.falas);
  dup("sinais", ids(p.sinais));
  dup("falas", ids(todasFalas));
  dup("moradores", ids(p.moradores));
  dup("motivos", ids(p.motivos));
  dup("opções do encontro", ids(p.encontro.opcoes));
  dup("criaturas", p.criaturas.map((x) => x.slug));

  const idsSinais = new Set(ids(p.sinais));
  const idsFalas = new Set(ids(todasFalas));
  for (const s of p.sinais) for (const r of s.requer) if (!idsSinais.has(r)) erros.push(`sinal ${s.id}: requer ${r} que não existe`);
  for (const f of todasFalas) {
    for (const r of f.requer) if (!idsSinais.has(r)) erros.push(`fala ${f.id}: requer ${r} que não existe`);
    for (const s of f.sinais) if (!idsSinais.has(s)) erros.push(`fala ${f.id}: rende ${s} que não existe`);
    if (f.depoisDe && !idsFalas.has(f.depoisDe)) erros.push(`fala ${f.id}: depoisDe ${f.depoisDe} não existe`);
  }

  if (!p.criaturas.some((x) => x.slug === g.criatura)) erros.push("criatura certa fora das opções");
  if (!p.motivos.some((x) => x.id === g.motivo)) erros.push("motivo certo fora das opções");
  if (!p.encontro.opcoes.some((x) => x.id === g.escolha)) erros.push("escolha certa fora das opções do encontro");
  for (const k of Object.keys(g.pesos)) if (!idsSinais.has(k)) erros.push(`pesos: sinal ${k} não existe`);
  for (const w of Object.values(g.pesos)) for (const k of Object.keys(w)) if (!p.criaturas.some((x) => x.slug === k)) erros.push(`pesos: criatura ${k} fora das opções`);
  for (const m of g.motivoPistas) if (!idsSinais.has(m) && !idsFalas.has(m)) erros.push(`motivoPistas: ${m} não existe`);

  // Todo sinal alcançável.
  const alc = alcancaveis(p);
  for (const s of p.sinais) if (!alc.sinais.has(s.id)) erros.push(`sinal ${s.id}: inalcançável`);
  for (const f of todasFalas) if (!alc.falas.has(f.id)) erros.push(`fala ${f.id}: inalcançável`);
  if (p.minSinais > alc.sinais.size) erros.push("minSinais maior que os sinais alcançáveis");

  // Resposta dedutível: a criatura certa lidera sozinha, apoiada por pelo menos 2 tipos de sinal.
  const total: Record<string, number> = {};
  const tiposDaCerta = new Set<string>();
  for (const s of p.sinais) {
    const w = g.pesos[s.id] ?? {};
    for (const [k, v] of Object.entries(w)) total[k] = (total[k] ?? 0) + v;
    if ((w[g.criatura] ?? 0) > 0) tiposDaCerta.add(s.tipo);
  }
  const certa = total[g.criatura] ?? 0;
  for (const x of p.criaturas) if (x.slug !== g.criatura && (total[x.slug] ?? 0) >= certa) erros.push(`criatura ${x.slug} empata ou lidera: o caso não é dedutível`);
  if (tiposDaCerta.size < 2) erros.push("a criatura certa precisa de pelo menos 2 tipos de sinal apontando pra ela");
  if (!g.motivoPistas.some((m) => alc.sinais.has(m) || alc.falas.has(m))) erros.push("nenhuma pista do motivo é alcançável");

  if (c.status === "publicado") {
    if (!g.origem.revisao) erros.push("publicado sem revisão do cartão de origem");
    if (g.origem.fontes.length < 2) erros.push("publicado com menos de 2 fontes");
  }
  return erros;
}

/** O que o navegador pode receber: nunca o gabarito. */
export function parteDoNavegador(c: Caso): Publico {
  return c.publico;
}
