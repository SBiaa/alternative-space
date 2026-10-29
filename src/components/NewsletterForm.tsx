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
    <form onSubmit={onSubmit} className="flex min-w-0 flex-[1_1_340px] flex-col gap-2.5">
      <label htmlFor="email-lista" className="font-ficha text-[13px] tracking-wider">SEU E-MAIL</label>
      <div className="flex flex-wrap gap-2.5">
        <input id="email-lista" name="email" type="email" required autoComplete="email" placeholder="voce@email.com" className="min-w-0 flex-[1_1_200px] rounded-full border-2 border-creme bg-transparent px-4 py-3.5 text-base text-creme placeholder:text-[#9aa3ab]" />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <button type="submit" disabled={state.status === "sending"} className="cursor-pointer rounded-full border-2 border-creme bg-laranja px-[22px] py-3.5 font-titulo text-[1.05rem] font-bold text-noite disabled:opacity-60">
          {state.status === "sending" ? "Enviando..." : "Quero receber"}
        </button>
      </div>
      <p role="status" aria-live="polite" className={`min-h-6 text-sm ${state.status === "error" ? "text-laranja-claro" : "text-creme"}`}>
        {state.message}
      </p>
    </form>
  );
}
