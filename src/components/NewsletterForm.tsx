"use client";

import { useState } from "react";
import { postJson, type FormState } from "@/lib/forms";

export function NewsletterForm() {
  const [state, setState] = useState<FormState>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ status: "sending" });
    setState(await postJson("/api/newsletter", { email: f.get("email"), website: f.get("website") }));
  }

  return (
    <form onSubmit={onSubmit} className="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
      <label htmlFor="email-lista" className="text-sm font-medium">Seu e-mail</label>
      <div className="flex flex-wrap gap-2.5">
        <input id="email-lista" name="email" type="email" required autoComplete="email" placeholder="voce@email.com" className="min-w-0 flex-[1_1_200px] rounded-md border border-noite bg-white px-3.5 py-3.5 text-base text-noite placeholder:text-neutro" />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <button type="submit" disabled={state.status === "sending"} className="btn bg-laranja text-noite disabled:opacity-60">
          {state.status === "sending" ? "Enviando..." : "Assinar"}
        </button>
      </div>
      <p role="status" aria-live="polite" className={`min-h-6 text-sm ${state.status === "error" ? "font-medium text-estrela" : "text-tinta"}`}>
        {state.message}
      </p>
    </form>
  );
}
