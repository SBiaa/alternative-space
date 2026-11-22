"use client";

import Link from "next/link";
import { PRODUTOS, eventoDe, produtoDe } from "@/lib/banca/config";
import { RESUMO, ROTULO_PRODUTO } from "@/lib/banca/conteudo";
import { lerItem } from "@/lib/banca/mesa";
import type { RegistroEvento } from "@/lib/banca/tipos";
import { nomeDoItem, ProdutoIcone } from "./ProdutoIcone";

const BASE = "/jogos/banca-na-feira";

export type ResumoSalvo = { registro: RegistroEvento; subiu: boolean };

/** Resumo do evento: vendas por produto, lucro, desistências, reputação e o produto mais procurado. */
export function ResumoView({ registro: r, subiu }: ResumoSalvo) {
  const def = eventoDe(r.evento);
  const porProduto = PRODUTOS.map((p) => ({
    p,
    itens: Object.entries(r.vendas).filter(([k]) => lerItem(k)?.produto === p.slug),
  })).filter((x) => x.itens.length > 0);
  const noAzul = r.lucro >= 0;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 text-2xl font-semibold">{RESUMO.titulo}{def ? ` · ${def.nome}` : ""}</h2>
      {r.tranquilo && <p className="m-0 w-fit rounded-[4px] border border-creme/30 px-2 py-1 text-sm">{RESUMO.tranquilo}</p>}

      <p className={`m-0 text-lg font-semibold ${noAzul ? "text-bege-fosforo" : "text-laranja-claro"}`} role="status">
        {noAzul ? "▲ " : "▼ "}{noAzul ? RESUMO.noAzul : RESUMO.noVermelho}
      </p>

      <dl className="surface-vidro m-0 grid grid-cols-2 gap-x-6 gap-y-2 p-4 sm:grid-cols-3">
        <Linha rotulo={RESUMO.receita} valor={`R$ ${r.receita}`} />
        <Linha rotulo={RESUMO.taxa} valor={`− R$ ${r.custos.taxa}`} />
        <Linha rotulo={RESUMO.material} valor={`− R$ ${r.custos.material}`} />
        {r.custos.maquininha > 0 && <Linha rotulo={RESUMO.maquininha} valor={`− R$ ${r.custos.maquininha}`} />}
        <Linha rotulo={RESUMO.lucro} valor={`${r.lucro >= 0 ? "+" : "−"} R$ ${Math.abs(r.lucro)}`} forte />
        <Linha rotulo={RESUMO.visitantes} valor={String(r.visitantes)} />
        <Linha rotulo={RESUMO.desistiram} valor={String(r.desistiram)} />
        <Linha rotulo={RESUMO.trocas} valor={String(r.trocas)} />
        <Linha rotulo={RESUMO.reputacao} valor={`${r.reputacaoFim.toFixed(2)} ★`} />
        <Linha rotulo={RESUMO.maisProcurado} valor={r.maisProcurado ? produtoDe(r.maisProcurado)!.nome : "—"} />
      </dl>
      {!r.maisProcurado && <p className="m-0 text-sm text-areia">{RESUMO.nenhumProcurado}</p>}
      {subiu && <p className="m-0 font-semibold text-bege-fosforo" role="status">{RESUMO.subiu}</p>}

      <section aria-labelledby="vendas" className="flex flex-col gap-2">
        <h3 id="vendas" className="m-0 text-lg font-semibold">{RESUMO.vendasPorProduto}</h3>
        {porProduto.length === 0 ? (
          <p className="m-0 text-areia">{RESUMO.semVendas}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {porProduto.map(({ p, itens }) => (
              <li key={p.slug} className="surface-vidro flex flex-col gap-2 p-3">
                <div className="flex justify-between">
                  <strong>{ROTULO_PRODUTO[p.slug]}</strong>
                  <span className="font-ficha">{itens.reduce((s, [, n]) => s + n, 0)}</span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                  {itens.map(([item, n]) => (
                    <li key={item} className="flex items-center gap-2">
                      <ProdutoIcone item={item} tamanho={24} />
                      <span className="flex-1">{nomeDoItem(item)}</span>
                      <span className="font-ficha">{n}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={`${BASE}/atelie`} className="botao-laranja inline-flex min-h-[44px] items-center no-underline">{RESUMO.proximo}</Link>
        <Link href={`${BASE}/melhorias`} className="botao-vidro inline-flex min-h-[44px] items-center no-underline">{RESUMO.melhorias}</Link>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-areia">{rotulo}</dt>
      <dd className={`m-0 font-ficha ${forte ? "text-2xl" : "text-lg"}`}>{valor}</dd>
    </div>
  );
}
