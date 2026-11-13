"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { salvarTurno } from "@/app/actions/entrega";
import type { Toque, Turno } from "@/lib/entrega/cena";
import { TEXTOS } from "@/lib/entrega/config";
import { resumir, type Atributos, type Resumo, type TurnoEnviado } from "@/lib/entrega/regras";
import { guardarPendente, teclaDoEvento, useAjustesEntrega } from "./ajustes";
import { Capa } from "./Capa";
import { ControlesToque } from "./ControlesToque";
import { ResultadoTurno, type EstadoSalvar } from "./ResultadoTurno";
import { TeclasAtuais } from "./TeclasAtuais";

type Fase = "pronto" | "carregando" | "jogando" | "pausado" | "fim";

export function EntregaTurno({ atributos, logado }: { atributos: Atributos; logado: boolean }) {
  const [ajustes] = useAjustesEntrega();
  const [fase, setFase] = useState<Fase>("pronto");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [salvar, setSalvar] = useState<EstadoSalvar>({ tipo: "salvando" });
  const palco = useRef<HTMLDivElement>(null);
  const turno = useRef<Turno | null>(null);
  const toque = useRef<Toque>({ ativo: false, ang: 0, forca: 0, freio: false, nitro: false });
  const faseRef = useRef(fase);
  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  useEffect(() => () => turno.current?.destruir(), []);

  // Pausa real: tecla configurada ou quando a aba some.
  useEffect(() => {
    const alternar = (p: boolean) => {
      if (!turno.current) return;
      if (p && faseRef.current === "jogando") {
        turno.current.pausar(true);
        setFase("pausado");
      } else if (!p && faseRef.current === "pausado") {
        turno.current.pausar(false);
        setFase("jogando");
      }
    };
    const tecla = (e: KeyboardEvent) => {
      const t = teclaDoEvento(e);
      if (t && ajustes.teclas.pausa.includes(t)) alternar(faseRef.current === "jogando");
    };
    const aba = () => document.hidden && alternar(true);
    window.addEventListener("keydown", tecla);
    document.addEventListener("visibilitychange", aba);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.removeEventListener("visibilitychange", aba);
    };
  }, [ajustes.teclas.pausa]);

  async function terminar(t: TurnoEnviado) {
    setResumo(resumir(t));
    setFase("fim");
    if (!logado) {
      guardarPendente(t);
      setSalvar({ tipo: "semConta" });
      return;
    }
    setSalvar({ tipo: "salvando" });
    const r = await salvarTurno(t);
    if (r.ok) {
      setResumo(r.resumo);
      setSalvar({ tipo: "salvo", recorde: r.recorde });
    } else setSalvar(r.semConta ? { tipo: "semConta" } : { tipo: "erro", erro: r.erro });
  }

  async function comecar() {
    turno.current?.destruir();
    turno.current = null;
    setFase("carregando");
    // Phaser só existe no navegador: carrega aqui, no clique.
    const { criarTurno } = await import("@/lib/entrega/cena");
    if (!palco.current) return;
    palco.current.innerHTML = "";
    const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fonte = getComputedStyle(document.body).getPropertyValue("--font-ficha").trim() || "monospace";
    turno.current = criarTurno(
      palco.current,
      { atributos, teclas: ajustes.teclas, chuvaVisivel: ajustes.chuva, piscarMenos: ajustes.piscarMenos, relaxado: ajustes.relaxado, reduzido, fonte },
      toque.current,
      { aoTerminar: terminar },
    );
    setFase("jogando");
    palco.current.focus();
  }

  const pausar = () => {
    turno.current?.pausar(true);
    setFase("pausado");
  };
  const continuar = () => {
    turno.current?.pausar(false);
    setFase("jogando");
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 hidden text-center text-sm text-areia max-[900px]:portrait:block">{TEXTOS.turno.girar}</p>
      <div className="relative h-[min(78dvh,620px)] w-full overflow-hidden rounded-lg border border-creme/20 bg-ceu max-[900px]:landscape:fixed max-[900px]:landscape:inset-0 max-[900px]:landscape:z-[100] max-[900px]:landscape:h-auto max-[900px]:landscape:rounded-none max-[900px]:landscape:border-0">
        <div ref={palco} tabIndex={-1} className="absolute inset-0 outline-none" aria-label={TEXTOS.nome} />

        {fase === "jogando" && (
          <>
            <button type="button" onClick={pausar} className="botao-vidro absolute bottom-3 left-1/2 -translate-x-1/2 bg-noite/70 font-ficha text-sm" aria-label={TEXTOS.acoes.pausa}>
              ❚❚ {TEXTOS.acoes.pausa}
            </button>
            <ControlesToque mudar={(p) => Object.assign(toque.current, p)} temNitro={atributos.nitroCargas > 0} />
          </>
        )}

        {(fase === "pronto" || fase === "carregando") && <Capa cobrir className="absolute inset-0 h-full w-full opacity-60" />}

        {fase !== "jogando" && (
          <div className="absolute inset-0 flex justify-center overflow-y-auto bg-noite/60 p-3 sm:p-4 [&>*]:my-auto">
            {fase === "fim" && resumo ? (
              <ResultadoTurno r={resumo} salvar={salvar} onDeNovo={comecar} cadastroHref={`/cadastro?next=${encodeURIComponent("/jogos/entrega-na-chuva")}`} />
            ) : fase === "pausado" ? (
              <div className="surface-vidro flex w-full max-w-[360px] flex-col items-center gap-3 bg-noite/85 p-5 text-center" role="dialog" aria-label={TEXTOS.hud.pausado}>
                <p className="rotulo m-0 text-laranja-claro">❚❚ {TEXTOS.hud.pausado}</p>
                <button type="button" className="botao-laranja w-full" onClick={continuar} autoFocus>
                  {TEXTOS.turno.continuar}
                </button>
                <Link href="/jogos/entrega-na-chuva" className="flex min-h-11 items-center text-laranja-claro">
                  {TEXTOS.turno.sair}
                </Link>
              </div>
            ) : (
              <div className="surface-vidro flex w-full max-w-[560px] flex-col gap-4 bg-noite/85 p-4 sm:p-5">
                <div className="flex flex-col gap-1">
                  <p className="rotulo m-0 text-areia">{TEXTOS.entrada.etiqueta}</p>
                  <h2 className="m-0 text-2xl font-semibold sm:text-3xl">{TEXTOS.nome}</h2>
                </div>
                <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {TEXTOS.entrada.passos.map((p) => (
                    <li key={p.titulo} className="flex items-start gap-2 text-sm">
                      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded bg-laranja-claro font-ficha text-xs font-bold text-noite">
                        {p.icone}
                      </span>
                      <span>
                        <strong>{p.titulo}.</strong> <span className="text-areia max-[900px]:landscape:hidden">{p.texto}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="hidden [@media(pointer:fine)]:block">
                  <TeclasAtuais />
                </div>
                <p className="m-0 text-sm text-areia [@media(pointer:fine)]:hidden">📱 {TEXTOS.entrada.toque}</p>
                {!logado && <p className="m-0 text-sm text-areia">ⓘ {TEXTOS.oficina_.semConta}</p>}
                {ajustes.relaxado && <p className="m-0 text-sm">⏱ {TEXTOS.resultado.relaxado}</p>}
                <button type="button" className="botao-laranja w-full text-base" onClick={comecar} disabled={fase === "carregando"} autoFocus>
                  {fase === "carregando" ? TEXTOS.turno.carregando : `▶ ${TEXTOS.comecar}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
