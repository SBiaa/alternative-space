import "server-only";
import { lerCasosDe, visiveis } from "./conteudo";
import type { Caso, Publico } from "./schema";

// Só o servidor enxerga o caso inteiro (com gabarito). Pro navegador vai apenas `publicoDe`.

let cache: Caso[] | null = null;
const todos = () => (cache ??= lerCasosDe());

export const casosVisiveis = () => visiveis(todos());
export const acharCaso = (slug: string): Caso | undefined => casosVisiveis().find((c) => c.publico.slug === slug);
export const publicoDe = (c: Caso): Publico => c.publico;
export const casoDaCriatura = (criatura: string) => casosVisiveis().find((c) => c.gabarito.criatura === criatura);

/** Quantas criaturas existem no Bestiário (uma por caso visível). */
export const totalCriaturas = () => new Set(casosVisiveis().map((c) => c.gabarito.criatura)).size;
