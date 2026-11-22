"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { iniciarPartida, migrarLocal } from "@/app/actions/bolso";
import { TEXTOS } from "@/lib/bolso/config";

export type PersonagemUI = { id: string | null; nome: string };

// Botões "Jogar com X". Logado, cada personagem tem o seu id; sem conta, a única personagem vem do cookie (id null).
export function IniciarPartida({ slug, personagens }: { slug: string; personagens: PersonagemUI[] }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function jogar(id: string | null) {
    setErro(null);
    comecar(async () => {
      const r = await iniciarPartida(slug, id ?? undefined);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {personagens.map((p) => (
          <li key={p.id ?? "local"}>
            <button type="button" className="btn bg-laranja min-h-11 w-full text-left text-noite" disabled={pendente} onClick={() => jogar(p.id)}>
              Jogar com {p.nome}
            </button>
          </li>
        ))}
      </ul>
      {erro && (
        <p role="alert" className="m-0 text-sm text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}

// Logo depois de criar a conta: leva a personagem e as partidas do navegador pra conta e recarrega a página.
export function MigrarLocal() {
  const router = useRouter();
  const feito = useRef(false);
  const [msg, setMsg] = useState<string>("Guardando o que você jogou na sua conta…");
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    migrarLocal().then((r) => {
      if (r.ok) router.refresh();
      else setMsg(r.erro);
    });
  }, [router]);
  return (
    <p role="status" className="surface-vidro m-0 p-3 text-sm text-creme">
      {msg}
    </p>
  );
}

export const AvisoSemConta = ({ next }: { next: string }) => (
  <aside className="surface-vidro flex flex-col gap-1 p-4 text-sm text-creme">
    <Link href={`/cadastro?next=${next}`} className="min-h-11 content-center font-semibold text-laranja-claro underline">
      {TEXTOS.semConta}
    </Link>
    <span className="text-areia">{TEXTOS.semContaExplica}</span>
  </aside>
);
