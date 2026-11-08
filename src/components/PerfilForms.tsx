"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { apagarConta, atualizarPerfil, trocarSenha, type FormState } from "@/app/actions/perfil";
import type { Avatar as AvatarArte } from "@/lib/perfil";
import { lerPirata } from "@/lib/pirata";
import { Avatar } from "./Avatar";
import { PirataArt } from "./PirataArt";

const field = "rounded-xl border-2 border-noite bg-creme px-4 py-3.5 text-base text-noite placeholder:text-neutro";
const label = "font-ficha text-[13px] tracking-wider text-tinta";
const corBg: Record<string, string> = {
  azul: "bg-azul",
  noite: "bg-noite",
  laranja: "bg-laranja",
  estrela: "bg-estrela",
  creme: "bg-creme-claro",
};

function Status({ state }: { state: FormState }) {
  return (
    <p role="status" aria-live="polite" className={`min-h-6 text-sm font-medium ${state?.error ? "text-estrela" : "text-azul"}`}>
      {state?.error ?? (state?.ok && `✓ ${state.ok}`)}
    </p>
  );
}

type PerfilProps = { name: string; apelido: string | null; cor: string; image: string | null; avatares: AvatarArte[]; cores: string[] };

export function PerfilForm({ name, apelido, cor, image, avatares, cores }: PerfilProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(atualizarPerfil, null);
  // Pré-visualização ao vivo: o avatar do topo muda conforme a escolha.
  const [nome, setNome] = useState(name);
  const [corAtual, setCor] = useState(cor);
  // O pirata montado no jogo aparece como mais uma opção.
  const pirata = lerPirata(image);
  const [arte, setArte] = useState(image && (pirata || avatares.some((a) => a.src === image)) ? image : "");

  return (
    <form action={action} className="card flex flex-col gap-6 p-7 sm:p-9">
      <div className="flex items-center gap-5">
        <Avatar name={nome || "?"} image={arte} cor={corAtual} size={88} />
        <div className="flex flex-col">
          <span className="font-titulo text-2xl font-bold text-azul">{nome || "Seu nome"}</span>
          <span className="font-ficha text-sm text-neutro">Pré-visualização</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={label}>COMO A GENTE TE CHAMA</label>
        <input id="name" name="name" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={60} autoComplete="nickname" className={field} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="apelido" className={label}>APELIDO (OPCIONAL)</label>
        <div className="flex items-center gap-2">
          <span className="font-titulo text-xl font-bold text-azul">@</span>
          <input id="apelido" name="apelido" defaultValue={apelido ?? ""} maxLength={21} pattern="@?[A-Za-z0-9_.]{3,20}" placeholder="tripulante_01" autoComplete="off" className={`${field} flex-1`} />
        </div>
        <span className="text-sm text-neutro">De 3 a 20 letras, números, ponto ou _. Cada apelido é de uma pessoa só.</span>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className={`${label} mb-2`}>COR DO PERFIL</legend>
        <div className="flex flex-wrap gap-3">
          {cores.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="cor" value={c} checked={corAtual === c} onChange={() => setCor(c)} className="peer sr-only" />
              <span className={`block size-11 rounded-full border-2 border-noite ${corBg[c] ?? "bg-azul"} peer-checked:shadow-duro-sm peer-checked:ring-4 peer-checked:ring-laranja-claro peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2`} />
              <span className="sr-only">{c}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={`${label} mb-2`}>AVATAR</legend>
        {avatares.length === 0 && !pirata ? (
          <p className="text-tinta">
            Cada quiz com arte desbloqueia avatares, e no <Link href="/jogos/monte-seu-pirata" className="font-bold text-azul">Monte seu Pirata</Link> você cria o seu. Por enquanto fica a inicial do seu nome na cor escolhida.
          </p>
        ) : (
          <>
            <p className="text-sm text-neutro">
              Desbloqueados pelos seus resultados. Faz mais quizzes pra liberar outros ou{" "}
              <Link href="/jogos/monte-seu-pirata" className="font-bold text-azul">{pirata ? "remonta seu pirata" : "monta seu pirata"}</Link>.
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3">
              <label className="cursor-pointer" title="Só a inicial">
                <input type="radio" name="avatar" value="" checked={arte === ""} onChange={() => setArte("")} className="peer sr-only" />
                <span className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-noite font-titulo text-2xl font-bold text-azul peer-checked:border-solid peer-checked:shadow-duro-sm peer-checked:ring-4 peer-checked:ring-laranja-claro peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                  {(nome.trim()[0] ?? "?").toUpperCase()}
                </span>
                <span className="sr-only">Só a inicial</span>
              </label>
              {pirata && image && (
                <label className="cursor-pointer" title="Seu pirata">
                  <input type="radio" name="avatar" value={image} checked={arte === image} onChange={() => setArte(image)} className="peer sr-only" />
                  <span className="relative block aspect-square overflow-hidden rounded-xl border-2 border-noite bg-azul peer-checked:shadow-duro-sm peer-checked:ring-4 peer-checked:ring-laranja-claro peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                    <PirataArt p={pirata} className="absolute inset-0 size-full" />
                  </span>
                  <span className="sr-only">Seu pirata</span>
                </label>
              )}
              {avatares.map((a) => (
                <label key={a.src} className="cursor-pointer" title={a.label}>
                  <input type="radio" name="avatar" value={a.src} checked={arte === a.src} onChange={() => setArte(a.src)} className="peer sr-only" />
                  <span className="relative block aspect-square overflow-hidden rounded-xl border-2 border-noite peer-checked:shadow-duro-sm peer-checked:ring-4 peer-checked:ring-laranja-claro peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                    <Image src={a.src} alt="" fill sizes="80px" className="object-cover" />
                  </span>
                  <span className="sr-only">{a.label}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </fieldset>

      <Status state={state} />
      <button type="submit" disabled={pending} className="btn self-start bg-laranja text-noite disabled:opacity-60">
        {pending ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}

export function SenhaForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(trocarSenha, null);
  return (
    <form action={action} className="card flex flex-col gap-5 p-7 sm:p-9">
      <h2 className="font-titulo text-2xl font-bold text-azul">Trocar senha</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="atual" className={label}>SENHA ATUAL</label>
        <input id="atual" name="atual" type="password" required autoComplete="current-password" className={field} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="nova" className={label}>SENHA NOVA (MÍNIMO 8 CARACTERES)</label>
        <input id="nova" name="nova" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn self-start bg-azul text-creme disabled:opacity-60">
        {pending ? "Trocando…" : "Trocar senha"}
      </button>
    </form>
  );
}

export function ApagarContaForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(apagarConta, null);
  return (
    <form action={action} className="flex flex-col gap-5 rounded-2xl border-2 border-estrela bg-creme-claro p-7 sm:p-9">
      <h2 className="font-titulo text-2xl font-bold text-estrela">Apagar conta</h2>
      <p className="text-tinta">Apaga seu cadastro, perfil e todos os resultados salvos. Não dá pra desfazer.</p>
      <div className="flex flex-col gap-2">
        <label htmlFor="senha-apagar" className={label}>SUA SENHA</label>
        <input id="senha-apagar" name="senha" type="password" required autoComplete="current-password" className={field} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirma" className={label}>DIGITE APAGAR PRA CONFIRMAR</label>
        <input id="confirma" name="confirma" required autoComplete="off" className={field} />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn self-start bg-estrela text-creme disabled:opacity-60">
        {pending ? "Apagando…" : "Apagar minha conta"}
      </button>
    </form>
  );
}
