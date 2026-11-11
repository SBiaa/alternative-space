// Progresso como constelação: cada pergunta respondida acende uma estrela e liga na anterior.
export function Constelacao({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  const w = 600;
  const h = 70;
  // Zigue-zague fixo, pra constelação ter sempre o mesmo desenho.
  const pts = Array.from({ length: total }, (_, i) => ({
    x: 20 + (i * (w - 40)) / Math.max(total - 1, 1),
    y: 14 + ((i * 7) % 5) * 10.5,
  }));
  const feitos = Math.min(step, total);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between font-ficha text-[13px] tracking-wider text-tinta">
        <span>PERGUNTA {String(Math.min(step + 1, total)).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        {onBack && (
          <button type="button" onClick={onBack} className="cursor-pointer font-ficha text-[13px] text-azul underline">
            ← VOLTAR
          </button>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitos} aria-label="Progresso do quiz">
        {pts.slice(1).map((p, i) => (
          <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} strokeWidth={2}
            className={i + 1 < feitos ? "stroke-laranja" : "stroke-noite/20"} strokeDasharray={i + 1 < feitos ? undefined : "4 5"} />
        ))}
        {pts.map((p, i) => {
          const aceso = i < feitos;
          const r = aceso ? 7 : 4.5;
          return (
            <path key={i}
              d={`M${p.x},${p.y - r} L${p.x + r * 0.3},${p.y - r * 0.3} L${p.x + r},${p.y} L${p.x + r * 0.3},${p.y + r * 0.3} L${p.x},${p.y + r} L${p.x - r * 0.3},${p.y + r * 0.3} L${p.x - r},${p.y} L${p.x - r * 0.3},${p.y - r * 0.3}Z`}
              className={`transition-all duration-300 motion-reduce:transition-none ${aceso ? "fill-laranja stroke-noite" : i === feitos ? "fill-creme stroke-laranja" : "fill-creme stroke-noite/40"}`}
              strokeWidth={1.5} />
          );
        })}
      </svg>
    </div>
  );
}
