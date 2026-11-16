"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ILHA, CATALOGO } from "@/lib/mar-sem-fim/conteudo";
import { emViagem, proximaDaAgulha } from "@/lib/mar-sem-fim/estado";
import { cenaAtual, opcoesDisponiveis } from "@/lib/mar-sem-fim/historias";
import { T, formatarNumero, textoDoErro } from "@/lib/mar-sem-fim/textos";
import type { Efeitos, Estado } from "@/lib/mar-sem-fim/tipos";
import { Icone } from "./Icone";
import { useMar } from "./MarProvider";
import { AvisoConta, BASE, NavMar } from "./Navegacao";
import { Carta } from "./Pecas";

const MS = T.historia;

/** O que mudou entre dois estados, em linhas de texto (ouro, recompensa, casco, mantimentos, itens e aliados). */
function resumoDaMudanca(antes: Estado, depois: Estado): string[] {
  const out: string[] = [];
  const d = (a: number, b: number) => b - a;
  const ouro = d(antes.ouro, depois.ouro);
  if (ouro) out.push(`${ouro > 0 ? "+" : ""}${formatarNumero(ouro)} ${MS.ouroMais}`);
  const rec = d(antes.recompensa, depois.recompensa);
  if (rec) out.push(`${rec > 0 ? "+" : ""}${formatarNumero(rec)} ${MS.recompensaMais}`);
  const casco = d(antes.barco.casco, depois.barco.casco);
  if (casco) out.push(`${casco > 0 ? "+" : ""}${casco} ${MS.cascoMenos}`);
  const mant = d(antes.barco.mantimentos, depois.barco.mantimentos);
  if (mant) out.push(`${mant > 0 ? "+" : ""}${mant} ${MS.mantimentosMenos}`);
  for (const i of depois.itens.filter((x) => !antes.itens.includes(x))) out.push(`${MS.novoItem}: ${CATALOGO.itens[i]?.nome ?? i}`);
  for (const a of depois.aliados.filter((x) => !antes.aliados.includes(x))) out.push(`${MS.novoAliado}: ${CATALOGO.aliados[a]?.nome ?? a}`);
  if (!antes.agulha.carregada && depois.agulha.carregada) out.push(MS.cargaAgulha);
  return out;
}

/** Itens e aliados que o caminho já rendeu nesta ilha. */
function levadoDoCaminho(slug: string, caminho: string[]): Efeitos[] {
  const ilha = ILHA[slug];
  const lista: Efeitos[] = [];
  let cena = ilha.historia.cenas[ilha.historia.inicio];
  for (const op of caminho) {
    const o = cena?.opcoes.find((x) => x.id === op);
    if (!o) break;
    if (o.efeitos) lista.push(o.efeitos);
    cena = ilha.historia.cenas[o.proxima];
    if (cena?.efeitos) lista.push(cena.efeitos);
  }
  return lista;
}

export function HistoriaIlha({ slug }: { slug: string }) {
  const { estado, pronto, ocupado, executar } = useMar();
  const ilha = ILHA[slug];
  const [resumo, setResumo] = useState<string[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const passos = estado?.ilhas[slug]?.caminho.length ?? 0;

  // A cena muda: leva o foco pro título novo, pra teclado e leitor de tela acompanharem.
  useEffect(() => {
    if (passos > 0) titulo.current?.focus();
  }, [passos]);

  if (!pronto) return <p className="text-areia">{T.mundo.carregando}</p>;
  if (!estado) {
    return (
      <div className="flex flex-col gap-4">
        <NavMar atual="ilha" />
        <p className="m-0 text-areia">{T.mundo.semPirata}</p>
        <Link href={`${BASE}/novo`} className="btn bg-laranja self-start text-tinta no-underline">{T.mundo.criarPirata}</Link>
      </div>
    );
  }

  const prog = estado.ilhas[slug];
  const aqui = estado.barco.ilhaAtual === slug && !emViagem(estado);
  const pos = prog ? cenaAtual(ilha, prog.caminho) : null;
  const concluida = prog?.status === "concluida";

  async function escolher(op: string) {
    setErro(null);
    const antes = estado!;
    const r = await executar({ t: "cena", ilha: slug, opcao: op });
    if (r.ok) setResumo(resumoDaMudanca(antes, r.estado));
    else setErro(textoDoErro(r.erro));
  }

  const levado = levadoDoCaminho(slug, prog?.caminho ?? []);
  const itens = levado.flatMap((e) => (e.item ? [e.item] : []));
  const aliados = levado.flatMap((e) => (e.aliado ? [e.aliado] : []));
  const proxima = proximaDaAgulha(estado);

  return (
    <div className="flex flex-col gap-4">
      <NavMar atual="ilha" />
      <header className="flex flex-col gap-1">
        <p className="rotulo m-0 text-laranja-claro">{ilha.tipo === "evento" ? T.viagem.eventoPendente : T.ilha.mesmaCarta}</p>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{ilha.nome}</h1>
        <p className="m-0 text-areia">{ilha.resumo}</p>
      </header>

      {!aqui ? (
        <Carta rotuloRegiao={ilha.nome}>
          <p className="m-0 text-tinta">{MS.naoEstaAqui}</p>
          <Link href={`${BASE}/mundo`} className="btn btn-contorno mt-3 inline-flex min-h-11 items-center no-underline">{MS.irParaMundo}</Link>
        </Carta>
      ) : !pos ? (
        <Carta><p className="m-0 text-tinta">{textoDoErro("sem-historia")}</p></Carta>
      ) : (
        <Carta rotuloRegiao={pos.cena.titulo}>
          <p className="font-ficha m-0 mb-1 text-xs text-neutro">{MS.tela} {Math.min(passos + 1, 99)}</p>
          <h2 ref={titulo} tabIndex={-1} className="m-0 mb-2 text-2xl font-semibold text-azul outline-none">{pos.cena.titulo}</h2>
          <p className="m-0 text-base leading-relaxed text-tinta">{pos.cena.texto}</p>

          {resumo && resumo.length > 0 && (
            <ul role="status" className="font-ficha m-0 mt-4 flex list-none flex-wrap gap-1.5 p-0 text-xs">
              {resumo.map((r) => (
                <li key={r} className="rounded-[4px] bg-azul/10 px-2 py-1 text-azul">{r}</li>
              ))}
            </ul>
          )}

          {!pos.terminou ? (
            <ul className="m-0 mt-5 flex list-none flex-col gap-2 p-0" aria-label={MS.escolher}>
              {opcoesDisponiveis(estado, pos.cena).map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={ocupado || Boolean(o.bloqueada)}
                    onClick={() => escolher(o.id)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-[6px] border border-azul bg-white px-3 py-2.5 text-left text-base font-medium text-noite hover:bg-azul-claro disabled:cursor-default disabled:opacity-55"
                  >
                    <Icone nome="seta" tamanho={16} className="shrink-0 text-azul" />
                    <span className="flex-1">
                      {o.rotulo}
                      {(o.efeitos?.ouro ?? 0) < 0 && <span className="font-ficha ml-2 text-xs text-neutro">({MS.custa} {Math.abs(o.efeitos!.ouro!)} {T.unidades.ouro})</span>}
                    </span>
                    {o.bloqueada && <span className="font-ficha text-xs text-estrela">{o.bloqueada === "ouro" ? MS.faltaOuro : MS.bloqueada}</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 flex flex-col gap-3 border-t border-azul/20 pt-4">
              <h3 className="m-0 flex items-center gap-2 text-lg font-semibold text-azul"><Icone nome="check" /> {MS.concluida}</h3>
              <p className="m-0 text-sm text-neutro">{MS.recompensas}</p>
              <ul className="font-ficha m-0 flex list-none flex-wrap gap-1.5 p-0 text-xs">
                {(prog?.ganhoOuro ?? 0) > 0 && <li className="rounded-[4px] bg-azul/10 px-2 py-1 text-azul">+{formatarNumero(prog!.ganhoOuro)} {MS.ouroMais}</li>}
                {(prog?.ganhoRecompensa ?? 0) > 0 && <li className="rounded-[4px] bg-azul/10 px-2 py-1 text-azul">+{formatarNumero(prog!.ganhoRecompensa)} {MS.recompensaMais}</li>}
                {itens.map((i) => <li key={i} className="rounded-[4px] bg-azul/10 px-2 py-1 text-azul">{CATALOGO.itens[i]?.nome}</li>)}
                {aliados.map((a) => <li key={a} className="rounded-[4px] bg-azul/10 px-2 py-1 text-azul">{CATALOGO.aliados[a]?.nome}</li>)}
              </ul>
              {estado.agulha.carregada && estado.agulha.ilha === slug && proxima && (
                <p className="m-0 text-sm text-tinta">{MS.cargaAgulha} {MS.proximaIlha} <strong>{ILHA[proxima]?.nome}</strong>.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Link href={`${BASE}/mundo`} className="btn bg-laranja inline-flex min-h-11 items-center text-tinta no-underline">{MS.irParaMundo}</Link>
                {(ilha.servicos.estaleiro || ilha.servicos.mercado) && (
                  <Link href={`${BASE}/barco`} className="btn btn-contorno inline-flex min-h-11 items-center no-underline">{MS.irParaBarco}</Link>
                )}
              </div>
            </div>
          )}
          {concluida && pos.terminou && <p className="m-0 mt-3 text-xs text-neutro">{MS.jaViveu}</p>}
        </Carta>
      )}

      {erro && <p role="alert" className="m-0 text-danger">{erro}</p>}
      <AvisoConta />
    </div>
  );
}
