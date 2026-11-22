"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarPersonagemAcao } from "@/app/actions/bolso";
import { ATRIBUTOS, BASE, REGRAS, RETRATO, TALENTOS, type AtributoId } from "@/lib/bolso/config";
import { personagemPadrao, type Personagem } from "@/lib/bolso/personagem";
import { Retrato } from "./Retrato";

type Retr = Personagem["retrato"];

const SELETORES: { campo: keyof Retr; rotulo: string; opcoes: readonly { id: string; nome: string }[] }[] = [
  { campo: "rosto", rotulo: "Rosto", opcoes: RETRATO.rosto },
  { campo: "pele", rotulo: "Pele", opcoes: RETRATO.pele },
  { campo: "cabelo", rotulo: "Cabelo", opcoes: RETRATO.cabelo },
  { campo: "cabeloCor", rotulo: "Cor do cabelo", opcoes: RETRATO.cabeloCor },
  { campo: "roupaCor", rotulo: "Cor da roupa", opcoes: RETRATO.roupaCor },
  { campo: "acessorio", rotulo: "Acessório", opcoes: RETRATO.acessorio },
];

const INICIAL: Personagem = { ...personagemPadrao(), attrs: { corpo: REGRAS.atributoMin, mente: REGRAS.atributoMin, labia: REGRAS.atributoMin } };

// Criação rápida: nome, 3 atributos (pontos pra distribuir), 2 talentos e retrato com peças próprias.
export function CriarPersonagem({ volta, logado }: { volta?: string; logado: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<Personagem>(INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const usados = ATRIBUTOS.reduce((s, a) => s + p.attrs[a.id], 0);
  const livres = REGRAS.atributoPontos - usados;
  const mexer = (id: AtributoId, d: number) => setP((x) => ({ ...x, attrs: { ...x.attrs, [id]: x.attrs[id] + d } }));
  const alternar = (id: string) =>
    setP((x) => ({ ...x, talentos: x.talentos.includes(id) ? x.talentos.filter((t) => t !== id) : x.talentos.length < REGRAS.talentosEscolhidos ? [...x.talentos, id] : x.talentos }));

  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await criarPersonagemAcao(p);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      router.push(volta ?? (logado && r.id ? `${BASE}/personagens/${r.id}` : `${BASE}/personagens`));
      router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="surface-creme flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Retrato retrato={p.retrato} nome={p.nome} tamanho={112} />
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm font-medium">
          Nome da personagem
          <input className="campo" value={p.nome} maxLength={REGRAS.nomeMax} required autoComplete="off" onChange={(e) => setP({ ...p, nome: e.target.value })} />
        </label>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-base font-semibold">
          Atributos <span className="font-ficha text-sm font-normal">· pontos pra distribuir: {livres}</span>
        </legend>
        {ATRIBUTOS.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span id={`attr-${a.id}`} className="text-sm font-medium">{a.nome}</span>
              <span className="text-xs text-neutro">{a.dica}</span>
            </div>
            <div className="flex items-center gap-2" role="group" aria-labelledby={`attr-${a.id}`}>
              <button type="button" className="btn btn-contorno min-h-11 min-w-11 p-0" aria-label={`Diminuir ${a.nome}`} disabled={p.attrs[a.id] <= REGRAS.atributoMin} onClick={() => mexer(a.id, -1)}>
                −
              </button>
              <output className="w-8 text-center font-ficha text-lg" aria-live="polite">{p.attrs[a.id]}</output>
              <button type="button" className="btn btn-contorno min-h-11 min-w-11 p-0" aria-label={`Aumentar ${a.nome}`} disabled={p.attrs[a.id] >= REGRAS.atributoMax || livres <= 0} onClick={() => mexer(a.id, 1)}>
                +
              </button>
            </div>
          </div>
        ))}
        <p className="m-0 text-xs text-neutro">Cada atributo vai de {REGRAS.atributoMin} a {REGRAS.atributoMax}. Use todos os {REGRAS.atributoPontos} pontos.</p>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-base font-semibold">
          Talentos <span className="font-ficha text-sm font-normal">· escolha {REGRAS.talentosEscolhidos} ({p.talentos.length}/{REGRAS.talentosEscolhidos})</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TALENTOS.map((t) => {
            const marcado = p.talentos.includes(t.id);
            const cheio = !marcado && p.talentos.length >= REGRAS.talentosEscolhidos;
            return (
              <label key={t.id} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-noite p-2 text-sm ${marcado ? "bg-creme-escuro font-medium" : ""} ${cheio ? "opacity-60" : ""}`}>
                <input type="checkbox" className="mt-1 size-4" checked={marcado} disabled={cheio} onChange={() => alternar(t.id)} />
                <span>
                  {t.nome}
                  <span className="block text-xs font-normal text-neutro">{t.dica}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 grid gap-3 border-0 p-0 sm:grid-cols-2">
        <legend className="mb-1 p-0 text-base font-semibold">Retrato</legend>
        {SELETORES.map((s) => (
          <label key={s.campo} className="flex flex-col gap-1 text-sm font-medium">
            {s.rotulo}
            <select className="campo" value={p.retrato[s.campo]} onChange={(e) => setP({ ...p, retrato: { ...p.retrato, [s.campo]: e.target.value } })}>
              {s.opcoes.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>

      {erro && (
        <p role="alert" className="m-0 rounded-md border border-estrela p-3 text-sm text-estrela">
          {erro}
        </p>
      )}
      <button type="submit" className="btn bg-laranja min-h-11 text-noite" disabled={pendente || livres !== 0 || p.talentos.length !== REGRAS.talentosEscolhidos || !p.nome.trim()}>
        {pendente ? "Guardando…" : "Criar personagem"}
      </button>
      <p className="m-0 text-xs text-neutro" aria-live="polite">
        {livres !== 0 ? `Falta distribuir ${livres} ${livres === 1 ? "ponto" : "pontos"}. ` : ""}
        {p.talentos.length !== REGRAS.talentosEscolhidos ? `Escolha mais ${REGRAS.talentosEscolhidos - p.talentos.length} talento(s). ` : ""}
        {!p.nome.trim() ? "Dê um nome pra personagem." : ""}
      </p>
    </form>
  );
}
