import { NOME_FORMA } from "@/lib/banda/conteudo";
import type { Logo } from "@/lib/banda/tipos";

// Desenhos de 0 a 100. A forma fica sobre um quadrado de cantos arredondados (raio de 8px na escala da tela).
const FORMAS: Record<string, string> = {
  circulo: "M50 22a28 28 0 1 0 0.01 0Z",
  raio: "M56 12 30 54h18l-6 34 28-44H50Z",
  estrela: "M50 14l10.5 21.4 23.5 3.4-17 16.6 4 23.4L50 67.8 29 78.8l4-23.4-17-16.6 23.5-3.4Z",
  triangulo: "M50 16 86 80H14Z",
  onda: "M10 56c10-24 20-24 30 0s20 24 30 0 14-16 20-8v22H10Z",
  chave: "M34 30a18 18 0 1 1 7 14l33 30-8 8-8-8-6 6-8-8 6-6-8-8-6 6A18 18 0 0 1 34 30Zm18-6a6 6 0 1 0 0.01 0Z",
};

export function LogoBanda({ logo, tamanho = 64, titulo }: { logo: Logo; tamanho?: number; titulo?: string }) {
  const nome = titulo ?? `Logo: ${NOME_FORMA[logo.forma] ?? logo.forma}`;
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" role="img" aria-label={nome} className="shrink-0">
      <rect x="2" y="2" width="96" height="96" rx="12" fill={logo.corFundo} stroke={logo.corForma} strokeWidth="3" />
      <path d={FORMAS[logo.forma] ?? FORMAS.circulo} fill={logo.corForma} fillRule="evenodd" />
    </svg>
  );
}
