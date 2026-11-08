"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { usarPirata, type FormState } from "@/app/actions/perfil";
import { CATEGORIAS, PADRAO, codigoPirata, lerPirata, nomePirata, recompensa, sortearPirata, type Categoria, type Pirata } from "@/lib/pirata";
import { PirataArt } from "./PirataArt";

const CHAVE = "monte-seu-pirata:atual";

function guardar(p: Pirata) {
  try {
    localStorage.setItem(CHAVE, codigoPirata(p));
  } catch {}
}

type Props = { logado: boolean; inicial: string | null };

export function MonteSeuPirata({ logado, inicial }: Props) {
  const [pirata, setPirata] = useState<Pirata>(() => lerPirata(inicial) ?? PADRAO);
  const [aba, setAba] = useState<Categoria>("chapeu");
  const [status, setStatus] = useState<FormState>(null);
  const [salvando, startSalvar] = useTransition();
  const [salvo, setSalvo] = useState(inicial);
  const palco = useRef<HTMLDivElement>(null);

  // Sem pirata na conta, retoma o que a pessoa estava montando (por exemplo, antes de entrar).
  useEffect(() => {
    if (lerPirata(inicial)) return;
    let guardado: Pirata | null = null;
    try {
      guardado = lerPirata(localStorage.getItem(CHAVE));
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    if (guardado) setPirata(guardado);
  }, [inicial]);

  const trocar = (p: Pirata) => {
    setPirata(p);
    setStatus(null);
    guardar(p);
  };

  const codigo = codigoPirata(pirata);
  const categoria = CATEGORIAS.find((c) => c.id === aba)!;
  const jaEhAvatar = salvo === codigo;

  const salvar = () =>
    startSalvar(async () => {
      const r = await usarPirata(codigo);
      setStatus(r);
      if (r?.ok) setSalvo(codigo);
    });

  const baixar = async () => {
    const svg = palco.current?.querySelector("svg");
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 800;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#093f7a";
    ctx.fillRect(0, 0, 800, 800);
    ctx.drawImage(img, 0, 0, 800, 800);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${nomePirata(pirata).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      {/* Cartaz de procura-se */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-noite bg-creme-claro p-6 text-center shadow-duro sm:p-8 lg:sticky lg:top-24">
        <span className="font-titulo text-[clamp(2rem,5vw,2.8rem)] font-bold leading-none tracking-wide text-estrela">PROCURA-SE</span>
        <div ref={palco} className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-full border-[3px] border-noite bg-azul">
          <PirataArt p={pirata} title={nomePirata(pirata)} className="absolute inset-0 size-full" />
        </div>
        <div className="flex flex-col gap-1" aria-live="polite">
          <span className="font-titulo text-2xl font-bold leading-tight text-noite">{nomePirata(pirata)}</span>
          <span className="font-ficha text-sm text-neutro">
            Recompensa: {recompensa(pirata).toLocaleString("pt-BR")} dobrões
          </span>
        </div>
      </div>

      {/* Peças */}
      <div className="flex flex-col gap-5">
        <div role="tablist" aria-label="Peças do pirata" className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={aba === c.id}
              aria-controls="pecas"
              onClick={() => setAba(c.id)}
              className={`rounded-full border-2 border-noite px-4 py-2 font-titulo text-base font-bold transition-colors ${
                aba === c.id ? "bg-noite text-creme" : "bg-creme-claro text-noite hover:bg-creme-escuro"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>

        <div id="pecas" role="tabpanel" aria-label={categoria.nome} className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3">
          {categoria.opcoes.map((nome, i) => {
            const ativo = pirata[aba] === i;
            return (
              <button
                key={nome}
                type="button"
                aria-pressed={ativo}
                onClick={() => trocar({ ...pirata, [aba]: i })}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-noite p-2 transition-transform hover:-translate-y-0.5 ${
                  ativo ? "bg-laranja-claro shadow-duro-sm" : "bg-creme-claro"
                }`}
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-azul">
                  <PirataArt p={{ ...pirata, [aba]: i }} className="absolute inset-0 size-full" />
                </span>
                <span className="font-ficha text-[12px] leading-tight text-noite">{nome}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="button" onClick={() => trocar(sortearPirata())} className="btn bg-creme-claro text-noite">
            🎲 Sortear
          </button>
          <button type="button" onClick={baixar} className="btn bg-creme-claro text-noite">
            Baixar imagem
          </button>
          {logado ? (
            <button type="button" onClick={salvar} disabled={salvando || jaEhAvatar} className="btn bg-laranja text-noite disabled:opacity-60">
              {salvando ? "Salvando…" : jaEhAvatar ? "✓ É seu avatar" : "Usar como avatar"}
            </button>
          ) : (
            <Link href="/entrar?next=/jogos/monte-seu-pirata" className="btn bg-laranja text-noite no-underline">
              Entrar pra usar como avatar
            </Link>
          )}
        </div>
        <p role="status" aria-live="polite" className={`min-h-6 text-sm font-medium ${status?.error ? "text-estrela" : "text-azul"}`}>
          {status?.error}
          {status?.ok && (
            <>
              ✓ {status.ok}{" "}
              <Link href="/conta" className="font-bold text-azul">
                Ver no diário →
              </Link>
            </>
          )}
        </p>
        {!logado && <p className="text-sm text-neutro">Seu pirata fica guardado aqui no navegador enquanto você entra.</p>}
      </div>
    </div>
  );
}
