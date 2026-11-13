"use client";

import Link from "next/link";
import { useState } from "react";
import { denunciarPico } from "@/app/actions/role";
import { TEXTOS } from "@/lib/role/config";

// Botão "denunciar pico" com a escolha do motivo.
export function DenunciarPico({ slug, logado }: { slug: string; logado: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState<string>(TEXTOS.denuncia.motivos[0]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (aviso) return <p role="status" className="m-0 text-sm text-areia">{aviso}</p>;
  if (!logado) {
    return (
      <Link href={`/entrar?next=/jogos/role-noturno/pico/${slug}`} className="text-sm text-areia underline">
        {TEXTOS.denuncia.botao}
      </Link>
    );
  }
  if (!aberto) {
    return (
      <button type="button" className="min-h-11 self-start text-sm text-areia underline" onClick={() => setAberto(true)}>
        {TEXTOS.denuncia.botao}
      </button>
    );
  }
  return (
    <form
      className="surface-vidro flex flex-col gap-2 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setOcupado(true);
        const r = await denunciarPico(slug, motivo);
        setOcupado(false);
        setAviso(r.ok ? TEXTOS.denuncia.obrigado : r.erro);
      }}
    >
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 font-semibold">{TEXTOS.denuncia.titulo}</legend>
        {TEXTOS.denuncia.motivos.map((m) => (
          <label key={m} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name="motivo" className="size-5" checked={motivo === m} onChange={() => setMotivo(m)} />
            {m}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="botao-laranja min-h-11 px-4" disabled={ocupado}>
          {TEXTOS.denuncia.enviar}
        </button>
        <button type="button" className="botao-vidro min-h-11 px-4" onClick={() => setAberto(false)}>
          {TEXTOS.denuncia.cancelar}
        </button>
      </div>
    </form>
  );
}

export function ModerarPico({ id, status }: { id: string; status: string }) {
  const [estado, setEstado] = useState(status);
  const agir = async (acao: "esconder" | "liberar") => {
    const { moderarPico } = await import("@/app/actions/role");
    const r = await moderarPico(id, acao);
    if (r.ok) setEstado(acao === "esconder" ? "hidden" : "published");
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-ficha text-xs">{estado}</span>
      {estado !== "hidden" && (
        <button type="button" className="botao-laranja min-h-11 px-4" onClick={() => agir("esconder")}>
          {TEXTOS.admin.esconder}
        </button>
      )}
      <button type="button" className="botao-vidro min-h-11 px-4" onClick={() => agir("liberar")}>
        {TEXTOS.admin.liberar}
      </button>
    </div>
  );
}
