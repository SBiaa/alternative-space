"use client";

import { useActionState } from "react";
import { pedirCodigoSenha, redefinirSenha, reenviarCodigoSenha, type SenhaState } from "@/app/actions/tripulante";

const field = "rounded-xl border-2 border-noite bg-creme px-4 py-3.5 text-base text-noite placeholder:text-neutro";
const label = "font-ficha text-[13px] tracking-wider text-tinta";

// Passo 1: e-mail para receber o código.
export function PedirCodigoForm() {
  const [state, action, pending] = useActionState<SenhaState, FormData>(pedirCodigoSenha, null);
  return (
    <form action={action} className="card flex flex-col gap-5 p-7 sm:p-9">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={label}>E-MAIL DA SUA CONTA</label>
        <input id="email" name="email" type="email" defaultValue={state?.email} required autoComplete="email" placeholder="voce@email.com" className={field} />
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-sm font-medium text-estrela">{state?.error}</p>
      <button type="submit" disabled={pending} className="btn bg-laranja text-noite disabled:opacity-60">
        {pending ? "Enviando…" : "Mandar código"}
      </button>
    </form>
  );
}

// Passo 2: código + senha nova.
export function NovaSenhaForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<SenhaState, FormData>(redefinirSenha, null);
  const [reenvio, reenviar, reenviando] = useActionState<SenhaState>(reenviarCodigoSenha, null);
  return (
    <div className="card flex flex-col gap-5 p-7 sm:p-9">
      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="codigo" className={label}>CÓDIGO ENVIADO PARA {email.toUpperCase()}</label>
          <input
            id="codigo"
            name="codigo"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            placeholder="000000"
            className="rounded-xl border-2 border-noite bg-creme px-4 py-3.5 text-center font-ficha text-2xl tracking-[0.4em] text-noite placeholder:text-neutro"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className={label}>SENHA NOVA (MÍNIMO 8 CARACTERES)</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
        </div>
        <p role="status" aria-live="polite" className="min-h-6 text-sm font-medium text-estrela">{state?.error}</p>
        <button type="submit" disabled={pending} className="btn bg-laranja text-noite disabled:opacity-60">
          {pending ? "Salvando…" : "Salvar senha e entrar"}
        </button>
      </form>

      <form action={reenviar} className="flex flex-col gap-2">
        <button type="submit" disabled={reenviando} className="self-start text-sm font-bold text-azul underline disabled:opacity-60">
          {reenviando ? "Enviando…" : "Não chegou? Mandar outro código"}
        </button>
        <p aria-live="polite" className="min-h-5 text-sm text-tinta">{reenvio?.error ?? reenvio?.ok}</p>
      </form>
    </div>
  );
}
