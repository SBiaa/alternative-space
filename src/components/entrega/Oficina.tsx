"use client";

import { useState, useTransition } from "react";
import { comprarImplante, equiparImplante } from "@/app/actions/entrega";
import { ENTREGA, TEXTOS } from "@/lib/entrega/config";

const T = TEXTOS.oficina_;

export type ImplanteOficina = { slug: string; name: string; description: string; maxLevel: number; prices: number[]; level: number; equipped: boolean };

export function Oficina({ implantes, saldo, logado }: { implantes: ImplanteOficina[]; saldo: number; logado: boolean }) {
  const [sel, setSel] = useState(implantes[0]?.slug ?? "");
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const equipados = implantes.filter((i) => i.equipped).length;
  const atual = implantes.find((i) => i.slug === sel);

  const agir = (f: () => Promise<{ ok: boolean; erro?: string }>) =>
    comecar(async () => {
      const r = await f();
      setAviso(r.ok ? null : (r.erro ?? TEXTOS.erros.generico));
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 font-ficha text-lg">
          {T.creditos}: <strong>{saldo}</strong>
        </p>
        <p className="m-0 font-ficha text-sm text-areia">
          {T.equipados}: {equipados}/{ENTREGA.equipadosMax}
        </p>
      </div>
      <p className="m-0 text-sm text-areia">ⓘ {T.aviso}</p>
      {!logado && <p className="surface-vidro m-0 p-3 text-sm">{T.semConta}</p>}

      {atual && (
        <section className="surface-creme flex flex-col gap-3 p-5" aria-live="polite">
          <h2 className="m-0 text-xl font-semibold text-azul">{atual.name}</h2>
          <p className="m-0">{atual.description}</p>
          <p className="rotulo m-0" aria-label={`${TEXTOS.turno.nivel} ${atual.level}/${atual.maxLevel}`}>
            {"◆".repeat(atual.level)}
            {"◇".repeat(atual.maxLevel - atual.level)} · {TEXTOS.turno.nivel} {atual.level}/{atual.maxLevel}
            {atual.equipped ? ` · ✓ ${T.equipados.toLowerCase()}` : ""}
          </p>
          {logado && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="botao-laranja"
                disabled={pendente || atual.level >= atual.maxLevel}
                onClick={() => agir(() => comprarImplante(atual.slug))}
              >
                {atual.level >= atual.maxLevel ? T.nivelMax : `${T.comprar} ${atual.level + 1} · ${atual.prices[atual.level]} ${T.creditos.toLowerCase()}`}
              </button>
              {atual.level > 0 && (
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-noite px-4 font-semibold text-noite"
                  disabled={pendente}
                  onClick={() => agir(() => equiparImplante(atual.slug, !atual.equipped))}
                >
                  {atual.equipped ? T.desequipar : T.equipar}
                </button>
              )}
            </div>
          )}
          {aviso && (
            <p role="alert" className="m-0 text-sm font-semibold">
              ⚠ {aviso}
            </p>
          )}
        </section>
      )}

      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {implantes.map((i) => (
          <li key={i.slug}>
            <button
              type="button"
              aria-pressed={i.slug === sel}
              onClick={() => {
                setSel(i.slug);
                setAviso(null);
              }}
              className={`surface-vidro flex min-h-11 w-full flex-col gap-1 p-4 text-left text-creme ${i.slug === sel ? "outline outline-2 outline-laranja-claro" : ""}`}
            >
              <span className="font-semibold">
                {i.name} {i.equipped && <span className="rotulo text-laranja-claro">✓ {T.equipados}</span>}
              </span>
              <span className="font-ficha text-xs text-areia">
                {"◆".repeat(i.level)}
                {"◇".repeat(i.maxLevel - i.level)} {i.level < i.maxLevel ? `· ${i.prices[i.level]} ${T.creditos.toLowerCase()}` : `· ${T.nivelMax}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
