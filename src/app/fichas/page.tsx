import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CharacterCardActions } from "@/components/fichas/characters/CharacterCardActions";
import { LocalImportBanner } from "@/components/fichas/characters/LocalImportBanner";
import { NewCharacterButton, NewPathfinderButton } from "@/components/fichas/characters/NewCharacterButton";
import { sistemasFicha } from "@/config/fichas";
import { getUser } from "@/lib/auth/server";
import { listCharacters, type CharacterSummary } from "@/lib/fichas/server/characters";

export const metadata: Metadata = {
  title: "Fichas",
  description: "Crie a ficha do seu personagem de RPG passo a passo, guarde na sua conta e jogue em time.",
};

export default function Page() {
  return (
    <section className="px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-9">
        <div className="flex max-w-[720px] flex-col gap-1.5">
          <span className="etiqueta text-[11px] text-laranja-claro sm:text-xs">Fichas</span>
          <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">Sua ficha, sem sofrimento.</h1>
          <p className="text-base text-areia">Escolhe o sistema e monta o personagem passo a passo. Mais sistemas chegando.</p>
        </div>

        <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 p-0">
          {sistemasFicha.map((s) => (
            <li key={s.slug}>
              <Link href={`/fichas/${s.slug}`} className="painel flex h-full flex-col gap-2 p-6 no-underline">
                <span className="etiqueta text-[11px] text-azul">{s.tagline}</span>
                <span className="text-[26px] font-bold leading-[1.1] tracking-[-0.015em] text-azul">{s.name}</span>
                <span className="leading-relaxed text-tinta">{s.text}</span>
                <span className="btn mt-3 self-start bg-laranja !px-4 !py-2.5 !text-[15px] text-noite">Criar ficha</span>
              </Link>
            </li>
          ))}
        </ul>

        <Suspense fallback={<ListSkeleton />}>
          <MinhasFichas />
        </Suspense>
      </div>
    </section>
  );
}

async function MinhasFichas() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex max-w-[560px] flex-col gap-1">
          <h2 className="text-xl font-semibold">Guarde suas fichas na sua conta</h2>
          <p className="text-areia">
            Sem conta, a ficha fica só neste navegador. Com conta, ela vai com você, entra no modo de jogo e pode ir pra um time.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/entrar?next=/fichas" className="btn btn-fantasma !px-4 !py-2.5 !text-[15px]">Entrar</Link>
          <Link href="/cadastro" className="btn bg-laranja !px-4 !py-2.5 !text-[15px] text-noite">Criar conta</Link>
        </div>
      </div>
    );
  }

  const list = await listCharacters();
  return (
    <section aria-labelledby="minhas-fichas" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="minhas-fichas" className="text-2xl font-semibold tracking-[-0.015em]">Minhas fichas</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/fichas/times" className="btn btn-fantasma !px-4 !py-2.5 !text-[15px]">Times</Link>
          <NewCharacterButton />
          <NewPathfinderButton />
        </div>
      </div>
      <LocalImportBanner />
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-8 text-center text-muted">
          Nenhuma ficha ainda. Clique em <strong className="text-ink">Nova ficha</strong> de um dos sistemas pra criar a primeira.
        </p>
      ) : (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

const NOME_SISTEMA: Record<string, string> = Object.fromEntries(
  sistemasFicha.map((s) => [s.id, s.name.split(" ")[0]]),
);

const STATUS_LABEL: Record<CharacterSummary["status"], string> = {
  draft: "Em criação",
  active: "Em jogo",
  retired: "Aposentada",
};

const updatedFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function CharacterCard({ character: c }: { character: CharacterSummary }) {
  return (
    <li className="card flex flex-col p-4 transition hover:border-accent/50">
      <Link href={`/fichas/${c.id}`} className="flex-1 text-ink no-underline">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-display text-xl font-semibold">{c.name}</h3>
          <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 text-xs text-muted">{STATUS_LABEL[c.status]}</span>
        </div>
        <p className="text-sm text-muted">
          <span className="etiqueta mr-1.5 text-[10px] text-accent">{NOME_SISTEMA[c.system] ?? c.system}</span>
          {c.role}
        </p>
        <p className="mt-3 text-xs text-faint">Atualizada em {updatedFormat.format(c.updatedAt)}</p>
      </Link>
      <CharacterCardActions id={c.id} name={c.name} />
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card h-36 animate-pulse" />
      ))}
    </div>
  );
}
