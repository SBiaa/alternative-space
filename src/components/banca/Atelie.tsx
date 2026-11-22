"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BANCA, PRODUTOS, TEMAS, produtoDe } from "@/lib/banca/config";
import { ATELIE, TEXTOS } from "@/lib/banca/conteudo";
import { calendario, custoDeProducao, diasLivres, listarEstoque } from "@/lib/banca/economia";
import { atributos, celulasDaMesa, layoutValido, precoDe } from "@/lib/banca/mesa";
import type { ItemKey, Layout, Progresso, ProdutoSlug } from "@/lib/banca/tipos";
import { Forma, nomeDoItem, ProdutoIcone } from "./ProdutoIcone";
import { useBanca, type Inicial } from "./useBanca";

const BASE = "/jogos/banca-na-feira";

export function Atelie({ inicial }: { inicial: Inicial }) {
  const t = useBanca(inicial);
  const { prog } = t;
  if (!t.pronto) return <p className="text-areia">{TEXTOS.carregando}</p>;
  if (!prog) return <Link href={BASE} className="botao-laranja inline-flex min-h-[44px] w-fit items-center no-underline">{TEXTOS.nova}</Link>;
  return <Conteudo t={t} prog={prog} />;
}

type T = ReturnType<typeof useBanca>;

function Conteudo({ t, prog }: { t: T; prog: Progresso }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const attrs = atributos(prog.melhorias);
  const livres = diasLivres(prog);
  const estoque = listarEstoque(prog);

  const rodar = async (f: () => Promise<{ ok: true } | { ok: false; erro: string }>, sucesso: string) => {
    setOcupado(true);
    const r = await f();
    setOcupado(false);
    setMsg(r.ok ? { ok: true, texto: sucesso } : { ok: false, texto: r.erro });
    return r.ok;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="surface-vidro flex flex-wrap items-center gap-x-6 gap-y-2 p-3">
        <span className="rotulo text-bege-fosforo">{ATELIE.semana(prog.semana)}</span>
        <span className="font-ficha text-lg" aria-label={ATELIE.caixa}>R$ {prog.dinheiro}</span>
        <span className="font-ficha" aria-label={ATELIE.reputacao}>★ {prog.reputacao.toFixed(2)}</span>
        <span className="text-sm text-areia">{ATELIE.dias(livres, attrs.diasAtelie)}</span>
        <Link href={`${BASE}/melhorias`} className="botao-vidro ml-auto inline-flex min-h-[44px] items-center no-underline">{ATELIE.melhorias}</Link>
      </div>

      <p className={`m-0 min-h-6 ${msg?.ok ? "text-bege-fosforo" : "text-danger"}`} role={msg?.ok ? "status" : "alert"}>{msg?.texto}</p>

      <Producao prog={prog} ocupado={ocupado} produzir={(p, tema, lotes) => rodar(() => t.produzir(p, tema, lotes), ATELIE.producaoFeita(custoDeProducao(p as ProdutoSlug, lotes).unidades, produtoDe(p)!.nome))} />

      <section aria-labelledby="estoque" className="flex flex-col gap-2">
        <h2 id="estoque" className="m-0 text-xl font-semibold">{ATELIE.estoque}</h2>
        {estoque.length === 0 ? (
          <p className="m-0 text-areia">{ATELIE.estoqueVazio}</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {estoque.map((e) => (
              <li key={e.item} className="surface-vidro flex items-center gap-3 p-2">
                <ProdutoIcone item={e.item} />
                <span className="flex-1">{nomeDoItem(e.item)}</span>
                <span className="font-ficha">{e.un}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Mesa key={JSON.stringify([prog.layout, prog.estoque.itens])} prog={prog} ocupado={ocupado} salvar={(l) => rodar(() => t.salvarLayout(l), ATELIE.mesaGuardada)} />

      <section aria-labelledby="calendario" className="flex flex-col gap-3">
        <h2 id="calendario" className="m-0 text-xl font-semibold">{ATELIE.calendario}</h2>
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
          {calendario(prog).map((o) => {
            const sem = !o.liberado ? ATELIE.trava(o.def.repMin) : !o.pagavel ? ATELIE.semSaldoTaxa : estoque.length === 0 ? ATELIE.semEstoque : "";
            return (
              <li key={o.def.slug} className="surface-vidro flex flex-col gap-2 p-3">
                <span className="rotulo text-bege-fosforo">{o.dia} · {o.edicao}</span>
                <strong className="text-lg">{o.def.nome}</strong>
                <p className="m-0 text-sm text-areia">{o.def.descricao}</p>
                <p className="m-0 font-ficha text-sm">{ATELIE.taxa(o.def.taxaMesa)}</p>
                <p className="m-0 text-sm">{ATELIE.publico(o.def.publico)}</p>
                {sem && <p className="m-0 text-sm text-laranja-claro">{sem}</p>}
                <button type="button" className="botao-laranja mt-auto min-h-[44px]" disabled={Boolean(sem) || ocupado}
                  onClick={() => router.push(`${BASE}/evento?e=${o.def.slug}`)}>
                  {ATELIE.irPara}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <label className="surface-vidro flex min-h-[44px] items-start gap-3 p-3">
        <input type="checkbox" className="mt-1 size-5" checked={prog.tranquilo} onChange={(e) => t.definirTranquilo(e.target.checked)} />
        <span><strong>{TEXTOS.tranquilo}</strong><br /><span className="text-sm text-areia">{TEXTOS.tranquiloAjuda}</span></span>
      </label>
    </div>
  );
}

function Producao({ prog, ocupado, produzir }: { prog: Progresso; ocupado: boolean; produzir: (produto: string, tema: string, lotes: number) => Promise<boolean> }) {
  const [tema, setTema] = useState(TEMAS[0].slug);
  const [lotes, setLotes] = useState<Record<string, number>>({});
  const livres = diasLivres(prog);
  const corTema = TEMAS.find((x) => x.slug === tema)!.cor;
  return (
    <section aria-labelledby="produzir" className="flex flex-col gap-3">
      <h2 id="produzir" className="m-0 text-xl font-semibold">{ATELIE.produzir}</h2>
      <label className="flex flex-col gap-1 text-sm">
        {ATELIE.tema}
        <select value={tema} onChange={(e) => setTema(e.target.value)} className="min-h-[44px] rounded-[6px] border border-creme/30 bg-transparent px-2 text-base">
          {TEMAS.map((x) => <option key={x.slug} value={x.slug} className="text-noite">{x.nome}</option>)}
        </select>
      </label>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {PRODUTOS.map((pr) => {
          const n = lotes[pr.slug] ?? 1;
          const c = custoDeProducao(pr.slug, n);
          const falta = c.dias > livres ? "dias" : c.material > prog.dinheiro ? "saldo" : "";
          return (
            <li key={pr.slug} className="surface-vidro flex flex-col gap-2 p-3">
              <div className="flex items-center gap-3">
                <Forma forma={pr.forma} cor={corTema} tamanho={44} />
                <div className="flex flex-col">
                  <strong>{pr.nome}</strong>
                  <span className="font-ficha text-xs text-areia">R$ {pr.precoSugerido} · {ATELIE.margem(pr.precoSugerido - pr.custo)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  {ATELIE.lotes}
                  <input type="number" min={1} max={BANCA.limiteLotes} value={n} onChange={(e) => setLotes({ ...lotes, [pr.slug]: Math.max(1, Math.min(BANCA.limiteLotes, Math.floor(Number(e.target.value)) || 1)) })}
                    className="min-h-[44px] w-20 rounded-[6px] border border-creme/30 bg-transparent px-2 font-ficha" />
                </label>
                <button type="button" className="botao-laranja ml-auto min-h-[44px]" disabled={ocupado || Boolean(falta)} onClick={() => produzir(pr.slug, tema, n)}>{ATELIE.produzir}</button>
              </div>
              <p className="m-0 text-sm text-areia">{ATELIE.custo(c.dias, c.material, c.unidades)}</p>
              {falta && <p className="m-0 text-sm text-laranja-claro">{falta === "dias" ? "Sem dias livres pra isso" : "Falta dinheiro pro material"}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Mesa({ prog, ocupado, salvar }: { prog: Progresso; ocupado: boolean; salvar: (l: Layout) => Promise<boolean> }) {
  const attrs = atributos(prog.melhorias);
  const [draft, setDraft] = useState<Layout>(prog.layout);
  const itens = listarEstoque(prog).map((e) => e.item);
  const mesaN = celulasDaMesa(attrs);
  const mudou = JSON.stringify(draft) !== JSON.stringify(prog.layout);
  const valido = layoutValido(draft, prog);

  const colocar = (idx: number, item: ItemKey | null) =>
    setDraft((d) => ({ ...d, celulas: d.celulas.map((c, i) => (i === idx ? item : item !== null && c === item ? null : c)) }));

  const seletor = (idx: number, rotulo: string) => (
    <label key={idx} className="surface-vidro flex min-h-[64px] flex-col gap-1 p-2 text-xs">
      <span className="text-areia">{rotulo}</span>
      <select value={draft.celulas[idx] ?? ""} onChange={(e) => colocar(idx, e.target.value || null)} className="min-h-[44px] rounded-[6px] border border-creme/30 bg-transparent px-1 text-sm">
        <option value="" className="text-noite">{ATELIE.vazio}</option>
        {itens.map((it) => <option key={it} value={it} className="text-noite">{nomeDoItem(it)}</option>)}
      </select>
    </label>
  );

  // A linha da frente fica embaixo: é a que o visitante vê primeiro.
  const linhas = Array.from({ length: attrs.linhas }, (_, r) => r).reverse();
  return (
    <section aria-labelledby="mesa" className="flex flex-col gap-3">
      <h2 id="mesa" className="m-0 text-xl font-semibold">{ATELIE.mesa}</h2>
      <p className="m-0 text-sm text-areia">{ATELIE.mesaAjuda}</p>
      <div className="flex flex-col gap-2" role="group" aria-label="Mesa vista de cima">
        {linhas.map((r) => (
          <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${attrs.colunas}, minmax(0, 1fr))` }}>
            {Array.from({ length: attrs.colunas }, (_, c) => seletor(r * attrs.colunas + c, r === 0 ? `${ATELIE.frente} ${c + 1}` : r === attrs.linhas - 1 && attrs.linhas > 1 ? `${ATELIE.fundo} ${c + 1}` : `Meio ${c + 1}`))}
          </div>
        ))}
        {attrs.expositor > 0 && (
          <div className="flex flex-col gap-1">
            <span className="rotulo text-bege-fosforo">{ATELIE.expositor}</span>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(attrs.expositor, 3)}, minmax(0, 1fr))` }}>
              {Array.from({ length: attrs.expositor }, (_, i) => seletor(mesaN + i, `Expositor ${i + 1}`))}
            </div>
          </div>
        )}
      </div>

      <h3 className="m-0 text-lg font-semibold">{ATELIE.precos}</h3>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {PRODUTOS.map((pr) => (
          <li key={pr.slug} className="surface-vidro flex items-center gap-3 p-2">
            <Forma forma={pr.forma} cor="#e3d8ac" tamanho={32} />
            <label className="flex flex-1 flex-col text-sm">
              {pr.nome} <span className="text-xs text-areia">{ATELIE.precoAjuda(pr.precoSugerido)} · R$ {pr.precoMin} a R$ {pr.precoMax}</span>
              <input type="number" min={pr.precoMin} max={pr.precoMax} step={1} value={precoDe(draft, pr.slug)}
                onChange={(e) => setDraft((d) => ({ ...d, precos: { ...d.precos, [pr.slug]: Math.floor(Number(e.target.value)) } }))}
                className="min-h-[44px] rounded-[6px] border border-creme/30 bg-transparent px-2 font-ficha" />
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="botao-vidro min-h-[44px] w-fit" disabled={ocupado || !mudou || !valido} onClick={() => salvar(draft)}>{ATELIE.salvarMesa}</button>
      {mudou && <p className="m-0 text-sm text-laranja-claro">Você mexeu na mesa. Guarde antes de ir pro evento.</p>}
    </section>
  );
}
