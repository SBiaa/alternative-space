"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { abandonarPartida, escolherOpcao } from "@/app/actions/bolso";
import { BASE, TEXTOS } from "@/lib/bolso/config";

export type OpcaoUI = {
  id: string;
  texto: string;
  bloqueada: boolean;
  motivo?: string;
  teste?: { atributo: string; dificuldade: number; talentoAjuda?: string };
};

// As opções da cena. O clique só manda o id da escolha: quem rola os dados e aplica o efeito é o servidor.
export function Partida({ slug, opcoes }: { slug: string; opcoes: OpcaoUI[] }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function escolher(id: string) {
    setErro(null);
    comecar(async () => {
      const r = await escolherOpcao(slug, id);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.terminou) router.push(`${BASE}/${slug}/fim`);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="m-0 text-base font-semibold text-creme">O que a sua personagem faz?</h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {opcoes.map((o) => (
          <li key={o.id} className="flex flex-col gap-1">
            <button
              type="button"
              className="btn btn-fantasma min-h-11 w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pendente || o.bloqueada}
              aria-describedby={o.bloqueada || o.teste ? `info-${o.id}` : undefined}
              onClick={() => escolher(o.id)}
            >
              {o.texto}
            </button>
            {(o.bloqueada || o.teste) && (
              <p id={`info-${o.id}`} className="m-0 px-1 font-ficha text-xs text-areia">
                {o.bloqueada ? `Bloqueada · ${o.motivo}` : `Teste de ${o.teste!.atributo}, dificuldade ${o.teste!.dificuldade}${o.teste!.talentoAjuda ? ` · seu talento ${o.teste!.talentoAjuda} ajuda (+1)` : ""}`}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="m-0 min-h-5 text-sm text-areia" role="status">
        {pendente ? TEXTOS.rolando : ""}
      </p>
      {erro && (
        <p role="alert" className="m-0 rounded-md border border-danger p-3 text-sm text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}

// Depois de cada escolha, leva o foco pro título da nova cena (leitor de tela e teclado seguem de onde a história está).
export function FocarCena({ passos }: { passos: number }) {
  useEffect(() => {
    if (passos > 0) document.getElementById("cena-titulo")?.focus();
  }, [passos]);
  return null;
}

// "Recomeçar": larga a partida em andamento. Pede um segundo toque pra ninguém perder a aventura sem querer.
export function Recomecar({ slug, rotulo = "Largar esta partida", confirmar = true }: { slug: string; rotulo?: string; confirmar?: boolean }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [certeza, setCerteza] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function largar() {
    comecar(async () => {
      const r = await abandonarPartida(slug);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      router.push(`${BASE}/${slug}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {!certeza ? (
        <button type="button" className="btn btn-fantasma min-h-11 px-4 py-2 text-sm" onClick={() => (confirmar ? setCerteza(true) : largar())}>
          {rotulo}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar">
          <span className="text-sm text-areia">O progresso desta partida será perdido. Tem certeza?</span>
          <button type="button" className="btn bg-laranja min-h-11 px-4 py-2 text-sm text-noite" disabled={pendente} onClick={largar}>
            Sim, largar
          </button>
          <button type="button" className="btn btn-fantasma min-h-11 px-4 py-2 text-sm" onClick={() => setCerteza(false)}>
            Voltar
          </button>
        </div>
      )}
      {erro && (
        <p role="alert" className="m-0 text-sm text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}
