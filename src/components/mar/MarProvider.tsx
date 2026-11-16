"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { criarPirataConta, executarAcaoMar, migrarSaveLocalMar } from "@/app/actions/mar-sem-fim";
import { aplicarAcao } from "@/lib/mar-sem-fim/acoes";
import { criarPirata, type EntradaPirata } from "@/lib/mar-sem-fim/estado";
import { migrar } from "@/lib/mar-sem-fim/save";
import type { Acao, Estado } from "@/lib/mar-sem-fim/tipos";
import { novaSeed } from "@/lib/gestao/rng";

const CHAVE_LOCAL = "mar-sem-fim:save";

type Falha = { ok: false; erro: string };
export type Migracao = "nenhuma" | "migrando" | "ok" | "falhou";

type Ctx = {
  estado: Estado | null;
  logado: boolean;
  pronto: boolean;
  ocupado: boolean;
  migracao: Migracao;
  /** Hora do servidor (ou do aparelho, no modo sem conta). 0 enquanto renderiza no servidor. */
  agora: number;
  executar: (a: Acao) => Promise<{ ok: true; estado: Estado } | Falha>;
  criar: (e: Omit<EntradaPirata, "seed">) => Promise<{ ok: true; estado: Estado } | Falha>;
};

const MarCtx = createContext<Ctx | null>(null);
export const useMar = () => {
  const c = useContext(MarCtx);
  if (!c) throw new Error("useMar fora do MarProvider");
  return c;
};

const lerLocal = (): Estado | null => {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL);
    return bruto ? migrar(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
};
const gravarLocal = (e: Estado) => {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(e));
  } catch {
    /* sem armazenamento: o jogo continua, só não guarda */
  }
};
const apagarLocal = () => {
  try {
    localStorage.removeItem(CHAVE_LOCAL);
  } catch {
    /* ok */
  }
};

// Relógio de exibição: uma batida por segundo. No servidor devolve 0, pra não chamar Date durante o pré-render.
const assinar = (cb: () => void) => {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
};
const batida = () => Math.floor(Date.now() / 1000) * 1000;

export function MarProvider({ inicial, children }: { inicial: { logado: boolean; estado: Estado | null; agora: number }; children: ReactNode }) {
  const [estado, setEstado] = useState<Estado | null>(inicial.estado);
  const [pronto, setPronto] = useState(inicial.logado);
  const [ocupado, setOcupado] = useState(false);
  const [migracao, setMigracao] = useState<Migracao>("nenhuma");
  const [desvio, setDesvio] = useState(0); // servidor - aparelho, em ms
  const tique = useSyncExternalStore(assinar, batida, () => 0);
  // O ref acompanha o estado no mesmo instante em que ele muda: efeitos de filhos rodam antes dos do pai e leriam um valor velho.
  const estadoRef = useRef(estado);
  const guardar = useCallback((e: Estado | null) => {
    estadoRef.current = e;
    setEstado(e);
  }, []);

  // Primeira montagem: acerta o relógio com o do servidor e lê/migra o save do aparelho.
  useEffect(() => {
    if (inicial.logado) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- o relógio do aparelho só existe no navegador
      setDesvio(inicial.agora - Date.now());
      const local = lerLocal();
      if (!local) return;
      setMigracao("migrando");
      void migrarSaveLocalMar(local).then((r) => {
        if (r.ok) {
          apagarLocal();
          guardar(r.estado);
          setMigracao("ok");
        } else setMigracao("falhou");
      });
      return;
    }
    guardar(lerLocal());
    setPronto(true);
  }, [inicial.logado, inicial.agora, guardar]);

  const agora = tique === 0 ? 0 : tique + (inicial.logado ? desvio : 0);

  const executar: Ctx["executar"] = useCallback(
    async (a) => {
      const atual = estadoRef.current;
      if (!atual) return { ok: false, erro: "sem-ilha" };
      setOcupado(true);
      try {
        if (!inicial.logado) {
          const r = aplicarAcao(atual, a, Date.now());
          if (!r.ok) return { ok: false, erro: r.erro };
          const novo = { ...r.estado, versao: atual.versao + 1 };
          gravarLocal(novo);
          guardar(novo);
          return { ok: true, estado: novo };
        }
        const r = await executarAcaoMar(a);
        if (r.agora) setDesvio(r.agora - Date.now());
        if (r.estado) guardar(r.estado);
        return r.ok ? { ok: true, estado: r.estado } : { ok: false, erro: r.erro };
      } finally {
        setOcupado(false);
      }
    },
    [inicial.logado, guardar],
  );

  const criar: Ctx["criar"] = useCallback(
    async (e) => {
      setOcupado(true);
      try {
        const entrada = { ...e, seed: novaSeed().toLowerCase() };
        if (!inicial.logado) {
          const r = criarPirata(entrada, Date.now());
          if (!r.ok) return { ok: false, erro: r.erro };
          gravarLocal(r.estado);
          guardar(r.estado);
          return { ok: true, estado: r.estado };
        }
        const r = await criarPirataConta(entrada);
        if (r.agora) setDesvio(r.agora - Date.now());
        if (r.ok) guardar(r.estado);
        return r.ok ? { ok: true, estado: r.estado } : { ok: false, erro: r.erro };
      } finally {
        setOcupado(false);
      }
    },
    [inicial.logado, guardar],
  );

  return <MarCtx.Provider value={{ estado, logado: inicial.logado, pronto, ocupado, migracao, agora, executar, criar }}>{children}</MarCtx.Provider>;
}
