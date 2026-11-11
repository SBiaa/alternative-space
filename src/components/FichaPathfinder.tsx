"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { importPf2eAction, savePf2eAction } from "@/app/fichas/actions";
import {
  ANCESTRALIDADES,
  ANTECEDENTES,
  ATRIBUTOS,
  AUMENTOS_POR_NIVEL,
  CLASSES,
  FICHA_VAZIA,
  LIVRES_NIVEL_1,
  NIVEIS_AUMENTO,
  NIVEL_MAX,
  NOME_ATRIBUTO,
  NOME_PROF,
  NOME_PROF_LONGO,
  NOME_TIPO_TALENTO,
  PERICIAS,
  acharAncestralidade,
  acharAntecedente,
  acharClasse,
  acharHeranca,
  ajustar,
  atributosDetalhe,
  calcular,
  grausPericia,
  lerFicha,
  niveisAumentoPericia,
  pendencias,
  periciasFixas,
  periciasParaEscolher,
  sinal,
  vagasTalento,
  type Atributo,
  type Ficha,
  type Pericia,
  type Prof,
} from "@/lib/pathfinder";
import { sugestoesTalento } from "@/lib/pathfinder-talentos";

const CHAVE = "ficha-pathfinder:atual";

const PASSOS = [
  { id: "ancestralidade", nome: "Ancestralidade" },
  { id: "antecedente", nome: "Antecedente" },
  { id: "classe", nome: "Classe" },
  { id: "atributos", nome: "Atributos" },
  { id: "pericias", nome: "Perícias" },
  { id: "talentos", nome: "Talentos" },
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

type Props = {
  // Ficha da conta: salva sozinha no banco. Sem isso, a ficha fica no navegador.
  nuvem?: { id: string; inicial: Ficha };
  logado?: boolean;
};

type Salvamento = { estado: "ok" | "salvando" | "erro"; msg?: string };

export function FichaPathfinder({ nuvem, logado = false }: Props) {
  const [ficha, setFicha] = useState<Ficha>(nuvem?.inicial ?? FICHA_VAZIA);
  const [passo, setPasso] = useState<Passo>("ancestralidade");
  const [salvamento, setSalvamento] = useState<Salvamento>({ estado: "ok" });
  const [importando, startImportar] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (nuvem) return;
    let guardada: Ficha | null = null;
    try {
      guardada = lerFicha(localStorage.getItem(CHAVE));
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    if (guardada) setFicha(guardada);
  }, [nuvem]);

  const mudar = (parcial: Partial<Ficha>) => {
    const f = ajustar({ ...ficha, ...parcial });
    setFicha(f);
    if (nuvem) {
      // Espera a pessoa parar de digitar antes de mandar pro banco.
      setSalvamento({ estado: "salvando" });
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const r = await savePf2eAction(nuvem.id, f).catch(() => ({ ok: false as const, error: "Sem conexão. Tentando de novo na próxima mudança." }));
        setSalvamento(r.ok ? { estado: "ok" } : { estado: "erro", msg: r.error });
      }, 800);
      return;
    }
    try {
      localStorage.setItem(CHAVE, JSON.stringify(f));
    } catch {}
  };

  const salvarNaConta = () =>
    startImportar(async () => {
      try {
        const id = await importPf2eAction(ficha);
        try {
          localStorage.removeItem(CHAVE);
        } catch {}
        router.push(`/fichas/${id}`);
      } catch {
        setSalvamento({ estado: "erro", msg: "Não deu pra salvar na conta agora. Tenta de novo." });
      }
    });

  const anc = acharAncestralidade(ficha.ancestralidade);
  const ant = acharAntecedente(ficha.antecedente);
  const cls = acharClasse(ficha.classe);
  const c = calcular(ficha);
  const { parcial } = atributosDetalhe(ficha);
  const falta = pendencias(ficha);
  const i = PASSOS.findIndex((p) => p.id === passo);
  const ir = (n: number) => {
    setPasso(PASSOS[n].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6">
      <label className="no-print flex items-center gap-3 self-start rounded-full border-2 border-noite bg-creme-claro px-4 py-2">
        <span className="font-titulo text-lg font-bold text-noite">Nível</span>
        <select
          value={ficha.nivel}
          onChange={(e) => mudar({ nivel: Number(e.target.value) })}
          className="rounded-lg border-2 border-noite bg-creme px-2 py-1 font-titulo text-lg font-bold text-noite"
        >
          {Array.from({ length: NIVEL_MAX }, (_, n) => n + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
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

      <div className="painel print-sheet flex flex-col gap-5 rounded-2xl border-2 border-noite p-5 shadow-duro sm:p-8">
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
            {anc && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-titulo text-lg font-bold text-noite">Herança</legend>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                  {anc.herancas.map((h) => (
                    <Opcao key={h.id} ativo={ficha.heranca === h.id} onClick={() => mudar({ heranca: h.id })} titulo={h.nome} detalhe={h.pv ? `${h.pv} PV de ancestralidade` : anc.nome} texto={h.texto} />
                  ))}
                </div>
              </fieldset>
            )}
            {ficha.heranca === "humano-habilidoso" && (
              <label className="flex flex-col gap-1 self-start">
                <span className="font-titulo text-lg font-bold">Perícia do Humano Habilidoso</span>
                <select
                  value={ficha.periciaHeranca}
                  onChange={(e) => mudar({ periciaHeranca: e.target.value as Pericia | "" })}
                  className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base text-noite"
                >
                  <option value="">Escolha…</option>
                  {PERICIAS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
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
                  <span className="font-titulo text-3xl font-bold text-noite">
                    {sinal(c.attr[a])}
                    {parcial[a] && <span title="Meio aumento guardado: o próximo aumento completa o +1" className="text-base text-azul">½</span>}
                  </span>
                </div>
              ))}
            </div>
            {NIVEIS_AUMENTO.filter((n) => n <= ficha.nivel).map((n) => (
              <Chips
                key={n}
                titulo={`Aumentos do nível ${n}`}
                opcoes={ATRIBUTOS}
                escolhidos={ficha.aumentos[n] ?? []}
                max={AUMENTOS_POR_NIVEL}
                onChange={(v) => mudar({ aumentos: { ...ficha.aumentos, [n]: v } })}
              />
            ))}
            {ficha.nivel < 5 && <p className="m-0 text-sm text-neutro">Nos níveis 5, 10, 15 e 20 você ganha mais {AUMENTOS_POR_NIVEL} aumentos. A partir de +4, cada atributo só sobe +1 a cada dois aumentos.</p>}
          </>
        )}

        {passo === "pericias" && (
          <>
            <PassoPericias ficha={ficha} onChange={(p) => mudar({ pericias: p })} />
            <AumentosPericia ficha={ficha} onChange={(v) => mudar({ aumentosPericia: v })} />
          </>
        )}

        {passo === "talentos" && <PassoTalentos ficha={ficha} onChange={(v) => mudar({ talentos: v })} />}

        {passo === "ficha" && (
          <>
            <FolhaFinal ficha={ficha} />
            <label className="no-print flex flex-col gap-1">
              <span className="font-titulo text-lg font-bold">Notas</span>
              <textarea
                value={ficha.notas}
                maxLength={4000}
                rows={4}
                onChange={(e) => mudar({ notas: e.target.value })}
                placeholder="História, aparência, aliados, o que quiser lembrar."
                className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base text-noite"
              />
            </label>
          </>
        )}

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
        {nuvem ? (
          <p role="status" aria-live="polite" className={`m-0 text-sm ${salvamento.estado === "erro" ? "text-laranja-claro" : "text-poeira"}`}>
            {salvamento.estado === "salvando" ? "Salvando na sua conta…" : salvamento.estado === "erro" ? salvamento.msg : "✓ Salva na sua conta."}
          </p>
        ) : logado ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={salvarNaConta} disabled={importando} className="btn bg-laranja text-noite disabled:opacity-60">
              {importando ? "Salvando…" : "Salvar na minha conta"}
            </button>
            {salvamento.estado === "erro" && <span className="text-sm text-laranja-claro">{salvamento.msg}</span>}
          </div>
        ) : (
          <p className="m-0 text-sm text-poeira">
            A ficha fica guardada aqui no navegador.{" "}
            <Link href="/entrar?next=/fichas/pathfinder" className="link-ficha">
              Entre pra salvar na sua conta
            </Link>
            .
          </p>
        )}
        <p className="m-0 text-sm text-poeira">Conteúdo de regras baseado no Pathfinder 2e (Remaster) da Paizo, uso de fã.</p>
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

function AumentosPericia({ ficha, onChange }: { ficha: Ficha; onChange: (v: Ficha["aumentosPericia"]) => void }) {
  const niveis = niveisAumentoPericia(ficha);
  if (!acharClasse(ficha.classe) || niveis.length === 0) {
    return ficha.nivel < 3 ? <p className="m-0 text-sm text-neutro">A partir do nível 3 você sobe uma perícia em um grau a cada nível ímpar (o ladino, todo nível).</p> : null;
  }
  const { graus, invalidos } = grausPericia(ficha);
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border-2 border-noite bg-creme-claro p-4">
      <legend className="px-1 font-titulo text-lg font-bold text-noite">Aumentos de perícia</legend>
      <p className="m-0 text-sm text-tinta">Cada aumento sobe uma perícia um grau. Mestre só a partir do nível 7, lendário a partir do 15.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
        {niveis.map((n) => (
          <label key={n} className="flex items-center gap-2">
            <span className="w-16 shrink-0 font-ficha text-sm text-azul">Nível {n}</span>
            <select
              value={ficha.aumentosPericia[n] ?? ""}
              onChange={(e) => {
                const v = { ...ficha.aumentosPericia };
                if (e.target.value) v[n] = e.target.value as Pericia;
                else delete v[n];
                onChange(v);
              }}
              aria-invalid={invalidos.includes(n)}
              className={`min-w-0 flex-1 rounded-lg border-2 px-2 py-1 text-sm text-noite ${invalidos.includes(n) ? "border-laranja bg-laranja-claro" : "border-noite bg-creme"}`}
            >
              <option value="">Escolha…</option>
              {PERICIAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="m-0 font-ficha text-[12px] text-neutro">
        Agora:{" "}
        {PERICIAS.filter((p) => graus[p.id] !== "destreinado" && graus[p.id] !== "treinado")
          .map((p) => `${p.nome} ${NOME_PROF[graus[p.id]]}`)
          .join(", ") || "nenhuma acima de treinado"}
      </p>
    </fieldset>
  );
}

function PassoTalentos({ ficha, onChange }: { ficha: Ficha; onChange: (v: Ficha["talentos"]) => void }) {
  const vagas = vagasTalento(ficha);
  if (!acharClasse(ficha.classe)) return <p className="m-0 text-tinta">Escolha a classe primeiro: ela define quantos talentos você ganha.</p>;
  const porNivel = new Map<number, typeof vagas>();
  for (const v of vagas) porNivel.set(v.nivel, [...(porNivel.get(v.nivel) ?? []), v]);
  return (
    <>
      <p className="m-0 text-tinta">
        Escreva o nome de cada talento. A lista sugere os mais comuns do Player Core, mas dá pra digitar qualquer um. Talentos de ancestralidade nos níveis 1, 5, 9…; de classe no 1 e nos pares; de perícia nos pares; gerais no 3, 7, 11…
      </p>
      {[...porNivel].map(([n, vs]) => (
        <section key={n} className="flex flex-col gap-2 rounded-xl border-2 border-noite bg-creme-claro p-4">
          <h3 className="m-0 font-titulo text-lg font-bold text-noite">Nível {n}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {vs.map((v) => {
              const lista = `sug-${v.chave}`;
              return (
                <label key={v.chave} className="flex flex-col gap-1">
                  <span className="font-ficha text-[12px] text-azul">
                    Talento de {NOME_TIPO_TALENTO[v.tipo].toLowerCase()}
                    {v.chave === "geral-versatil" && " (Humano Versátil)"}
                  </span>
                  <input
                    list={lista}
                    value={ficha.talentos[v.chave] ?? ""}
                    maxLength={80}
                    onChange={(e) => onChange({ ...ficha.talentos, [v.chave]: e.target.value })}
                    className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base text-noite"
                  />
                  <datalist id={lista}>
                    {sugestoesTalento(v.tipo, v.nivel, ficha.ancestralidade, ficha.classe).map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function Caixa({ rotulo, valor, prof }: { rotulo: string; valor: string | number; prof?: Prof }) {
  return (
    <div className="flex flex-col items-center rounded-xl border-2 border-noite bg-creme p-3 text-center">
      <span className="font-ficha text-[11px] uppercase text-neutro">{rotulo}</span>
      <span className="font-titulo text-2xl font-bold text-noite">{valor}</span>
      {prof && <span className="font-ficha text-[11px] text-azul">{NOME_PROF_LONGO[prof]}</span>}
    </div>
  );
}

function FolhaFinal({ ficha }: { ficha: Ficha }) {
  const c = calcular(ficha);
  const anc = acharAncestralidade(ficha.ancestralidade);
  const her = acharHeranca(ficha);
  const ant = acharAntecedente(ficha.antecedente);
  const cls = acharClasse(ficha.classe);
  const talentos = vagasTalento(ficha).filter((v) => ficha.talentos[v.chave]?.trim());
  return (
    <div id="folha" className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 border-b-2 border-noite pb-3">
        <h2 className="m-0 font-titulo text-[2rem] font-bold leading-tight text-noite">{ficha.nome || "Sem nome"}</h2>
        <p className="m-0 font-ficha text-sm text-azul">
          {[her?.nome ?? anc?.nome, ant?.nome, cls?.nome].filter(Boolean).join(" · ") || "Escolha ancestralidade, antecedente e classe"} · Nível {ficha.nivel}
        </p>
      </header>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ATRIBUTOS.map((a) => (
          <Caixa key={a} rotulo={NOME_ATRIBUTO[a]} valor={sinal(c.attr[a])} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Caixa rotulo="Pontos de vida" valor={c.pv} />
        <Caixa rotulo="CA (sem armadura)" valor={c.ca} prof={c.graus.defesa} />
        <Caixa rotulo="Percepção" valor={sinal(c.percepcao)} prof={c.graus.percepcao} />
        <Caixa rotulo="CD de classe" valor={c.cdClasse ?? "—"} prof={c.graus.cd} />
        <Caixa rotulo="Fortitude" valor={sinal(c.fortitude)} prof={c.graus.fortitude} />
        <Caixa rotulo="Reflexos" valor={sinal(c.reflexos)} prof={c.graus.reflexos} />
        <Caixa rotulo="Vontade" valor={sinal(c.vontade)} prof={c.graus.vontade} />
        <Caixa rotulo="Deslocamento" valor={`${c.deslocamento} pés`} />
      </div>
      <p className="m-0 text-sm text-tinta">
        Tamanho {c.tamanho}
        {c.sentidos && ` · ${c.sentidos}`}
        {c.idiomas && ` · Idiomas: ${c.idiomas}`}
      </p>
      <section>
        <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Perícias</h3>
        <ul className="grid list-none grid-cols-1 gap-x-6 gap-y-1 p-0 sm:grid-cols-2">
          {c.pericias.map((p) => (
            <li key={p.id} className="flex items-center justify-between border-b border-noite/15 py-1">
              <span className={p.prof !== "destreinado" ? "font-bold" : ""}>
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
      <div className="grid gap-5 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Recursos de classe</h3>
          {c.recursos.length ? (
            <ul className="m-0 list-none p-0">
              {c.recursos.map(([n, nome]) => (
                <li key={`${n}-${nome}`} className="flex gap-2 border-b border-noite/15 py-1">
                  <span className="w-8 shrink-0 font-ficha text-sm text-neutro">{n}</span>
                  <span>{nome}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-neutro">Escolha a classe.</p>
          )}
        </section>
        <section>
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Talentos</h3>
          {her && (
            <p className="m-0 border-b border-noite/15 py-1">
              <span className="font-ficha text-sm text-neutro">Herança · </span>
              {her.nome}
            </p>
          )}
          {talentos.length ? (
            <ul className="m-0 list-none p-0">
              {talentos.map((v) => (
                <li key={v.chave} className="flex gap-2 border-b border-noite/15 py-1">
                  <span className="w-8 shrink-0 font-ficha text-sm text-neutro">{v.nivel}</span>
                  <span>
                    {ficha.talentos[v.chave]} <span className="font-ficha text-[11px] text-neutro">({NOME_TIPO_TALENTO[v.tipo]})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-neutro">Nenhum talento escrito ainda.</p>
          )}
        </section>
      </div>
      {ficha.notas.trim() && (
        <section className="print-only">
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Notas</h3>
          <p className="m-0 whitespace-pre-wrap">{ficha.notas}</p>
        </section>
      )}
      <p className="m-0 text-sm text-neutro">
        D = destreinado, T = treinado, E = especialista, M = mestre, L = lendário. Equipamento, armas e magias entram nas próximas fases.
      </p>
    </div>
  );
}
