"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { faltaParaCarregar } from "@/lib/mar-sem-fim/barco";
import { CATALOGO, EVENTOS, ILHA, MUNDO, eventoDe, marDe } from "@/lib/mar-sem-fim/conteudo";
import { efeitosDoEvento, faltaParaChegar, planejarViagem, progressoDaViagem } from "@/lib/mar-sem-fim/viagem";
import { emViagem, limitesDoBarco, proximaDaAgulha } from "@/lib/mar-sem-fim/estado";
import { T, formatarDuracao, formatarNumero, formatarRelogio, textoDoErro } from "@/lib/mar-sem-fim/textos";
import type { Efeitos, Estado } from "@/lib/mar-sem-fim/tipos";
import { Icone } from "./Icone";
import { gravarVisao, lerVisao, MARCADORES, reduzMovimento, usePlaneta, type Visao } from "./mapa-comum";
import { useMar } from "./MarProvider";
import { AvisoConta, BASE } from "./Navegacao";
import { Barra, Valores } from "./Pecas";

const Globo3D = dynamic(() => import("./Globo3D"), { ssr: false, loading: () => <Carregando /> });
const Mapa2D = dynamic(() => import("./Mapa2D"), { ssr: false, loading: () => <Carregando /> });
const Carregando = () => <p className="m-0 p-6 text-center text-areia">{T.mundo.carregando}</p>;

const M = T.mundo;
const V = T.viagem;

// ---------- peças da gaveta ----------

function ChipsDaIlha({ id }: { id: string }) {
  const { estado } = useMar();
  const ilha = ILHA[id];
  const breve = MUNDO.emBreve.find((x) => x.id === id);
  if (breve) return <span className="gs-chip inline-flex items-center gap-1"><Icone nome="cadeado" tamanho={13} />{T.ilha.emBreveTitulo}</span>;
  if (!ilha || !estado) return null;
  const mar = ilha.mar === "corrente" ? null : marDe(ilha.mar);
  const st = estado.ilhas[id]?.status ?? "travada";
  return (
    <>
      <span className="gs-chip inline-flex items-center gap-1">
        <Icone nome={mar?.icone ?? "bussola"} tamanho={13} />
        {mar?.nome ?? MUNDO.corrente.nome}
      </span>
      <span className="gs-chip inline-flex items-center gap-1">
        <Icone nome={st === "travada" ? "cadeado" : st === "concluida" ? "check" : "ilha"} tamanho={13} />
        {T.ilha.status[st]}
      </span>
    </>
  );
}

function CartaDaIlha({ id, fechar }: { id: string; fechar: () => void }) {
  const { estado, ocupado, executar } = useMar();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  if (!estado) return null;
  const ilha = ILHA[id];
  const breve = MUNDO.emBreve.find((x) => x.id === id);
  const status = estado.ilhas[id]?.status ?? "travada";
  const aqui = estado.barco.ilhaAtual === id;
  const viajando = emViagem(estado);
  const plano = ilha && !aqui && status !== "travada" && !viajando ? planejarViagem(estado, id) : null;

  async function zarpar() {
    setErro(null);
    const r = await executar({ t: "zarpar", destino: id });
    if (!r.ok) setErro(textoDoErro(r.erro));
  }

  return (
    <section aria-label={ilha?.nome ?? breve?.nome} className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h2 className="m-0 text-lg font-semibold leading-tight text-creme-claro">{ilha?.nome ?? breve?.nome}</h2>
        <button type="button" onClick={fechar} aria-label={T.ilha.fechar} className="gs-redondo !size-11 shrink-0"><span aria-hidden="true" className="text-xl leading-none">×</span></button>
      </div>
      <div className="flex flex-wrap gap-1.5"><ChipsDaIlha id={id} /></div>
      <p className="m-0 text-sm text-areia">{ilha?.resumo ?? breve?.resumo}</p>
      {breve && <p className="m-0 text-sm text-warn"><strong>{T.ilha.requisito}:</strong> {breve.requisito}</p>}
      {ilha && status === "travada" && <p className="m-0 flex items-center gap-1.5 text-sm text-warn"><Icone nome="cadeado" tamanho={15} />{T.ilha.travadaAviso}</p>}
      {plano?.ok && (
        <p className="font-ficha m-0 text-xs text-creme" aria-label={T.ilha.duracao}>
          {T.ilha.duracao}: {formatarDuracao(plano.plano.minutos * 60_000)} · {Math.round(plano.plano.rota.graus * MUNDO.navegacao.leguasPorGrau)} {T.unidades.leguas}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {ilha && aqui && !viajando && (
          <Link href={`${BASE}/ilha/${id}`} className="gs-botao gs-botao-cta inline-flex items-center px-4 no-underline">
            {status === "concluida" ? T.ilha.voltarHistoria : T.ilha.verHistoria}
          </Link>
        )}
        {ilha && !aqui && status !== "travada" && (
          <button type="button" onClick={zarpar} disabled={ocupado || viajando} className="gs-botao gs-botao-cta px-4 disabled:opacity-60">
            {ocupado ? T.ilha.zarpando : T.ilha.zarpar}
          </button>
        )}
        {aqui && <span className="gs-chip self-center">{T.ilha.jaAqui}</span>}
        <button type="button" onClick={() => router.push(`${BASE}/barco`)} className="gs-botao px-3 text-sm">{T.nav.barco}</button>
      </div>
      {viajando && !aqui && status !== "travada" && <p className="m-0 text-xs text-areia">{T.ilha.emViagem}</p>}
      {erro && <p role="alert" className="m-0 text-sm text-danger">{erro}</p>}
    </section>
  );
}

function DetalhesDaIlha({ id }: { id: string }) {
  const ilha = ILHA[id];
  if (!ilha) return null;
  const linha = (rotulo: string, valor: string) => (
    <div><dt className="rotulo text-poeira">{rotulo}</dt><dd className="m-0 text-sm text-creme">{valor}</dd></div>
  );
  return (
    <dl className="m-0 grid gap-2 sm:grid-cols-2">
      {linha(T.ilha.bioma, ilha.bioma)}
      {linha(T.ilha.clima, ilha.clima)}
      {linha(T.ilha.regraEstranha, ilha.regraEstranha)}
      {linha(T.ilha.servicos, [ilha.servicos.mercado && T.ilha.mercado, ilha.servicos.estaleiro && T.ilha.estaleiro].filter(Boolean).join(", ") || "—")}
    </dl>
  );
}

function PainelViagem({ estado, agora }: { estado: Estado; agora: number }) {
  const v = estado.viagem!;
  const destino = ILHA[v.para];
  const falta = agora ? faltaParaChegar(v, agora) : 0;
  const pct = agora ? Math.round(progressoDaViagem(v, agora) * 100) : 0;
  return (
    <section aria-label={V.titulo} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="m-0 text-lg font-semibold text-creme-claro">{V.titulo}</h2>
        <span className="font-ficha text-xl text-laranja-claro" role="timer" aria-live="off">{agora ? formatarRelogio(falta) : "--:--:--"}</span>
      </div>
      <p className="m-0 text-sm text-areia">{V.para} <strong className="text-creme">{destino?.nome}</strong></p>
      <div role="progressbar" aria-label={V.titulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2.5 w-full overflow-hidden rounded-[4px] bg-black/35">
        <div className="h-full bg-laranja" style={{ width: `${pct}%` }} />
      </div>
      <p className="m-0 flex flex-wrap gap-x-3 text-xs text-areia">
        <span>{V.vento}: <span className="font-ficha">{v.vento.toFixed(2)}×</span></span>
        {v.faltouMantimento && <span className="flex items-center gap-1 text-warn"><Icone nome="raio" tamanho={13} />{V.semAgua}</span>}
      </p>
      {v.faltouMantimento && <p className="m-0 text-xs text-warn">{V.faltouMantimento}</p>}
      <p className="m-0 text-xs text-poeira">{V.deixeRodando}</p>
    </section>
  );
}

/** Resumo, em texto, do que uma escolha fez (casco, mantimentos, ouro, recompensa...). */
function textoDosEfeitos(ef: Efeitos): string[] {
  const s = (n: number) => `${n > 0 ? "+" : ""}${formatarNumero(n)}`;
  const l: string[] = [];
  if (ef.ouro) l.push(`${s(ef.ouro)} ${T.historia.ouroMais}`);
  if (ef.recompensa) l.push(`${s(ef.recompensa)} ${T.historia.recompensaMais}`);
  if (ef.casco) l.push(`${s(ef.casco)} ${T.historia.cascoMenos}`);
  if (ef.mantimentos) l.push(`${s(ef.mantimentos)} ${T.historia.mantimentosMenos}`);
  if (ef.item) l.push(`${T.historia.novoItem}: ${CATALOGO.itens[ef.item]?.nome}`);
  if (ef.aliado) l.push(`${T.historia.novoAliado}: ${CATALOGO.aliados[ef.aliado]?.nome}`);
  return l;
}

type Feito = { texto: string; efeitos: string[] };

function PainelResultado({ feito, onSeguir }: { feito: Feito; onSeguir: () => void }) {
  return (
    <section aria-label={V.resultado} className="flex flex-col gap-2">
      <h2 className="m-0 text-lg font-semibold text-creme-claro">{V.resultado}</h2>
      <p role="status" className="m-0 text-sm text-creme">{feito.texto}</p>
      {feito.efeitos.length > 0 && (
        <ul className="font-ficha m-0 flex list-none flex-wrap gap-1.5 p-0 text-xs">{feito.efeitos.map((e) => <li key={e} className="gs-chip">{e}</li>)}</ul>
      )}
      <button type="button" onClick={onSeguir} className="gs-botao gs-botao-cta self-start px-4">{V.continuar}</button>
    </section>
  );
}

function PainelEventos({ estado, onFeito }: { estado: Estado; onFeito: (f: Feito) => void }) {
  const { executar, ocupado } = useMar();
  const [erro, setErro] = useState<string | null>(null);
  const v = estado.viagem!;
  const pendente = v.eventos.find((e) => e.escolha === null);
  const def = pendente ? eventoDe(pendente.id) : null;
  const tipo = def ? EVENTOS.tipos[def.tipo] : null;

  async function escolher(opcaoId: string) {
    if (!def || !pendente) return;
    setErro(null);
    const op = def.opcoes.find((o) => o.id === opcaoId)!;
    const r = await executar({ t: "evento", id: pendente.id, opcao: opcaoId });
    if (r.ok) onFeito({ texto: op.resultado, efeitos: textoDosEfeitos(efeitosDoEvento(estado, def.tipo, op.efeitos, v.faltouMantimento)) });
    else setErro(textoDoErro(r.erro));
  }

  if (!def || !tipo) return null;
  return (
    <section aria-label={def.titulo} className="flex max-h-[44dvh] flex-col gap-2 overflow-auto">
      <p className="rotulo m-0 flex items-center gap-1.5 text-laranja-claro"><Icone nome={tipo.icone} tamanho={14} />{tipo.nome}</p>
      <h2 className="m-0 text-lg font-semibold text-creme-claro">{def.titulo}</h2>
      <p className="m-0 text-sm text-creme">{def.texto}</p>
      {v.faltouMantimento && <p className="m-0 text-xs text-warn">{V.faltouMantimento}</p>}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {def.opcoes.map((o) => {
          const semOuro = Boolean(o.exige && estado.ouro < o.exige.ouro);
          return (
            <li key={o.id}>
              <button type="button" disabled={ocupado || semOuro} onClick={() => escolher(o.id)} className="gs-botao w-full px-3 py-2 text-left text-sm disabled:opacity-55">
                {o.rotulo}
                {o.exige && <span className="font-ficha ml-2 text-xs text-areia">({T.historia.custa} {o.exige.ouro} {T.unidades.ouro})</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {erro && <p role="alert" className="m-0 text-sm text-danger">{erro}</p>}
    </section>
  );
}

function PainelAgulha({ estado, agora }: { estado: Estado; agora: number }) {
  const { executar, ocupado } = useMar();
  const A = T.agulha;
  const prox = proximaDaAgulha(estado);
  const ilhaNaAgulha = estado.agulha.ilha;
  const falta = agora ? faltaParaCarregar(estado, agora) : 0;
  const naOrdem = ilhaNaAgulha !== null && MUNDO.agulha.ordem.includes(ilhaNaAgulha);
  const fim = estado.agulha.carregada && ilhaNaAgulha === MUNDO.agulha.ordem.at(-1);
  return (
    <section aria-label={A.titulo} className="flex flex-col gap-1.5">
      <h3 className="m-0 flex items-center gap-1.5 text-base font-semibold text-creme-claro"><Icone nome="bussola" />{A.titulo}</h3>
      {!naOrdem ? <p className="m-0 text-sm text-areia">{A.semAgulha}</p> : (
        <>
          <p className="m-0 text-sm text-creme">{A.colada} <strong>{ILHA[ilhaNaAgulha]?.nome}</strong>: {estado.agulha.carregada ? A.carregada : A.carregando}.</p>
          {prox ? <p className="m-0 text-sm text-creme">{A.aponta} <strong>{ILHA[prox]?.nome}</strong>.</p> : fim ? <p className="m-0 text-sm text-areia">{A.fim}</p> : <p className="m-0 text-sm text-areia">{A.naoAponta}</p>}
          {!estado.agulha.carregada && estado.barco.ilhaAtual === ilhaNaAgulha && !emViagem(estado) && (
            <>
              <p className="m-0 text-xs text-poeira">{A.ficarMais}</p>
              <p className="font-ficha m-0 text-xs text-creme">{A.faltaCarregar}: {agora ? formatarRelogio(falta * 1000) : "--:--:--"}</p>
              <button type="button" disabled={ocupado || falta > 0} onClick={() => executar({ t: "carregar" })} className="gs-botao self-start px-3 text-sm disabled:opacity-50">{A.carregar}</button>
            </>
          )}
        </>
      )}
    </section>
  );
}

function ListaDeIlhas({ estado, selecionada, onSelecionar }: { estado: Estado; selecionada: string | null; onSelecionar: (id: string) => void }) {
  const grupo = (titulo: string, ids: string[], travado?: boolean) =>
    ids.length === 0 ? null : (
      <div>
        <h4 className="rotulo m-0 mb-1 text-poeira">{titulo}</h4>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {ids.map((id) => {
            const m = MARCADORES.find((x) => x.id === id)!;
            const ilha = ILHA[id];
            const mar = ilha && ilha.mar !== "corrente" ? marDe(ilha.mar) : null;
            const st = estado.ilhas[id]?.status;
            return (
              <li key={id}>
                <button type="button" aria-pressed={selecionada === id} onClick={() => onSelecionar(id)} className={`gs-botao flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${selecionada === id ? "!border-laranja-claro" : ""}`}>
                  <Icone nome={travado ? "cadeado" : (mar?.icone ?? "bussola")} tamanho={16} />
                  <span className="flex-1">{m.nome}{estado.barco.ilhaAtual === id && <span className="ml-2 text-xs text-laranja-claro">· {T.ilha.jaAqui}</span>}</span>
                  <span className="font-ficha text-xs text-areia">{ilha ? T.ilha.status[st ?? "travada"] : T.ilha.emBreveTitulo}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  const abertas = MARCADORES.filter((m) => !m.emBreve && (estado.ilhas[m.id]?.status ?? "travada") !== "travada").map((m) => m.id);
  const travadas = MARCADORES.filter((m) => !m.emBreve && (estado.ilhas[m.id]?.status ?? "travada") === "travada").map((m) => m.id);
  return (
    <nav aria-label={M.listaTitulo} className="flex flex-col gap-3">
      <p className="m-0 text-xs text-poeira">{M.listaAjuda}</p>
      {grupo(M.listaLiberadas, abertas)}
      {grupo(M.listaTravadas, travadas, true)}
      {grupo(M.listaEmBreve, MARCADORES.filter((m) => m.emBreve).map((m) => m.id), true)}
    </nav>
  );
}

// ---------- tela ----------

export function Mundo() {
  const router = useRouter();
  const { estado, pronto, agora, ocupado, executar } = useMar();
  const planeta = usePlaneta();
  const [visao, setVisao] = useState<Visao | null>(null);
  const [auto, setAuto] = useState(true);
  const [reduzido, setReduzido] = useState(false);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const chegando = useRef<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferências só existem no navegador
    setVisao(lerVisao());
    setReduzido(reduzMovimento());
    setAuto(!reduzMovimento());
  }, []);

  const sair = useCallback(() => router.push(BASE), [router]);

  // O servidor decide a hora da chegada: quando o relógio dele passa de chegaEm, pedimos "atracar" (uma vez por viagem).
  const v = estado?.viagem ?? null;
  useEffect(() => {
    if (!v || v.chegou || v.resolvida || !agora || agora < v.chegaEm || ocupado || chegando.current === v.numero) return;
    chegando.current = v.numero;
    // Se falhar (rede, relógio), tenta de novo em alguns segundos.
    void executar({ t: "chegar" }).then((r) => {
      if (!r.ok) setTimeout(() => { chegando.current = null; }, 5000);
    });
  }, [v, agora, ocupado, executar]);

  const trocarVisao = (x: Visao) => {
    setVisao(x);
    gravarVisao(x);
  };

  const hud = useMemo(() => (estado ? <Valores ouro={estado.ouro} recompensa={estado.recompensa} /> : null), [estado]);

  if (!pronto || visao === null) return <p className="px-4 py-10 text-center text-areia">{M.carregando}</p>;
  if (!estado) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 py-10">
        <p className="m-0 text-areia">{M.semPirata}</p>
        <Link href={`${BASE}/novo`} className="btn bg-laranja self-start text-tinta no-underline">{M.criarPirata}</Link>
        <AvisoConta />
      </div>
    );
  }

  const viajando = emViagem(estado);
  const emEvento = Boolean(v && v.chegou && !v.resolvida);
  const lim = limitesDoBarco(estado);

  const gaveta = feito ? (
    <PainelResultado feito={feito} onSeguir={() => setFeito(null)} />
  ) : viajando && v && !v.chegou ? (
    <PainelViagem estado={estado} agora={agora} />
  ) : emEvento ? (
    <PainelEventos estado={estado} onFeito={setFeito} />
  ) : selecionada ? (
    <CartaDaIlha id={selecionada} fechar={() => setSelecionada(null)} />
  ) : (
    <section aria-label={M.ilhaAtual} className="flex flex-col gap-1.5">
      <p className="m-0 text-sm text-areia">{M.ilhaAtual} <strong className="text-creme-claro">{ILHA[estado.barco.ilhaAtual].nome}</strong></p>
      <p className="m-0 text-xs text-poeira">{M.gestos}</p>
    </section>
  );

  const detalhes = (
    <div className="flex flex-col gap-4 pb-2">
      {selecionada && <DetalhesDaIlha id={selecionada} />}
      <PainelAgulha estado={estado} agora={agora} />
      <div className="flex flex-col gap-1.5">
        <Barra rotulo={T.unidades.casco} valor={estado.barco.casco} max={lim.casco} />
        <Barra rotulo={T.unidades.mantimentos} valor={estado.barco.mantimentos} max={lim.mantimentos} tom="laranja" />
      </div>
      <ListaDeIlhas estado={estado} selecionada={selecionada} onSelecionar={setSelecionada} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="rotulo mb-1 p-0 text-poeira">{M.visao.titulo}</legend>
        <div className="flex flex-wrap gap-2">
          {(["globo", "mapa"] as const).map((x) => (
            <label key={x} className={`gs-botao inline-flex cursor-pointer items-center px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laranja-claro ${visao === x ? "!border-laranja-claro" : ""}`}>
              <input type="radio" name="visao" value={x} checked={visao === x} onChange={() => trocarVisao(x)} className="sr-only" />
              {x === "globo" ? M.visao.globo : M.visao.mapa}
            </label>
          ))}
          <label className="gs-botao inline-flex cursor-pointer items-center gap-2 px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laranja-claro">
            <input type="checkbox" checked={auto && !reduzido} disabled={reduzido || visao === "mapa"} onChange={(e) => setAuto(e.target.checked)} />
            {M.visao.rotacao}
          </label>
        </div>
        <p className="m-0 text-xs text-poeira">{M.visao.ajuda}</p>
      </fieldset>
      <AvisoConta />
    </div>
  );

  return (
    <GameShell title={M.titulo} hud={hud} drawer={gaveta} drawerDetails={detalhes} dica={M.gestos} onExit={sair}>
      <div className="absolute inset-0 bg-noite">
        {planeta && visao === "globo" && (
          <Globo3D planeta={planeta} estado={estado} agora={agora} selecionada={selecionada} onSelecionar={setSelecionada} autoRotacao={auto} reduzido={reduzido} />
        )}
        {planeta && visao === "mapa" && <Mapa2D planeta={planeta} estado={estado} agora={agora} selecionada={selecionada} onSelecionar={setSelecionada} />}
        {!planeta && <Carregando />}
      </div>
    </GameShell>
  );
}
