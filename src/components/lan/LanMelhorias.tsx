"use client";

import Link from "next/link";
import { useState } from "react";
import { gradeDe, nivelDe } from "@/lib/lan/atributos";
import { EQUIPE, LAN } from "@/lib/lan/config";
import { EQUIPE_TEXTO, NOME_PC, ROTULO_KIND, TEXTOS } from "@/lib/lan/conteudo";
import { contasDaSemana, vagasDe } from "@/lib/lan/economia";
import { descreverEfeito } from "@/lib/lan/rotulos";
import type { ItemCatalogo, Layout, Papel, TipoItem } from "@/lib/lan/tipos";
import { useLan, type Inicial } from "./useLan";

type Aba = TipoItem | "equipe" | "salao";
const ABAS: Aba[] = ["maquina", "internet", "energia", "software", "servico", "balcao", "conforto", "ambiente", "equipe", "expansao", "salao"];
const ROTULO_ABA: Record<Aba, string> = { ...ROTULO_KIND, equipe: "Equipe", salao: "Arrumar o salão" };

export function LanMelhorias({ inicial }: { inicial: Inicial }) {
  const t = useLan(inicial);
  const { prog, catalogo } = t;
  const [aba, setAba] = useState<Aba>("maquina");
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (!t.pronto) return <p className="text-areia">{TEXTOS.procurando}</p>;
  if (!prog) return <Link href="/jogos/lan-house" className="botao-laranja inline-flex w-fit items-center no-underline">{TEXTOS.nova}</Link>;

  const rodar = async (f: () => Promise<{ ok: true } | { ok: false; erro: string }>, sucesso: string) => {
    setOcupado(true);
    const r = await f();
    setOcupado(false);
    setMsg(r.ok ? { ok: true, texto: sucesso } : { ok: false, texto: r.erro });
  };

  const itens = catalogo.itens.filter((i) => i.kind === aba).sort((a, b) => a.position - b.position);
  const contas = contasDaSemana(prog, catalogo);

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-vidro flex flex-wrap items-center gap-x-6 gap-y-2 p-3">
        <span className="font-ficha text-lg">R$ {prog.dinheiro}</span>
        <span className="font-ficha">★ {prog.reputacao.toFixed(2)}</span>
        <span>Nível {prog.nivel}</span>
        <span className="text-sm text-areia">Contas da semana: R$ {contas.aluguel + contas.luz + contas.internet} (aluguel {contas.aluguel}, luz {contas.luz}, internet {contas.internet})</span>
        <Link href="/jogos/lan-house/dia" className="botao-laranja ml-auto inline-flex items-center no-underline">Abrir o dia {prog.dia + 1}</Link>
      </div>

      <div role="tablist" aria-label="Tipos de melhoria" className="flex gap-2 overflow-x-auto pb-1">
        {ABAS.map((a) => (
          <button key={a} type="button" role="tab" aria-selected={aba === a} onClick={() => { setAba(a); setSel(null); setMsg(null); }}
            className={`min-h-[44px] shrink-0 rounded-[6px] border px-3 text-sm ${aba === a ? "border-laranja-claro bg-laranja-claro/20 font-semibold" : "border-creme/30"}`}>
            {ROTULO_ABA[a]}
          </button>
        ))}
      </div>

      {msg && <p className={`m-0 ${msg.ok ? "text-bege-fosforo" : "text-danger"}`} role={msg.ok ? "status" : "alert"}>{msg.texto}</p>}

      {aba === "equipe" ? (
        <Equipe prog={prog} ocupado={ocupado}
          contratar={(p) => rodar(() => t.contratar(p), `${EQUIPE_TEXTO[p].nome} contratado.`)}
          melhorar={(p) => rodar(() => t.melhorar(p), `${EQUIPE_TEXTO[p].nome} subiu de nível.`)} />
      ) : aba === "salao" ? (
        <ArrumarSalao key={JSON.stringify(prog.layout)} inicial={prog.layout} grade={gradeDe(prog, catalogo)} temDivisoria={nivelDe(prog, "divisoria") > 0}
          tipos={new Map(prog.maquinas.map((m) => [m.id, m.tipo]))} ocupado={ocupado}
          salvar={(l) => rodar(() => t.salvarLayout(l), "Salão arrumado.")} />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {itens.map((it) => (
            <Cartao key={it.slug} it={it} nivel={nivelDe(prog, it.slug)} nivelLan={prog.nivel} dinheiro={prog.dinheiro} aberto={sel === it.slug} ocupado={ocupado}
              abrir={() => setSel(sel === it.slug ? null : it.slug)} comprar={() => rodar(() => t.comprar(it.slug), `${it.name}: comprado!`)} />
          ))}
          {aba === "expansao" && (
            <li className="surface-vidro flex flex-col gap-2 border-dashed p-4 opacity-90">
              <span className="rotulo text-bege-fosforo">{TEXTOS.emBreve}</span>
              <h3 className="m-0 text-lg">{TEXTOS.cyberTitulo}</h3>
              <p className="m-0 text-sm text-areia">{TEXTOS.cyberTexto}</p>
              <p className="m-0 font-ficha text-xs">Requisito: reputação {LAN.cyberCentro.reputacao.toFixed(1)} ★ e nível {LAN.cyberCentro.nivel} (agora: {prog.reputacao.toFixed(2)} ★, nível {prog.nivel})</p>
              <button type="button" className="botao-vidro w-fit" disabled>{TEXTOS.emBreve}</button>
            </li>
          )}
        </ul>
      )}

      <p className="m-0 text-xs text-poeira">{TEXTOS.avisoDinheiro}</p>
    </div>
  );
}

function Cartao({ it, nivel, nivelLan, dinheiro, aberto, ocupado, abrir, comprar }: {
  it: ItemCatalogo; nivel: number; nivelLan: number; dinheiro: number; aberto: boolean; ocupado: boolean; abrir: () => void; comprar: () => void;
}) {
  const max = nivel >= it.maxLevel;
  const preco = it.prices[nivel];
  const travado = nivelLan < it.minLanLevel;
  const proximo = it.effects[nivel];
  const status = max ? "Nível máximo" : travado ? `Libera no nível ${it.minLanLevel} da lan` : `R$ ${preco}`;
  return (
    <li className={aberto ? "surface-creme p-4" : "surface-vidro p-4"}>
      <button type="button" className="flex w-full flex-col items-start gap-1 text-left" aria-expanded={aberto} onClick={abrir}>
        <span className={`text-lg font-semibold ${aberto ? "text-azul" : ""}`}>{it.name}</span>
        <span className="font-ficha text-xs">Nível {nivel}/{it.maxLevel} · {status}</span>
      </button>
      {aberto && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="m-0 text-sm">{it.description}</p>
          {nivel > 0 && <p className="m-0 text-sm">Agora: {descreverEfeito(it.kind, it.effects[nivel - 1])}</p>}
          {proximo && <p className="m-0 text-sm">Próximo nível: {descreverEfeito(it.kind, proximo)}</p>}
          {!max && (
            <button type="button" className="botao-laranja w-fit" disabled={ocupado || travado || dinheiro < preco} onClick={comprar}>
              {travado ? `Precisa do nível ${it.minLanLevel}` : dinheiro < preco ? `Faltam R$ ${preco - dinheiro}` : `Comprar · R$ ${preco}`}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function Equipe({ prog, ocupado, contratar, melhorar }: { prog: NonNullable<ReturnType<typeof useLan>["prog"]>; ocupado: boolean; contratar: (p: Papel) => void; melhorar: (p: Papel) => void }) {
  const vagas = vagasDe(prog.nivel);
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-areia">Vagas: {prog.equipe.length}/{vagas}. Salário por dia, descontado no fechamento.</p>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
        {(Object.keys(EQUIPE) as Papel[]).map((p) => {
          const d = EQUIPE[p];
          const tx = EQUIPE_TEXTO[p];
          const m = prog.equipe.find((x) => x.papel === p);
          const nivel = m?.nivel ?? 0;
          const preco = d.precos[nivel];
          const travado = !m && prog.nivel < d.nivelLan;
          const semVaga = !m && prog.equipe.length >= vagas;
          return (
            <li key={p} className={m ? "surface-creme flex flex-col gap-2 p-4" : "surface-vidro flex flex-col gap-2 p-4"}>
              <h3 className={`m-0 text-lg ${m ? "text-azul" : ""}`}>{tx.icone} {tx.nome}</h3>
              <p className="m-0 text-sm">{tx.descricao}</p>
              <p className="m-0 font-ficha text-xs">
                {m ? `Nível ${nivel} · salário R$ ${d.salario[nivel - 1]}/dia` : `Salário R$ ${d.salario[0]}/dia`}
              </p>
              {preco !== undefined && (
                <button type="button" className="botao-laranja w-fit" disabled={ocupado || travado || semVaga || prog.dinheiro < preco} onClick={() => (m ? melhorar(p) : contratar(p))}>
                  {travado ? `Libera no nível ${d.nivelLan}` : semVaga ? "Sem vaga" : `${m ? "Treinar" : "Contratar"} · R$ ${preco}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Grade do salão em React (não no canvas): botões de verdade, dá pra arrumar só com teclado e com leitor de tela.
 * Escolha uma máquina e depois a casa pra onde ela vai; a divisória fica entre duas colunas.
 */
function ArrumarSalao({ inicial, grade, temDivisoria, tipos, ocupado, salvar }: {
  inicial: Layout; grade: { colunas: number; linhas: number }; temDivisoria: boolean; tipos: Map<string, string>; ocupado: boolean; salvar: (l: Layout) => void;
}) {
  const [layout, setLayout] = useState<Layout>(inicial);
  const [pega, setPega] = useState<string | null>(null);
  const em = (x: number, y: number) => layout.pcs.find((p) => p.x === x && p.y === y);

  const tocar = (x: number, y: number) => {
    const aqui = em(x, y);
    if (!pega) {
      if (aqui) setPega(aqui.id);
      return;
    }
    const origem = layout.pcs.find((p) => p.id === pega)!;
    setLayout({
      ...layout,
      pcs: layout.pcs.map((p) => (p.id === pega ? { ...p, x, y } : aqui && p.id === aqui.id ? { ...p, x: origem.x, y: origem.y } : p)),
    });
    setPega(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-areia">
        Escolha uma máquina e depois a casa pra onde ela vai (se tiver outra lá, elas trocam). Quem grita perto de quem está no mensageiro ou fazendo trabalho deixa todo mundo impaciente.
      </p>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-1 rounded-[8px] bg-bege-piso p-2" style={{ gridTemplateColumns: `repeat(${grade.colunas}, minmax(64px, 1fr))` }} role="grid" aria-label="Planta do salão">
          {Array.from({ length: grade.linhas }).map((_, y) => (
            <div key={y} role="row" className="contents">
              {Array.from({ length: grade.colunas }).map((__, x) => {
                const pc = em(x, y);
                const divEsq = layout.divisoria !== null && x === layout.divisoria;
                return (
                  <div key={x} role="gridcell" className={divEsq ? "border-l-4 border-bege-gabinete-sombra pl-1" : ""}>
                    <button type="button" onClick={() => tocar(x, y)} aria-pressed={pc?.id === pega}
                      aria-label={pc ? `Máquina ${pc.id.replace("pc", "")} ${NOME_PC[tipos.get(pc.id) as keyof typeof NOME_PC]}, coluna ${x + 1}, linha ${y + 1}` : `Casa vazia, coluna ${x + 1}, linha ${y + 1}`}
                      className={`flex min-h-[64px] w-full flex-col items-center justify-center rounded-[6px] border text-xs text-bege-texto ${pc ? "border-bege-gabinete-sombra bg-bege-gabinete" : "border-dashed border-bege-rejunte"} ${pc?.id === pega ? "outline outline-3 outline-laranja" : ""}`}>
                      {pc ? <><span aria-hidden="true">🖥️</span><span className="font-ficha">{pc.id.replace("pc", "")} · {NOME_PC[tipos.get(pc.id) as keyof typeof NOME_PC]}</span></> : <span aria-hidden="true">·</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {temDivisoria && (
        <label className="flex min-h-[44px] items-center gap-3">
          <span>Divisória antes da coluna</span>
          <select className="campo" value={layout.divisoria ?? ""} onChange={(ev) => setLayout({ ...layout, divisoria: ev.target.value ? Number(ev.target.value) : null })}>
            <option value="">sem divisória</option>
            {Array.from({ length: grade.colunas - 1 }).map((_, i) => <option key={i} value={i + 1}>{i + 2}</option>)}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button type="button" className="botao-laranja" disabled={ocupado} onClick={() => salvar(layout)}>Guardar arrumação</button>
        <button type="button" className="botao-vidro" onClick={() => { setLayout(inicial); setPega(null); }}>Desfazer</button>
      </div>
    </div>
  );
}
