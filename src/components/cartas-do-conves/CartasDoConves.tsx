"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { abandonarTravessiaConta, carregarConves, enviarAcoesConta, migrarLocalConta, novaTravessiaConta, type Carregado } from "@/app/actions/cartas-do-conves";
import { Chip, GameShell } from "@/components/GameShell";
import { CONFIG, ERROS } from "@/lib/cartas-do-conves/config";
import { CONTEUDO } from "@/lib/cartas-do-conves/conteudo";
import { aplicar, novaPartida } from "@/lib/cartas-do-conves/motor";
import { narrar } from "@/lib/cartas-do-conves/narrar";
import { novaSeed } from "@/lib/cartas-do-conves/rng";
import { migrar, novoSaveLocal } from "@/lib/cartas-do-conves/save";
import { liberacoes, simular } from "@/lib/cartas-do-conves/simular";
import { definirSom, somLigado, tocar } from "@/lib/cartas-do-conves/som";
import { TEXTOS } from "@/lib/cartas-do-conves/textos";
import type { Acao, Estado } from "@/lib/cartas-do-conves/tipos";
import { apagarLocal, guardarLocal, lerLocal } from "@/lib/gestao/save";
import { Colecao } from "./Colecao";
import { Combate } from "./Combate";
import { Icone, RosaDosVentos } from "./Icone";
import { Mapa } from "./Mapa";
import { Baralho, EscolherOficio, Evento, Fim, Porto, Recompensa, Tesouro, type SituacaoEnvio } from "./Telas";

type Partida = { seed: string; oficio: string; estado: Estado; acoes: Acao[] };

const refazer = (seed: string, oficio: string, colecao: string[], acoes: Acao[]): Partida | null => {
  const s = simular({ seed, oficio, colecao, acoes });
  return s.ok ? { seed, oficio, estado: s.estado, acoes } : null;
};

export function CartasDoConves({ inicial }: { inicial: Carregado }) {
  const logado = inicial.logado;
  const [colecao, setColecao] = useState(inicial.colecao);
  const [partida, setPartida] = useState<Partida | null>(() => (inicial.run ? refazer(inicial.run.seed, inicial.run.oficio, inicial.run.colecao, inicial.run.acoes) : null));
  const [tela, setTela] = useState<"capa" | "oficio">("capa");
  const [jogando, setJogando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [registro, setRegistro] = useState<string[]>([]);
  const [baralhoAberto, setBaralhoAberto] = useState(false);
  const [sync, setSync] = useState<"ok" | "enviando" | "erro">("ok");
  const [fim, setFim] = useState<{ situacao: SituacaoEnvio; novas: string[] }>({ situacao: logado ? "enviando" : "local", novas: [] });
  const [som, setSom] = useState(true);
  const fila = useRef<Promise<unknown>>(Promise.resolve());

  // O que só dá pra saber no navegador: som ligado, partida guardada neste aparelho e migração pra conta.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência guardada no navegador
    setSom(somLigado());
    const local = lerLocal(CONFIG.chaveLocal, migrar);
    if (!local) return;
    if (!logado) {
      const p = refazer(local.seed, local.oficio, [], local.acoes);
      if (p) setPartida(p);
      else apagarLocal(CONFIG.chaveLocal);
      return;
    }
    // Logou ou criou a conta com uma partida local guardada: sobe pra conta (o servidor re-simula).
    void migrarLocalConta(local).then(async (r) => {
      if (r.ok) {
        apagarLocal(CONFIG.chaveLocal);
        setAviso(TEXTOS.capa.migrou);
        const novo = await carregarConves();
        setColecao(novo.colecao);
        setPartida(novo.run ? refazer(novo.run.seed, novo.run.oficio, novo.run.colecao, novo.run.acoes) : null);
      } else setAviso(TEXTOS.capa.migrouFalhou);
    });
  }, [logado]);

  const enviar = useCallback((acoes: Acao[], final: boolean) => {
    setSync("enviando");
    if (final) setFim({ situacao: "enviando", novas: [] });
    fila.current = fila.current.then(async () => {
      const r = await enviarAcoesConta(acoes).catch(() => null);
      if (!r || !r.ok) {
        setSync("erro");
        if (final) setFim({ situacao: "erro", novas: [] });
        return;
      }
      setSync("ok");
      if (final) {
        setFim({ situacao: "ok", novas: r.novas ?? [] });
        if (r.colecao) setColecao(r.colecao);
      }
    });
  }, []);

  const agir = useCallback(
    (a: Acao) => {
      if (!partida) return;
      const r = aplicar(partida.estado, a);
      if (!r.ok) {
        setMensagem(ERROS[r.erro]);
        tocar("erro");
        return;
      }
      const acoes = [...partida.acoes, a];
      setPartida({ ...partida, estado: r.estado, acoes });
      setMensagem(null);
      setRegistro(narrar(partida.estado, r.estado));
      if (a.t === "jogar") tocar(CONTEUDO.cartas[partida.estado.combate!.mao[a.c]].tipo === "ataque" ? "golpe" : CONTEUDO.cartas[partida.estado.combate!.mao[a.c]].tipo === "defesa" ? "bloqueio" : "carta");
      else if (a.t === "fim") tocar("fim");
      if (r.estado.resultado === "vitoria") tocar("vitoria");
      if (r.estado.resultado === "derrota") tocar("derrota");

      if (!logado) {
        guardarLocal(CONFIG.chaveLocal, novoSaveLocal(partida.seed, partida.oficio, acoes));
        if (r.estado.resultado !== "andamento") setFim({ situacao: "local", novas: [] });
        return;
      }
      // Na conta, o servidor recebe a lista de ações quando o jogador volta ao mapa e no fim da travessia (nunca no meio do combate).
      const terminou = r.estado.resultado !== "andamento";
      if (terminou || (r.estado.fase === "mapa" && partida.estado.fase !== "mapa")) enviar(acoes, terminou);
    },
    [partida, logado, enviar],
  );

  const comecar = async (oficio: string) => {
    setOcupado(true);
    setAviso(null);
    try {
      let p: Partida | null;
      if (logado) {
        const r = await novaTravessiaConta(oficio);
        if (!r.ok) {
          setAviso(r.erro);
          return;
        }
        p = refazer(r.run.seed, r.run.oficio, r.run.colecao, []);
        setColecao(r.colecao);
      } else {
        const seed = novaSeed();
        const estado = novaPartida(seed, oficio, []);
        p = estado ? { seed, oficio, estado, acoes: [] } : null;
        if (p) guardarLocal(CONFIG.chaveLocal, novoSaveLocal(seed, oficio, []));
      }
      if (!p) {
        setAviso(TEXTOS.erro.generico);
        return;
      }
      setPartida(p);
      setFim({ situacao: logado ? "enviando" : "local", novas: [] });
      setRegistro([]);
      setMensagem(null);
      setTela("capa");
      setJogando(true);
    } finally {
      setOcupado(false);
    }
  };

  const abrirContinuar = () => {
    setRegistro([]);
    setMensagem(null);
    if (partida?.estado.resultado !== "andamento") setFim((f) => ({ ...f, situacao: logado ? f.situacao : "local" }));
    setJogando(true);
  };

  const sair = useCallback(() => setJogando(false), []);
  const alternarSom = () => {
    const v = !som;
    definirSom(v);
    setSom(v);
  };
  const abandonar = async () => {
    if (logado) await abandonarTravessiaConta();
    else apagarLocal(CONFIG.chaveLocal);
    setPartida(null);
  };

  const e = partida?.estado;
  const emAndamento = e && e.resultado === "andamento";
  const previa = e && e.resultado !== "andamento" ? liberacoes({ resultado: e.resultado, trecho: e.trechoMax, oficio: e.oficio, derrotados: e.derrotados, jogadas: e.jogadas }).filter((s) => !colecao.includes(s)) : [];
  const T = TEXTOS.capa;

  return (
    <>
      <div className="flex flex-col gap-5">
        {tela === "oficio" ? (
          <EscolherOficio onEscolher={comecar} onVoltar={() => setTela("capa")} ocupado={ocupado} />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <RosaDosVentos className="size-24 shrink-0 text-laranja-claro" />
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setTela("oficio")} className="btn h-14 bg-laranja px-8 text-lg text-noite focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro">
                    {T.nova}
                  </button>
                  {emAndamento && (
                    <button type="button" onClick={abrirContinuar} className="botao-vidro min-h-14 px-6 text-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro">
                      {T.continuar}
                    </button>
                  )}
                  {e && !emAndamento && (
                    <button type="button" onClick={abrirContinuar} className="botao-vidro min-h-14 px-6 text-lg">
                      {TEXTOS.fim.resumo}
                    </button>
                  )}
                  <a href="#como-jogar" className="botao-vidro inline-flex min-h-14 items-center px-6 text-lg no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro">
                    {T.comoJogar}
                  </a>
                </div>
                {emAndamento && (
                  <button type="button" onClick={abandonar} className="min-h-11 self-start text-sm text-areia underline">
                    Abandonar a travessia atual
                  </button>
                )}
                {aviso && (
                  <p className="m-0 text-sm text-laranja-claro" role="status">
                    {aviso}
                  </p>
                )}
              </div>
            </div>

            {!logado && (
              <div className="surface-vidro flex flex-col gap-2 p-4">
                <h2 className="m-0 text-xl font-semibold">{T.contaTitulo}</h2>
                <p className="m-0 text-areia">{T.contaTexto}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/cadastro" className="btn inline-flex min-h-12 items-center bg-laranja px-5 text-noite no-underline">
                    {T.criarConta}
                  </Link>
                  <Link href="/entrar" className="botao-vidro inline-flex min-h-12 items-center px-5 no-underline">
                    {T.entrar}
                  </Link>
                </div>
              </div>
            )}

            <section id="como-jogar" aria-labelledby="como-jogar-t" className="card flex flex-col gap-2 px-4 py-3.5">
              <h2 id="como-jogar-t" className="etiqueta m-0 text-[10px] text-laranja-claro">
                {T.comoJogar}
              </h2>
              <ol className="m-0 flex flex-col gap-1.5 pl-5 text-sm text-areia sm:text-[15px]">
                {TEXTOS.comoJogar.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
              <details className="text-sm text-areia">
                <summary className="min-h-11 cursor-pointer content-center font-semibold text-creme">Jogando só com o teclado</summary>
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {TEXTOS.teclado.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </details>
            </section>

            <Colecao colecao={colecao} />
            <p className="m-0 text-xs text-poeira">{T.avisoOuro}</p>
          </>
        )}
      </div>

      {jogando && partida && e && (
        <GameShell
          title={TEXTOS.titulo}
          onExit={sair}
          hud={
            <>
              <Chip rotulo={TEXTOS.hud.folego(e.folego, e.folegoMax)}>
                <Icone nome="folego" className="size-4" /> {e.folego}/{e.folegoMax}
              </Chip>
              <Chip rotulo={TEXTOS.hud.ouro(e.ouro)}>
                <Icone nome="ouro" className="size-4" /> {e.ouro}
              </Chip>
              <Chip>{TEXTOS.hud.trecho(e.trecho, CONFIG.trechos)}</Chip>
              <button type="button" className="gs-chip min-h-11" onClick={() => setBaralhoAberto(true)}>
                <Icone nome="baralho" className="size-4" /> {TEXTOS.hud.baralho(e.baralho.length)}
              </button>
              <button type="button" className="gs-chip min-h-11" onClick={alternarSom} aria-pressed={som} aria-label={TEXTOS.hud.som(som)}>
                <Icone nome={som ? "som" : "mudo"} className="size-4" />
              </button>
              <Chip>{logado ? (sync === "enviando" ? TEXTOS.hud.sincronizando : sync === "erro" ? TEXTOS.hud.erroSync : TEXTOS.hud.sincronizado) : TEXTOS.hud.local}</Chip>
            </>
          }
        >
          <div className="aspect-auto relative size-full bg-ceu" style={{ aspectRatio: "16 / 9" }}>
            {baralhoAberto ? (
              <Baralho estado={e} onFechar={() => setBaralhoAberto(false)} />
            ) : e.fase === "mapa" ? (
              <Mapa estado={e} agir={agir} />
            ) : e.fase === "combate" ? (
              <Combate estado={e} agir={agir} mensagem={mensagem} registro={registro} />
            ) : e.fase === "recompensa" ? (
              <Recompensa estado={e} agir={agir} />
            ) : e.fase === "evento" ? (
              <Evento estado={e} agir={agir} />
            ) : e.fase === "porto" ? (
              <Porto estado={e} agir={agir} />
            ) : e.fase === "tesouro" ? (
              <Tesouro agir={agir} />
            ) : (
              <Fim
                estado={e}
                situacao={fim.situacao}
                novas={fim.novas}
                previa={previa}
                logado={logado}
                onNova={() => {
                  setJogando(false);
                  setTela("oficio");
                }}
                onSair={sair}
              />
            )}
            {mensagem && e.fase !== "combate" && (
              <p className="absolute inset-x-0 bottom-3 m-0 text-center text-sm text-laranja-claro" role="alert">
                {mensagem}
              </p>
            )}
            {sync === "erro" && logado && (
              <button type="button" onClick={() => enviar(partida.acoes, e.resultado !== "andamento")} className="botao-vidro absolute bottom-3 right-3 min-h-11 px-3 text-sm">
                {TEXTOS.hud.tentar}
              </button>
            )}
            <ul className="sr-only" aria-live="polite">
              {registro.map((r, k) => (
                <li key={`${k}-${r}`}>{r}</li>
              ))}
            </ul>
          </div>
        </GameShell>
      )}
    </>
  );
}
