// Schema (zod) do conteúdo e do save. Roda nos testes (npm test), que é o "schema no build".

import { z } from "zod";
import { CONFIG } from "./config";
import type { Conteudo } from "./tipos";

const status = z.enum(["encharcado", "firme", "enjoado"]);
const valor = z.number().int().min(1).max(99);

export const efeito = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("dano"), valor, vezes: z.number().int().min(2).max(6).optional() }).strict(),
  z.object({ tipo: z.literal("dano_todos"), valor }).strict(),
  z.object({ tipo: z.literal("bloqueio"), valor }).strict(),
  z.object({ tipo: z.literal("curar"), valor }).strict(),
  z.object({ tipo: z.literal("comprar"), valor: z.number().int().min(1).max(5) }).strict(),
  z.object({ tipo: z.literal("energia"), valor: z.number().int().min(1).max(3) }).strict(),
  z.object({ tipo: z.literal("status"), status, valor: z.number().int().min(1).max(9), em: z.enum(["inimigo", "todos", "si"]).optional() }).strict(),
  z.object({ tipo: z.literal("folego_max"), valor }).strict(),
]);

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const schemaCarta = z
  .object({
    slug,
    nome: z.string().min(2).max(40),
    tipo: z.enum(["ataque", "defesa", "manobra"]),
    custo: z.number().int().min(0).max(3),
    raridade: z.enum(["comum", "incomum", "rara"]),
    exaurir: z.boolean().optional(),
    efeitos: z.array(efeito).min(1).max(4),
    liberacao: z.discriminatedUnion("tipo", [
      z.object({ tipo: z.literal("inicio") }).strict(),
      z.object({ tipo: z.literal("derrotar"), inimigo: slug }).strict(),
      z.object({ tipo: z.literal("trecho"), trecho: z.number().int().min(2).max(CONFIG.trechos) }).strict(),
      z.object({ tipo: z.literal("vitoria_com"), oficio: slug }).strict(),
    ]),
  })
  .strict();

const intencao = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("atacar"), valor, vezes: z.number().int().min(2).max(4).optional() }).strict(),
  z.object({ tipo: z.literal("defender"), valor }).strict(),
  z.object({ tipo: z.literal("status"), status, valor: z.number().int().min(1).max(9) }).strict(),
]);

const inimigo = z
  .object({ slug, nome: z.string().min(2).max(40), icone: z.string().min(2), folego: z.number().int().min(5).max(400), ouro: z.tuple([z.number().int().min(0), z.number().int().min(0)]), ciclo: z.array(intencao).min(2).max(8) })
  .strict();

const gatilho = z.enum(["inicio_combate", "inicio_turno", "fim_combate", "ao_pegar"]);

export const schemaConteudo = {
  cartas: z.object({ cartas: z.array(schemaCarta) }),
  oficios: z.object({
    oficios: z.array(
      z.object({
        id: slug,
        nome: z.string().min(2),
        icone: z.string().min(2),
        descricao: z.string().min(5),
        passiva: z.object({ texto: z.string().min(5), gatilho: gatilho.exclude(["ao_pegar"]), efeitos: z.array(efeito).min(1) }).strict(),
        baralho: z.array(slug).length(10),
      }).strict(),
    ),
  }),
  inimigos: z.object({
    inimigos: z.array(inimigo),
    chefe: inimigo,
    encontros: z.array(z.object({ trecho: z.number().int().min(1).max(CONFIG.trechos), peso: z.number().int().min(1), inimigos: z.array(slug).min(1).max(2) }).strict()),
  }),
  reliquias: z.object({ reliquias: z.array(z.object({ slug, nome: z.string().min(2), icone: z.string().min(2), texto: z.string().min(5), gatilho, efeitos: z.array(efeito).min(1) }).strict()) }),
  eventos: z.object({
    eventos: z.array(
      z.object({
        slug,
        nome: z.string().min(2),
        texto: z.string().min(10),
        escolhas: z
          .array(
            z.object({
              texto: z.string().min(2),
              exige: z.object({ ouro: z.number().int().min(1) }).optional(),
              efeitos: z.array(
                z.discriminatedUnion("tipo", [
                  z.object({ tipo: z.literal("folego"), valor: z.number().int() }),
                  z.object({ tipo: z.literal("ouro"), valor: z.number().int() }),
                  z.object({ tipo: z.literal("carta_aleatoria") }),
                  z.object({ tipo: z.literal("reliquia_aleatoria") }),
                ]),
              ),
            }).strict(),
          )
          .min(1),
      }).strict(),
    ),
  }),
};

/** Confere as referências cruzadas: toda carta, inimigo e ofício citado existe. Devolve a lista de problemas (vazia = ok). */
export function conferirReferencias(C: Conteudo): string[] {
  const erros: string[] = [];
  const slugsUnicos = (nome: string, lista: string[]) => {
    const vistos = new Set<string>();
    for (const s of lista) {
      if (vistos.has(s)) erros.push(`${nome}: slug repetido ${s}`);
      vistos.add(s);
    }
  };
  slugsUnicos("cartas", C.listaCartas.map((c) => c.slug));
  slugsUnicos("relíquias", C.listaReliquias.map((r) => r.slug));
  slugsUnicos("eventos", C.eventos.map((e) => e.slug));
  slugsUnicos("inimigos", [...Object.keys(C.inimigos), C.chefe.slug]);
  for (const o of C.oficios) for (const s of o.baralho) if (!C.cartas[s]) erros.push(`ofício ${o.id}: carta inexistente ${s}`);
  for (const o of C.oficios) for (const s of o.baralho) if (C.cartas[s] && C.cartas[s].liberacao.tipo !== "inicio") erros.push(`ofício ${o.id}: ${s} no baralho inicial, mas não é inicial`);
  for (const c of C.listaCartas) {
    const l = c.liberacao;
    if (l.tipo === "derrotar" && !(C.inimigos[l.inimigo] || l.inimigo === C.chefe.slug)) erros.push(`carta ${c.slug}: inimigo inexistente ${l.inimigo}`);
    if (l.tipo === "vitoria_com" && !C.oficios.some((o) => o.id === l.oficio)) erros.push(`carta ${c.slug}: ofício inexistente ${l.oficio}`);
  }
  for (const en of C.encontros) for (const s of en.inimigos) if (!C.inimigos[s]) erros.push(`encontro: inimigo inexistente ${s}`);
  for (let t = 1; t <= CONFIG.trechos; t++) if (!C.encontros.some((e) => e.trecho === t)) erros.push(`trecho ${t} sem encontros`);
  return erros;
}

// ---- Save local (navegador sem conta) ----
export const schemaSaveLocal = z.object({
  v: z.number().int().min(1),
  seed: z.string().min(1).max(40),
  oficio: z.string().min(1).max(40),
  acoes: z.array(z.unknown()).max(CONFIG.maxAcoes),
});
export type SaveLocal = z.infer<typeof schemaSaveLocal>;
