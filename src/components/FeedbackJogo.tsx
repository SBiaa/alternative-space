"use client";

import { useState } from "react";
import { TIPOS_FEEDBACK, type TipoFeedback } from "@/lib/feedback";
import { postJson, type FormState } from "@/lib/forms";

const campo = "w-full rounded-lg border border-creme/25 bg-noite/60 px-3 py-2 text-sm text-creme placeholder:text-areia/50";

const DICA: Record<TipoFeedback, string> = {
  avaliacao: "Quer comentar a nota? (opcional)",
  sugestao: "O que deixaria o jogo melhor?",
  bug: "O que aconteceu? Em que parte do jogo? Celular ou computador?",
  ideia: "Conta a ideia (pode ser jogo novo, modo novo...)",
};

// Cartão "Avaliar o jogo" no fim de cada página do Fliperama.
export function FeedbackJogo({ slug, nome }: { slug: string; nome: string }) {
  const [tipo, setTipo] = useState<TipoFeedback>("avaliacao");
  const [nota, setNota] = useState(0);
  const [estado, setEstado] = useState<FormState>({ status: "idle" });

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setEstado({ status: "sending" });
    const res = await postJson("/api/feedback", {
      ...Object.fromEntries(new FormData(form)),
      jogo: slug,
      tipo,
      nota: tipo === "avaliacao" ? nota : null,
      pagina: window.location.pathname,
    });
    setEstado(res);
    if (res.status === "ok") { form.reset(); setNota(0); }
  }

  return (
    <section aria-labelledby="feedback-jogo" className="card flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="feedback-jogo" className="text-lg font-semibold">O que achou de {nome}?</h2>
        <p className="m-0 text-sm text-areia">Dá uma nota, manda sugestão, ideia ou avisa de um bug. A gente lê tudo.</p>
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="Tipo de mensagem" className="flex flex-wrap gap-2">
          {(Object.keys(TIPOS_FEEDBACK) as TipoFeedback[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              onClick={() => setTipo(t)}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                tipo === t ? "border-laranja bg-laranja text-noite" : "border-creme/25 text-creme hover:border-creme/50"
              }`}
            >
              {TIPOS_FEEDBACK[t]}
            </button>
          ))}
        </div>

        {tipo === "avaliacao" && (
          <div role="radiogroup" aria-label="Nota de 1 a 5" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={nota === n}
                aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                onClick={() => setNota(n)}
                className={`cursor-pointer text-3xl leading-none ${n <= nota ? "text-laranja" : "text-creme/25 hover:text-creme/50"}`}
              >
                ★
              </button>
            ))}
          </div>
        )}

        <label className="sr-only" htmlFor="feedback-mensagem">Mensagem</label>
        <textarea
          id="feedback-mensagem"
          name="mensagem"
          rows={3}
          maxLength={2000}
          required={tipo !== "avaliacao"}
          placeholder={DICA[tipo]}
          className={campo}
        />
        <label className="sr-only" htmlFor="feedback-contato">Contato (opcional)</label>
        <input id="feedback-contato" name="contato" maxLength={200} placeholder="E-mail ou @ se quiser resposta (opcional)" className={campo} />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={estado.status === "sending" || (tipo === "avaliacao" && nota === 0)}
            className="btn cursor-pointer bg-laranja text-noite !px-5 !py-2 !text-base disabled:opacity-50"
          >
            {estado.status === "sending" ? "Enviando..." : "Enviar"}
          </button>
          <p role="status" aria-live="polite" className={`m-0 text-sm ${estado.status === "error" ? "font-bold text-estrela" : "text-areia"}`}>
            {estado.message}
          </p>
        </div>
      </form>
    </section>
  );
}
