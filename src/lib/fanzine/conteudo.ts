// Schema do capítulo (zod) e validação de coerência. Puro: não lê arquivo nem banco, então roda em teste e no build.

import { z } from "zod";
import type { Capitulo, VisaoCapitulo } from "./tipos";

const id = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,47}$/, "id em minúsculas, números, _ ou -");
const texto = (max: number) => z.string().trim().min(1).max(max);
const rel = z.number().min(0).max(1);

export const schemaCapitulo = z.object({
  slug: id,
  ordem: z.number().int().min(1),
  titulo: texto(80),
  resumo: texto(300),
  publicadoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data AAAA-MM-DD"),
  selo: z.object({ nome: texto(60), descricao: texto(160) }),
  paginas: z
    .array(z.object({ id, titulo: texto(80), imagem: z.string().regex(/^\/jogos\/fanzine\/[\w./-]+\.(png|jpg|webp|svg)$/), alt: texto(400), mdx: z.string().regex(/^[\w.-]+\.mdx$/), largura: z.number().int().min(100), altura: z.number().int().min(100) }))
    .min(1)
    .max(12),
  pistas: z
    .array(
      z.object({
        id,
        pagina: id,
        area: z.object({ x: rel, y: rel, w: rel.min(0.02), h: rel.min(0.02) }),
        rotulo: texto(60),
        descricao: texto(240),
        texto: texto(400),
      }),
    )
    .min(2)
    .max(30),
  ligacoes: z.array(z.object({ id, pistas: z.tuple([id, id]), texto: texto(400), faltou: texto(200) })).min(1).max(40),
  pergunta: z.object({
    enunciado: texto(200),
    partes: z
      .array(
        z.object({
          id,
          rotulo: texto(60),
          opcoes: z.array(z.object({ id, texto: texto(160) })).min(2).max(6),
          certa: id,
          exige: z.array(id).max(10),
        }),
      )
      .min(1)
      .max(5),
  }),
  dicas: z.tuple([texto(300), texto(300), texto(300)]),
});

const repetidos = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);

/** Erros de coerência do capítulo (lista vazia = ok): pistas, ligações e pergunta têm que se encaixar. */
export function validarCapitulo(cap: Capitulo): string[] {
  const erros: string[] = [];
  const paginas = new Set(cap.paginas.map((p) => p.id));
  const pistas = new Map(cap.pistas.map((p) => [p.id, p]));
  const deducoes = new Map(cap.ligacoes.map((l) => [l.id, l]));

  for (const d of repetidos(cap.paginas.map((p) => p.id))) erros.push(`página repetida: ${d}`);
  for (const d of repetidos(cap.pistas.map((p) => p.id))) erros.push(`pista repetida: ${d}`);
  for (const d of repetidos(cap.ligacoes.map((l) => l.id))) erros.push(`dedução repetida: ${d}`);

  for (const p of cap.pistas) {
    if (!paginas.has(p.pagina)) erros.push(`pista ${p.id}: página ${p.pagina} não existe`);
    if (p.area.x + p.area.w > 1.0001 || p.area.y + p.area.h > 1.0001) erros.push(`pista ${p.id}: área sai da página`);
  }

  const pares = new Set<string>();
  for (const l of cap.ligacoes) {
    const [a, b] = l.pistas;
    if (a === b) erros.push(`ligação ${l.id}: liga a pista a ela mesma`);
    for (const x of l.pistas) if (!pistas.has(x)) erros.push(`ligação ${l.id}: pista ${x} não existe`);
    const par = [a, b].sort().join("|");
    if (pares.has(par)) erros.push(`ligação ${l.id}: par ${par} já tem outra dedução`);
    pares.add(par);
  }

  for (const parte of cap.pergunta.partes) {
    const ops = parte.opcoes.map((o) => o.id);
    for (const d of repetidos(ops)) erros.push(`parte ${parte.id}: opção repetida ${d}`);
    if (!ops.includes(parte.certa)) erros.push(`parte ${parte.id}: resposta certa ${parte.certa} fora das opções`);
    if (parte.exige.length === 0) erros.push(`parte ${parte.id}: a resposta certa não exige nenhuma dedução (dava pra chutar)`);
    for (const d of parte.exige) {
      const lig = deducoes.get(d);
      // Alcançável: a dedução existe e as duas pistas dela existem (e ficam em páginas que existem).
      if (!lig) erros.push(`parte ${parte.id}: exige a dedução ${d}, que não existe`);
      else for (const x of lig.pistas) if (!pistas.has(x)) erros.push(`parte ${parte.id}: a dedução ${d} depende da pista ${x}, que não existe`);
    }
  }
  for (const d of repetidos(cap.pergunta.partes.map((p) => p.id))) erros.push(`parte repetida: ${d}`);
  return erros;
}

/** Valida e devolve o capítulo, ou lança com todos os erros (usado pelo carregador e pelo teste de conteúdo). */
export function lerCapitulo(bruto: unknown): Capitulo {
  const r = schemaCapitulo.safeParse(bruto);
  if (!r.success) throw new Error(`capítulo inválido: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const erros = validarCapitulo(r.data);
  if (erros.length) throw new Error(`capítulo incoerente: ${erros.join("; ")}`);
  return r.data;
}

/** O que pode ir pro navegador: sem ligações, resposta certa, exigências nem dicas. */
export function visaoPublica(cap: Capitulo): VisaoCapitulo {
  return {
    slug: cap.slug,
    ordem: cap.ordem,
    titulo: cap.titulo,
    resumo: cap.resumo,
    selo: cap.selo,
    paginas: cap.paginas,
    pistas: cap.pistas,
    pergunta: { enunciado: cap.pergunta.enunciado, partes: cap.pergunta.partes.map((p) => ({ id: p.id, rotulo: p.rotulo, opcoes: p.opcoes })) },
  };
}

/** Deduções que o capítulo exige pra resolver (união do `exige` de todas as partes). */
export const deducoesExigidas = (cap: Capitulo) => [...new Set(cap.pergunta.partes.flatMap((p) => p.exige))];
