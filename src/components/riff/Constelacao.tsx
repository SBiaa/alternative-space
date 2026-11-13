// Barra de energia em forma de constelação: cada ponto acende com os Perfeitos.
const PONTOS = [
  [6, 18], [18, 8], [30, 16], [42, 6], [54, 14], [66, 4], [78, 15], [90, 7], [102, 17], [114, 9],
];

export function EnergiaConstelacao({ energia, ativa }: { energia: number; ativa: boolean }) {
  const acesos = ativa ? PONTOS.length : Math.floor(energia * PONTOS.length + 1e-9);
  const cheia = acesos === PONTOS.length;
  return (
    <div
      role="meter"
      aria-label="Energia"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={ativa ? 100 : Math.round(energia * 100)}
      aria-valuetext={ativa ? "Energia ligada, pontos em dobro" : cheia ? "Energia cheia" : `${Math.round(energia * 100)}%`}
      className="flex items-center"
    >
      <svg viewBox="0 0 120 22" className="h-6 w-[120px]" aria-hidden="true">
        {PONTOS.slice(1).map(([x, y], i) => (
          <line
            key={i}
            x1={PONTOS[i][0]}
            y1={PONTOS[i][1]}
            x2={x}
            y2={y}
            stroke={i + 1 < acesos ? "#f2a66e" : "rgba(236,227,190,0.2)"}
            strokeWidth={1}
          />
        ))}
        {PONTOS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i < acesos ? 2.6 : 1.8} fill={i < acesos ? "#f2a66e" : "rgba(236,227,190,0.35)"} />
        ))}
      </svg>
    </div>
  );
}
