// Catálogo de talentos e magias com descrição. Na ficha, talentos e magias são texto livre;
// o catálogo serve pra buscar, preencher o nome e mostrar o que cada um faz.
import { MAGIAS } from "./dados/magias";
import { TALENTOS } from "./dados/talentos";
import type { Magia, Talento, Tradicao } from "./tipos";

type TipoTalento = Talento["tipo"];

const chave = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s*\(.*?\)\s*/g, " ").trim();

// Aceita o nome em português, o nome com o original entre parênteses ou só o original.
function indice<T extends { nome: string }>(xs: T[]) {
  const m = new Map<string, T>();
  for (const x of xs) {
    m.set(chave(x.nome), x);
    const original = x.nome.match(/\(([^)]+)\)/)?.[1];
    if (original) m.set(chave(original), x);
  }
  return m;
}
const TALENTO_POR_NOME = indice(TALENTOS);
const MAGIA_POR_NOME = indice(MAGIAS);

export const acharTalentoPorNome = (nome: string) => (nome.trim() ? TALENTO_POR_NOME.get(chave(nome)) : undefined);
export const acharMagiaPorNome = (nome: string) => (nome.trim() ? MAGIA_POR_NOME.get(chave(nome)) : undefined);

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR");

// Talentos que cabem numa vaga. Vaga geral aceita talento de perícia também.
export function talentosDaVaga(tipo: TipoTalento, nivel: number, ancestralidade: string, classe: string): Talento[] {
  return TALENTOS.filter((t) => {
    if (t.tipo !== tipo && !(tipo === "geral" && t.tipo === "pericia")) return false;
    if (t.nivel > nivel) return false;
    if (t.tipo === "ancestralidade") return t.ancestralidade === ancestralidade;
    if (t.tipo === "classe") return (t.classes as string[] | undefined)?.includes(classe) ?? false;
    return true;
  }).sort((a, b) => b.nivel - a.nivel || porNome(a, b));
}

// Magias de uma vaga: truques só na vaga de truque; nas outras, qualquer círculo até o da vaga.
export function magiasDaVaga(tradicao: Tradicao | "", circulo: number): Magia[] {
  if (!tradicao) return [];
  return MAGIAS.filter((m) => m.tradicoes.includes(tradicao) && (circulo === 0 ? m.nivel === 0 : m.nivel > 0 && m.nivel <= circulo)).sort(
    (a, b) => b.nivel - a.nivel || porNome(a, b),
  );
}

export const temCatalogoDeClasse = (classe: string) => TALENTOS.some((t) => (t.classes as string[] | undefined)?.includes(classe));

export { MAGIAS, TALENTOS };
export type { Magia, Talento };
