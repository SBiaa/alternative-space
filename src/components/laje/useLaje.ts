"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { agirNaLaje, carregarLaje, criarLajeConta } from "@/app/actions/laje";
import { novaSeed } from "@/lib/gestao/rng";
import { apagarLocal, guardarLocal, lerLocal } from "@/lib/gestao/save";
import { aplicarAcao, semExtras, type AcaoLaje } from "@/lib/laje/acoes";
import { TEXTOS, TEXTOS_ERRO } from "@/lib/laje/conteudo";
import { novoSave } from "@/lib/laje/motor";
import { migrar } from "@/lib/laje/save";
import { montarVisao, type Visao } from "@/lib/laje/visao";

const CHAVE_LOCAL = "laje-verde:save";
const REFRESCO_MS = 30_000;

export type Modo = "conta" | "local";

/**
 * Estado da laje na tela. Logado, tudo vem do servidor (a tela só mostra). Sem login, o mesmo motor roda no aparelho
 * e a laje fica no localStorage até a pessoa criar a conta; aí o save é levado pro servidor.
 */
export function useLaje(inicial: { logado: boolean; visao: Visao | null }) {
  const [visao, setVisao] = useState<Visao | null>(inicial.visao);
  const [modo] = useState<Modo>(inicial.logado ? "conta" : "local");
  const [pronto, setPronto] = useState(inicial.logado && inicial.visao !== null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);

  const mostrar = useCallback((ok: boolean, texto: string | null) => {
    setErro(ok ? null : texto);
    setAviso(ok ? texto : null);
  }, []);

  // Primeira carga: save do aparelho (sem login) ou abrir a laje da conta, levando o save local se houver.
  useEffect(() => {
    let vivo = true;
    const carga = async () => {
      if (modo === "local") {
        let s = lerLocal(CHAVE_LOCAL, migrar);
        if (!s) {
          s = novoSave(novaSeed(), Date.now());
          guardarLocal(CHAVE_LOCAL, s);
        }
        if (vivo) {
          setVisao(montarVisao(s, Date.now()));
          setPronto(true);
        }
        return;
      }
      if (inicial.visao) return;
      const local = lerLocal(CHAVE_LOCAL, migrar);
      const r = await criarLajeConta(local ?? undefined);
      if (!vivo) return;
      if (r.ok) {
        if (local) {
          apagarLocal(CHAVE_LOCAL);
          setAviso(TEXTOS.importada);
        }
        setVisao(r.visao);
      } else setErro(r.erro);
      setPronto(true);
    };
    carga().catch((e) => {
      console.error("Não deu pra abrir a laje:", e);
      if (vivo) {
        setErro(TEXTOS_ERRO.generico);
        setPronto(true);
      }
    });
    return () => {
      vivo = false;
    };
  }, [modo, inicial.visao]);

  // A laje anda sozinha: de tempos em tempos (e ao voltar pra aba) o servidor recalcula e a tela só mostra.
  const atualizar = useCallback(async () => {
    if (trava.current) return;
    if (modo === "local") {
      const s = lerLocal(CHAVE_LOCAL, migrar);
      if (s) setVisao(montarVisao(s, Date.now()));
      return;
    }
    const r = await carregarLaje();
    if (r.visao) setVisao(r.visao);
  }, [modo]);

  useEffect(() => {
    if (!pronto) return;
    const id = setInterval(() => void atualizar(), REFRESCO_MS);
    const ver = () => !document.hidden && void atualizar();
    document.addEventListener("visibilitychange", ver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", ver);
    };
  }, [pronto, atualizar]);

  const agir = useCallback(
    async (acao: AcaoLaje, sucesso: string | null): Promise<boolean> => {
      if (trava.current) return false;
      trava.current = true;
      setOcupado(true);
      try {
        if (modo === "conta") {
          const r = await agirNaLaje(acao);
          if (r.visao) setVisao(r.visao);
          mostrar(r.ok, r.ok ? sucesso : r.erro);
          return r.ok;
        }
        const atual = lerLocal(CHAVE_LOCAL, migrar);
        if (!atual) {
          mostrar(false, TEXTOS_ERRO.generico);
          return false;
        }
        const agora = Date.now();
        const { r } = aplicarAcao(atual, agora, acao);
        if (!r.ok) {
          setVisao(montarVisao(atual, agora));
          mostrar(false, TEXTOS_ERRO[r.erro]);
          return false;
        }
        const novo = semExtras(r.save);
        guardarLocal(CHAVE_LOCAL, novo);
        setVisao(montarVisao(novo, agora));
        mostrar(true, sucesso);
        return true;
      } finally {
        trava.current = false;
        setOcupado(false);
      }
    },
    [modo, mostrar],
  );

  return { visao, modo, pronto, aviso, erro, ocupado, agir };
}
