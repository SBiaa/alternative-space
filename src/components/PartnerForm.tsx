"use client";

import { useState } from "react";
import { postJson, type FormState } from "@/lib/forms";

const field = "w-full rounded-xl border-2 border-noite bg-creme px-4 py-3 text-base text-noite";
const label = "font-ficha text-[13px] uppercase tracking-wider";

export function PartnerForm({ types }: { types: string[] }) {
  const [state, setState] = useState<FormState>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ status: "sending" });
    const res = await postJson("/api/parceiros", Object.fromEntries(new FormData(form)));
    setState(res);
    if (res.status === "ok") form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-5 p-7">
      <div className="flex flex-col gap-2">
        <label htmlFor="nome" className={label}>Nome</label>
        <input id="nome" name="nome" required maxLength={120} autoComplete="name" className={field} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={label}>E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="tipo" className={label}>Tipo de parceria</label>
        <select id="tipo" name="tipo" required defaultValue="" className={field}>
          <option value="" disabled>Escolhe uma</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="canal" className={label}>Sua loja, canal ou perfil</label>
        <input id="canal" name="canal" maxLength={200} placeholder="@perfil ou link" className={field} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="mensagem" className={label}>Conta mais</label>
        <textarea id="mensagem" name="mensagem" rows={4} maxLength={2000} className={field} />
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={state.status === "sending"} className="btn cursor-pointer bg-laranja text-noite disabled:opacity-60">
          {state.status === "sending" ? "Enviando..." : "Enviar interesse"}
        </button>
        <p role="status" aria-live="polite" className={`text-base ${state.status === "error" ? "font-bold text-estrela" : "text-noite"}`}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
