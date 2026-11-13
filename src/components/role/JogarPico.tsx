"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { salvarCorrida } from "@/app/actions/role";
import { TEXTOS } from "@/lib/role/config";
import type { Pista } from "@/lib/role/pista";
import { AjustesControles } from "./AjustesControles";
import { BotoesManobra } from "./BotoesManobra";
import { HudJogo } from "./HudJogo";
import type { Motor } from "./motor";
import type { FimDeCorrida, Hud } from "./motor/jogo";
import { guardarPendente } from "./pendente";
import { ResultadoCorrida } from "./ResultadoCorrida";
import { useAjustesRole } from "./useAjustesRole";

type Salvar = { tipo: "salvando" } | { tipo: "ok"; recorde: boolean } | { tipo: "semConta" } | { tipo: "erro"; texto: string } | null;

// Jogar um pico publicado: mesmo motor do editor, só a cena de jogo.
export default function JogarPico({ slug, titulo, pista, logado }: { slug: string; titulo: string; pista: Pista; logado: boolean }) {
  const router = useRouter();
  const caixa = useRef<HTMLDivElement>(null);
  const motor = useRef<Motor | null>(null);
  const [pronto, setPronto] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [fim, setFim] = useState<FimDeCorrida | null>(null);
  const [salvar, setSalvar] = useState<Salvar>(null);
  const [rodada, setRodada] = useState(0);
  const { ajustes, reduzido, mudar } = useAjustesRole();

  useEffect(() => {
    let vivo = true;
    let m: Motor | null = null;
    import("./motor").then(async ({ criarMotor }) => {
      if (!vivo || !caixa.current) return;
      m = await criarMotor(caixa.current);
      if (!vivo) return m.destruir();
      motor.current = m;
      setPronto(true);
    });
    return () => {
      vivo = false;
      m?.destruir();
      motor.current = null;
    };
  }, []);

  const aoFim = useCallback(
    async (f: FimDeCorrida) => {
      setFim(f);
      setSalvar({ tipo: "salvando" });
      const r = await salvarCorrida(slug, f.corrida);
      if (r.ok) {
        setSalvar({ tipo: "ok", recorde: r.recorde });
        router.refresh();
      } else if (r.semConta) {
        if (f.corrida.finished) guardarPendente({ slug, titulo, corrida: f.corrida });
        setSalvar({ tipo: "semConta" });
      } else setSalvar({ tipo: "erro", texto: r.erro });
    },
    [slug, titulo, router],
  );

  useEffect(() => {
    if (!pronto) return;
    motor.current?.jogar({ pista, teclas: ajustes.teclas, reduzido, aoHud: setHud, aoFim });
    caixa.current?.focus();
    // Recomeça só quando pedem outra rodada.
  }, [pronto, rodada]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={caixa}
          tabIndex={0}
          role="application"
          aria-label={TEXTOS.jogo.ajudaTeclado}
          className="h-[min(62vh,520px)] w-full touch-none overflow-hidden rounded-lg border border-line-strong bg-ceu landscape:max-lg:h-[calc(100dvh-96px)]"
        />
        <HudJogo hud={hud} />
        {ajustes.botoesNaTela && pronto && !fim && <BotoesManobra aoDirecao={(d, on) => motor.current?.direcao(d, on)} />}
        {fim && (
          <div className="absolute inset-0 flex items-center justify-center bg-noite/60 p-3">
            <ResultadoCorrida fim={fim} timeLimit={pista.timeLimit}>
              <p className="m-0 text-sm" aria-live="polite">
                {salvar?.tipo === "ok" && (salvar.recorde ? TEXTOS.pico.novoRecorde : TEXTOS.pico.corridaGuardada)}
                {salvar?.tipo === "erro" && salvar.texto}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="botao-laranja min-h-11 px-4" onClick={() => {
                    setFim(null);
                    setHud(null);
                    setSalvar(null);
                    setRodada((n) => n + 1);
                  }}>
                  {TEXTOS.resultado.deNovo}
                </button>
                {salvar?.tipo === "semConta" && !logado && (
                  <Link href={`/cadastro?next=/jogos/role-noturno/pico/${slug}`} className="botao-vidro min-h-11 content-center px-4 !text-tinta no-underline">
                    {TEXTOS.pico.entrarRanking}
                  </Link>
                )}
              </div>
            </ResultadoCorrida>
          </div>
        )}
      </div>
      <p className="m-0 text-sm text-areia">{ajustes.botoesNaTela ? TEXTOS.jogo.ajudaToque : TEXTOS.jogo.ajudaTeclado}</p>
      <AjustesControles ajustes={ajustes} mudar={mudar} />
    </div>
  );
}
