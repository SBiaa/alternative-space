"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  comprarMelhoriaConta, contratarConta, fecharDiaConta, melhorarFuncionarioConta, migrarSaveLocal, novaLanConta, salvarLayoutConta,
  type RespostaDia,
} from "@/app/actions/lan";
import { novaSeed } from "@/lib/gestao/rng";
import { apagarLocal, guardarLocal, lerLocal } from "@/lib/gestao/save";
import { layoutValido } from "@/lib/lan/atributos";
import { LAN } from "@/lib/lan/config";
import { TEXTOS_ERRO } from "@/lib/lan/conteudo";
import { comprarMelhoria, contratar, fecharDia, melhorarFuncionario, novaLan } from "@/lib/lan/economia";
import { migrar } from "@/lib/lan/save";
import type { Catalogo, Layout, Papel, Progresso, ResumoDia } from "@/lib/lan/tipos";

export type Resp = { ok: true } | { ok: false; erro: string };
export type Inicial = { logado: boolean; prog: Progresso | null; catalogo: Catalogo };

/**
 * Uma lan, dois lugares: na conta, cada mudança passa pelo servidor (que confere preço e saldo);
 * sem conta, as mesmas regras puras rodam no aparelho e o save fica no localStorage.
 */
export function useLan(inicial: Inicial) {
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
      const local = lerLocal(LAN.chaveLocal, migrar);
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
          apagarLocal(LAN.chaveLocal);
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
    if (!logado) guardarLocal(LAN.chaveLocal, p);
  };
  const doServidor = (r: { ok: true; prog: Progresso } | { ok: false; erro: string }): Resp => {
    if (!r.ok) return { ok: false, erro: r.erro };
    setProg({ ...r.prog, tranquilo: ref.current?.tranquilo ?? false });
    return { ok: true };
  };
  const local = <T extends { ok: true; prog: Progresso } | { ok: false; erro: keyof typeof TEXTOS_ERRO }>(r: T): Resp => {
    if (!r.ok) return { ok: false, erro: TEXTOS_ERRO[r.erro] };
    aplicar(r.prog);
    return { ok: true };
  };

  const nova = async (): Promise<Resp> => {
    if (logado) return doServidor(await novaLanConta());
    aplicar(novaLan(novaSeed(), catalogo));
    return { ok: true };
  };
  const comprar = async (slug: string): Promise<Resp> => (logado ? doServidor(await comprarMelhoriaConta(slug)) : local(comprarMelhoria(ref.current!, catalogo, slug)));
  const contratarPapel = async (papel: Papel): Promise<Resp> => (logado ? doServidor(await contratarConta(papel)) : local(contratar(ref.current!, papel)));
  const melhorarPapel = async (papel: Papel): Promise<Resp> => (logado ? doServidor(await melhorarFuncionarioConta(papel)) : local(melhorarFuncionario(ref.current!, papel)));

  const salvarLayout = async (layout: Layout): Promise<Resp> => {
    if (logado) return doServidor(await salvarLayoutConta(layout));
    if (!layoutValido(layout, ref.current!, catalogo)) return { ok: false, erro: TEXTOS_ERRO.layout };
    aplicar({ ...ref.current!, layout });
    return { ok: true };
  };

  const fechar = async (resumo: ResumoDia): Promise<RespostaDia> => {
    const tranquilo = ref.current?.tranquilo ?? false;
    if (logado) {
      const r = await fecharDiaConta(resumo);
      if (r.ok) setProg({ ...r.prog, tranquilo });
      return r;
    }
    const f = fecharDia(ref.current!, catalogo, resumo);
    if (!f.ok) return { ok: false, erro: TEXTOS_ERRO[f.erro] };
    aplicar({ ...f.prog, tranquilo });
    return { ok: true, prog: f.prog, registro: f.registro, semana: f.semana, subiuDeNivel: f.subiuDeNivel };
  };

  /** Liga/desliga o dia tranquilo (fica no aparelho; na conta vale até recarregar). */
  const definirTranquilo = (v: boolean) => {
    if (ref.current) aplicar({ ...ref.current, tranquilo: v });
  };

  return { prog, pronto, logado, catalogo, nova, comprar, contratar: contratarPapel, melhorar: melhorarPapel, salvarLayout, fechar, definirTranquilo };
}
