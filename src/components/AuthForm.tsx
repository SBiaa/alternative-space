"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cadastrar, entrar, type AuthState } from "@/app/actions/tripulante";

const field = "rounded-xl border-2 border-noite bg-creme px-4 py-3.5 text-base text-noite placeholder:text-neutro";
const label = "font-ficha text-[13px] tracking-wider text-tinta";

export function AuthForm({ mode, next, salvar }: { mode: "cadastro" | "entrar"; next?: string; salvar?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "cadastro" ? cadastrar : entrar, null);
  const novo = mode === "cadastro";

  return (
    <form action={action} className="card flex flex-col gap-5 p-7 sm:p-9">
      {next && <input type="hidden" name="next" value={next} />}
      {salvar && <input type="hidden" name="salvar" value={salvar} />}

      {novo && (
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className={label}>COMO A GENTE TE CHAMA</label>
          <input id="name" name="name" defaultValue={state?.name} required autoComplete="nickname" maxLength={60} placeholder="Seu nome ou apelido" className={field} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={label}>E-MAIL</label>
        <input id="email" name="email" type="email" defaultValue={state?.email} required autoComplete="email" placeholder="voce@email.com" className={field} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="password" className={label}>SENHA{novo && " (MÍNIMO 8 CARACTERES)"}</label>
          {!novo && <Link href="/entrar/esqueci" className="text-sm font-bold text-azul">Esqueci a senha</Link>}
        </div>
        <input id="password" name="password" type="password" required minLength={novo ? 8 : undefined} autoComplete={novo ? "new-password" : "current-password"} className={field} />
      </div>

      <p role="status" aria-live="polite" className="min-h-6 text-sm font-medium text-estrela">{state?.error}</p>

      <button type="submit" disabled={pending} className="btn bg-laranja text-noite disabled:opacity-60">
        {pending ? "Um instante…" : novo ? "Embarcar na tripulação" : "Entrar"}
      </button>
    </form>
  );
}
