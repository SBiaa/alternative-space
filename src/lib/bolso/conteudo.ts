// Formato das aventuras (content/mesa-de-bolso/*.json), schema zod e validação do grafo de cenas.
import { z } from "zod";
import { ATRIBUTO_IDS, REGRAS, TALENTO_IDS } from "./config";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "use minúsculas, números e hífen");
const texto = z.string().min(1);

const efeito = z
  .object({
    folego: z.number().int().min(-REGRAS.folegoInicial).max(REGRAS.folegoInicial).optional(),
    itens: z.array(id).optional(),
    marcas: z.array(id).optional(),
    flags: z.array(id).optional(),
  })
  .strict();

export const requisito = z
  .object({ item: id.optional(), marca: id.optional(), flag: id.optional() })
  .strict()
  .refine((r) => Object.keys(r).length > 0, "requisito vazio");

export const opcaoSchema = z
  .object({
    id,
    texto,
    requisito: requisito.optional(),
    teste: z
      .object({
        atributo: z.enum(ATRIBUTO_IDS),
        dificuldade: z.number().int().min(REGRAS.dificuldadeMin).max(REGRAS.dificuldadeMax),
        talentos: z.array(z.enum(TALENTO_IDS as [string, ...string[]])).optional(),
      })
      .strict()
      .optional(),
    efeitos: z.object({ sucesso: efeito.optional(), custo: efeito.optional(), falha: efeito.optional() }).strict().optional(),
    proxima: id,
    // Quando o teste não dá sucesso, a história pode seguir por outra cena.
    desvios: z.object({ custo: id.optional(), falha: id.optional() }).strict().optional(),
  })
  .strict();

export const finalSchema = z
  .object({
    id,
    titulo: texto,
    tipo: z.enum(["bom", "custo", "alternativo"]),
    resumo: texto,
  })
  .strict();

export const cenaSchema = z
  .object({
    id,
    // MDX curto: parágrafos, ênfase e listas.
    texto,
    opcoes: z.array(opcaoSchema),
    final: finalSchema.optional(),
  })
  .strict();

const catalogo = z.array(z.object({ id, nome: texto, descricao: texto }).strict());

export const aventuraSchema = z
  .object({
    slug: id,
    titulo: texto,
    tema: z.enum(["fantasia", "cidade-noturna"]),
    resumo: texto,
    duracaoMin: z.number().int().min(5).max(60),
    classificacao: texto,
    inicio: id,
    // Cena do final alternativo, pra onde o Fôlego zerado leva.
    finalFolego: id,
    folegoInicial: z.number().int().min(1).max(12).optional(),
    itens: catalogo,
    marcas: catalogo,
    cenas: z.array(cenaSchema).min(2),
  })
  .strict();

export type Aventura = z.infer<typeof aventuraSchema>;
export type Cena = z.infer<typeof cenaSchema>;
export type Opcao = z.infer<typeof opcaoSchema>;
export type Efeito = z.infer<typeof efeito>;
export type Final = z.infer<typeof finalSchema>;

/** Todas as cenas pra onde uma opção pode levar. */
export const destinos = (o: Opcao): string[] => [o.proxima, ...(o.desvios ? Object.values(o.desvios).filter((x): x is string => !!x) : [])];

/**
 * Confere o grafo: schema, ids repetidos, saídas quebradas, cena inalcançável, cena sem saída,
 * item/marca que não existe e todo caminho chegando a um final. Devolve a lista de problemas (vazia = ok).
 */
export function validarAventura(bruta: unknown): { problemas: string[]; aventura?: Aventura } {
  const r = aventuraSchema.safeParse(bruta);
  if (!r.success) return { problemas: r.error.issues.map((i) => `schema: ${i.path.join(".")}: ${i.message}`) };
  const a = r.data;
  const problemas: string[] = [];

  const porId = new Map<string, Cena>();
  for (const c of a.cenas) {
    if (porId.has(c.id)) problemas.push(`cena repetida: ${c.id}`);
    porId.set(c.id, c);
  }
  const itens = new Set(a.itens.map((x) => x.id));
  const marcas = new Set(a.marcas.map((x) => x.id));

  if (!porId.has(a.inicio)) problemas.push(`inicio aponta pra cena que não existe: ${a.inicio}`);
  const fim = porId.get(a.finalFolego);
  if (!fim) problemas.push(`finalFolego aponta pra cena que não existe: ${a.finalFolego}`);
  else if (!fim.final) problemas.push(`finalFolego (${a.finalFolego}) não é uma cena final`);

  const finaisIds = new Set<string>();
  for (const c of a.cenas) {
    if (c.final) {
      if (finaisIds.has(c.final.id)) problemas.push(`final repetido: ${c.final.id}`);
      finaisIds.add(c.final.id);
      if (c.opcoes.length) problemas.push(`cena final com opções: ${c.id}`);
    } else if (!c.opcoes.length) {
      problemas.push(`cena sem saída e sem final: ${c.id}`);
    }
    const opIds = new Set<string>();
    for (const o of c.opcoes) {
      if (opIds.has(o.id)) problemas.push(`opção repetida em ${c.id}: ${o.id}`);
      opIds.add(o.id);
      for (const d of destinos(o)) if (!porId.has(d)) problemas.push(`saída quebrada: ${c.id}/${o.id} → ${d}`);
      if (o.desvios && !o.teste) problemas.push(`desvios sem teste: ${c.id}/${o.id}`);
      if (o.requisito?.item && !itens.has(o.requisito.item)) problemas.push(`requisito com item desconhecido: ${c.id}/${o.id}`);
      if (o.requisito?.marca && !marcas.has(o.requisito.marca)) problemas.push(`requisito com marca desconhecida: ${c.id}/${o.id}`);
      for (const f of Object.values(o.efeitos ?? {})) {
        for (const i of f?.itens ?? []) if (!itens.has(i)) problemas.push(`item desconhecido: ${c.id}/${o.id} → ${i}`);
        for (const m of f?.marcas ?? []) if (!marcas.has(m)) problemas.push(`marca desconhecida: ${c.id}/${o.id} → ${m}`);
      }
    }
  }

  // Alcançável a partir do início.
  const vistas = new Set<string>();
  const pilha = porId.has(a.inicio) ? [a.inicio] : [];
  while (pilha.length) {
    const atual = pilha.pop()!;
    if (vistas.has(atual)) continue;
    vistas.add(atual);
    for (const o of porId.get(atual)?.opcoes ?? []) for (const d of destinos(o)) if (porId.has(d)) pilha.push(d);
  }
  // O final do Fôlego é alcançado pela regra, não por uma opção.
  vistas.add(a.finalFolego);
  for (const c of a.cenas) if (!vistas.has(c.id)) problemas.push(`cena inalcançável: ${c.id}`);

  // Todo caminho chega a um final: de toda cena alcançável tem que dar pra chegar a alguma cena final.
  const chegaAoFinal = new Set<string>(a.cenas.filter((c) => c.final).map((c) => c.id));
  let mudou = true;
  const podeChegar = chegaAoFinal;
  while (mudou) {
    mudou = false;
    for (const c of a.cenas) {
      if (podeChegar.has(c.id)) continue;
      if (c.opcoes.some((o) => destinos(o).some((d) => podeChegar.has(d)))) {
        podeChegar.add(c.id);
        mudou = true;
      }
    }
  }
  for (const c of a.cenas) if (vistas.has(c.id) && !podeChegar.has(c.id)) problemas.push(`caminho sem final a partir de: ${c.id}`);

  return { problemas, aventura: problemas.length ? undefined : a };
}
