"use client";

import { useEffect, useState } from "react";
import {
  ANCESTRALIDADES,
  ANTECEDENTES,
  ATRIBUTOS,
  CLASSES,
  FICHA_VAZIA,
  LIVRES_NIVEL_1,
  NOME_ATRIBUTO,
  NOME_PROF,
  PERICIAS,
  acharAncestralidade,
  acharAntecedente,
  acharClasse,
  ajustar,
  calcular,
  lerFicha,
  pendencias,
  periciasFixas,
  periciasParaEscolher,
  sinal,
  type Atributo,
  type Ficha,
  type Pericia,
} from "@/lib/pathfinder";

const CHAVE = "ficha-pathfinder:atual";

const PASSOS = [
  { id: "ancestralidade", nome: "Ancestralidade" },
  { id: "antecedente", nome: "Antecedente" },
  { id: "classe", nome: "Classe" },
  { id: "atributos", nome: "Atributos" },
  { id: "pericias", nome: "Perícias" },
  { id: "ficha", nome: "Ficha" },
] as const;
type Passo = (typeof PASSOS)[number]["id"];

const abrev = (a: Atributo) => NOME_ATRIBUTO[a].slice(0, 3).toUpperCase();

function Opcao({ ativo, onClick, titulo, detalhe, texto }: { ativo: boolean; onClick: () => void; titulo: string; detalhe: string; texto: string }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-xl border-2 border-noite p-4 text-left transition-transform hover:-translate-y-0.5 ${
        ativo ? "bg-laranja-claro shadow-duro-sm" : "bg-creme-claro"
      }`}
    >
      <span className="font-titulo text-xl font-bold leading-tight text-noite">{titulo}</span>
      <span className="font-ficha text-[12px] text-azul">{detalhe}</span>
      <span className="text-sm leading-snug text-tinta">{texto}</span>
    </button>
  );
}

function Chips({ titulo, opcoes, escolhidos, max, bloqueados = [], onChange }: {
  titulo: string;
  opcoes: readonly Atributo[];
  escolhidos: Atributo[];
  max: number;
  bloqueados?: Atributo[];
  onChange: (v: Atributo[]) => void;
}) {
  const alternar = (a: Atributo) => {
    if (escolhidos.includes(a)) onChange(escolhidos.filter((x) => x !== a));
    else if (max === 1) onChange([a]);
    else if (escolhidos.length < max) onChange([...escolhidos, a]);
  };
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border-2 border-noite bg-creme-claro p-4">
      <legend className="px-1 font-titulo text-lg font-bold text-noite">
        {titulo} <span className="font-ficha text-sm font-normal text-neutro">({escolhidos.length}/{max})</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((a) => {
          const ativo = escolhidos.includes(a);
          const off = bloqueados.includes(a) || (!ativo && max > 1 && escolhidos.length >= max);
          return (
            <button
              key={a}
              type="button"
              aria-pressed={ativo}
              disabled={off}
              onClick={() => alternar(a)}
              className={`rounded-full border-2 border-noite px-3 py-1.5 font-titulo text-sm font-bold disabled:opacity-35 ${
                ativo ? "bg-noite text-creme" : "bg-creme text-noite hover:bg-creme-escuro"
              }`}
            >
              {NOME_ATRIBUTO[a]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FichaPathfinder() {
  const [ficha, setFicha] = useState<Ficha>(FICHA_VAZIA);
  const [passo, setPasso] = useState<Passo>("ancestralidade");

  useEffect(() => {
    let guardada: Ficha | null = null;
    try {
      guardada = lerFicha(localStorage.getItem(CHAVE));
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    if (guardada) setFicha(guardada);
  }, []);

  const mudar = (parcial: Partial<Ficha>) => {
    const f = ajustar({ ...ficha, ...parcial });
    setFicha(f);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(f));
    } catch {}
  };

  const anc = acharAncestralidade(ficha.ancestralidade);
  const ant = acharAntecedente(ficha.antecedente);
  const cls = acharClasse(ficha.classe);
  const c = calcular(ficha);
  const falta = pendencias(ficha);
  const i = PASSOS.findIndex((p) => p.id === passo);
  const ir = (n: number) => {
    setPasso(PASSOS[n].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Passos da ficha" className="no-print">
        <ol className="flex list-none flex-wrap gap-2 p-0">
          {PASSOS.map((p, n) => (
            <li key={p.id}>
              <button
                type="button"
                aria-current={passo === p.id ? "step" : undefined}
                onClick={() => ir(n)}
                className={`rounded-full border-2 border-noite px-4 py-2 font-titulo text-base font-bold transition-colors ${
                  passo === p.id ? "bg-laranja text-noite" : "bg-creme-claro text-noite hover:bg-creme-escuro"
                }`}
              >
                {n + 1}. {p.nome}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="painel flex flex-col gap-5 rounded-2xl border-2 border-noite p-5 shadow-duro sm:p-8">
        {passo === "ancestralidade" && (
          <>
            <label className="flex flex-col gap-1">
              <span className="font-titulo text-lg font-bold">Nome do personagem</span>
              <input
                value={ficha.nome}
                maxLength={60}
                onChange={(e) => mudar({ nome: e.target.value })}
                placeholder="Ex.: Brunhilda Martelo-de-Pedra"
                className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base text-noite"
              />
            </label>
            <p className="m-0 text-tinta">A ancestralidade é o povo de onde seu herói vem. Ela define PV iniciais, tamanho, deslocamento e alguns atributos.</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {ANCESTRALIDADES.map((a) => (
                <Opcao
                  key={a.id}
                  ativo={ficha.ancestralidade === a.id}
                  onClick={() => mudar({ ancestralidade: a.id })}
                  titulo={a.nome}
                  detalhe={`${a.pv} PV · ${a.tamanho} · ${a.deslocamento} pés · ${[...a.boosts.map(abrev), ...Array(a.livres).fill("livre")].join(", ")}${a.falha ? ` · falha ${abrev(a.falha)}` : ""}`}
                  texto={a.texto}
                />
              ))}
            </div>
            {anc && anc.livres > 0 && (
              <Chips
                titulo={anc.livres === 1 ? "Boost livre da ancestralidade" : "Boosts livres da ancestralidade"}
                opcoes={ATRIBUTOS}
                escolhidos={ficha.boostsAncestral}
                max={anc.livres}
                bloqueados={anc.boosts}
                onChange={(v) => mudar({ boostsAncestral: v })}
              />
            )}
          </>
        )}

        {passo === "antecedente" && (
          <>
            <p className="m-0 text-tinta">O antecedente é o que seu herói fazia antes de se aventurar. Dá dois boosts, uma perícia treinada e um Saber.</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {ANTECEDENTES.map((a) => (
                <Opcao
                  key={a.id}
                  ativo={ficha.antecedente === a.id}
                  onClick={() => mudar({ antecedente: a.id })}
                  titulo={a.nome}
                  detalhe={`${abrev(a.opcoes[0])} ou ${abrev(a.opcoes[1])} · ${PERICIAS.find((p) => p.id === a.pericia)!.nome} · ${a.saber}`}
                  texto={a.texto}
                />
              ))}
            </div>
            {ant && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Chips
                  titulo="Boost do antecedente"
                  opcoes={ant.opcoes}
                  escolhidos={ficha.boostAntecedente ? [ficha.boostAntecedente] : []}
                  max={1}
                  onChange={(v) => mudar({ boostAntecedente: v[0] ?? "", boostAntecedenteLivre: ficha.boostAntecedenteLivre === v[0] ? "" : ficha.boostAntecedenteLivre })}
                />
                <Chips
                  titulo="Boost livre do antecedente"
                  opcoes={ATRIBUTOS}
                  escolhidos={ficha.boostAntecedenteLivre ? [ficha.boostAntecedenteLivre] : []}
                  max={1}
                  bloqueados={ficha.boostAntecedente ? [ficha.boostAntecedente] : []}
                  onChange={(v) => mudar({ boostAntecedenteLivre: v[0] ?? "" })}
                />
              </div>
            )}
          </>
        )}

        {passo === "classe" && (
          <>
            <p className="m-0 text-tinta">A classe é o que seu herói sabe fazer de melhor. Ela dá +1 no atributo-chave, PV, salvamentos e perícias.</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {CLASSES.map((k) => (
                <Opcao
                  key={k.id}
                  ativo={ficha.classe === k.id}
                  onClick={() => mudar({ classe: k.id })}
                  titulo={k.nome}
                  detalhe={`${k.pv} PV · chave ${k.chave.map(abrev).join(" ou ")} · ${k.extras} perícias + INT`}
                  texto={k.texto}
                />
              ))}
            </div>
            {cls && cls.chave.length > 1 && (
              <Chips
                titulo="Atributo-chave"
                opcoes={cls.chave}
                escolhidos={ficha.chave ? [ficha.chave] : []}
                max={1}
                onChange={(v) => mudar({ chave: v[0] ?? "" })}
              />
            )}
          </>
        )}

        {passo === "atributos" && (
          <>
            <p className="m-0 text-tinta">
              No nível 1 você ainda ganha {LIVRES_NIVEL_1} boosts livres, cada um num atributo diferente. Os valores abaixo já somam tudo que você escolheu.
            </p>
            <Chips titulo="Boosts livres" opcoes={ATRIBUTOS} escolhidos={ficha.boostsLivres} max={LIVRES_NIVEL_1} onChange={(v) => mudar({ boostsLivres: v })} />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {ATRIBUTOS.map((a) => (
                <div key={a} className={`flex flex-col items-center rounded-xl border-2 border-noite p-3 ${ficha.chave === a ? "bg-laranja-claro" : "bg-creme"}`}>
                  <span className="font-ficha text-[12px] text-neutro">{abrev(a)}</span>
                  <span className="font-titulo text-3xl font-bold text-noite">{sinal(c.attr[a])}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {passo === "pericias" && (
          <PassoPericias ficha={ficha} onChange={(p) => mudar({ pericias: p })} />
        )}

        {passo === "ficha" && <FolhaFinal ficha={ficha} />}

        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t-2 border-noite/15 pt-4">
          <button type="button" disabled={i === 0} onClick={() => ir(i - 1)} className="btn btn-contorno disabled:opacity-40">
            ← Voltar
          </button>
          {i < PASSOS.length - 1 ? (
            <button type="button" onClick={() => ir(i + 1)} className="btn bg-laranja text-noite">
              Próximo: {PASSOS[i + 1].nome} →
            </button>
          ) : (
            <button type="button" onClick={() => window.print()} className="btn bg-laranja text-noite">
              Imprimir / salvar PDF
            </button>
          )}
        </div>
      </div>

      <div className="no-print flex flex-col gap-2">
        {falta.length > 0 ? (
          <details className="rounded-xl border-2 border-creme/30 p-4 text-creme">
            <summary className="cursor-pointer font-titulo text-lg font-bold">Falta {falta.length} coisa{falta.length === 1 ? "" : "s"} pra ficha ficar completa</summary>
            <ul className="mt-2 pl-5">
              {falta.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="m-0 font-titulo text-lg font-bold text-laranja-claro">✓ Ficha completa e dentro das regras.</p>
        )}
        <button
          type="button"
          onClick={() => {
            if (!confirm("Apagar a ficha e começar do zero?")) return;
            mudar(FICHA_VAZIA);
            ir(0);
          }}
          className="self-start text-sm text-poeira underline"
        >
          Começar do zero
        </button>
        <p className="m-0 text-sm text-poeira">A ficha fica guardada aqui no navegador. Conteúdo de regras baseado no Pathfinder 2e (Remaster) da Paizo, uso de fã.</p>
      </div>
    </div>
  );
}

function PassoPericias({ ficha, onChange }: { ficha: Ficha; onChange: (p: Pericia[]) => void }) {
  const fixas = periciasFixas(ficha);
  const n = periciasParaEscolher(ficha);
  if (!acharClasse(ficha.classe)) return <p className="m-0 text-tinta">Escolha a classe primeiro: é ela que diz quantas perícias você treina.</p>;
  const alternar = (p: Pericia) => {
    if (ficha.pericias.includes(p)) onChange(ficha.pericias.filter((x) => x !== p));
    else if (ficha.pericias.length < n) onChange([...ficha.pericias, p]);
  };
  return (
    <>
      <p className="m-0 text-tinta">
        Escolha <strong>{n}</strong> perícia{n === 1 ? "" : "s"} treinada{n === 1 ? "" : "s"} (as da classe + Inteligência). As marcadas com ★ já vêm do antecedente ou da classe.
      </p>
      <p className="m-0 font-ficha text-sm text-azul">
        {ficha.pericias.length}/{n} escolhidas
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
        {PERICIAS.map((p) => {
          const fixa = fixas.includes(p.id);
          const ativo = fixa || ficha.pericias.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={ativo}
              disabled={fixa || (!ativo && ficha.pericias.length >= n)}
              onClick={() => alternar(p.id)}
              className={`flex items-center justify-between rounded-lg border-2 border-noite px-3 py-2 text-left font-titulo text-base font-bold disabled:cursor-default ${
                fixa ? "bg-creme-escuro text-noite" : ativo ? "bg-noite text-creme" : "bg-creme text-noite hover:bg-creme-escuro disabled:opacity-40"
              }`}
            >
              <span>
                {fixa && "★ "}
                {p.nome}
              </span>
              <span className="font-ficha text-[11px] font-normal opacity-70">{abrev(p.attr)}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Caixa({ rotulo, valor }: { rotulo: string; valor: string | number }) {
  return (
    <div className="flex flex-col items-center rounded-xl border-2 border-noite bg-creme p-3 text-center">
      <span className="font-ficha text-[11px] uppercase text-neutro">{rotulo}</span>
      <span className="font-titulo text-2xl font-bold text-noite">{valor}</span>
    </div>
  );
}

function FolhaFinal({ ficha }: { ficha: Ficha }) {
  const c = calcular(ficha);
  const anc = acharAncestralidade(ficha.ancestralidade);
  const ant = acharAntecedente(ficha.antecedente);
  const cls = acharClasse(ficha.classe);
  return (
    <div id="folha" className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 border-b-2 border-noite pb-3">
        <h2 className="m-0 font-titulo text-[2rem] font-bold leading-tight text-noite">{ficha.nome || "Sem nome"}</h2>
        <p className="m-0 font-ficha text-sm text-azul">
          {[anc?.nome, ant?.nome, cls?.nome].filter(Boolean).join(" · ") || "Escolha ancestralidade, antecedente e classe"} · Nível 1
        </p>
      </header>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ATRIBUTOS.map((a) => (
          <Caixa key={a} rotulo={NOME_ATRIBUTO[a]} valor={sinal(c.attr[a])} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Caixa rotulo="Pontos de vida" valor={c.pv} />
        <Caixa rotulo="CA (sem armadura)" valor={c.ca} />
        <Caixa rotulo="Percepção" valor={sinal(c.percepcao)} />
        <Caixa rotulo="CD de classe" valor={c.cdClasse ?? "—"} />
        <Caixa rotulo="Fortitude" valor={sinal(c.fortitude)} />
        <Caixa rotulo="Reflexos" valor={sinal(c.reflexos)} />
        <Caixa rotulo="Vontade" valor={sinal(c.vontade)} />
        <Caixa rotulo="Deslocamento" valor={`${c.deslocamento} pés`} />
      </div>
      <section>
        <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Perícias</h3>
        <ul className="grid list-none grid-cols-1 gap-x-6 gap-y-1 p-0 sm:grid-cols-2">
          {c.pericias.map((p) => (
            <li key={p.id} className="flex items-center justify-between border-b border-noite/15 py-1">
              <span className={p.prof === "treinado" ? "font-bold" : ""}>
                {p.nome} <span className="font-ficha text-[11px] text-neutro">({abrev(p.attr)} · {NOME_PROF[p.prof]})</span>
              </span>
              <span className="font-titulo text-lg font-bold">{sinal(p.bonus)}</span>
            </li>
          ))}
          {c.saber && (
            <li className="flex items-center justify-between border-b border-noite/15 py-1">
              <span className="font-bold">
                {c.saber} <span className="font-ficha text-[11px] text-neutro">(INT · T)</span>
              </span>
              <span className="font-titulo text-lg font-bold">{sinal(c.saberBonus)}</span>
            </li>
          )}
        </ul>
      </section>
      <p className="m-0 text-sm text-neutro">
        Tamanho {c.tamanho}. Ainda faltam no papel: talentos de ancestralidade e de classe, equipamento e magias, que dependem de cada livro. D = destreinado, T = treinado, E = especialista.
      </p>
    </div>
  );
}
