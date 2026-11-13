"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  carregarMuro, comprarMaterialConta, comprarMelhoriaConta, contratarConta, fecharDiaConta, migrarSaveLocal, novaCrewConta, salvarProgressoConta,
  type RespostaDia,
} from "@/app/actions/muro";
import { estaMudo, mudar } from "@/lib/sons";
import { novaSeed } from "@/lib/gestao/rng";
import { apagarLocal, guardarLocal, lerLocal } from "@/lib/gestao/save";
import { MIN_DIA, MURO } from "@/lib/muro/config";
import { TEXTOS, TEXTOS_ERRO } from "@/lib/muro/conteudo";
import { comprarMaterial, comprarMelhoria, contratar, entregar as entregarPuro, fecharDia as fecharDiaPuro, novoProgresso, type PedidoMaterial } from "@/lib/muro/economia";
import { inscrever as inscreverPuro, type Julgamento } from "@/lib/muro/encontro";
import { aceitar as aceitarPuro, iniciarMural, responder as responderPuro, revisar as revisarPuro } from "@/lib/muro/negociacao";
import { migrar } from "@/lib/muro/save";
import { tocarMuro } from "@/lib/muro/sons";
import type { Catalogo, Camada, CorId, Progresso, RegistroDia, RegistroSemana, Tag } from "@/lib/muro/tipos";
import { aprovarTrecho, avancar, cobrir as cobrirPuro, definirFolga, descobrir as descobrirPuro, escalar as escalarPuro, pintarManual, type Aviso, type Pintura, type Resultado } from "@/lib/muro/trabalho";

export type Inicial = { logado: boolean; prog: Progresso | null; catalogo: Catalogo; tag: Tag; tagPropria: boolean };
export type Resp = { ok: true } | { ok: false; erro: string };
export type Opcoes = { semInclinacao: boolean; assistida: boolean };
export type Toast = { id: number; texto: string; tipo: "info" | "erro" | "chuva" };
export type Resumo = { registro: RegistroDia; semana: RegistroSemana | null; subiu: boolean; julgamento: Julgamento | null; antesNivel: number };

const OPCOES_PADRAO: Opcoes = { semInclinacao: false, assistida: false };

function useMuroEstado(inicial: Inicial) {
  const { logado, catalogo, tag } = inicial;
  const router = useRouter();
  const [prog, setProgState] = useState<Progresso | null>(logado ? inicial.prog : null);
  const [pronto, setPronto] = useState(logado);
  const [rodando, setRodando] = useState(false);
  const [vel, setVel] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [opcoes, setOpcoesState] = useState<Opcoes>(OPCOES_PADRAO);
  const [ocupado, setOcupado] = useState(false);
  const [mudo, setMudo] = useState(false);
  const ref = useRef(prog);
  const acum = useRef(0);
  const fim = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idToast = useRef(0);
  const logadoRef = useRef(logado);

  const setProg = useCallback((p: Progresso | null) => {
    ref.current = p;
    setProgState(p);
  }, []);

  const avisar = useCallback((texto: string, tipo: Toast["tipo"] = "info") => {
    const id = ++idToast.current;
    setToasts((t) => [...t.slice(-3), { id, texto, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);

  const textoAviso = useCallback((a: Aviso): { texto: string; tipo: Toast["tipo"] } | null => {
    if (a.tipo === "fim-do-dia") return null;
    const base = TEXTOS.avisos[a.tipo];
    if (!base) return null;
    if (a.tipo === "sem-material") return { texto: `${base} ${TEXTOS.muro.semMaterial[a.material]}`, tipo: "erro" };
    if (a.tipo === "chuva-comecou" || a.tipo === "estragou") return { texto: base, tipo: "chuva" };
    return { texto: base, tipo: "info" };
  }, []);

  const mostrarAvisos = useCallback((avisos: Aviso[]) => {
    for (const a of avisos) {
      const t = textoAviso(a);
      if (t) avisar(t.texto, t.tipo);
      if (a.tipo === "chuva-comecou") tocarMuro("chuva");
      if (a.tipo === "fim-do-dia") fim.current = true;
    }
  }, [avisar, textoAviso]);

  // ---- carga inicial e migração do save local ----
  useEffect(() => {
    let vivo = true;
    (async () => {
      setMudo(estaMudo());
      try {
        const o = localStorage.getItem(MURO.chaveOpcoes);
        if (o) setOpcoesState({ ...OPCOES_PADRAO, ...(JSON.parse(o) as Partial<Opcoes>) });
      } catch {}
      const local = lerLocal(MURO.chaveLocal, migrar);
      if (!logado) {
        if (vivo) {
          setProg(local);
          setPronto(true);
        }
        return;
      }
      if (local) {
        const r = await migrarSaveLocal(local);
        if (r.ok) {
          apagarLocal(MURO.chaveLocal);
          if (vivo && r.prog) setProg({ ...r.prog, tagPropria: inicial.tagPropria });
        }
      }
      if (vivo) setPronto(true);
    })();
    return () => {
      vivo = false;
    };
  }, [logado, inicial.tagPropria, setProg]);

  const setOpcoes = (o: Partial<Opcoes>) => {
    const novo = { ...opcoes, ...o };
    setOpcoesState(novo);
    try {
      localStorage.setItem(MURO.chaveOpcoes, JSON.stringify(novo));
    } catch {}
  };
  const alternarSons = () => {
    mudar(!mudo);
    setMudo(!mudo);
  };

  // ---- aplicar resultados ----
  const guardarAparelho = useCallback((p: Progresso) => {
    if (!logadoRef.current) guardarLocal(MURO.chaveLocal, p);
  }, []);
  const aplicar = useCallback((p: Progresso) => {
    setProg(p);
    guardarAparelho(p);
  }, [setProg, guardarAparelho]);

  const salvar = useCallback(async (): Promise<Resp> => {
    if (!logadoRef.current || !ref.current) return { ok: true };
    const r = await salvarProgressoConta(ref.current);
    if (!r.ok) return { ok: false, erro: r.erro };
    setProg({ ...r.prog, tranquilo: ref.current?.tranquilo ?? false, minuto: Math.max(r.prog.minuto, ref.current?.minuto ?? 0) });
    return { ok: true };
  }, [setProg]);
  const agendarSalvar = useCallback(() => {
    if (!logadoRef.current) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void salvar(), 2500);
  }, [salvar]);

  /** Roda uma operação pura (aceitar, escalar...) sobre o save atual. */
  const local = useCallback(<T extends object>(r: Resultado<T>): Resp & { dados?: T } => {
    if (!r.ok) {
      tocarMuro("erro");
      return { ok: false, erro: TEXTOS_ERRO[r.erro] };
    }
    aplicar(r.prog);
    mostrarAvisos(r.avisos);
    agendarSalvar();
    return { ok: true, dados: r };
  }, [aplicar, mostrarAvisos, agendarSalvar]);

  const doServidor = useCallback((r: { ok: true; prog: Progresso } | { ok: false; erro: string }): Resp => {
    if (!r.ok) {
      tocarMuro("erro");
      return { ok: false, erro: r.erro };
    }
    setProg({ ...r.prog, tranquilo: ref.current?.tranquilo ?? false });
    return { ok: true };
  }, [setProg]);

  // ---- relógio ----
  useEffect(() => {
    if (!rodando || !pronto) return;
    const velocidade = MURO.dia.velocidades[vel] ?? 1;
    const id = setInterval(() => {
      const p = ref.current;
      if (!p || fim.current) return;
      acum.current += 0.2 * (MIN_DIA / MURO.dia.duracaoSeg) * velocidade;
      const inteiros = Math.floor(acum.current);
      if (inteiros < 1) return;
      acum.current -= inteiros;
      const r = avancar(p, catalogo, inteiros);
      setProg(r.prog);
      mostrarAvisos(r.avisos);
      guardarAparelho(r.prog);
      if (r.fimDoDia) setRodando(false);
    }, 200);
    return () => clearInterval(id);
  }, [rodando, vel, pronto, catalogo, setProg, mostrarAvisos, guardarAparelho]);

  // salva na pausa e a cada ~40 s com o relógio andando
  const jaRodou = useRef(false);
  useEffect(() => {
    if (rodando) jaRodou.current = true;
    else if (jaRodou.current) void salvar();
  }, [rodando, salvar]);
  useEffect(() => {
    if (!rodando || !logado) return;
    const id = setInterval(() => void salvar(), 40000);
    return () => clearInterval(id);
  }, [rodando, logado, salvar]);

  // ---- ações ----
  const nova = async (): Promise<Resp> => {
    setOcupado(true);
    fim.current = false;
    acum.current = 0;
    setRodando(false);
    const r = logado ? doServidor(await novaCrewConta()) : (() => {
      aplicar(novoProgresso(novaSeed(), catalogo, inicial.tagPropria));
      return { ok: true } as Resp;
    })();
    setOcupado(false);
    return r;
  };

  const fecharDiaAgora = useCallback(async (): Promise<Resp> => {
    const p = ref.current;
    if (!p) return { ok: false, erro: TEXTOS_ERRO.invalido };
    setOcupado(true);
    const antesNivel = p.nivel;
    let r: RespostaDia;
    if (logado) r = await fecharDiaConta(p);
    else {
      const f = fecharDiaPuro(p, catalogo);
      r = { ok: true, prog: f.prog, registro: f.registro, semana: f.semana, subiuDeNivel: f.subiuDeNivel };
      setResumo({ registro: f.registro, semana: f.semana, subiu: f.subiuDeNivel, julgamento: f.julgamento, antesNivel });
    }
    setOcupado(false);
    if (!r.ok) {
      avisar(r.erro, "erro");
      return { ok: false, erro: r.erro };
    }
    if (logado) setResumo({ registro: r.registro, semana: r.semana, subiu: r.subiuDeNivel, julgamento: null, antesNivel });
    fim.current = false;
    acum.current = 0;
    setProg({ ...r.prog, tranquilo: p.tranquilo });
    guardarAparelho({ ...r.prog, tranquilo: p.tranquilo });
    tocarMuro("moeda");
    router.push("/jogos/muro-livre/resumo");
    return { ok: true };
  }, [logado, catalogo, avisar, setProg, guardarAparelho, router]);

  // o dia acabou: fecha sozinho
  useEffect(() => {
    if (prog && prog.minuto >= MIN_DIA && !ocupado && fim.current) void fecharDiaAgora();
  }, [prog, ocupado, fecharDiaAgora]);

  const encerrarDia = async () => {
    const p = ref.current;
    if (!p) return;
    const r = avancar(p, catalogo, MIN_DIA - p.minuto);
    setProg(r.prog);
    mostrarAvisos(r.avisos);
    setRodando(false);
    fim.current = true;
  };

  const comprarMelhoriaA = async (slug: string): Promise<Resp> => {
    const p = ref.current!;
    const r = logado ? doServidor(await comprarMelhoriaConta(p, slug)) : local(comprarMelhoria(p, catalogo, slug));
    if (r.ok) tocarMuro("moeda");
    return r;
  };
  const comprarMaterialA = async (pedido: PedidoMaterial): Promise<Resp> => {
    const p = ref.current!;
    const r = logado ? doServidor(await comprarMaterialConta(p, pedido)) : local(comprarMaterial(p, catalogo, pedido));
    if (r.ok) tocarMuro("moeda");
    return r;
  };
  const contratarA = async (slug: string): Promise<Resp> => {
    const p = ref.current!;
    const r = logado ? doServidor(await contratarConta(p, slug)) : local(contratar(p, catalogo, slug));
    if (r.ok) tocarMuro("moeda");
    return r;
  };

  const entregar = async (jobId: string): Promise<Resp> => {
    const r = local(entregarPuro(ref.current!, catalogo, jobId));
    if (r.ok) {
      tocarMuro("entrega");
      if (logado) await salvar();
    }
    return r;
  };

  const pintar = (a: Pintura) => {
    const r = local(pintarManual(ref.current!, catalogo, a));
    if (r.ok) tocarMuro(a.camada === "fundo" || a.camada === "preenchimento" ? "rolinho" : "spray");
    return r;
  };
  const aprovar = (jobId: string, camada: Camada, cor: CorId) => {
    const r = local(aprovarTrecho(ref.current!, catalogo, { jobId, camada, cor }));
    if (r.ok) tocarMuro(camada === "fundo" || camada === "preenchimento" ? "rolinho" : "spray");
    return r;
  };
  const responder = (jobId: string, escolha: number) => {
    const r = local(responderPuro(ref.current!, catalogo, jobId, escolha));
    return r.ok ? { ...r, resposta: r.dados!.resposta, fim: r.dados!.fim, resultado: r.dados!.resultado } : r;
  };
  const inscrever = () => local(inscreverPuro(ref.current!, catalogo));
  const cobrir = (id: string) => {
    const r = local(cobrirPuro(ref.current!, catalogo, id));
    if (r.ok) tocarMuro("lona");
    return r;
  };

  return {
    prog, pronto, logado, catalogo, tag, tagPropria: inicial.tagPropria, rodando, vel, toasts, resumo, opcoes, ocupado, mudo,
    iniciarRelogio: () => { if (ref.current && ref.current.minuto < MIN_DIA) setRodando(true); },
    pausar: () => setRodando(false),
    alternarRelogio: () => { if (rodando) setRodando(false); else if (ref.current && ref.current.minuto < MIN_DIA) setRodando(true); },
    acelerar: () => setVel((v) => (v + 1) % MURO.dia.velocidades.length),
    setOpcoes, alternarSons, avisar, nova, encerrarDia, fecharDiaAgora,
    definirTranquilo: (v: boolean) => { if (ref.current) { aplicar({ ...ref.current, tranquilo: v }); agendarSalvar(); } },
    aceitar: (id: string) => local(aceitarPuro(ref.current!, catalogo, id)),
    responder,
    revisar: (id: string) => local(revisarPuro(ref.current!, catalogo, id)),
    iniciar: (id: string) => local(iniciarMural(ref.current!, catalogo, id)),
    escalar: (aid: string, jobId: string | null, camada: Camada | "auto" = "auto") => local(escalarPuro(ref.current!, aid, jobId, camada)),
    folga: (aid: string, v: boolean) => local(definirFolga(ref.current!, aid, v)),
    cobrir, descobrir: (id: string) => local(descobrirPuro(ref.current!, catalogo, id)),
    pintar, aprovar, entregar, inscrever,
    comprarMelhoria: comprarMelhoriaA, comprarMaterial: comprarMaterialA, contratar: contratarA,
    salvar,
  };
}

type Ctx = ReturnType<typeof useMuroEstado>;
const MuroCtx = createContext<Ctx | null>(null);

export function MuroProvider({ inicial, children }: { inicial: Inicial; children: ReactNode }) {
  const v = useMuroEstado(inicial);
  const valor = useMemo(() => v, [v]);
  return <MuroCtx.Provider value={valor}>{children}</MuroCtx.Provider>;
}

export function useMuro(): Ctx {
  const c = useContext(MuroCtx);
  if (!c) throw new Error("useMuro fora do MuroProvider");
  return c;
}

export { carregarMuro };
