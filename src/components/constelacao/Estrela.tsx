import type { Estado } from "@/lib/constelacao/retorno";

// Estrela de quatro pontas. O estado aparece pela forma (cheia, contorno tracejado, apagada), não só pela cor.
export function caminhoEstrela(x: number, y: number, r: number): string {
  const k = r * 0.3;
  return `M${x},${y - r} L${x + k},${y - k} L${x + r},${y} L${x + k},${y + k} L${x},${y + r} L${x - k},${y + k} L${x - r},${y} L${x - k},${y - k}Z`;
}

export function Estrela({ estado, className = "" }: { estado: Estado; className?: string }) {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" className={className} focusable="false">
      {estado === "certa" && <path d={caminhoEstrela(22, 22, 20)} className="fill-carta-estrela stroke-noite" strokeWidth={1.5} />}
      {estado === "outro" && <path d={caminhoEstrela(22, 22, 19)} className="fill-none stroke-carta-estrela" strokeWidth={2} strokeDasharray="4 3" />}
      {estado === "ausente" && <circle cx={22} cy={22} r={3} className="fill-creme/25" />}
    </svg>
  );
}
