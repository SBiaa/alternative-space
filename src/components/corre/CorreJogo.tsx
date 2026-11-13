"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { carregarSave, migrarSaveLocal, salvarCorre } from "@/app/actions/corre";
import { CORRE, reais, relogio } from "@/lib/corre/config";
import { criarEstado, diaDaSemana, reduzir, type Acao, type Estado } from "@/lib/corre/motor";
import { novaSeed } from "@/lib/corre/rng";
import { CHAVE_LOCAL, escolherSave, migrar } from "@/lib/corre/save";
import { Celular } from "./Celular";
import { MapaCidade } from "./MapaCidade";
import { ResumoDiaCard, ResumoSemanaCard } from "./Resumos";

export function lerLocal(): Estado | null {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL);
    return bruto ? migrar(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
}
function gravarLocal(e: Estado) {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(e));
  } catch {}
}

const semAssinatura = () => () => {};

// O save mora no navegador: só monta o jogo depois da hidratação, pra servidor e cliente não divergirem.
export function CorreJogo({ novo }: { novo: boolean }) {
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);
  return montado ? <Jogo novo={novo} /> : <p className="px-4 py-10 text-areia">Abrindo o mapa…</p>;
}

function Jogo({ novo }: { novo: boolean }) {
  const [e, setE] = useState<Estado>(() => (novo ? criarEstado(novaSeed()) : (lerLocal() ?? criarEstado(novaSeed()))));
  const [logado, setLogado] = useState(false);
  const [pausado, setPausado] = useState(true);
  const [vel, setVel] = useState(1);
  const [gaveta, setGaveta] = useState(false);
  const [salvo, setSalvo] = useState("");
  const ref = useRef<Estado>(e);
  const inicialRef = useRef<Estado>(e);
  const acc = useRef(0);

  const persistir = useCallback(async (est: Estado) => {
    gravarLocal(est);
    const r = await salvarCorre(est).catch(() => null);
    if (r?.ok) setSalvo("Guardado na sua conta.");
    else if (r && "semConta" in r && r.semConta) setSalvo("");
    else if (r && !r.ok) setSalvo(r.erro);
  }, []);

  // Carga: abre na hora com o save do aparelho (ou um jogo novo). A conta, se existir, é conferida em seguida:
  // se tiver um save mais avançado e o jogo ainda estiver pausado, ele assume.
  useEffect(() => {
    let vivo = true;
    const inicial = inicialRef.current;
    carregarSave()
      .then(async (srv) => {
        if (!vivo) return;
        setLogado(srv.logado);
        if (!srv.logado) return;
        if (novo) {
          await salvarCorre(inicial);
          return;
        }
        const local = lerLocal();
        if (local) void migrarSaveLocal(local);
        const { save, origem } = escolherSave(ref.current, srv.save);
        if (origem === "remoto" && save && ref.current === inicial) {
          ref.current = save;
          setE(save);
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [novo]);

  const agir = useCallback(
    (a: Acao) => {
      const atual = ref.current;
      if (!atual) return;
      const prox = reduzir(atual, a);
      ref.current = prox;
      setE(prox);
      const fechou = (prox.fase === "resumoDia" || prox.fase === "resumoSemana") && prox.fase !== atual.fase;
      if (fechou || a.tipo === "continuar" || a.tipo === "ritmo") void persistir(prox);
      if (a.tipo === "escolher" || a.tipo === "sair") setPausado(false);
      if (prox.fase === "minigame" || prox.fase === "evento") setGaveta(true); // no celular, abre a gaveta
      if (prox.fase === "evento" || prox.fase === "resumoDia" || prox.fase === "resumoSemana") setPausado(true);
    },
    [persistir],
  );

  // Relógio: 1 h do jogo = msPorHora reais.
  useEffect(() => {
    if (pausado) return;
    const passo = 250;
    const id = setInterval(() => {
      acc.current += (passo / CORRE.tempo.msPorHora) * 60 * vel;
      const m = Math.floor(acc.current);
      if (m >= 1) {
        acc.current -= m;
        agir({ tipo: "tick", minutos: m });
      }
    }, passo);
    return () => clearInterval(id);
  }, [pausado, vel, agir]);

  const alternarPausa = () => {
    if (!pausado && ref.current) void persistir(ref.current);
    setPausado((p) => !p);
  };

  const emCurso = e.fase === "rodando" || e.fase === "viagem" || e.fase === "evento" || e.fase === "minigame";
  const chovendo = e.clima[Math.floor(e.minuto / 60) % 24];
  const pendente = Boolean(e.oferta) || e.fase === "evento" || e.fase === "minigame";

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/jogos/o-corre" className="etiqueta text-[11px] text-laranja-claro no-underline">← O Corre</Link>
        <p className="m-0 font-ficha text-sm" aria-live="off">
          Dia {e.dia} · semana {e.semana} · {relogio(e.minuto)} · {reais(e.dinheiro)}
        </p>
        <p className="m-0 text-sm text-areia">{chovendo ? "☔ Chovendo" : "Sem chuva"} · {diaDaSemana(e.dia) === 7 ? "Folga" : `Dia ${diaDaSemana(e.dia)} de ${CORRE.semana.diasTrabalho}`}</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {emCurso && (
            <>
              <button onClick={alternarPausa} className="btn-contorno min-h-11 px-4" aria-pressed={pausado}>
                {pausado ? "▶ Continuar" : "⏸ Pausar"}
              </button>
              {CORRE.tempo.velocidades.map((v) => (
                <button key={v} onClick={() => setVel(v)} aria-pressed={vel === v} className={`min-h-11 min-w-11 rounded-md border px-3 font-ficha text-sm ${vel === v ? "bg-creme text-noite" : "line-sutil text-creme"}`}>
                  {v}×
                </button>
              ))}
            </>
          )}
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={e.ritmoTranquilo} onChange={(ev) => agir({ tipo: "ritmo", ligado: ev.target.checked })} className="size-5" />
            {CORRE.textos.ritmoTranquilo}
          </label>
        </div>
      </header>

      {emCurso && pausado && <p role="status" className="m-0 text-sm text-laranja-claro">Jogo pausado. O tempo só corre quando você continuar.</p>}
      {e.fase === "casa" && <p className="m-0 text-sm text-areia">Você está em casa. Abra o celular e escolha quando sair.</p>}

      {e.fase === "resumoDia" && e.resumoDia ? (
        <ResumoDiaCard r={e.resumoDia} salvo={salvo} onContinuar={() => agir({ tipo: "continuar" })} />
      ) : e.fase === "resumoSemana" && e.resumoSemana ? (
        <ResumoSemanaCard r={e.resumoSemana} salvo={salvo} onContinuar={() => agir({ tipo: "continuar" })} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
          <div className="h-[46dvh] min-h-[280px] overflow-hidden rounded-lg lg:h-[640px]">
            <MapaCidade minuto={e.minuto} chovendo={chovendo} posicao={e.posicao} viagem={e.viagem} />
          </div>
          <button onClick={() => setGaveta(true)} className="btn bg-laranja text-noite lg:hidden">
            {pendente ? "● Abrir celular (tem novidade)" : "Abrir celular"}
          </button>
          <div className={gaveta ? "fixed inset-x-0 bottom-0 z-40 h-[78dvh] p-2" : "hidden lg:block lg:h-[640px]"}>
            {gaveta && (
              <button onClick={() => setGaveta(false)} className="mb-1 min-h-11 w-full rounded-md bg-noite/90 text-sm text-creme lg:hidden">Fechar celular</button>
            )}
            <div className={gaveta ? "h-[calc(100%-48px)]" : "h-full"}>
              <Celular e={e} agir={agir} />
            </div>
          </div>
        </div>
      )}

      {!logado && (
        <p className="m-0 text-sm text-areia">
          <Link href="/cadastro" className="text-laranja-claro">{CORRE.textos.criarConta}</Link>. Seu progresso fica só neste aparelho até lá.
        </p>
      )}
      <p className="m-0 text-xs text-poeira">{CORRE.textos.avisoDinheiro}</p>
    </div>
  );
}
