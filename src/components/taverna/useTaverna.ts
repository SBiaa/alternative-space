"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  comprarMelhoriaConta, contratarFuncionarioConta, fecharNoiteConta, melhorarFuncionarioConta, migrarSaveLocal, novaTavernaConta, salvarLayoutConta,
  type RespostaNoite,
} from "@/app/actions/taverna";
import { layoutValido } from "@/lib/taverna/atributos";
import { TAVERNA, TEXTOS_ERRO } from "@/lib/taverna/config";
import { comprarMelhoria, contratar, fecharNoite, melhorarFuncionario, novaTaverna } from "@/lib/taverna/economia";
import { novaSeed } from "@/lib/taverna/rng";
import { migrar } from "@/lib/taverna/save";
import type { Catalogo, MesaLayout, Papel, Progresso, ResumoNoite } from "@/lib/taverna/tipos";

export type Resp = { ok: true } | { ok: false; erro: string };
export type Inicial = { logado: boolean; prog: Progresso | null; catalogo: Catalogo };

const lerLocal = (): Progresso | null => {
  try {
    const bruto = localStorage.getItem(TAVERNA.chaveLocal);
    return bruto ? migrar(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
};
const guardarLocal = (p: Progresso) => {
  try {
    localStorage.setItem(TAVERNA.chaveLocal, JSON.stringify(p));
  } catch {}
};

/**
 * Uma taverna, dois lugares: na conta, cada mudança passa pelo servidor (que confere preço e saldo);
 * sem conta, as mesmas regras puras rodam no aparelho e o save fica no localStorage.
 */
export function useTaverna(inicial: Inicial) {
  const { logado, catalogo } = inicial;
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
      const local = lerLocal();
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
          try {
            localStorage.removeItem(TAVERNA.chaveLocal);
          } catch {}
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
    if (!logado) guardarLocal(p);
  };
  const doServidor = async (r: { ok: true; prog: Progresso } | { ok: false; erro: string }): Promise<Resp> => {
    if (!r.ok) return { ok: false, erro: r.erro };
    setProg(r.prog);
    return { ok: true };
  };

  const nova = async (): Promise<Resp> => {
    if (logado) return doServidor(await novaTavernaConta());
    aplicar(novaTaverna(novaSeed()));
    return { ok: true };
  };

  const comprar = async (slug: string): Promise<Resp> => {
    if (logado) return doServidor(await comprarMelhoriaConta(slug));
    const r = comprarMelhoria(ref.current!, catalogo, slug);
    if (!r.ok) return { ok: false, erro: TEXTOS_ERRO[r.erro] };
    aplicar(r.prog);
    return { ok: true };
  };

  const contratarPapel = async (papel: Papel): Promise<Resp> => {
    if (logado) return doServidor(await contratarFuncionarioConta(papel));
    const r = contratar(ref.current!, papel);
    if (!r.ok) return { ok: false, erro: TEXTOS_ERRO[r.erro] };
    aplicar(r.prog);
    return { ok: true };
  };

  const melhorarPapel = async (papel: Papel): Promise<Resp> => {
    if (logado) return doServidor(await melhorarFuncionarioConta(papel));
    const r = melhorarFuncionario(ref.current!, papel);
    if (!r.ok) return { ok: false, erro: TEXTOS_ERRO[r.erro] };
    aplicar(r.prog);
    return { ok: true };
  };

  const salvarLayout = async (layout: MesaLayout[]): Promise<Resp> => {
    if (logado) return doServidor(await salvarLayoutConta(layout));
    if (!layoutValido(layout, ref.current!, catalogo)) return { ok: false, erro: TEXTOS_ERRO.layout };
    aplicar({ ...ref.current!, layout });
    return { ok: true };
  };

  const fechar = async (resumo: ResumoNoite): Promise<RespostaNoite> => {
    if (logado) {
      const r = await fecharNoiteConta(resumo);
      if (r.ok) setProg(r.prog);
      return r;
    }
    const f = fecharNoite(ref.current!, catalogo, resumo);
    if (!f.ok) return { ok: false, erro: TEXTOS_ERRO[f.erro] };
    aplicar(f.prog);
    return { ok: true, prog: f.prog, registro: f.registro, semana: f.semana, subiuDeNivel: f.subiuDeNivel };
  };

  /** Liga/desliga a noite tranquila (guardado junto com a taverna). */
  const definirTranquila = (v: boolean) => {
    if (ref.current) aplicar({ ...ref.current, tranquila: v });
  };

  return { prog, pronto, logado, catalogo, nova, comprar, contratar: contratarPapel, melhorar: melhorarPapel, salvarLayout, fechar, definirTranquila };
}
