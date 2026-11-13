// Ilustração do bairro vista de cima: cruzamento molhado, moto, área de entrega e placas.
// Decorativa (aria-hidden): o texto da página já diz o que ela mostra.
const ROSA = "#f27aa8";
const CIANO = "#6fd3e0";

const gotas = Array.from({ length: 46 }, (_, i) => ({ x: (i * 137) % 640, y: (i * 89) % 400, l: 10 + (i % 4) * 4 }));
const janelas = (x: number, y: number, w: number, h: number) =>
  Array.from({ length: Math.floor(w / 18) * Math.floor(h / 18) }, (_, i) => {
    const c = Math.floor(w / 18);
    return { x: x + 6 + (i % c) * 18, y: y + 6 + Math.floor(i / c) * 18, acesa: (i * 7 + x) % 5 === 0 };
  });

export function Capa({ className = "", cobrir = false }: { className?: string; cobrir?: boolean }) {
  const blocos = [
    [0, 0, 230, 140],
    [330, 0, 310, 140],
    [0, 240, 230, 160],
    [330, 240, 310, 160],
  ];
  return (
    <svg viewBox="0 0 640 400" preserveAspectRatio={cobrir ? "xMidYMid slice" : "xMidYMid meet"} className={className} aria-hidden="true" focusable="false">
      <rect width="640" height="400" fill="#13304f" />
      {/* faixas da rua */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={`h${i}`} x={i * 84 + 8} y={188} width="40" height="4" rx="2" fill="#d9d2b0" opacity="0.25" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={`v${i}`} x={278} y={i * 84 + 8} width="4" height="40" rx="2" fill="#d9d2b0" opacity="0.25" />
      ))}
      {/* prédios */}
      {blocos.map(([x, y, w, h]) => (
        <g key={`${x}-${y}`}>
          <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="6" fill="#07192c" stroke="#22364d" strokeWidth="2" />
          {janelas(x + 6, y + 6, w - 12, h - 12).map((j, i) => (
            <rect key={i} x={j.x} y={j.y} width="8" height="8" rx="1" fill={j.acesa ? "#f2a66e" : "#2a3e52"} opacity={j.acesa ? 0.55 : 1} />
          ))}
        </g>
      ))}
      {/* placas */}
      <g fontFamily="var(--font-ficha)" fontSize="13" fontWeight="700">
        <rect x="40" y="118" width="128" height="22" rx="4" fill="#01121e" stroke={ROSA} strokeWidth="2" />
        <text x="104" y="133" textAnchor="middle" fill={ROSA}>
          SOPA 24H
        </text>
        <rect x="440" y="246" width="150" height="22" rx="4" fill="#01121e" stroke={CIANO} strokeWidth="2" />
        <text x="515" y="261" textAnchor="middle" fill={CIANO}>
          KARAOKÊ GAROA
        </text>
      </g>
      {/* luz dos postes */}
      <circle cx="232" cy="142" r="70" fill="#f2a66e" opacity="0.1" />
      <circle cx="232" cy="142" r="30" fill="#f2a66e" opacity="0.12" />
      <circle cx="330" cy="240" r="60" fill="#f2a66e" opacity="0.08" />
      {/* poça refletindo as placas */}
      <ellipse cx="420" cy="196" rx="64" ry="26" fill="#2a4a6e" opacity="0.9" />
      <rect x="380" y="186" width="44" height="3" rx="1.5" fill={ROSA} opacity="0.5" />
      <rect x="420" y="202" width="36" height="3" rx="1.5" fill={CIANO} opacity="0.5" />
      {/* área de entrega */}
      <circle cx="560" cy="190" r="36" fill="#f2a66e" opacity="0.16" />
      <circle cx="560" cy="190" r="36" fill="none" stroke="#f2a66e" strokeWidth="3" strokeDasharray="10 6" />
      <path d="M546 192 L560 178 L574 192 Z M550 192 H570 V204 H550 Z" fill="#f2a66e" />
      {/* rastro molhado e moto */}
      <path d="M90 210 C 150 214, 190 204, 250 198" stroke="#d6deec" strokeWidth="2" fill="none" opacity="0.25" strokeDasharray="4 6" />
      <g transform="translate(262 196) rotate(-4)">
        <path d="M14 0 L96 -26 L96 26 Z" fill="#ece3be" opacity="0.12" />
        <rect x="-22" y="-9" width="40" height="18" rx="5" fill="#01121e" stroke="#dd5d05" strokeWidth="3" />
        <rect x="12" y="-9" width="7" height="18" rx="2" fill="#dd5d05" />
        <rect x="-32" y="-12" width="12" height="24" rx="3" fill="#dd5d05" />
        <circle cx="-4" cy="0" r="8" fill="#ece3be" />
      </g>
      {/* chuva */}
      <g stroke="#d6deec" strokeWidth="2" strokeLinecap="round" opacity="0.35">
        {gotas.map((g, i) => (
          <line key={i} x1={g.x} y1={g.y} x2={g.x - 3} y2={g.y + g.l} />
        ))}
      </g>
    </svg>
  );
}
