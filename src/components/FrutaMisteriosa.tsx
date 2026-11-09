"use client";

import { useEffect, useRef, useState } from "react";
import type { Chegada, Controles, Jogo } from "@/lib/fruta/cena";
import { FASE_TESTE, LISTA_PODERES, PODERES, formataTempo, sortear, type PoderId } from "@/lib/fruta/regras";

type Tela = "menu" | "carregando" | "jogando" | "chegou";

const hex = (cor: number) => `#${cor.toString(16).padStart(6, "0")}`;

export function FrutaMisteriosa() {
  const palco = useRef<HTMLDivElement>(null);
  const jogo = useRef<Jogo | null>(null);
  const controles = useRef<Controles>({ esq: false, dir: false, pular: false, poder: false });
  const [tela, setTela] = useState<Tela>("menu");
  const [poder, setPoder] = useState<PoderId | null>(null);
  const [resultado, setResultado] = useState<Chegada | null>(null);

  useEffect(() => () => jogo.current?.destruir(), []);

  const aperta = (campo: keyof Controles, v: boolean) => {
    controles.current[campo] = v;
  };

  async function jogar(id: PoderId) {
    setPoder(id);
    if (jogo.current) {
      jogo.current.reiniciar(id);
      setTela("jogando");
      return;
    }
    setTela("carregando");
    // Phaser só existe no navegador: carrega aqui, no clique, e não no servidor.
    const { criarJogo } = await import("@/lib/fruta/cena");
    if (!palco.current) return;
    jogo.current = criarJogo(
      palco.current,
      controles.current,
      {
        aoChegar: (r) => {
          setResultado(r);
          setTela("chegou");
        },
      },
      id,
    );
    setTela("jogando");
  }

  const atual = poder ? PODERES[poder] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border-[6px] border-creme bg-[#dfe4e8] shadow-[0_10px_30px_rgb(0_0_0/0.35)]">
        <div ref={palco} className="absolute inset-0 [&_canvas]:!h-full [&_canvas]:!w-full" />

        {tela !== "jogando" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-noite/75 p-4 text-center text-creme-claro sm:gap-4 sm:p-6">
            {tela === "chegou" && resultado ? (
              <>
                <p className="etiqueta text-laranja-claro">Chegou no baú com a {PODERES[resultado.poder].nome}!</p>
                <p className="font-titulo text-4xl font-bold tracking-widest sm:text-5xl" aria-label={`${resultado.estrelas} de 3 estrelas`}>
                  {"★".repeat(resultado.estrelas)}
                  <span className="opacity-30">{"★".repeat(3 - resultado.estrelas)}</span>
                </p>
                <p className="font-ficha text-xs sm:text-base">
                  {formataTempo(resultado.tempo)} (alvo {formataTempo(FASE_TESTE.tempoAlvo)}) · moedas {resultado.moedas}/
                  {resultado.totalMoedas}
                  {resultado.mortes > 0 && ` · afundou ${resultado.mortes}x`}
                </p>
                <button type="button" onClick={() => jogar(resultado.poder)} className="btn bg-laranja px-6 py-2 text-noite sm:px-8 sm:py-3 sm:text-lg">
                  Mesma fruta de novo
                </button>
              </>
            ) : (
              <>
                <p className="etiqueta text-laranja-claro">Protótipo · etapa 1</p>
                <h2 className="font-titulo text-2xl font-bold sm:text-4xl">{FASE_TESTE.nome}</h2>
                <p className="hidden max-w-[460px] text-sm sm:block sm:text-base">
                  Chegue no baú sem encostar na água. Cada fruta tem um atalho com moedas só dela.
                </p>
              </>
            )}

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                disabled={tela === "carregando"}
                onClick={() => jogar(sortear(Math.random()).id as PoderId)}
                className="btn bg-creme-claro px-6 py-2 text-noite sm:text-lg"
              >
                {tela === "carregando" ? "Carregando…" : "Sortear fruta"}
              </button>
              <p className="etiqueta text-[11px] opacity-80">ou escolha (modo teste):</p>
              <div className="flex flex-wrap justify-center gap-2">
                {LISTA_PODERES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={tela === "carregando"}
                    onClick={() => jogar(p.id as PoderId)}
                    className="flex items-center gap-1.5 rounded-full border-2 border-creme-claro/60 px-3 py-1 text-xs font-bold hover:bg-creme-claro/15 sm:text-sm"
                  >
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: hex(p.cor) }} aria-hidden />
                    {p.nome.replace("Fruta ", "")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {atual && <p className="text-center font-ficha text-sm text-tinta">{atual.nome}: {atual.dica}</p>}

      {/* Botões de toque: só aparecem em tela de toque. */}
      <div className="hidden select-none items-center justify-between gap-3 pointer-coarse:flex">
        <div className="flex gap-3">
          <BotaoToque rotulo="Esquerda" campo="esq" aoMudar={aperta}>◀</BotaoToque>
          <BotaoToque rotulo="Direita" campo="dir" aoMudar={aperta}>▶</BotaoToque>
        </div>
        <div className="flex gap-3">
          <BotaoToque rotulo="Poder" campo="poder" aoMudar={aperta} cor="bg-azul text-creme-claro">
            Poder
          </BotaoToque>
          <BotaoToque rotulo="Pular" campo="pular" aoMudar={aperta} cor="bg-laranja">
            Pular
          </BotaoToque>
        </div>
      </div>
    </div>
  );
}

function BotaoToque({
  rotulo,
  campo,
  aoMudar,
  cor = "bg-creme-claro",
  children,
}: {
  rotulo: string;
  campo: keyof Controles;
  aoMudar: (campo: keyof Controles, v: boolean) => void;
  cor?: string;
  children: React.ReactNode;
}) {
  const [ativo, setAtivo] = useState(false);
  const muda = (v: boolean) => {
    aoMudar(campo, v);
    setAtivo(v);
  };
  return (
    <button
      type="button"
      aria-label={rotulo}
      className={`flex h-20 min-w-20 touch-none items-center justify-center rounded-2xl border-2 border-noite px-3 font-titulo text-xl font-bold shadow-duro-sm transition-transform ${cor} ${
        ativo ? "translate-x-[2px] translate-y-[2px] shadow-none" : ""
      }`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        muda(true);
      }}
      onPointerUp={() => muda(false)}
      onPointerCancel={() => muda(false)}
      onLostPointerCapture={() => muda(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
