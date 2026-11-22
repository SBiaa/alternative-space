"use client";

import Link from "next/link";
import { useState } from "react";
import { MELHORIAS } from "@/lib/banca/config";
import { ATELIE, MELHORIAS_TXT, TEXTOS } from "@/lib/banca/conteudo";
import { nivelDe } from "@/lib/banca/economia";
import type { Efeito } from "@/lib/banca/tipos";
import { useBanca, type Inicial } from "./useBanca";

const BASE = "/jogos/banca-na-feira";

/** Texto do que cada nível faz, montado dos números da config. */
function descreverEfeito(e: Efeito): string {
  const p: string[] = [];
  if (e.colunas && e.linhas) p.push(`mesa de ${e.colunas} por ${e.linhas} espaços`);
  if (e.expositor) p.push(`${e.expositor} espaços no expositor`);
  if (e.maquininha) p.push("aceita cartão, sem troco");
  if (e.visBonus) p.push(`+${Math.round(e.visBonus * 100)}% de visibilidade na mesa`);
  if (e.atencao) p.push(`visitantes olham +${e.atencao} ${e.atencao === 1 ? "espaço" : "espaços"}`);
  if (e.diasAtelie) p.push(`+${e.diasAtelie} ${e.diasAtelie === 1 ? "dia" : "dias"} de ateliê por semana`);
  if (e.reposMult !== undefined && e.reposMult < 1) p.push("repõe a mesa em metade do tempo");
  return p.join(" · ");
}

export function BancaMelhorias({ inicial }: { inicial: Inicial }) {
  const t = useBanca(inicial);
  const { prog } = t;
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (!t.pronto) return <p className="text-areia">{TEXTOS.carregando}</p>;
  if (!prog) return <Link href={BASE} className="botao-laranja inline-flex min-h-[44px] w-fit items-center no-underline">{TEXTOS.nova}</Link>;

  const comprar = async (slug: string) => {
    setOcupado(true);
    const r = await t.comprar(slug);
    setOcupado(false);
    setMsg(r.ok ? { ok: true, texto: MELHORIAS_TXT.comprada } : { ok: false, texto: r.erro });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-vidro flex flex-wrap items-center gap-x-6 gap-y-2 p-3">
        <span className="font-ficha text-lg" aria-label={ATELIE.caixa}>R$ {prog.dinheiro}</span>
        <span className="font-ficha" aria-label={ATELIE.reputacao}>★ {prog.reputacao.toFixed(2)}</span>
        <Link href={`${BASE}/atelie`} className="botao-laranja ml-auto inline-flex min-h-[44px] items-center no-underline">{ATELIE.titulo}</Link>
      </div>
      <p className={`m-0 min-h-6 ${msg?.ok ? "text-bege-fosforo" : "text-danger"}`} role={msg?.ok ? "status" : "alert"}>{msg?.texto}</p>

      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {MELHORIAS.map((m) => {
          const nivel = nivelDe(prog, m.slug);
          const prox = m.niveis[nivel];
          const semRep = prox && prog.reputacao < prox.repMin;
          const semSaldo = prox && prog.dinheiro < prox.preco;
          return (
            <li key={m.slug} className="surface-vidro flex flex-col gap-2 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <strong className="text-lg">{m.nome}</strong>
                <span className="font-ficha text-xs text-areia">{MELHORIAS_TXT.nivel(nivel, m.niveis.length)}</span>
              </div>
              <p className="m-0 text-sm text-areia">{m.descricao}</p>
              {nivel > 0 && <p className="m-0 text-sm">Agora: {descreverEfeito(m.niveis[nivel - 1].efeito)}</p>}
              {prox ? (
                <>
                  <p className="m-0 text-sm">Próximo: {descreverEfeito(prox.efeito)}</p>
                  <p className="m-0 font-ficha">{MELHORIAS_TXT.preco(prox.preco)}</p>
                  {semRep && <p className="m-0 text-sm text-laranja-claro">{MELHORIAS_TXT.precisaRep(prox.repMin)}</p>}
                  {!semRep && semSaldo && <p className="m-0 text-sm text-laranja-claro">{MELHORIAS_TXT.semSaldo}</p>}
                  <button type="button" className="botao-laranja mt-auto min-h-[44px]" disabled={ocupado || Boolean(semRep) || Boolean(semSaldo)} onClick={() => comprar(m.slug)}>
                    {MELHORIAS_TXT.comprar}
                  </button>
                </>
              ) : (
                <p className="m-0 mt-auto font-semibold text-bege-fosforo">{MELHORIAS_TXT.maximo}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
