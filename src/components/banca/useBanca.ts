"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  comprarMelhoriaConta, fecharEventoConta, migrarSaveLocal, novaBancaConta, produzirConta, salvarLayoutConta, type RespostaEvento,
} from "@/app/actions/banca";
import { novaSeed } from "@/lib/gestao/rng";
import { apagarLocal, guardarLocal, lerLocal } from "@/lib/gestao/save";
import { BANCA } from "@/lib/banca/config";
import { TEXTOS_ERRO } from "@/lib/banca/conteudo";
import { comprarMelhoria, definirLayout, fecharEvento, novaBanca, produzir } from "@/lib/banca/economia";
import { migrar } from "@/lib/banca/save";
import type { Layout, Progresso, ResumoEvento } from "@/lib/banca/tipos";

export type Resp = { ok: true } | { ok: false; erro: string };
export type Inicial = { logado: boolean; prog: Progresso | null };

/**
 * Uma banca, dois lugares: na conta, cada mudança passa pelo servidor (que confere preço e saldo);
 * sem conta, as mesmas regras puras rodam no aparelho e o save fica no localStorage.
 */
export function useBanca(inicial: Inicial) {
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
      const local = lerLocal(BANCA.chaveLocal, migrar);
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
          apagarLocal(BANCA.chaveLocal);
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
    if (!logado) guardarLocal(BANCA.chaveLocal, p);
  };
  const tranquilo = () => ref.current?.tranquilo ?? false;
  const doServidor = (r: { ok: true; prog: Progresso } | { ok: false; erro: string }): Resp => {
    if (!r.ok) return { ok: false, erro: r.erro };
    setProg({ ...r.prog, tranquilo: tranquilo() });
    return { ok: true };
  };
  const local = (r: { ok: true; prog: Progresso } | { ok: false; erro: keyof typeof TEXTOS_ERRO }): Resp => {
    if (!r.ok) return { ok: false, erro: TEXTOS_ERRO[r.erro] };
    aplicar(r.prog);
    return { ok: true };
  };

  const nova = async (): Promise<Resp> => {
    if (logado) return doServidor(await novaBancaConta());
    aplicar(novaBanca(novaSeed()));
    return { ok: true };
  };
  const produzirLote = async (produto: string, tema: string, lotes: number): Promise<Resp> =>
    logado ? doServidor(await produzirConta(produto, tema, lotes)) : local(produzir(ref.current!, produto, tema, lotes));
  const comprar = async (slug: string): Promise<Resp> => (logado ? doServidor(await comprarMelhoriaConta(slug)) : local(comprarMelhoria(ref.current!, slug)));
  const salvarLayout = async (layout: Layout): Promise<Resp> => (logado ? doServidor(await salvarLayoutConta(layout)) : local(definirLayout(ref.current!, layout)));

  const fechar = async (resumo: ResumoEvento): Promise<RespostaEvento> => {
    const t = tranquilo();
    if (logado) {
      const r = await fecharEventoConta(resumo);
      if (r.ok) setProg({ ...r.prog, tranquilo: t });
      return r;
    }
    const f = fecharEvento(ref.current!, resumo);
    if (!f.ok) return { ok: false, erro: TEXTOS_ERRO[f.erro] };
    aplicar({ ...f.prog, tranquilo: t });
    return { ok: true, prog: f.prog, registro: f.registro, subiu: f.subiu };
  };

  /** Liga/desliga o evento tranquilo (fica no aparelho; na conta vale até recarregar). */
  const definirTranquilo = (v: boolean) => {
    if (ref.current) aplicar({ ...ref.current, tranquilo: v });
  };

  return { prog, pronto, logado, nova, produzir: produzirLote, comprar, salvarLayout, fechar, definirTranquilo };
}
