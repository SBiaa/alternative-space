// Personagem da Mesa de Bolso: criação rápida validada (nome, atributos, talentos, retrato).
import { z } from "zod";
import { ATRIBUTOS, REGRAS, RETRATO, TALENTO_IDS, type AtributoId } from "./config";
import { atributosValidos } from "./regras";

const ids = <T extends readonly { id: string }[]>(l: T) => l.map((x) => x.id) as [string, ...string[]];

export const retratoSchema = z
  .object({
    rosto: z.enum(ids(RETRATO.rosto)),
    cabelo: z.enum(ids(RETRATO.cabelo)),
    acessorio: z.enum(ids(RETRATO.acessorio)),
    pele: z.enum(ids(RETRATO.pele)),
    cabeloCor: z.enum(ids(RETRATO.cabeloCor)),
    roupaCor: z.enum(ids(RETRATO.roupaCor)),
  })
  .strict();

export const personagemSchema = z
  .object({
    nome: z.string().trim().min(1, "Dá um nome pra personagem.").max(REGRAS.nomeMax, `No máximo ${REGRAS.nomeMax} letras.`),
    attrs: z.object({ corpo: z.number(), mente: z.number(), labia: z.number() }).strict(),
    talentos: z.array(z.enum(TALENTO_IDS as [string, ...string[]])).length(REGRAS.talentosEscolhidos, `Escolha ${REGRAS.talentosEscolhidos} talentos.`),
    retrato: retratoSchema,
  })
  .strict()
  .refine((p) => new Set(p.talentos).size === p.talentos.length, { message: "Talentos repetidos.", path: ["talentos"] })
  .refine((p) => atributosValidos(p.attrs), {
    message: `Cada atributo vai de ${REGRAS.atributoMin} a ${REGRAS.atributoMax}, somando ${REGRAS.atributoPontos}.`,
    path: ["attrs"],
  });

export type Personagem = z.infer<typeof personagemSchema>;
export type PersonagemSalva = Personagem & { id: string };

export function personagemPadrao(): Personagem {
  return {
    nome: "",
    attrs: { corpo: 2, mente: 3, labia: 2 } satisfies Record<AtributoId, number>,
    talentos: [],
    retrato: {
      rosto: RETRATO.rosto[0].id,
      cabelo: RETRATO.cabelo[0].id,
      acessorio: RETRATO.acessorio[0].id,
      pele: RETRATO.pele[0].id,
      cabeloCor: RETRATO.cabeloCor[0].id,
      roupaCor: RETRATO.roupaCor[0].id,
    },
  };
}

export const nomeDoAtributo = (id: AtributoId) => ATRIBUTOS.find((a) => a.id === id)?.nome ?? id;
