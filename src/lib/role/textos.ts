import { PALAVRAS_BLOQUEADAS, PISTA, TEXTOS } from "./config";

// Nome e descrição do pico: limites, filtro de palavras e slug.

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function temPalavraBloqueada(texto: string): boolean {
  const palavras = semAcento(texto).replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
  const juntas = palavras.join("");
  return palavras.some((p) => PALAVRAS_BLOQUEADAS.includes(p)) || PALAVRAS_BLOQUEADAS.some((b) => b.length >= 5 && juntas.includes(b));
}

export const limparTexto = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

export function validarNomeEDescricao(titulo: unknown, descricao: unknown): { ok: true; titulo: string; descricao: string } | { ok: false; erro: string } {
  const t = limparTexto(titulo);
  const d = limparTexto(descricao);
  if (t.length < 3 || t.length > PISTA.tituloMax) return { ok: false, erro: TEXTOS.erros.titulo };
  if (d.length > PISTA.descricaoMax) return { ok: false, erro: TEXTOS.erros.descricao };
  if (temPalavraBloqueada(t) || temPalavraBloqueada(d)) return { ok: false, erro: TEXTOS.erros.palavra };
  return { ok: true, titulo: t, descricao: d };
}

// "Praça do Poste!" + sufixo -> "praca-do-poste-k3f9"
export function gerarSlug(titulo: string, sufixo: string): string {
  const base = semAcento(titulo).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "pico";
  return `${base}-${sufixo}`;
}
