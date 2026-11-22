import { TEXTOS } from "@/lib/constelacao/config";
import type { Estado } from "@/lib/constelacao/retorno";

// Teclado ABNT simplificado, sem acentos nem Ç. Altura de 44px em todas as teclas.
const LINHAS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const marca: Record<Estado, string> = { certa: "★", outro: "☆", ausente: "·" };
const visual: Record<Estado, string> = {
  certa: "border-laranja-claro bg-laranja-claro text-noite",
  outro: "border-dashed border-laranja-claro bg-transparent text-creme",
  ausente: "border-creme/10 bg-creme/5 text-creme/45",
};

type Props = {
  estados: Map<string, Estado>;
  desligado: boolean;
  onLetra: (l: string) => void;
  onApagar: () => void;
  onEnviar: () => void;
};

export function Teclado({ estados, desligado, onLetra, onApagar, onEnviar }: Props) {
  const base = "relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border font-ficha text-base font-bold disabled:cursor-default disabled:opacity-50";
  return (
    <div role="group" aria-label={TEXTOS.teclado} className="mx-auto flex w-full max-w-[520px] flex-col gap-1.5">
      {LINHAS.map((linha, i) => (
        <div key={linha} className="flex justify-center gap-1">
          {i === 2 && (
            <button type="button" onClick={onEnviar} disabled={desligado} aria-label={TEXTOS.enviarRotulo} className={`${base} max-w-[64px] flex-[1.6] border-creme/30 bg-creme/10 text-xs text-creme`}>
              {TEXTOS.enviar}
            </button>
          )}
          {[...linha].map((l) => {
            const e = estados.get(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => onLetra(l)}
                disabled={desligado}
                aria-label={TEXTOS.tecla(l, e ? TEXTOS.estados[e] : null)}
                className={`${base} max-w-[44px] ${e ? visual[e] : "border-creme/30 bg-creme/10 text-creme"}`}
              >
                {l}
                {e && (
                  <span aria-hidden="true" className="absolute right-0.5 top-0 text-[9px] leading-none">
                    {marca[e]}
                  </span>
                )}
              </button>
            );
          })}
          {i === 2 && (
            <button type="button" onClick={onApagar} disabled={desligado} aria-label={TEXTOS.apagarRotulo} className={`${base} max-w-[64px] flex-[1.6] border-creme/30 bg-creme/10 text-xs text-creme`}>
              {TEXTOS.apagar}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
