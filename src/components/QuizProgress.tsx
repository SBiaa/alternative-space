// Cabeçalho comum dos quizzes: contador, voltar e barra de progresso.
export function QuizProgress({ step, total, label = "PERGUNTA", onBack }: { step: number; total: number; label?: string; onBack?: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between font-ficha text-[13px] tracking-wider text-tinta">
        <span>{label} {String(Math.min(step + 1, total)).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        {onBack && (
          <button type="button" onClick={onBack} className="cursor-pointer font-ficha text-[13px] text-azul underline">
            ← VOLTAR
          </button>
        )}
      </div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-noite bg-creme" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step} aria-label="Progresso do quiz">
        <div className="h-full bg-laranja transition-[width] duration-300" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

export const optionClass =
  "flex h-full w-full cursor-pointer items-start gap-3.5 rounded-xl border-2 border-noite bg-creme px-5 py-4 text-left text-[1.05rem] leading-snug shadow-duro-sm transition-[transform,box-shadow,background-color] duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-laranja-claro hover:shadow-none motion-reduce:transition-none disabled:cursor-default";
