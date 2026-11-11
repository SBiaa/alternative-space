"use client";

import Image from "next/image";
import { useState } from "react";
import { site } from "@/config/site";

type Peca = { name: string; image: string | null };

// "Personalize a sua": a pessoa escolhe a peça em branco, conta a ideia e manda pelo WhatsApp ou pelo direct.
export function Personalize({ pecas, passos }: { pecas: Peca[]; passos: string[] }) {
  const [peca, setPeca] = useState(pecas[0]?.name ?? "");
  const [ideia, setIdeia] = useState("");

  const numero = site.links.whatsapp.replace(/\D/g, "");
  const mensagem = `Oi! Quero personalizar uma ${peca.toLowerCase()}.${ideia.trim() ? ` Ideia: ${ideia.trim()}` : ""}`;
  const whatsapp = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : "";
  const direct = site.links.instagram;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-9 rounded-lg border-[1.5px] border-dashed border-laranja-claro p-[clamp(20px,3vw,36px)]">
      <div className="flex flex-col gap-4">
        <span className="etiqueta text-laranja-claro">Personalize a sua</span>
        <h2 id="personalize-titulo" className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-[1.08] tracking-[-0.015em]">Você imagina, a gente materializa.</h2>
        <ol className="mt-1 flex list-none flex-col gap-3 p-0 text-base">
          {passos.map((s, i) => (
            <li key={s} className="flex gap-3.5">
              <span className="pt-0.5 font-ficha text-[13px] text-laranja-claro">{String(i + 1).padStart(2, "0")}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-4">
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-sm font-medium">1. Escolhe a peça</legend>
          <div className="grid grid-cols-3 gap-2.5">
            {pecas.map((p) => {
              const ativa = peca === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => setPeca(p.name)}
                  className={`flex cursor-pointer flex-col gap-2 overflow-hidden rounded-lg pb-2.5 text-left ${ativa ? "border-2 border-laranja-claro bg-creme-claro text-noite" : "border border-creme/40 bg-creme/5 text-creme hover:border-creme/70"}`}
                >
                  {p.image ? (
                    <span className="relative block aspect-square w-full bg-white">
                      <Image src={p.image} alt="" fill sizes="160px" className="object-cover" />
                    </span>
                  ) : (
                    <span className="flex aspect-square w-full items-center justify-center bg-cabine px-2 text-center font-ficha text-[11px] text-poeira">foto em breve</span>
                  )}
                  <span className="px-2.5 text-sm font-semibold">{p.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          2. Conta a ideia
          <textarea
            rows={3}
            value={ideia}
            onChange={(e) => setIdeia(e.target.value)}
            maxLength={500}
            placeholder="Personagem, frase, cores, referência… ou avisa que vai mandar a arte"
            className="resize-y rounded-md border border-creme/40 bg-cabine p-3 text-[15px] font-normal text-creme placeholder:text-poeira"
          />
        </label>

        {whatsapp || direct ? (
          <div className="flex flex-wrap gap-2.5">
            {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn bg-laranja text-noite">Pedir pelo WhatsApp</a>}
            {direct && <a href={direct} target="_blank" rel="noopener noreferrer" className="btn btn-fantasma">Mandar no direct</a>}
          </div>
        ) : (
          <p className="m-0 text-sm text-areia">Os pedidos personalizados abrem em breve pelo WhatsApp e pelo direct.</p>
        )}
      </div>
    </div>
  );
}
