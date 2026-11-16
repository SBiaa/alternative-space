"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { APARENCIA, MUNDO, OFICIOS, ILHA } from "@/lib/mar-sem-fim/conteudo";
import { T, textoDoErro } from "@/lib/mar-sem-fim/textos";
import type { Aparencia, Bandeira } from "@/lib/mar-sem-fim/tipos";
import { Icone } from "./Icone";
import { useMar } from "./MarProvider";
import { AvisoConta, BASE, NavMar } from "./Navegacao";
import { BandeiraArte, PirataArte } from "./Pecas";

type Item = { id: string; rotulo: string; detalhe?: string; icone?: string; cor?: string };

/** Grupo de escolha única com radios de verdade (teclado e leitor de tela), em botões de 44px. */
function Escolha({ legenda, nome, valor, onChange, itens, grande }: { legenda: string; nome: string; valor: string; onChange: (id: string) => void; itens: Item[]; grande?: boolean }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="rotulo mb-1 p-0 text-poeira">{legenda}</legend>
      <div className={grande ? "grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"}>
        {itens.map((i) => (
          <label
            key={i.id}
            className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-[6px] border px-3 py-2 text-sm has-[:checked]:border-laranja-claro has-[:checked]:bg-laranja-claro/15 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laranja-claro ${valor === i.id ? "border-laranja-claro" : "border-creme/30"}`}
          >
            <input type="radio" name={nome} value={i.id} checked={valor === i.id} onChange={() => onChange(i.id)} className="sr-only" />
            {i.cor && <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border border-black/40" style={{ background: i.cor }} />}
            {i.icone && <Icone nome={i.icone} tamanho={18} className="mt-0.5 shrink-0" />}
            <span className="flex flex-col">
              <span className="font-semibold text-creme">{i.rotulo}</span>
              {i.detalhe && <span className="text-xs text-areia">{i.detalhe}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const Secao = ({ titulo, ajuda, children }: { titulo: string; ajuda?: string; children: ReactNode }) => (
  <section className="surface-vidro flex flex-col gap-4 p-4">
    <div>
      <h2 className="m-0 text-xl font-semibold">{titulo}</h2>
      {ajuda && <p className="m-0 mt-1 text-sm text-areia">{ajuda}</p>}
    </div>
    {children}
  </section>
);

const nomeados = (l: { id: string; nome: string; valor?: string }[]): Item[] => l.map((x) => ({ id: x.id, rotulo: x.nome, cor: x.valor }));

export function FormNovo() {
  const router = useRouter();
  const { estado, pronto, criar, ocupado } = useMar();
  const [nome, setNome] = useState("");
  const [ap, setAp] = useState<Aparencia>({ silhueta: APARENCIA.silhuetas[0].id, cor: APARENCIA.cores[1].id, chapeu: APARENCIA.chapeus[1].id, cicatriz: APARENCIA.cicatrizes[0].id });
  const [mar, setMar] = useState(MUNDO.mares[0].id);
  const [oficio, setOficio] = useState(OFICIOS[0].id);
  const [barco, setBarco] = useState("");
  const [bd, setBd] = useState<Bandeira>({ fundo: "liso", fundoCor: "azul", forma: "estrela", formaCor: "creme" });
  const [erro, setErro] = useState<string | null>(null);

  if (!pronto) return <p className="text-areia">{T.mundo.carregando}</p>;
  if (estado) {
    return (
      <div className="flex flex-col gap-4">
        <NavMar atual="novo" />
        <p role="status" className="m-0 text-areia">{T.novo.jaTem}</p>
        <Link href={`${BASE}/mundo`} className="btn bg-laranja self-start text-tinta no-underline">{T.novo.irParaMundo}</Link>
      </div>
    );
  }

  const corIgual = bd.fundoCor === bd.formaCor;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (corIgual) return setErro(textoDoErro("bandeira"));
    const r = await criar({ nome, aparencia: ap, mar, oficio, barco, bandeira: bd });
    if (r.ok) router.push(`${BASE}/mundo`);
    else setErro(textoDoErro(r.erro));
  }

  const marEscolhido = MUNDO.mares.find((m) => m.id === mar)!;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <NavMar atual="novo" />
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{T.novo.titulo}</h1>
        <p className="m-0 text-areia">{T.novo.chamada}</p>
      </header>

      <Secao titulo={T.novo.passos.pirata}>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div className="surface-creme flex items-end justify-center p-3" aria-live="polite">
            <PirataArte aparencia={ap} rotulo={nome || T.novo.nome.marcador} className="block w-[120px]" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="ms-nome" className="rotulo text-poeira">{T.novo.nome.rotulo}</label>
              <input
                id="ms-nome" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={T.novo.nome.marcador}
                minLength={APARENCIA.nome.min} maxLength={APARENCIA.nome.max} autoComplete="off" required aria-describedby="ms-nome-ajuda" className="campo-vidro"
              />
              <span id="ms-nome-ajuda" className="text-xs text-areia">{T.novo.nome.ajuda}</span>
            </div>
            <Escolha legenda={T.novo.aparencia.silhueta} nome="silhueta" valor={ap.silhueta} onChange={(silhueta) => setAp({ ...ap, silhueta })} itens={nomeados(APARENCIA.silhuetas)} />
            <Escolha legenda={T.novo.aparencia.cor} nome="cor" valor={ap.cor} onChange={(cor) => setAp({ ...ap, cor })} itens={nomeados(APARENCIA.cores)} />
            <Escolha legenda={T.novo.aparencia.chapeu} nome="chapeu" valor={ap.chapeu} onChange={(chapeu) => setAp({ ...ap, chapeu })} itens={nomeados(APARENCIA.chapeus)} />
            <Escolha legenda={T.novo.aparencia.cicatriz} nome="cicatriz" valor={ap.cicatriz} onChange={(cicatriz) => setAp({ ...ap, cicatriz })} itens={nomeados(APARENCIA.cicatrizes)} />
          </div>
        </div>
      </Secao>

      <Secao titulo={T.novo.passos.mar} ajuda={T.novo.mar.ajuda}>
        <Escolha
          legenda={T.novo.passos.mar} nome="mar" valor={mar} onChange={setMar} grande
          itens={MUNDO.mares.map((m) => ({ id: m.id, rotulo: m.nome, icone: m.icone, detalhe: `${m.descricao} ${m.bonus.texto}` }))}
        />
        <p className="m-0 text-sm text-areia">
          {T.novo.mar.comecaEm}: <strong className="text-creme">{ILHA[marEscolhido.ilhaOrigem].nome}</strong>
        </p>
      </Secao>

      <Secao titulo={T.novo.passos.oficio} ajuda={T.novo.oficio.ajuda}>
        <Escolha legenda={T.novo.passos.oficio} nome="oficio" valor={oficio} onChange={setOficio} grande itens={OFICIOS.map((o) => ({ id: o.id, rotulo: o.nome, icone: o.icone, detalhe: `${o.descricao} ${o.vantagem.texto}` }))} />
      </Secao>

      <Secao titulo={T.novo.passos.barco}>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div className="surface-creme flex flex-col items-center justify-center gap-2 p-3">
            <BandeiraArte bandeira={bd} rotulo={T.novo.barco.bandeira} className="block w-[120px]" />
            <span className="font-semibold text-azul">{barco || T.novo.barco.marcador}</span>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="ms-barco" className="rotulo text-poeira">{T.novo.barco.nome}</label>
              <input id="ms-barco" name="barco" value={barco} onChange={(e) => setBarco(e.target.value)} placeholder={T.novo.barco.marcador} minLength={APARENCIA.barco.min} maxLength={APARENCIA.barco.max} autoComplete="off" required className="campo-vidro" />
            </div>
            <Escolha legenda={T.novo.barco.fundo} nome="fundo" valor={bd.fundo} onChange={(fundo) => setBd({ ...bd, fundo })} itens={nomeados(APARENCIA.bandeira.fundos)} />
            <Escolha legenda={T.novo.barco.forma} nome="forma" valor={bd.forma} onChange={(forma) => setBd({ ...bd, forma })} itens={nomeados(APARENCIA.bandeira.formas)} />
            <Escolha legenda={T.novo.barco.fundoCor} nome="fundoCor" valor={bd.fundoCor} onChange={(fundoCor) => setBd({ ...bd, fundoCor })} itens={nomeados(APARENCIA.bandeira.cores)} />
            <Escolha legenda={T.novo.barco.formaCor} nome="formaCor" valor={bd.formaCor} onChange={(formaCor) => setBd({ ...bd, formaCor })} itens={nomeados(APARENCIA.bandeira.cores)} />
            {corIgual && <p role="alert" className="m-0 text-sm text-warn">{T.novo.barco.avisoCores}</p>}
          </div>
        </div>
      </Secao>

      {erro && <p role="alert" className="m-0 text-danger">{erro}</p>}
      <div className="flex flex-col gap-3">
        <button type="submit" disabled={ocupado} className="btn self-start bg-laranja text-tinta disabled:opacity-60">
          {ocupado ? T.novo.enviando : T.novo.enviar}
        </button>
        <AvisoConta />
        <p className="m-0 text-xs text-poeira">{T.aviso}</p>
      </div>
    </form>
  );
}
