import { PARTIDA, TEXTOS } from "@/lib/constelacao/config";
import type { Estado } from "@/lib/constelacao/retorno";
import { Estrela } from "./Estrela";

// Grade de casas: uma linha por tentativa. Cada linha tem um rótulo único pro leitor de tela,
// então as casas ficam escondidas dele (aria-hidden) e não leem letra por letra duas vezes.

type Props = { length: number; palpites: string[]; retornos: Estado[][]; atual: string };

const rotuloLinha = (i: number, palpite: string, retorno: Estado[]) =>
  `${TEXTOS.linha(i + 1)}: ${[...palpite].map((l, j) => TEXTOS.casa(l, retorno[j])).join("; ")}`;

export function Grade({ length, palpites, retornos, atual }: Props) {
  const linhas = Array.from({ length: PARTIDA.tentativas }, (_, i) => i);
  return (
    <ol
      aria-label={TEXTOS.grade}
      className="m-0 mx-auto flex w-full list-none flex-col gap-1.5 p-0"
      style={{ maxWidth: length * 56 + (length - 1) * 6 }}
    >
      {linhas.map((i) => {
        const enviado = palpites[i];
        const digitando = i === palpites.length ? atual : "";
        const rotulo = enviado
          ? rotuloLinha(i, enviado, retornos[i])
          : digitando
            ? `${TEXTOS.linha(i + 1)}: ${[...digitando].map((l) => TEXTOS.casa(l, "digitando")).join("; ")}`
            : TEXTOS.linhaVazia(i + 1);
        return (
          <li key={i} aria-label={rotulo} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
            {Array.from({ length }, (_, j) => {
              const letra = enviado ? enviado[j] : digitando[j];
              const estado = enviado ? retornos[i][j] : null;
              return (
                <span
                  key={j}
                  aria-hidden="true"
                  className={`surface-vidro relative flex aspect-square items-center justify-center font-ficha text-xl font-bold uppercase transition-colors motion-reduce:transition-none sm:text-2xl ${
                    !enviado && letra ? "border-laranja-claro" : ""
                  } ${estado === "certa" ? "text-noite" : "text-creme"}`}
                >
                  {estado && <Estrela estado={estado} className="absolute inset-0 h-full w-full" />}
                  <span className="relative">{letra}</span>
                </span>
              );
            })}
          </li>
        );
      })}
    </ol>
  );
}
