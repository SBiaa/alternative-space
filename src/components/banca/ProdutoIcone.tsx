import { TEMAS, produtoDe } from "@/lib/banca/config";
import { lerItem } from "@/lib/banca/mesa";
import type { Produto } from "@/lib/banca/tipos";

/** Desenho do produto: a forma diz o que é (print, adesivo, chaveiro, botton) e a cor diz o tema. Nunca só a cor. */
export function Forma({ forma, cor, tamanho = 40 }: { forma: Produto["forma"]; cor: string; tamanho?: number }) {
  const traco = "#01121e";
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {forma === "retangulo" && (
        <>
          <rect x="7" y="4" width="26" height="32" rx="2" fill="#f6efd3" stroke={traco} strokeWidth="2" />
          <rect x="11" y="8" width="18" height="18" rx="1" fill={cor} stroke={traco} strokeWidth="1.5" />
          <path d="M11 30h18M11 33h10" stroke={traco} strokeWidth="1.5" />
        </>
      )}
      {forma === "estrela" && (
        <path d="M20 4l4.6 10.2 11 1.2-8.2 7.5 2.3 10.9L20 27.8l-9.7 6 2.3-10.9-8.2-7.5 11-1.2z" fill={cor} stroke={traco} strokeWidth="2" strokeLinejoin="round" />
      )}
      {forma === "chaveiro" && (
        <>
          <circle cx="20" cy="7" r="4" fill="none" stroke={traco} strokeWidth="2" />
          <path d="M20 11v4" stroke={traco} strokeWidth="2" />
          <rect x="11" y="15" width="18" height="21" rx="4" fill={cor} stroke={traco} strokeWidth="2" />
        </>
      )}
      {forma === "circulo" && (
        <>
          <circle cx="20" cy="20" r="15" fill={cor} stroke={traco} strokeWidth="2" />
          <circle cx="20" cy="20" r="9" fill="none" stroke={traco} strokeWidth="1.5" strokeDasharray="3 3" />
        </>
      )}
    </svg>
  );
}

export function ProdutoIcone({ item, tamanho }: { item: string; tamanho?: number }) {
  const l = lerItem(item);
  if (!l) return null;
  return <Forma forma={produtoDe(l.produto)!.forma} cor={TEMAS.find((t) => t.slug === l.tema)?.cor ?? "#888"} tamanho={tamanho} />;
}

export function nomeDoItem(item: string): string {
  const l = lerItem(item);
  if (!l) return item;
  return `${produtoDe(l.produto)!.nome} · ${TEMAS.find((t) => t.slug === l.tema)?.nome ?? l.tema}`;
}
