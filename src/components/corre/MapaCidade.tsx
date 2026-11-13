"use client";

import { bairroPorId, CORRE } from "@/lib/corre/config";
import { progressoViagem, type Viagem } from "@/lib/corre/motor";

// Mapa ilustrado em SVG, vista de cima. Cor do céu muda com a hora; chuva é uma camada por cima.
function clima(minuto: number) {
  const h = (minuto / 60) % 24;
  if (h < 6 || h >= 20) return { fundo: "#1f2f52", rua: "#3a4668", quadra: "#2c3b63", nome: "Noite" };
  if (h < 10) return { fundo: "#f4e6c8", rua: "#8a7a6c", quadra: "#e9d3b3", nome: "Manhã" };
  if (h < 16) return { fundo: "#f1e2b8", rua: "#7a6c60", quadra: "#e6cfa6", nome: "Dia" };
  return { fundo: "#f6c58f", rua: "#6d5a52", quadra: "#eaa66f", nome: "Fim de tarde" };
}

export function MapaCidade({ minuto, chovendo, posicao, viagem }: { minuto: number; chovendo: boolean; posicao: string; viagem: Viagem | null }) {
  const c = clima(minuto);
  const noite = c.nome === "Noite";
  let x = bairroPorId(posicao)?.x ?? 50;
  let y = bairroPorId(posicao)?.y ?? 50;
  if (viagem && viagem.pontos.length > 1) {
    const t = progressoViagem(viagem) * (viagem.pontos.length - 1);
    const i = Math.min(viagem.pontos.length - 2, Math.floor(t));
    const a = bairroPorId(viagem.pontos[i])!;
    const b = bairroPorId(viagem.pontos[i + 1])!;
    const f = t - i;
    x = a.x + (b.x - a.x) * f;
    y = a.y + (b.y - a.y) * f;
  }
  const rota = viagem?.pontos.map((p) => bairroPorId(p)).filter(Boolean).map((b) => `${b!.x},${b!.y}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Mapa da cidade, ${c.nome.toLowerCase()}${chovendo ? ", chovendo" : ""}`} className="size-full rounded-lg" style={{ background: c.fundo }}>
      <path d="M0 58 C 25 52, 40 66, 60 60 S 90 70, 100 66 L100 76 C 88 80, 70 70, 58 72 S 24 64, 0 70Z" fill="#6f9fb8" opacity={noite ? 0.5 : 0.85} />
      <ellipse cx="80" cy="45" rx="9" ry="6" fill="#8fae7a" opacity={noite ? 0.5 : 0.9} />
      {[10, 30, 50, 70, 90].map((v) => (
        <g key={v}>
          <rect x={v - 8} y={4} width="16" height="12" rx="1.5" fill={c.quadra} />
          <rect x={v - 8} y={90} width="16" height="8" rx="1.5" fill={c.quadra} />
        </g>
      ))}
      <g stroke={c.rua} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M0 40 H100 M0 20 H100 M30 0 V100 M60 0 V100 M80 0 V100 M10 0 V100" opacity="0.55" />
      </g>
      {rota && <polyline points={rota} fill="none" stroke="#1f6f6a" strokeWidth="1.2" strokeDasharray="2 1.6" />}
      {CORRE.bairros.map((b) => (
        <g key={b.id}>
          <circle cx={b.x} cy={b.y} r="1.6" fill={noite ? "#ece3be" : "#1f2f52"} />
          <text x={b.x} y={b.y + 4.6} textAnchor="middle" fontSize="2.8" fontFamily="var(--font-ficha)" fill={noite ? "#ece3be" : "#1f2f52"}>
            {b.nome}
          </text>
        </g>
      ))}
      <g className="corre-marcador" style={{ transition: "transform .8s linear" }} transform={`translate(${x} ${y})`}>
        <circle r="3.2" fill="#fff" opacity="0.9" />
        <circle r="2.1" fill="#dd5d05" stroke="#1f2f52" strokeWidth="0.6" />
        <path d="M-.9 .2 H.9 M0 -.9 V1" stroke="#fff" strokeWidth="0.5" />
      </g>
      {chovendo && (
        <g className="corre-chuva" aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => (
            <line key={i} x1={(i * 7.3) % 100} y1={((i * 13) % 100) - 40} x2={((i * 7.3) % 100) - 1.2} y2={((i * 13) % 100) - 35} stroke="#a9c4e0" strokeWidth="0.35" opacity="0.7" />
          ))}
        </g>
      )}
      {chovendo && <rect width="100" height="100" fill="#1f2f52" opacity="0.18" />}
    </svg>
  );
}
