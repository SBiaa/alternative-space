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
  ataque,
  dadosMagia,
  pontosFoco,
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
  type ItemFicha,
  type Pericia,
  type Prof,
} from "@/lib/pathfinder";
import { ARMADURAS, ARMAS, COMBATE_CLASSE, ESCUDOS, ITENS_COMUNS, NOME_CAT_ARMA, NOME_CAT_ARMADURA, NOME_DANO, formatarPreco, formatarVolume } from "@/lib/pathfinder-equip";
import { CONJURACAO, NOME_TRADICAO, TRADICOES, sugestoesMagia, type VagaMagia } from "@/lib/pathfinder-magia";
import { CONDICOES, MAX_HEROI, type Condicao } from "@/lib/pathfinder-condicoes";
import { descansar, emJogo } from "@/lib/pathfinder-jogo";
import { sugestoesTalento } from "@/lib/pathfinder-talentos";

const CHAVE = "ficha-pathfinder:atual";

const PASSOS = [
  { id: "ancestralidade", nome: "Ancestralidade" },
  { id: "antecedente", nome: "Antecedente" },
  { id: "classe", nome: "Classe" },
  { id: "atributos", nome: "Atributos" },
  { id: "pericias", nome: "Perícias" },
  { id: "talentos", nome: "Talentos" },
  { id: "equipamento", nome: "Equipamento" },
  { id: "magias", nome: "Magias" },
  { id: "jogo", nome: "Em jogo" },
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
        {passo === "equipamento" && <PassoEquipamento ficha={ficha} onChange={mudar} />}
        {passo === "magias" && <PassoMagias ficha={ficha} onChange={mudar} />}
        {passo === "jogo" && <PassoJogo ficha={ficha} onChange={mudar} />}

        {passo === "ficha" && (
          <>
            <FolhaFinal ficha={ficha} />
            <IdiomasExtras ficha={ficha} onChange={(v) => mudar({ idiomasExtras: v })} />
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
        Escreva o nome de cada talento. A lista sugere os mais comuns do Player Core, mas dá pra digitar qualquer um. Talentos de ancestralidade nos níveis 1, 5, 9…; de classe no 1 e nos pares; de perícia nos pares; gerais no 3, 7, 11… A partir do 2, uma vaga de classe pode virar a dedicação de um arquétipo.
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

const campo = "rounded-lg border-2 border-noite bg-creme px-2 py-1 text-sm text-noite";
const RUNAS = ["Nenhuma", "+1", "+2", "+3"];
const GOLPE = ["Nenhuma", "Golpe", "Golpe maior", "Golpe superior"];
const RESILIENTE = ["Nenhuma", "Resiliente", "Resiliente maior", "Resiliente superior"];
const NOME_MOEDA = { pp: "Platina (pp)", po: "Ouro (po)", pa: "Prata (pa)", pc: "Cobre (pc)" } as const;

function SelectNum({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: number; opcoes: string[]; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-ficha text-[12px] text-azul">{rotulo}</span>
      <select value={valor} onChange={(e) => onChange(+e.target.value)} className={campo}>
        {opcoes.map((o, i) => (
          <option key={o} value={i}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function PassoEquipamento({ ficha, onChange }: { ficha: Ficha; onChange: (p: Partial<Ficha>) => void }) {
  const c = calcular(ficha);
  const combate = COMBATE_CLASSE[ficha.classe];
  const [novaArma, setNovaArma] = useState("");
  const [novoItem, setNovoItem] = useState("");
  const caixa = "flex flex-col gap-3 rounded-xl border-2 border-noite bg-creme-claro p-4";
  const titulo = "m-0 font-titulo text-lg font-bold text-noite";

  const addItem = () => {
    const nome = novoItem.trim();
    if (!nome) return;
    const comum = ITENS_COMUNS.find(([n]) => n.toLowerCase() === nome.toLowerCase());
    onChange({ itens: [...ficha.itens, { nome: comum?.[0] ?? nome, qtd: 1, volume: comum?.[1] ?? 0 }] });
    setNovoItem("");
  };

  return (
    <>
      <p className="m-0 text-tinta">
        Escolha armadura, escudo e armas: a ficha calcula CA, ataques e dano sozinha.{" "}
        {combate
          ? `Sua classe é treinada em armas ${combate.marciais ? "simples e marciais" : "simples"} e em armadura ${combate.armaduras.length ? combate.armaduras.map((x) => NOME_CAT_ARMADURA[x].toLowerCase()).join(", ") : "nenhuma (só sem armadura)"}.`
          : "Escolha a classe pra ver em que ela é treinada."}
      </p>

      <section className={caixa}>
        <h3 className={titulo}>Armadura e escudo</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-ficha text-[12px] text-azul">Armadura</span>
            <select value={ficha.armadura} onChange={(e) => onChange({ armadura: e.target.value })} className={campo}>
              <option value="">Sem armadura</option>
              {(["leve", "media", "pesada"] as const).map((cat) => (
                <optgroup key={cat} label={NOME_CAT_ARMADURA[cat]}>
                  {ARMADURAS.filter((x) => x.cat === cat).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome} (CA +{x.ca}, Des máx +{x.desMax})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-ficha text-[12px] text-azul">Escudo</span>
            <select value={ficha.escudo} onChange={(e) => onChange({ escudo: e.target.value })} className={campo}>
              <option value="">Sem escudo</option>
              {ESCUDOS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome} (+{x.ca} erguido, dureza {x.dureza}, {x.pv} PV)
                </option>
              ))}
            </select>
          </label>
          {ficha.armadura && (
            <>
              <SelectNum rotulo="Runa de potência" valor={ficha.runasArmadura.potencia} opcoes={RUNAS} onChange={(n) => onChange({ runasArmadura: { ...ficha.runasArmadura, potencia: n } })} />
              <SelectNum rotulo="Runa de resiliência" valor={ficha.runasArmadura.resiliente} opcoes={RESILIENTE} onChange={(n) => onChange({ runasArmadura: { ...ficha.runasArmadura, resiliente: n } })} />
            </>
          )}
        </div>
        <p className="m-0 font-ficha text-sm text-noite">
          CA {c.ca}
          {c.caEscudo !== null && ` (${c.caEscudo} com escudo erguido)`}
          {c.penalidade !== 0 && ` · Penalidade ${c.penalidade} em Acrobatismo, Atletismo, Furtividade e Ladroagem`}
          {c.armadura && c.armadura.velocidade !== 0 && ` · Deslocamento ${c.deslocamento} pés`}
        </p>
        {!c.treinadoArmadura && <p className="m-0 rounded-lg bg-laranja-claro px-3 py-2 text-sm text-noite">Sua classe não é treinada nessa armadura: ela entra sem bônus de proficiência.</p>}
      </section>

      <section className={caixa}>
        <h3 className={titulo}>Armas</h3>
        {ficha.armas.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {ficha.armas.map((x, i) => {
              const at = ataque(ficha, x);
              if (!at) return null;
              return (
                <li key={i} className="flex flex-col gap-2 rounded-lg border-2 border-noite/20 bg-creme p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold text-noite">{at.nome}</span>
                    <span className="font-ficha text-sm text-noite">
                      {at.map.map(sinal).join(" / ")} · {at.dano} · {NOME_PROF_LONGO[at.prof]}
                    </span>
                  </div>
                  <p className="m-0 font-ficha text-[12px] text-neutro">
                    {NOME_CAT_ARMA[at.arma.cat]} · {at.arma.distancia ? `distância ${at.arma.alcance} pés` : "corpo a corpo"} · {at.arma.maos} mão{at.arma.maos > 1 ? "s" : ""}
                    {at.arma.tracos.length > 0 && ` · ${at.arma.tracos.join(", ")}`}
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <SelectNum rotulo="Potência" valor={x.potencia} opcoes={RUNAS} onChange={(n) => onChange({ armas: ficha.armas.map((y, j) => (j === i ? { ...y, potencia: n } : y)) })} />
                    <SelectNum rotulo="Golpe" valor={x.golpe} opcoes={GOLPE} onChange={(n) => onChange({ armas: ficha.armas.map((y, j) => (j === i ? { ...y, golpe: n } : y)) })} />
                    <button type="button" onClick={() => onChange({ armas: ficha.armas.filter((_, j) => j !== i) })} className="rounded-lg border-2 border-noite px-3 py-1 text-sm text-noite hover:bg-laranja-claro">
                      Tirar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <select value={novaArma} onChange={(e) => setNovaArma(e.target.value)} aria-label="Arma pra adicionar" className={`${campo} min-w-0 flex-1`}>
            <option value="">Escolha uma arma…</option>
            {(["simples", "marciais", "avancadas"] as const).map((cat) => (
              <optgroup key={cat} label={NOME_CAT_ARMA[cat]}>
                {ARMAS.filter((x) => x.cat === cat).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome} (d{x.dado} {NOME_DANO[x.dano]}, {formatarPreco(x.preco)})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            disabled={!novaArma || ficha.armas.length >= 20}
            onClick={() => {
              onChange({ armas: [...ficha.armas, { id: novaArma, potencia: 0, golpe: 0 }] });
              setNovaArma("");
            }}
            className="rounded-lg border-2 border-noite bg-laranja px-3 py-1 text-sm font-bold text-noite disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </section>

      <section className={caixa}>
        <h3 className={titulo}>Itens</h3>
        {ficha.itens.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {ficha.itens.map((it, i) => {
              const mudarItem = (p: Partial<ItemFicha>) => onChange({ itens: ficha.itens.map((y, j) => (j === i ? { ...y, ...p } : y)) });
              return (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <input value={it.nome} maxLength={80} onChange={(e) => mudarItem({ nome: e.target.value })} aria-label="Nome do item" className={`${campo} min-w-0 flex-1`} />
                  <label className="flex items-center gap-1 text-sm">
                    Qtd
                    <input type="number" min={0} value={it.qtd} onChange={(e) => mudarItem({ qtd: Math.max(0, Math.round(+e.target.value) || 0) })} className={`${campo} w-16`} />
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    Volume
                    <select value={it.volume} onChange={(e) => mudarItem({ volume: +e.target.value })} className={campo}>
                      <option value={0}>—</option>
                      <option value={1}>L</option>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v * 10}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" aria-label={`Tirar ${it.nome}`} onClick={() => onChange({ itens: ficha.itens.filter((_, j) => j !== i) })} className="rounded-lg border-2 border-noite px-2 py-1 text-sm hover:bg-laranja-claro">
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
        >
          <input list="itens-comuns" value={novoItem} maxLength={80} onChange={(e) => setNovoItem(e.target.value)} placeholder="Kit de aventureiro, corda, tocha…" aria-label="Item pra adicionar" className={`${campo} min-w-0 flex-1`} />
          <datalist id="itens-comuns">
            {ITENS_COMUNS.map(([n]) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <button type="submit" disabled={!novoItem.trim() || ficha.itens.length >= 100} className="rounded-lg border-2 border-noite bg-laranja px-3 py-1 text-sm font-bold text-noite disabled:opacity-50">
            Adicionar
          </button>
        </form>
      </section>

      <section className={caixa}>
        <h3 className={titulo}>Dinheiro e Volume</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["pp", "po", "pa", "pc"] as const).map((m) => (
            <label key={m} className="flex flex-col gap-1">
              <span className="font-ficha text-[12px] text-azul">{NOME_MOEDA[m]}</span>
              <input type="number" min={0} value={ficha.dinheiro[m]} onChange={(e) => onChange({ dinheiro: { ...ficha.dinheiro, [m]: Math.max(0, Math.round(+e.target.value) || 0) } })} className={campo} />
            </label>
          ))}
        </div>
        <p className="m-0 text-sm text-neutro">No nível 1 todo mundo começa com 15 po pra gastar.</p>
        <p className={`m-0 font-ficha text-sm ${c.volume.total > c.volume.maximo ? "text-laranja" : "text-noite"}`}>
          Volume {formatarVolume(c.volume.total)} de {c.volume.sobrecarregado / 10} (sobrecarregado acima disso, máximo {c.volume.maximo / 10})
          {c.sobrecarregado && " · Sobrecarregado: −10 pés de deslocamento e desajeitado 1"}
        </p>
      </section>
    </>
  );
}

const nomeCirculo = (r: number) => (r === 0 ? "Truques" : `${r}º círculo`);

function PassoMagias({ ficha, onChange }: { ficha: Ficha; onChange: (p: Partial<Ficha>) => void }) {
  const m = dadosMagia(ficha);
  const conj = CONJURACAO[ficha.classe];
  const caixa = "flex flex-col gap-3 rounded-xl border-2 border-noite bg-creme-claro p-4";
  const titulo = "m-0 font-titulo text-lg font-bold text-noite";
  const porCirculo = new Map<number, VagaMagia[]>();
  for (const v of m?.vagas ?? []) porCirculo.set(v.circulo, [...(porCirculo.get(v.circulo) ?? []), v]);
  const foco = [...ficha.foco, ""].slice(0, 10);

  return (
    <>
      {!m ? (
        <p className="m-0 text-tinta">{acharClasse(ficha.classe) ? "Sua classe não conjura magias por espaço. Se você ganhou magias de foco por talento, anote abaixo." : "Escolha a classe primeiro."}</p>
      ) : (
        <>
          <p className="m-0 text-tinta">
            {m.tipo === "preparada"
              ? "Você prepara as magias todo dia: escreva o que vai em cada espaço."
              : "Você conjura de forma espontânea: escreva as magias do seu repertório, uma por espaço."}{" "}
            Truques sobem sozinhos pro {m.circuloMaximo}º círculo.
          </p>
          {conj?.tradicao === "escolha" && (
            <label className="flex max-w-xs flex-col gap-1">
              <span className="font-ficha text-[12px] text-azul">Tradição ({ficha.classe === "feiticeiro" ? "vem da linhagem" : "vem do patrono"})</span>
              <select value={ficha.tradicao} onChange={(e) => onChange({ tradicao: e.target.value as Ficha["tradicao"] })} className={campo}>
                <option value="">Escolha…</option>
                {TRADICOES.map((t) => (
                  <option key={t} value={t}>
                    {NOME_TRADICAO[t]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid grid-cols-3 gap-2 sm:max-w-md">
            <Caixa rotulo="Ataque de magia" valor={sinal(m.ataque)} prof={m.prof} />
            <Caixa rotulo="CD de magia" valor={m.cd} prof={m.prof} />
            <Caixa rotulo="Tradição" valor={m.tradicao ? NOME_TRADICAO[m.tradicao] : "—"} />
          </div>
          {[...porCirculo].map(([r, vs]) => {
            const lista = `magias-${r}`;
            return (
              <section key={r} className={caixa}>
                <h3 className={titulo}>
                  {nomeCirculo(r)} <span className="font-ficha text-sm font-normal text-neutro">({vs.length} {r === 0 ? "por dia, à vontade" : "espaços"})</span>
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {vs.map((v) => (
                    <input
                      key={v.chave}
                      list={lista}
                      value={ficha.magias[v.chave] ?? ""}
                      maxLength={80}
                      aria-label={`${nomeCirculo(r)}, espaço ${v.chave.split("-")[1]}`}
                      onChange={(e) => onChange({ magias: { ...ficha.magias, [v.chave]: e.target.value } })}
                      className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base text-noite"
                    />
                  ))}
                </div>
                <datalist id={lista}>
                  {sugestoesMagia(m.tradicao, r).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </section>
            );
          })}
        </>
      )}
      <section className={caixa}>
        <h3 className={titulo}>
          Magias de foco <span className="font-ficha text-sm font-normal text-neutro">({pontosFoco(ficha)} ponto{pontosFoco(ficha) === 1 ? "" : "s"} de foco)</span>
        </h3>
        <p className="m-0 text-sm text-tinta">Vêm da classe (linhagem, ordem, mistério, escola…) ou de talentos. Cada uma dá 1 ponto de foco, até 3.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {foco.map((x, i) => (
            <input
              key={i}
              value={x}
              maxLength={80}
              placeholder={i === ficha.foco.length ? "Nova magia de foco…" : undefined}
              aria-label={`Magia de foco ${i + 1}`}
              onChange={(e) => {
                const novo = [...ficha.foco];
                novo[i] = e.target.value;
                onChange({ foco: novo.filter((y, j) => y.trim() || j === i) });
              }}
              className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base text-noite"
            />
          ))}
        </div>
      </section>
    </>
  );
}

function Contador({ rotulo, valor, min = 0, max, onChange }: { rotulo: string; valor: number; min?: number; max?: number; onChange: (n: number) => void }) {
  const botao = "h-9 w-9 rounded-lg border-2 border-noite bg-creme text-lg font-bold text-noite disabled:opacity-40";
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-noite bg-creme p-3">
      <span className="font-ficha text-[11px] uppercase text-neutro">{rotulo}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Menos ${rotulo}`} disabled={valor <= min} onClick={() => onChange(valor - 1)} className={botao}>
          −
        </button>
        <span className="min-w-8 text-center font-titulo text-2xl font-bold text-noite">
          {valor}
          {max !== undefined && <span className="text-base text-neutro">/{max}</span>}
        </span>
        <button type="button" aria-label={`Mais ${rotulo}`} disabled={max !== undefined && valor >= max} onClick={() => onChange(valor + 1)} className={botao}>
          +
        </button>
      </div>
    </div>
  );
}

function PassoJogo({ ficha, onChange }: { ficha: Ficha; onChange: (p: Partial<Ficha>) => void }) {
  const j = ficha.jogo;
  const e = emJogo(ficha);
  const [qtd, setQtd] = useState("");
  const mudarJogo = (p: Partial<Ficha["jogo"]>) => onChange({ jogo: { ...j, ...p } });
  const caixa = "flex flex-col gap-3 rounded-xl border-2 border-noite bg-creme-claro p-4";
  const titulo = "m-0 font-titulo text-lg font-bold text-noite";
  const n = Math.max(0, Math.round(+qtd) || 0);

  const dano = () => {
    if (!n) return;
    const temp = Math.min(j.pvTemp, n);
    mudarJogo({ pvTemp: j.pvTemp - temp, pvAtual: Math.max(0, e.pv - (n - temp)) });
    setQtd("");
  };
  const cura = () => {
    if (!n) return;
    const pv = Math.min(e.pvMax, e.pv + n);
    mudarJogo({ pvAtual: pv >= e.pvMax ? null : pv });
    setQtd("");
  };
  const setCondicao = (id: Condicao, v: number) => {
    const condicoes = { ...j.condicoes };
    if (v > 0) condicoes[id] = v;
    else delete condicoes[id];
    mudarJogo({ condicoes });
  };
  const vagas = e.magia?.vagas.filter((v) => v.circulo > 0) ?? [];

  return (
    <>
      <p className="m-0 text-tinta">Use durante a sessão. Os números abaixo já descontam as condições marcadas; a ficha impressa continua com os valores normais.</p>

      <section className={caixa}>
        <h3 className={titulo}>Pontos de vida</h3>
        <p className={`m-0 font-titulo text-4xl font-bold ${e.pv === 0 ? "text-laranja" : "text-noite"}`}>
          {e.pv} <span className="text-xl text-neutro">/ {e.pvMax}</span>
          {e.pvTemp > 0 && <span className="ml-2 text-xl text-azul">+{e.pvTemp} temp.</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" min={0} value={qtd} onChange={(ev) => setQtd(ev.target.value)} aria-label="Quantidade de PV" placeholder="Qtd" className={`${campo} w-20`} />
          <button type="button" onClick={dano} disabled={!n} className="rounded-lg border-2 border-noite bg-laranja px-3 py-1 text-sm font-bold text-noite disabled:opacity-50">
            Dano
          </button>
          <button type="button" onClick={cura} disabled={!n} className="rounded-lg border-2 border-noite bg-creme px-3 py-1 text-sm font-bold text-noite disabled:opacity-50">
            Cura
          </button>
          <button
            type="button"
            onClick={() => {
              if (!n) return;
              mudarJogo({ pvTemp: Math.max(j.pvTemp, n) });
              setQtd("");
            }}
            disabled={!n}
            className="rounded-lg border-2 border-noite bg-creme px-3 py-1 text-sm text-noite disabled:opacity-50"
          >
            PV temporários
          </button>
        </div>
        {e.pv === 0 && <p className="m-0 rounded-lg bg-laranja-claro px-3 py-2 text-sm text-noite">Com 0 PV você fica moribundo 1 + ferido. Morre no moribundo {e.morreEm}.</p>}
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Contador rotulo="Pontos de herói" valor={j.heroi} max={MAX_HEROI} onChange={(heroi) => mudarJogo({ heroi })} />
        {e.pontosFoco > 0 && <Contador rotulo="Foco disponível" valor={e.pontosFoco - j.focoGasto} min={0} max={e.pontosFoco} onChange={(v) => mudarJogo({ focoGasto: e.pontosFoco - v })} />}
        <Caixa rotulo="CA" valor={e.ca} />
        <Caixa rotulo="Percepção" valor={sinal(e.percepcao)} />
        <Caixa rotulo="Fortitude" valor={sinal(e.fortitude)} />
        <Caixa rotulo="Reflexos" valor={sinal(e.reflexos)} />
        <Caixa rotulo="Vontade" valor={sinal(e.vontade)} />
        {e.magia && <Caixa rotulo="CD de magia" valor={e.magia.cd} />}
      </div>

      <section className={caixa}>
        <h3 className={titulo}>Condições</h3>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {CONDICOES.map((cd) => {
            const v = j.condicoes[cd.id] ?? 0;
            return (
              <li key={cd.id} className={`flex items-start gap-2 rounded-lg border-2 p-2 ${v ? "border-laranja bg-laranja-claro" : "border-noite/20 bg-creme"}`}>
                {cd.valor ? (
                  <select value={v} onChange={(ev) => setCondicao(cd.id, +ev.target.value)} aria-label={cd.nome} className={campo}>
                    {[0, 1, 2, 3, 4].map((x) => (
                      <option key={x} value={x}>
                        {x || "—"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="checkbox" checked={!!v} onChange={(ev) => setCondicao(cd.id, ev.target.checked ? 1 : 0)} aria-label={cd.nome} className="mt-1 h-5 w-5" />
                )}
                <span className="text-sm text-noite">
                  <b>{cd.nome}</b> <span className="text-tinta">{cd.texto}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {e.ataques.length > 0 && (
        <section className={caixa}>
          <h3 className={titulo}>Ataques</h3>
          <ul className="m-0 list-none p-0">
            {e.ataques.map((at, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-noite/15 py-1">
                <span className="font-bold">{at.nome}</span>
                <span className="font-ficha text-sm">
                  {at.map.map(sinal).join(" / ")} · {at.dano}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vagas.length > 0 && (
        <section className={caixa}>
          <h3 className={titulo}>Espaços de magia de hoje</h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {[...new Set(vagas.map((v) => v.circulo))].map((r) => (
              <li key={r} className="flex flex-wrap items-center gap-2">
                <span className="w-20 shrink-0 font-ficha text-sm text-neutro">{nomeCirculo(r)}</span>
                {vagas
                  .filter((v) => v.circulo === r)
                  .map((v) => {
                    const gasto = j.espacosGastos.includes(v.chave);
                    return (
                      <label key={v.chave} className={`flex items-center gap-1 rounded-lg border-2 px-2 py-1 text-sm ${gasto ? "border-noite/20 text-neutro line-through" : "border-noite bg-creme text-noite"}`}>
                        <input
                          type="checkbox"
                          checked={gasto}
                          onChange={(ev) => mudarJogo({ espacosGastos: ev.target.checked ? [...j.espacosGastos, v.chave] : j.espacosGastos.filter((k) => k !== v.chave) })}
                        />
                        {ficha.magias[v.chave]?.trim() || "Espaço vazio"}
                      </label>
                    );
                  })}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange({ jogo: descansar(j) })} className="btn bg-laranja text-noite">
          Descansar 8 horas
        </button>
        <button type="button" onClick={() => mudarJogo({ heroi: 1 })} className="btn btn-contorno">
          Nova sessão (1 ponto de herói)
        </button>
      </div>
    </>
  );
}

function IdiomasExtras({ ficha, onChange }: { ficha: Ficha; onChange: (v: string[]) => void }) {
  const livres = calcular(ficha).idiomasLivres;
  const [texto, setTexto] = useState(ficha.idiomasExtras.join(", "));
  return (
    <label className="no-print flex flex-col gap-1">
      <span className="font-titulo text-lg font-bold">Idiomas extras</span>
      <span className="text-sm text-neutro">
        Você pode aprender {livres} idioma{livres === 1 ? "" : "s"} a mais pela Inteligência (talentos como Multilíngue dão outros). Separe por vírgula.
      </span>
      <input
        value={texto}
        maxLength={400}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(e.target.value.split(",").map((x) => x.trim()).filter(Boolean));
        }}
        placeholder="Élfico, Dracônico…"
        className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base text-noite"
      />
    </label>
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
        <Caixa rotulo={c.caEscudo !== null ? `CA (${c.caEscudo} c/ escudo)` : "CA"} valor={c.ca} prof={c.graus.defesa} />
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
        {(c.idiomas || ficha.idiomasExtras.length > 0) && ` · Idiomas: ${[c.idiomas, ...ficha.idiomasExtras].filter(Boolean).join(", ")}`}
      </p>
      {c.ataques.length > 0 && (
        <section>
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Ataques</h3>
          <ul className="m-0 list-none p-0">
            {c.ataques.map((at, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-noite/15 py-1">
                <span className="font-bold">
                  {at.nome} <span className="font-ficha text-[11px] font-normal text-neutro">({NOME_PROF[at.prof]}{at.arma.tracos.length > 0 && ` · ${at.arma.tracos.join(", ")}`})</span>
                </span>
                <span className="font-ficha text-sm">
                  <b className="font-titulo text-lg">{at.map.map(sinal).join(" / ")}</b> · {at.dano}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
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
      {(c.magia || c.pontosFoco > 0) && (
        <section>
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Magias</h3>
          {c.magia && (
            <p className="m-0 font-ficha text-sm text-noite">
              {c.magia.tradicao ? NOME_TRADICAO[c.magia.tradicao] : "Tradição a escolher"} · {c.magia.tipo === "preparada" ? "preparada" : "espontânea"} · Ataque {sinal(c.magia.ataque)} · CD {c.magia.cd} ({NOME_PROF_LONGO[c.magia.prof]})
            </p>
          )}
          <ul className="m-0 list-none p-0">
            {[...new Set(c.magia?.vagas.map((v) => v.circulo) ?? [])].map((r) => {
              const nomes = c.magia!.vagas.filter((v) => v.circulo === r).map((v) => ficha.magias[v.chave]?.trim()).filter(Boolean);
              return (
                <li key={r} className="flex gap-2 border-b border-noite/15 py-1">
                  <span className="w-20 shrink-0 font-ficha text-sm text-neutro">{nomeCirculo(r)}</span>
                  <span>{nomes.join(", ") || "—"}</span>
                </li>
              );
            })}
            {c.pontosFoco > 0 && (
              <li className="flex gap-2 border-b border-noite/15 py-1">
                <span className="w-20 shrink-0 font-ficha text-sm text-neutro">Foco ({c.pontosFoco})</span>
                <span>{ficha.foco.filter((x) => x.trim()).join(", ")}</span>
              </li>
            )}
          </ul>
        </section>
      )}
      <section>
        <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Equipamento</h3>
        <p className="m-0 text-sm text-tinta">
          {[c.armadura && `${ficha.runasArmadura.potencia ? `+${ficha.runasArmadura.potencia} ` : ""}${c.armadura.nome}`, c.escudo?.nome, ...ficha.itens.filter((it) => it.nome.trim()).map((it) => (it.qtd > 1 ? `${it.nome} ×${it.qtd}` : it.nome))]
            .filter(Boolean)
            .join(" · ") || "Nada além das armas."}
        </p>
        <p className="m-0 font-ficha text-sm text-noite">
          {(["pp", "po", "pa", "pc"] as const).filter((m) => ficha.dinheiro[m]).map((m) => `${ficha.dinheiro[m]} ${m}`).join(" · ") || "Sem dinheiro"} · Volume {formatarVolume(c.volume.total)} / {c.volume.sobrecarregado / 10}
          {c.sobrecarregado && " (sobrecarregado)"}
        </p>
      </section>
      {ficha.notas.trim() && (
        <section className="print-only">
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Notas</h3>
          <p className="m-0 whitespace-pre-wrap">{ficha.notas}</p>
        </section>
      )}
      <p className="m-0 text-sm text-neutro">
        D = destreinado, T = treinado, E = especialista, M = mestre, L = lendário.
      </p>
    </div>
  );
}
