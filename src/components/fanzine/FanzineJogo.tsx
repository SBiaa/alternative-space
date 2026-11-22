"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { acharPistaAcao, carregarFanzine, ligarAcao, migrarProgressoLocal, pedirDicaAcao, responderAcao } from "@/app/actions/fanzine";
import { apagarLocal, guardarLocal, lerLocal } from "@/lib/gestao/save";
import { FANZINE, TEXTOS } from "@/lib/fanzine/config";
import { migrar } from "@/lib/fanzine/save";
import type { Estado, Pista, VisaoCapitulo } from "@/lib/fanzine/tipos";
import { Dicas } from "./Dicas";
import { Folhear } from "./Folhear";
import { IconeLupa } from "./Icones";
import { Pergunta } from "./Pergunta";
import { Quadro, type AvisoQuadro } from "./Quadro";
import "./xerox.css";

type Aba = "paginas" | "quadro" | "pergunta";
const T = TEXTOS;

export function FanzineJogo({ visao, inicial, textos }: { visao: VisaoCapitulo; inicial: Estado; textos: Record<string, ReactNode> }) {
  const chave = FANZINE.chaveLocal(visao.slug);
  const [estado, setEstado] = useState<Estado>(inicial);
  const [aba, setAba] = useState<Aba>("paginas");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<AvisoQuadro>(null);
  const [ultima, setUltima] = useState<Pista | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [faltou, setFaltou] = useState<string[] | null>(null);
  const [novaDeducao, setNovaDeducao] = useState<string | null>(null);
  const estadoRef = useRef(estado);
  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  // Sem conta o progresso fica no aparelho; com conta quem guarda é o servidor.
  const aplicar = useCallback(
    (e: Estado) => {
      setEstado(e);
      if (!e.logado) guardarLocal(chave, e.prog);
    },
    [chave],
  );
  const local = () => (estadoRef.current.logado ? undefined : estadoRef.current.prog);

  // Ao abrir: com conta, leva o progresso do aparelho pra conta; sem conta, devolve o do aparelho conferido pelo servidor.
  useEffect(() => {
    const salvo = lerLocal(chave, migrar);
    if (!salvo) return;
    let vivo = true;
    (async () => {
      if (inicial.logado) {
        const r = await migrarProgressoLocal(visao.slug, salvo);
        if (!vivo || !r.ok) return;
        setEstado(r.estado);
        apagarLocal(chave);
        setMensagem(T.conta.migrado);
      } else {
        const r = await carregarFanzine(visao.slug, salvo);
        if (vivo && r.ok) setEstado(r.estado);
      }
    })().catch(() => {});
    return () => {
      vivo = false;
    };
  }, [chave, inicial.logado, visao.slug]);

  const rodar = async <R extends { ok: boolean }>(fn: () => Promise<R>): Promise<R | null> => {
    setOcupado(true);
    try {
      return await fn();
    } catch {
      setAviso({ tipo: "nao", texto: T.erros.generico });
      return null;
    } finally {
      setOcupado(false);
    }
  };

  const marcar = async (p: Pista) => {
    if (estadoRef.current.prog.clues.includes(p.id)) return setMensagem(T.lupa.jaTinha);
    const r = await rodar(() => acharPistaAcao(visao.slug, p.id, local()));
    if (!r) return;
    if (!r.ok) return setMensagem(r.erro);
    aplicar(r.estado);
    setUltima(p);
    setMensagem(T.lupa.nova(p.rotulo));
  };

  const ligar = useCallback(
    async (a: string, b: string) => {
      const r = await rodar(() => ligarAcao(visao.slug, a, b, local()));
      if (!r) return;
      if (!r.ok) return setAviso({ tipo: "nao", texto: r.erro });
      aplicar(r.estado);
      if (r.resultado === "nao_fecha") return setAviso({ tipo: "nao", texto: T.quadro.naoFecha });
      if (r.jaTinha) return setAviso({ tipo: "info", texto: T.quadro.jaFeita });
      setNovaDeducao(r.estado.deducoes[r.estado.deducoes.length - 1]?.id ?? null);
      setAviso({ tipo: "certa", texto: r.texto });
    },
    [visao.slug, aplicar],
  );

  const responder = async (respostas: Record<string, string>) => {
    const r = await rodar(() => responderAcao(visao.slug, respostas, local()));
    if (!r) return;
    if (!r.ok) return setFaltou([r.erro]);
    aplicar(r.estado);
    setFaltou(r.resolvida ? null : r.faltou);
  };

  const dica = async () => {
    const r = await rodar(() => pedirDicaAcao(visao.slug, local()));
    if (!r) return;
    if (r.ok) aplicar(r.estado);
    else setMensagem(r.erro);
  };

  const abas: { id: Aba; nome: string; n?: number }[] = [
    { id: "paginas", nome: T.folhear.titulo },
    { id: "quadro", nome: T.quadro.titulo, n: estado.prog.clues.length },
    { id: "pergunta", nome: "Pergunta" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div aria-label={visao.titulo} className="flex gap-2" role="group">
        {abas.map((a) => (
          <button key={a.id} type="button" className="btn min-h-11 flex-1 border border-creme/40 px-2 text-sm aria-pressed:bg-creme aria-pressed:text-noite sm:text-base" aria-pressed={aba === a.id} onClick={() => setAba(a.id)}>
            {a.nome}
            {a.n !== undefined && <span className="ml-1 font-ficha text-xs">({a.n})</span>}
          </button>
        ))}
      </div>

      <div role="status" aria-live="polite" className="min-h-6 text-sm text-creme">
        {mensagem}
      </div>

      {!estado.logado && (
        <div className="surface-vidro flex flex-wrap items-center gap-3 p-3 text-sm">
          <p className="m-0 flex-1 text-areia">{T.conta.aviso}</p>
          <Link href="/cadastro" className="btn h-11 bg-laranja px-4 text-noite no-underline">
            {T.conta.botao}
          </Link>
        </div>
      )}

      {aba === "paginas" && (
        <>
          <Folhear visao={visao} achadas={estado.prog.clues} onMarcar={marcar} textos={textos} ocupado={ocupado} />
          {ultima && (
            <section aria-label={ultima.rotulo} className="surface-vidro flex items-start gap-2 p-3 text-sm">
              <IconeLupa />
              <span>
                <strong>{ultima.rotulo}.</strong> {ultima.texto}
              </span>
            </section>
          )}
        </>
      )}
      {aba === "quadro" && <Quadro visao={visao} achadas={estado.prog.clues} deducoes={estado.deducoes} aviso={aviso} ocupado={ocupado} novaDeducao={novaDeducao} onLigar={ligar} />}
      {aba === "pergunta" && <Pergunta visao={visao} deducoes={estado.deducoes} resolvida={estado.prog.solved} logado={estado.logado} faltou={faltou} ocupado={ocupado} onResponder={responder} />}

      <Dicas dicas={estado.dicas} ocupado={ocupado} onPedir={dica} />
    </div>
  );
}
