"use client";

import Link from "next/link";
import { useState } from "react";
import type { Desfecho } from "@/app/actions/assombracoes";
import { LUGAR_IDS, LUGARES, TEXTOS, TIPOS, type LugarId } from "@/lib/assombracoes/config";
import { faltamSinais } from "@/lib/assombracoes/investigacao";
import type { Publico } from "@/lib/assombracoes/schema";
import { tocar } from "@/lib/assombracoes/sons";
import { Criatura, IconeLugar, IconeSinal } from "./arte";
import { Ajustes, AvisoConta, CartaoOrigem, Opcoes } from "./pecas";
import { useAjustes, useVila } from "./useVila";

type Aba = "lugares" | "caderno" | "encontro";

export function CasoJogo({ publico }: { publico: Publico }) {
  const T = TEXTOS;
  const v = useVila();
  const aj = useAjustes();
  const [aba, setAba] = useState<Aba>("lugares");
  const [lugar, setLugar] = useState<LugarId>(publico.lugarPrincipal);
  const [aviso, setAviso] = useState("");
  const [criatura, setCriatura] = useState("");
  const [motivo, setMotivo] = useState("");
  const [escolha, setEscolha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [dica, setDica] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Desfecho | null>(null);

  const c = v.atual(publico.slug);
  const falta = faltamSinais(publico, c.estado);
  const lugaresDoCaso = LUGAR_IDS.filter((id) => id === publico.lugarPrincipal || publico.sinais.some((s) => s.lugar === id) || publico.moradores.some((m) => m.lugar === id));
  const nomeSinal = (id: string) => publico.sinais.find((s) => s.id === id)?.nome ?? id;
  const sons = { sons: aj.sons, semSustos: aj.semSustos };

  const anunciar = (novos: string[], depoimento: boolean) => {
    if (novos.length > 0) {
      setAviso(`${T.sinalNovo}: ${novos.map(nomeSinal).join(", ")}.`);
      tocar("sinal", sons);
    } else setAviso(depoimento ? T.depoimentoNovo : T.nadaNovo);
  };

  const olhar = async () => {
    const r = await v.olhar(publico, lugar);
    if (r.erro) setAviso(T.erros.generico);
    else anunciar(r.novos, false);
  };

  const perguntar = async (morador: string, fala: string) => {
    const r = await v.perguntarA(publico, morador, fala);
    if (r.erro) setAviso(T.erros.generico);
    else anunciar(r.novos, true);
  };

  const confirmar = async () => {
    setEnviando(true);
    setErro("");
    setDica(null);
    const r = await v.tentar(publico, { criatura, motivo, escolha });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro === "rede" ? T.erros.generico : r.erro);
    if (r.acertou) {
      setResultado(r.resultado);
      tocar("acerto", sons);
    } else {
      setDica(r.dica);
      tocar("erro", sons);
    }
  };

  const verDesfecho = async () => {
    const r = await v.reabrir(publico.slug);
    if (r) setResultado(r);
    else setErro(T.erros.generico);
  };

  if (!v.pronto) return <p className="text-areia" role="status">{T.conferindo}</p>;

  if (resultado) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <Criatura slug={resultado.criatura.slug} className="size-32 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="rotulo text-laranja-claro">{T.casoResolvido}</span>
            <h2 className="m-0 text-2xl font-semibold text-creme">{T.acertou}</h2>
            <p className="m-0 text-sm text-areia">
              {T.criaturaConhecida}: {resultado.criatura.nome}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {resultado.desfecho.map((p) => (
            <p key={p} className="m-0 text-creme">{p}</p>
          ))}
        </div>
        <CartaoOrigem origem={resultado.origem} />
        {!v.logado && <AvisoConta />}
        <div className="flex flex-wrap gap-2">
          <Link href="/jogos/assombracoes/bestiario" className="botao-laranja inline-flex items-center no-underline">{T.bestiario}</Link>
          <Link href="/jogos/assombracoes/mapa" className="botao-vidro inline-flex items-center no-underline">{T.verMapa}</Link>
        </div>
      </div>
    );
  }

  const moradoresAqui = publico.moradores.filter((m) => m.lugar === lugar);
  const abas: { id: Aba; nome: string; desabilitada?: boolean }[] = [
    { id: "lugares", nome: T.lugares },
    { id: "caderno", nome: `${T.caderno} (${c.estado.sinais.length})` },
    { id: "encontro", nome: T.encontro, desabilitada: falta > 0 || !criatura || !motivo },
  ];

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-creme">{publico.abertura}</p>

      {c.resolvido && (
        <div className="surface-vidro flex flex-wrap items-center gap-3 p-3">
          <span className="font-semibold text-creme">{T.casoResolvido}</span>
          <button type="button" className="botao-vidro" onClick={verDesfecho}>{T.origemTitulo}</button>
        </div>
      )}

      <Ajustes {...aj} />

      <div role="group" aria-label={publico.titulo} className="flex flex-wrap gap-2">
        {abas.map((a) => (
          <button key={a.id} type="button" aria-pressed={aba === a.id} disabled={a.desabilitada} onClick={() => setAba(a.id)} className={`${aba === a.id ? "botao-laranja" : "botao-vidro"}`}>
            {a.nome}
          </button>
        ))}
      </div>

      {/* Avisos de coleta, lidos por leitor de tela sem tirar o foco. */}
      <p className="m-0 min-h-6 text-sm text-laranja-claro" role="status" aria-live="polite">{aviso}</p>

      {aba === "lugares" && (
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <ul className="m-0 flex list-none flex-row gap-2 overflow-x-auto p-0 md:flex-col" aria-label={T.lugares}>
            {lugaresDoCaso.map((id) => (
              <li key={id}>
                <button type="button" aria-pressed={lugar === id} onClick={() => setLugar(id)} className={`${lugar === id ? "botao-laranja" : "botao-vidro"} flex w-full items-center gap-2 whitespace-nowrap text-left`}>
                  <IconeLugar id={id} className="size-7 shrink-0" />
                  {LUGARES[id].nome}
                </button>
              </li>
            ))}
          </ul>

          <section className="surface-vidro flex flex-col gap-4 p-4" aria-labelledby="lugar-nome">
            <div className="flex items-center gap-3">
              <IconeLugar id={lugar} className="size-12 shrink-0" />
              <div>
                <h2 id="lugar-nome" className="m-0 text-xl font-semibold text-creme">{LUGARES[lugar].nome}</h2>
                <p className="m-0 text-sm text-areia">{LUGARES[lugar].descricao}</p>
              </div>
            </div>
            <div>
              <button type="button" className="botao-vidro" onClick={olhar}>{T.olharLugar}</button>
            </div>

            {moradoresAqui.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="m-0 text-base font-semibold text-creme">{T.moradores}</h3>
                {moradoresAqui.map((m) => {
                  const liberadas = m.falas.filter((f) => f.requer.every((r) => c.estado.sinais.includes(r)) && (!f.depoisDe || c.estado.depoimentos.includes(f.depoisDe)));
                  return (
                    <article key={m.id} className="flex flex-col gap-2 rounded-md border border-creme/18 p-3" aria-label={m.nome}>
                      <p className="m-0 text-creme">
                        <span className="font-semibold">{m.nome}</span> <span className="text-sm text-areia">· {m.papel}</span>
                      </p>
                      {liberadas.map((f) => {
                        const feita = c.estado.depoimentos.includes(f.id);
                        return feita ? (
                          <div key={f.id} className="flex flex-col gap-1 text-sm">
                            <p className="m-0 text-areia">{f.pergunta}</p>
                            <p className="m-0 text-creme">{f.resposta}</p>
                          </div>
                        ) : (
                          <button key={f.id} type="button" className="botao-vidro text-left text-sm" onClick={() => perguntar(m.id, f.id)}>
                            {T.perguntar}: {f.pergunta}
                          </button>
                        );
                      })}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {aba === "caderno" && (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="cad-sinais" className="flex flex-col gap-2">
            <h2 id="cad-sinais" className="m-0 text-xl font-semibold text-creme">{T.sinais}</h2>
            {c.estado.sinais.length === 0 ? (
              <p className="m-0 text-areia">{T.cadernoVazioSinais}</p>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                {c.estado.sinais.map((id) => {
                  const s = publico.sinais.find((x) => x.id === id);
                  if (!s) return null;
                  return (
                    <li key={id} className="surface-vidro flex gap-3 p-3">
                      <IconeSinal tipo={s.tipo} className="size-8 shrink-0" />
                      <div>
                        <p className="m-0 text-xs font-ficha uppercase text-laranja-claro">{TIPOS[s.tipo].nome} · {LUGARES[s.lugar].nome}</p>
                        <p className="m-0 font-semibold text-creme">{s.nome}</p>
                        <p className="m-0 text-sm text-areia">{s.texto}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="cad-dep" className="flex flex-col gap-2">
            <h2 id="cad-dep" className="m-0 text-xl font-semibold text-creme">{T.moradores}</h2>
            {(() => {
              const itens = publico.moradores.flatMap((m) => m.falas.filter((f) => f.depoimento && c.estado.depoimentos.includes(f.id)));
              return itens.length === 0 ? (
                <p className="m-0 text-areia">{T.cadernoVazioDepoimentos}</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {itens.map((f) => (
                    <li key={f.id} className="surface-vidro p-3 text-sm text-creme">{f.depoimento}</li>
                  ))}
                </ul>
              );
            })()}
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <Opcoes nome="criatura" legenda={T.quemE} opcoes={publico.criaturas.map((x) => ({ id: x.slug, texto: x.nome }))} valor={criatura} onChange={setCriatura} />
            <Opcoes nome="motivo" legenda={T.oQueQuer} opcoes={publico.motivos} valor={motivo} onChange={setMotivo} />
          </div>
          {falta > 0 && <p className="m-0 text-laranja-claro">{T.faltamSinais(falta)}</p>}
          <div>
            <button type="button" className="botao-laranja" disabled={falta > 0 || !criatura || !motivo} onClick={() => setAba("encontro")}>{T.irParaEncontro}</button>
          </div>
        </div>
      )}

      {aba === "encontro" && (
        <section className="flex flex-col gap-4" aria-labelledby="enc-titulo">
          <h2 id="enc-titulo" className="m-0 text-xl font-semibold text-creme">{T.encontro}</h2>
          <p className="m-0 text-creme">{publico.encontro.cena}</p>
          <Opcoes nome="escolha" legenda={T.oQueFazer} opcoes={publico.encontro.opcoes} valor={escolha} onChange={setEscolha} />
          {dica && (
            <div className="surface-vidro flex flex-col gap-2 border-laranja-claro p-4" role="status">
              <span className="rotulo text-laranja-claro">{T.dicaTitulo}</span>
              <p className="m-0 text-creme">{dica}</p>
              <div>
                <button type="button" className="botao-vidro" onClick={() => (setDica(null), setAba("caderno"))}>{T.tentarDeNovo}</button>
              </div>
            </div>
          )}
          {erro && <p className="m-0 text-danger" role="alert">{erro}</p>}
          <div>
            <button type="button" className="botao-laranja" disabled={!escolha || enviando} onClick={confirmar}>
              {enviando ? T.conferindo : T.confirmar}
            </button>
          </div>
        </section>
      )}

      {!v.logado && Object.keys(v.casos).length > 0 && <AvisoConta />}
    </div>
  );
}
