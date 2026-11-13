// Texto dos efeitos de cada nível, pra mostrar nos cartões de melhoria. Os números vêm do catálogo.

import type { Efeito, TipoItem } from "./tipos";

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function descreverEfeito(kind: TipoItem, e: Efeito | undefined): string {
  if (!e) return "";
  const p: string[] = [];
  if (kind === "receita") {
    p.push(`cobra ${e.preco} de ouro`, `ingrediente ${e.ingrediente} de ouro`, `qualidade ${pct(e.satisfacao ?? 0)}`, e.prep ? `preparo ${e.prep}s` : "sai na hora");
  } else if (kind === "mobilia") {
    if (e.lugares) p.push(`${e.lugares} lugares`);
    if (e.paciencia !== undefined) p.push(e.paciencia >= 1 ? "paciência cai no ritmo normal" : `paciência cai ${pct(1 - e.paciencia)} mais devagar`);
    if (e.conforto) p.push(`conforto ${pct(e.conforto)}`);
  } else if (kind === "ambiente") {
    if (e.satisfacao) p.push(`+${pct(e.satisfacao)} de satisfação`);
    if (e.reputacao) p.push(`+${e.reputacao.toFixed(3)} de reputação por cliente`);
  } else {
    if (e.colunas && e.linhas) p.push(`salão de ${e.colunas} por ${e.linhas} casas`);
    if (e.linhasExtra) p.push(`+${e.linhasExtra} linhas de mesas`);
  }
  return p.join(" · ");
}

export const ROTULO_KIND: Record<TipoItem, string> = { mobilia: "Mobília", receita: "Cardápio", ambiente: "Ambiente", expansao: "Expansão" };
