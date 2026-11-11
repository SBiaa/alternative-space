"use client";

import { useState } from "react";
import { postJson, type FormState } from "@/lib/forms";
import { PECAS, type Peca } from "@/lib/sugestaoDrop";

const campo = "w-full rounded-lg border border-creme/25 bg-noite/60 px-3 py-2 text-sm text-creme placeholder:text-areia/50";

// Formulário "O que você quer no próximo drop?".
export function SugestaoDrop() {
  const [peca, setPeca] = useState<Peca | "">("");
  const [estado, setEstado] = useState<FormState>({ status: "idle" });

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setEstado({ status: "sending" });
    const res = await postJson("/api/sugestao-drop", { ...Object.fromEntries(new FormData(form)), peca });
    setEstado(res);
    if (res.status === "ok") { form.reset(); setPeca(""); }
  }

  return (
    <section aria-labelledby="sugestao-drop" className="card flex w-full max-w-[640px] flex-col gap-3 px-4 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="sugestao-drop" className="text-lg font-semibold">O que você quer no próximo drop?</h2>
        <p className="m-0 text-sm text-areia">Anime, banda, filme, jogo, uma estética... Manda que a gente lê tudo.</p>
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-3">
        <label className="sr-only" htmlFor="sugestao-tema">Tema ou fandom</label>
        <input id="sugestao-tema" name="tema" required minLength={2} maxLength={120} placeholder="Tema ou fandom (ex.: Akatsuki, Bauhaus, Hollow Knight)" className={campo} />

        <div role="radiogroup" aria-label="Que tipo de peça?" className="flex flex-wrap gap-2">
          {(Object.keys(PECAS) as Peca[]).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={peca === p}
              onClick={() => setPeca(peca === p ? "" : p)}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                peca === p ? "border-laranja bg-laranja text-noite" : "border-creme/25 text-creme hover:border-creme/50"
              }`}
            >
              {PECAS[p]}
            </button>
          ))}
        </div>

        <label className="sr-only" htmlFor="sugestao-detalhes">Detalhes</label>
        <textarea id="sugestao-detalhes" name="detalhes" rows={3} maxLength={2000} placeholder="Detalhes: personagem, frase, cores, referência... (opcional)" className={campo} />
        <label className="sr-only" htmlFor="sugestao-contato">Contato (opcional)</label>
        <input id="sugestao-contato" name="contato" maxLength={200} placeholder="E-mail ou @ se quiser saber quando sair (opcional)" className={campo} />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={estado.status === "sending"} className="btn cursor-pointer bg-laranja text-noite !px-5 !py-2 !text-base disabled:opacity-50">
            {estado.status === "sending" ? "Enviando..." : "Enviar ideia"}
          </button>
          <p role="status" aria-live="polite" className={`m-0 text-sm ${estado.status === "error" ? "font-bold text-estrela" : "text-areia"}`}>
            {estado.message}
          </p>
        </div>
      </form>
    </section>
  );
}
