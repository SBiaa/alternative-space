"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  comporConta, consertarConta, fazerDiaConta, gravarDemoConta, migrarSaveLocal, novaBandaConta, pularShowConta, tocarShowConta,
  type RespostaBanda, type RespostaDiaBanda, type RespostaShowBanda,
} from "@/app/actions/banda";
import { novaSeed } from "@/lib/gestao/rng";
import { apagarLocal, guardarLocal, lerLocal } from "@/lib/gestao/save";
import { novaBanda } from "@/lib/banda/candidatos";
import { BANDA } from "@/lib/banda/config";
import { ERROS } from "@/lib/banda/conteudo";
import { compor, consertar, fazerDia, gravarDemo, type EscolhasComposicao } from "@/lib/banda/motor";
import { migrar } from "@/lib/banda/save";
import { pularShow, tocarShow } from "@/lib/banda/show";
import type { Montagem, Progresso } from "@/lib/banda/tipos";

export type Inicial = { logado: boolean; prog: Progresso | null };
type Erro = { ok: false; erro: string };

/**
 * Uma banda, dois lugares: na conta, cada ação passa pelo servidor (que refaz as contas e confere tudo);
 * sem conta, as mesmas regras puras rodam no aparelho e o save fica no localStorage.
 */
export function useBanda(inicial: Inicial) {
  const { logado } = inicial;
  const [prog, setProgState] = useState<Progresso | null>(logado ? inicial.prog : null);
  const [pronto, setPronto] = useState(logado && inicial.prog !== null);
  const ref = useRef(prog);
  const setProg = useCallback((p: Progresso | null) => {
    ref.current = p;
    setProgState(p);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const local = lerLocal(BANDA.chaveLocal, migrar);
      if (!logado) {
        if (vivo) {
          setProg(local);
          setPronto(true);
        }
        return;
      }
      // Logado com um save no aparelho: leva pra conta (o mais avançado vence) e limpa o do aparelho.
      if (local) {
        const r = await migrarSaveLocal(local);
        if (r.ok) {
          apagarLocal(BANDA.chaveLocal);
          if (vivo && r.prog) setProg(r.prog);
        }
      }
      if (vivo) setPronto(true);
    })();
    return () => {
      vivo = false;
    };
  }, [logado, setProg]);

  const aplicar = (p: Progresso) => {
    setProg(p);
    if (!logado) guardarLocal(BANDA.chaveLocal, p);
  };
  const aceitar = <R extends { ok: boolean }>(r: R | Erro): (R & { ok: true }) | Erro => {
    if (!r.ok) return { ok: false, erro: (r as Erro).erro };
    return r as R & { ok: true };
  };
  /** Resposta do servidor: guarda o save novo e devolve o resto. */
  const doServidor = <R extends { ok: boolean; prog?: Progresso }>(r: R | Erro) => {
    const a = aceitar<R>(r);
    if (a.ok) setProg((a as { prog: Progresso }).prog);
    return a;
  };
  /** Resposta das regras locais: o erro vira texto e o save novo vai pro aparelho. */
  const local = <R extends { ok: boolean }>(r: R | { ok: false; erro: keyof typeof ERROS }) => {
    if (!r.ok) return { ok: false, erro: ERROS[(r as { erro: keyof typeof ERROS }).erro] } as Erro;
    aplicar((r as unknown as { prog: Progresso }).prog);
    return r as R & { ok: true };
  };

  const nova = async (seed: string, montagem: Montagem): Promise<RespostaBanda> => {
    if (logado) return doServidor(await novaBandaConta(seed, montagem)) as RespostaBanda;
    const p = novaBanda(seed, montagem);
    if (!p) return { ok: false, erro: ERROS.invalido };
    aplicar(p);
    return { ok: true, prog: p };
  };
  const dia = async (acao: string): Promise<RespostaDiaBanda> =>
    (logado ? doServidor(await fazerDiaConta(acao)) : local(fazerDia(ref.current!, acao))) as RespostaDiaBanda;
  const comporMusica = async (esc: EscolhasComposicao): Promise<RespostaDiaBanda> =>
    (logado ? doServidor(await comporConta(esc)) : local(compor(ref.current!, esc))) as RespostaDiaBanda;
  const consertarParte = async (parte: string): Promise<RespostaBanda> =>
    (logado ? doServidor(await consertarConta(parte)) : local(consertar(ref.current!, parte))) as RespostaBanda;
  const show = async (palco: string, repertorio: number[]): Promise<RespostaShowBanda> =>
    (logado ? doServidor(await tocarShowConta(palco, repertorio)) : local(tocarShow(ref.current!, palco, repertorio))) as RespostaShowBanda;
  const pular = async (): Promise<RespostaBanda> => (logado ? doServidor(await pularShowConta()) : local(pularShow(ref.current!))) as RespostaBanda;
  const demo = async (): Promise<RespostaBanda> => (logado ? doServidor(await gravarDemoConta()) : local(gravarDemo(ref.current!))) as RespostaBanda;

  return { prog, pronto, logado, nova, dia, compor: comporMusica, consertar: consertarParte, show, pular, demo, novaSeed };
}

export type Banda = ReturnType<typeof useBanda>;
