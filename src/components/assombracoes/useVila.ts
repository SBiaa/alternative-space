"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { agirNoCaso, carregarProgresso, migrarProgressoLocal, reabrirResolvido, verificarResposta, type Desfecho, type ResultadoVerificar } from "@/app/actions/assombracoes";
import { VILA, type LugarId } from "@/lib/assombracoes/config";
import { estadoVazio, olharLugar, perguntar, type EstadoCaso, type Resposta } from "@/lib/assombracoes/investigacao";
import { migrar, progressoVazio, type ProgressoLocal } from "@/lib/assombracoes/save";
import type { Publico } from "@/lib/assombracoes/schema";

// Progresso do tripulante. Sem conta: no navegador (localStorage), com a lógica pura rodando aqui.
// Com conta: no banco, e toda coleta passa pelo servidor. A resposta sempre é conferida no servidor.

export type CasoVila = { estado: EstadoCaso; resolvido: boolean; resposta: Resposta | null };
type Mapa = Record<string, CasoVila>;

const lerLocal = (): ProgressoLocal => {
  try {
    const bruto = localStorage.getItem(VILA.chaveLocal);
    return (bruto && migrar(JSON.parse(bruto))) || progressoVazio();
  } catch {
    return progressoVazio();
  }
};

const gravarLocal = (m: Mapa) => {
  const p = progressoVazio();
  for (const [slug, c] of Object.entries(m)) p.casos[slug] = { ...c.estado, resolvida: c.resposta };
  try {
    localStorage.setItem(VILA.chaveLocal, JSON.stringify(p));
  } catch {
    // armazenamento cheio ou bloqueado: o progresso só dura até fechar a página
  }
};

const doLocal = (p: ProgressoLocal): Mapa =>
  Object.fromEntries(Object.entries(p.casos).map(([slug, c]) => [slug, { estado: { sinais: c.sinais, depoimentos: c.depoimentos, tentativas: c.tentativas }, resolvido: Boolean(c.resolvida), resposta: c.resolvida }]));

export function useVila() {
  const [pronto, setPronto] = useState(false);
  const [logado, setLogado] = useState(false);
  const [casos, setCasos] = useState<Mapa>({});
  const logadoRef = useRef(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const local = lerLocal();
      let r = await carregarProgresso().catch(() => ({ logado: false, casos: {} }));
      // Acabou de criar a conta com progresso no navegador: leva pra conta e limpa o local.
      if (r.logado && Object.keys(local.casos).length > 0) {
        const m = await migrarProgressoLocal(local);
        if (m.ok) {
          try {
            localStorage.removeItem(VILA.chaveLocal);
          } catch {}
          r = await carregarProgresso().catch(() => r);
        }
      }
      if (!vivo) return;
      logadoRef.current = r.logado;
      setLogado(r.logado);
      setCasos(r.logado ? Object.fromEntries(Object.entries(r.casos).map(([s, c]) => [s, { ...c, resposta: null }])) : doLocal(local));
      setPronto(true);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const atualizar = useCallback((slug: string, f: (c: CasoVila) => CasoVila) => {
    setCasos((antes) => {
      const proximo = { ...antes, [slug]: f(antes[slug] ?? { estado: estadoVazio(), resolvido: false, resposta: null }) };
      if (!logadoRef.current) gravarLocal(proximo);
      return proximo;
    });
  }, []);

  const atual = (slug: string): CasoVila => casos[slug] ?? { estado: estadoVazio(), resolvido: false, resposta: null };

  const olhar = useCallback(
    async (p: Publico, lugar: LugarId): Promise<{ novos: string[]; erro?: string }> => {
      const e = (casos[p.slug] ?? { estado: estadoVazio() }).estado;
      if (logadoRef.current) {
        const r = await agirNoCaso(p.slug, { tipo: "olhar", lugar });
        if (!r.ok) return { novos: [], erro: r.erro };
        atualizar(p.slug, (c) => ({ ...c, estado: r.estado }));
        return { novos: r.novos };
      }
      const r = olharLugar(p, e, lugar);
      if (!r.ok) return { novos: [], erro: r.erro };
      atualizar(p.slug, (c) => ({ ...c, estado: r.estado }));
      return { novos: r.novos };
    },
    [casos, atualizar],
  );

  const perguntarA = useCallback(
    async (p: Publico, morador: string, fala: string): Promise<{ novos: string[]; erro?: string }> => {
      const e = (casos[p.slug] ?? { estado: estadoVazio() }).estado;
      if (logadoRef.current) {
        const r = await agirNoCaso(p.slug, { tipo: "perguntar", morador, fala });
        if (!r.ok) return { novos: [], erro: r.erro };
        atualizar(p.slug, (c) => ({ ...c, estado: r.estado }));
        return { novos: r.novos };
      }
      const r = perguntar(p, e, morador, fala);
      if (!r.ok) return { novos: [], erro: r.erro };
      atualizar(p.slug, (c) => ({ ...c, estado: r.estado }));
      return { novos: r.novos };
    },
    [casos, atualizar],
  );

  const tentar = useCallback(
    async (p: Publico, resposta: Resposta): Promise<ResultadoVerificar> => {
      const e = (casos[p.slug] ?? { estado: estadoVazio() }).estado;
      const r = await verificarResposta(p.slug, resposta, logadoRef.current ? undefined : e).catch((): ResultadoVerificar => ({ ok: false, erro: "rede" }));
      if (r.ok && r.acertou) atualizar(p.slug, (c) => ({ ...c, resolvido: true, resposta: logadoRef.current ? null : resposta }));
      else if (r.ok) atualizar(p.slug, (c) => ({ ...c, estado: { ...c.estado, tentativas: r.tentativas } }));
      return r;
    },
    [casos, atualizar],
  );

  const reabrir = useCallback(
    async (slug: string): Promise<Desfecho | null> => {
      const r = await reabrirResolvido(slug, casos[slug]?.resposta ?? undefined).catch(() => null);
      return r?.ok ? r.resultado : null;
    },
    [casos],
  );

  return { pronto, logado, casos, atual, olhar, perguntarA, tentar, reabrir };
}

/** Respostas aceitas guardadas no navegador, pro Bestiário de quem ainda não tem conta. */
export function resolucoesDoNavegador() {
  const p = lerLocal();
  return Object.entries(p.casos).flatMap(([caso, c]) => (c.resolvida ? [{ caso, resposta: c.resolvida }] : []));
}

export function useAjustes() {
  const [sons, setSons] = useState(false);
  const [semSustos, setSemSustos] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- só dá pra saber no navegador
      setSons(localStorage.getItem(VILA.chaveSons) === "1");
      setSemSustos(localStorage.getItem(VILA.chaveSemSustos) === "1");
    } catch {}
  }, []);
  const gravar = (chave: string, v: boolean) => {
    try {
      localStorage.setItem(chave, v ? "1" : "0");
    } catch {}
  };
  return {
    sons,
    semSustos,
    setSons: (v: boolean) => (setSons(v), gravar(VILA.chaveSons, v)),
    setSemSustos: (v: boolean) => (setSemSustos(v), gravar(VILA.chaveSemSustos, v)),
  };
}
