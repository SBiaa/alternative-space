import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Star } from "@/components/Star";
import { getUser } from "@/lib/auth/server";
import { getQuiz, getResult } from "@/lib/quiz";
import { safeNext } from "@/lib/tripulante";

type Search = Promise<Record<string, string | string[] | undefined>>;

const copy = {
  cadastro: {
    eyebrow: "Cadastro de tripulante",
    title: "Sobe a bordo.",
    text: "Com a conta você guarda os resultados dos quizzes e vê as coleções novas na íntegra, antes de todo mundo.",
    switchText: "Já é da tripulação?",
    switchLabel: "Entrar",
    switchHref: "/entrar",
  },
  entrar: {
    eyebrow: "Tripulantes",
    title: "Bem-vinde de volta.",
    text: "Entra pra ver seu diário de bordo e as coleções completas.",
    switchText: "Ainda não tem conta?",
    switchLabel: "Criar cadastro",
    switchHref: "/cadastro",
  },
};

export function AuthPage({ mode, searchParams }: { mode: "cadastro" | "entrar"; searchParams: Search }) {
  const c = copy[mode];
  return (
    <section className="secao !pt-16">
      <div className="mx-auto grid max-w-[1000px] items-start gap-10 md:grid-cols-[1fr_1.1fr]">
        <div className="relative flex flex-col gap-4">
          <span className="etiqueta text-azul">{c.eyebrow}</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}>{c.title}</h1>
          <p className="text-lg leading-relaxed text-tinta">{c.text}</p>
          <Star className="absolute -top-6 right-4 hidden md:block" />
        </div>
        <Suspense fallback={<div className="card h-[420px]" />}>
          <Form mode={mode} searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Form({ mode, searchParams }: { mode: "cadastro" | "entrar"; searchParams: Search }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const next = safeNext(one("next") ?? null);
  if (await getUser()) redirect(next);

  const salvar = one("salvar");
  const [quiz, result] = salvar?.split("/") ?? [];
  const q = quiz ? getQuiz(quiz) : undefined;
  const pending = q && result ? getResult(q, result) : undefined;
  const c = copy[mode];
  const qs = new URLSearchParams({ ...(one("next") && { next }), ...(pending && { salvar }) }).toString();

  return (
    <div className="flex flex-col gap-4">
      {pending && (
        <p className="rounded-xl border-2 border-noite bg-azul px-5 py-3.5 text-creme">
          Seu resultado <strong>{pending.name}</strong> vai direto pro seu diário de bordo.
        </p>
      )}
      <AuthForm mode={mode} next={next} salvar={pending ? salvar : undefined} />
      <p className="text-tinta">
        {c.switchText}{" "}
        <Link href={`${c.switchHref}${qs ? `?${qs}` : ""}`} className="font-bold text-azul">{c.switchLabel}</Link>
      </p>
    </div>
  );
}
