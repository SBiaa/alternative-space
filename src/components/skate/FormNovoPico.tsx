"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cadastrarSpot } from "@/app/actions/skate";
import { LIMITES, validarSpot } from "@/lib/skate/regras";
import { NOME_TIPO, OBSTACULOS, TIPOS_SPOT, type TipoSpot } from "@/lib/skate/tipos";
import { SeletorCliente } from "./MapaCliente";
import type { Ponto } from "./SeletorLocal";

// Cadastro de pico: marca no mapa, dá o nome e diz o que tem lá.
export function FormNovoPico() {
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [tipo, setTipo] = useState<TipoSpot>("pico");
  const [obstaculos, setObstaculos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const alternar = (o: string) => setObstaculos((l) => (l.includes(o) ? l.filter((x) => x !== o) : [...l, o]));

  function enviar(form: FormData) {
    const entrada = {
      tipo,
      nome: String(form.get("nome") ?? ""),
      descricao: String(form.get("descricao") ?? ""),
      cidade: String(form.get("cidade") ?? ""),
      lat: ponto?.lat ?? 0,
      lng: ponto?.lng ?? 0,
      obstaculos,
    };
    const v = validarSpot(entrada);
    if (!v.ok) return setErro(v.erro);
    setErro(null);
    iniciar(async () => {
      const r = await cadastrarSpot(entrada);
      if (r.ok) setFeito(r.id);
      else setErro(r.erro);
    });
  }

  if (feito) {
    return (
      <div className="surface-vidro flex flex-col gap-3 p-5">
        <h2 className="m-0 font-titulo text-2xl font-semibold text-creme">Pico enviado!</h2>
        <p className="m-0 text-areia">A moderação vai dar uma olhada. Depois de aprovado ele aparece no mapa com o nome que você deu e o seu crédito de descoberta.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/skate/picos/${feito}`} className="botao-laranja inline-flex items-center no-underline">Ver meu pico</Link>
          <Link href="/skate/mapa" className="botao-vidro inline-flex items-center no-underline">Voltar pro mapa</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-5">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="rotulo mb-2 text-laranja-claro">Onde fica</legend>
        <SeletorCliente ponto={ponto} onEscolher={setPonto} />
        <p className="m-0 text-sm text-areia">
          {ponto ? `Marcado em ${ponto.lat.toFixed(5)}, ${ponto.lng.toFixed(5)}. Arraste o pino pra ajustar.` : "Toque no mapa pra marcar o lugar."}
        </p>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="rotulo mb-2 text-laranja-claro">O que é</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS_SPOT.map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)} aria-pressed={tipo === t} className={tipo === t ? "botao-laranja" : "botao-vidro"}>
              {NOME_TIPO[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="rotulo text-laranja-claro">Nome do pico</span>
        <input name="nome" required minLength={3} maxLength={LIMITES.nomeMax} placeholder="Você descobriu, você batiza" className="campo-vidro" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="rotulo text-laranja-claro">Cidade</span>
        <input name="cidade" required minLength={2} maxLength={LIMITES.cidadeMax} placeholder="Ex.: São Paulo" className="campo-vidro" />
      </label>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="rotulo mb-2 text-laranja-claro">O que tem lá</legend>
        <div className="flex flex-wrap gap-2">
          {OBSTACULOS.map((o) => (
            <button key={o} type="button" onClick={() => alternar(o)} aria-pressed={obstaculos.includes(o)} className={`botao-vidro text-sm ${obstaculos.includes(o) ? "!border-laranja-claro !text-laranja-claro" : ""}`}>
              {o}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="rotulo text-laranja-claro">Dicas (opcional)</span>
        <textarea name="descricao" rows={4} maxLength={LIMITES.descricaoMax} placeholder="Piso, melhor horário, se o segurança implica…" className="campo-vidro" />
      </label>

      {erro && (
        <p role="alert" className="m-0 rounded-md border border-[#ff8f80] px-3 py-2 text-[#ff8f80]">
          {erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className="botao-laranja self-start">
        {enviando ? "Enviando…" : "Cadastrar pico"}
      </button>
    </form>
  );
}
