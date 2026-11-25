"use client";

import { useState, useTransition, type FormEvent } from "react";
import { darPetisco, renomearBichinho, usarAcessorio } from "@/app/actions/bichinho";
import { ACESSORIOS, MECANICA, TEXTOS, type Slot } from "@/lib/bichinho/config";
import type { PetView } from "@/lib/bichinho/dados";
import { BarrasDoBichinho } from "./BarrasDoBichinho";
import { JanelaBichinho } from "./JanelaBichinho";
import "./bichinho.css";

// Página do bichinho: só pede coisas ao servidor (petisco, acessório, nome). Barras e fase vêm de lá, prontas.
export function PaginaBichinho({ pet }: { pet: PetView }) {
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [toque, setToque] = useState(0);

  const roda = (fn: () => Promise<{ error?: string; mensagem?: string }>) =>
    comecar(async () => {
      const r = await fn();
      setAviso(r.error ? { texto: r.error, erro: true } : r.mensagem ? { texto: r.mensagem, erro: false } : null);
    });

  const tocar = () => {
    const resp = TEXTOS.tocar.respostas;
    setToque((t) => t + 1);
    setAviso({ texto: resp[toque % resp.length], erro: false });
  };

  const renomear = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const nome = String(new FormData(ev.currentTarget).get("nome") ?? "");
    roda(() => renomearBichinho({ nome }));
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
      <div className="flex flex-col items-center gap-3">
        <JanelaBichinho especie={pet.especie} fase={pet.fase} humor={pet.humor} nome={pet.nome} equipados={pet.equipados} toque={toque} />
        <p className="m-0 text-center font-ficha text-xs text-areia">
          {TEXTOS.faseRotulo}: {pet.fraseFase} · {TEXTOS.humor[pet.humor]}
          {pet.proximaFaseXp !== null && ` · ${pet.xp}/${pet.proximaFaseXp} XP`}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-2xl font-semibold">{pet.nome}</h2>
          <p className="m-0 text-areia">{pet.voltou ? TEXTOS.boasVindas : pet.frase}</p>
        </div>

        <div className="bic-card p-4">
          <BarrasDoBichinho stats={pet.stats} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="bic-btn" disabled={pendente || !pet.petiscoDisponivel} onClick={() => roda(() => darPetisco())}>
            {pet.petiscoDisponivel ? TEXTOS.petisco.botao : TEXTOS.petisco.rotulo}
          </button>
          <button type="button" className="bic-btn-sec" onClick={tocar}>
            {TEXTOS.tocar.botao}
          </button>
          {!pet.petiscoDisponivel && <span className="text-sm text-areia">{TEXTOS.petisco.feito}</span>}
        </div>
        <p role="status" aria-live="polite" className={`m-0 min-h-6 text-sm ${aviso?.erro ? "text-laranja-claro" : "text-areia"}`}>
          {aviso?.texto}
        </p>

        <section aria-labelledby="bic-acess" className="flex flex-col gap-3">
          <h3 id="bic-acess" className="m-0 text-lg font-semibold">
            {TEXTOS.acessorios.titulo}
          </h3>
          {pet.liberados.length === 0 && <p className="m-0 text-sm text-areia">{TEXTOS.acessorios.vazio}</p>}
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {ACESSORIOS.map((a) => {
              const liberado = pet.liberados.includes(a.slug);
              const emUso = pet.equipados[a.slot] === a.slug;
              const troca = (slug: string | null, slot: Slot) => roda(() => usarAcessorio({ slot, slug }));
              return (
                <li key={a.slug} className="bic-card flex flex-col gap-2 p-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-creme">{a.nome}</span>
                    <span className="text-xs text-areia">
                      {TEXTOS.acessorios.slot[a.slot]} · {a.descricao}
                    </span>
                  </div>
                  {liberado ? (
                    <button type="button" className={emUso ? "bic-btn-sec" : "bic-btn"} disabled={pendente} aria-pressed={emUso} onClick={() => troca(emUso ? null : a.slug, a.slot)}>
                      {emUso ? `${TEXTOS.acessorios.equipado} · ${TEXTOS.acessorios.tirar}` : TEXTOS.acessorios.equipar}
                    </button>
                  ) : (
                    <p className="m-0 text-sm text-areia">
                      <span aria-hidden="true">🔒 </span>
                      {TEXTOS.acessorios.bloqueado}: {a.dica}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <form onSubmit={renomear} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-areia">
            {TEXTOS.renomear.rotulo}
            <input name="nome" defaultValue={pet.nome} maxLength={MECANICA.nomeMax} required className="bic-campo" />
          </label>
          <button type="submit" className="bic-btn-sec" disabled={pendente}>
            {TEXTOS.renomear.botao}
          </button>
        </form>
      </div>
    </div>
  );
}
