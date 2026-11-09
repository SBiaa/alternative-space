"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { importPf2eAction, savePf2eAction } from "@/app/fichas/actions";
import {
  acharItem,
  acharMagia,
  acharTalento,
  ARMADURAS,
  ARMAS,
  bloqueioTalento,
  calcularEquipamento,
  ESCUDOS,
  espacos,
  infoMagia,
  ITENS,
  limparTudo,
  magiasDisponiveis,
  pendenciasExtras,
  talentosPara,
  TIPOS_ESPACO,
  type Espaco,
} from "@/lib/fichas/pf2e/calculo";
import { CONJURADORES, NIVEIS_BOOST, niveisAumentoPericia } from "@/lib/fichas/pf2e/progressao";
import type { Acoes, Magia, Talento, Tradicao } from "@/lib/fichas/pf2e/tipos";
import {
  ANCESTRALIDADES,
  ANTECEDENTES,
  ATRIBUTOS,
  CLASSES,
  FICHA_VAZIA,
  LIVRES_NIVEL_1,
  NIVEL_MAX,
  NOME_ATRIBUTO,
  NOME_PROF,
  NOME_PROF_LONGO,
  PERICIAS,
  acharAncestralidade,
  acharAntecedente,
  acharClasse,
  ajustar,
  atributosIniciais,
  calcular,
  lerFicha,
  pendencias,
  periciasFixas,
  periciasParaEscolher,
  podeAumentar,
  profPericias,
  sinal,
  type Atributo,
  type Ficha,
  type Pericia,
  type Prof,
} from "@/lib/pathfinder";

const CHAVE = "ficha-pathfinder:atual";

const ABAS = [
  { id: "construcao", nome: "Construção" },
  { id: "talentos", nome: "Talentos" },
  { id: "pericias", nome: "Perícias" },
  { id: "equipamento", nome: "Equipamento" },
  { id: "magias", nome: "Magias" },
  { id: "ficha", nome: "Ficha" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const abrev = (a: Atributo) => NOME_ATRIBUTO[a].slice(0, 3).toUpperCase();
const NOME_TRADICAO: Record<Tradicao, string> = { arcana: "Arcana", divina: "Divina", ocultista: "Ocultista", primal: "Primal" };
const NOME_ACOES: Record<NonNullable<Acoes>, string> = { "1": "◆", "2": "◆◆", "3": "◆◆◆", reacao: "⟲", livre: "◇", "1a3": "◆ a ◆◆◆" };

// Tudo que muda a ficha passa por aqui: regras do núcleo e depois talentos/magias/equipamento.
const normalizar = (f: Ficha) => limparTudo(ajustar(f));

type Props = {
  // Ficha da conta: salva sozinha no banco. Sem isso, a ficha fica no navegador.
  nuvem?: { id: string; inicial: Ficha };
  logado?: boolean;
};

type Salvamento = { estado: "ok" | "salvando" | "erro"; msg?: string };

export function FichaPathfinder({ nuvem, logado = false }: Props) {
  const [ficha, setFicha] = useState<Ficha>(() => normalizar(nuvem?.inicial ?? FICHA_VAZIA));
  const [aba, setAba] = useState<Aba>("construcao");
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
    if (guardada) setFicha(normalizar(guardada));
  }, [nuvem]);

  const mudar = (parcial: Partial<Ficha>) => {
    const f = normalizar({ ...ficha, ...parcial });
    setFicha(f);
    if (nuvem) {
      // Espera a pessoa parar de mexer antes de mandar pro banco.
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

  const c = calcular(ficha);
  const eq = calcularEquipamento(ficha);
  const falta = [...pendencias(ficha), ...pendenciasExtras(ficha)];
  const conjurador = Boolean(CONJURADORES[ficha.classe as keyof typeof CONJURADORES]);
  const abas = ABAS.filter((a) => a.id !== "magias" || conjurador);
  const anc = acharAncestralidade(ficha.ancestralidade);
  const ant = acharAntecedente(ficha.antecedente);
  const cls = acharClasse(ficha.classe);

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <header className="painel print-sheet flex flex-wrap items-end justify-between gap-4 rounded-2xl border-2 border-noite p-4 sm:p-6">
        <div className="flex min-w-0 flex-[1_1_100%] flex-col gap-1 sm:flex-1">
          <input
            aria-label="Nome do personagem"
            value={ficha.nome}
            maxLength={60}
            onChange={(e) => mudar({ nome: e.target.value })}
            placeholder="Nome do personagem"
            className="w-full min-w-0 border-b-2 border-dashed border-noite/30 bg-transparent font-titulo text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight text-noite outline-none focus:border-noite"
          />
          <span className="font-ficha text-[13px] text-azul">
            {[anc?.nome, ant?.nome, cls?.nome].filter(Boolean).join(" · ") || "Escolha ancestralidade, antecedente e classe"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-ficha text-[12px] uppercase text-neutro">Nível</span>
          <button type="button" aria-label="Diminuir nível" disabled={ficha.nivel <= 1} onClick={() => mudar({ nivel: ficha.nivel - 1 })} className="size-10 rounded-full border-2 border-noite bg-creme font-titulo text-xl font-bold text-noite disabled:opacity-30 no-print">−</button>
          <span className="w-10 text-center font-titulo text-3xl font-bold text-noite" aria-live="polite">{ficha.nivel}</span>
          <button type="button" aria-label="Aumentar nível" disabled={ficha.nivel >= NIVEL_MAX} onClick={() => mudar({ nivel: ficha.nivel + 1 })} className="size-10 rounded-full border-2 border-noite bg-creme font-titulo text-xl font-bold text-noite disabled:opacity-30 no-print">+</button>
        </div>
      </header>

      {/* Números sempre à vista */}
      <section aria-label="Resumo" className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        <Stat rotulo="PV" valor={c.pv} destaque />
        <Stat rotulo="CA" valor={eq.caComEscudo ? `${eq.ca} (${eq.caComEscudo})` : eq.ca} destaque />
        <Stat rotulo="Percepção" valor={sinal(c.percepcao)} />
        <Stat rotulo="Fortitude" valor={sinal(c.fortitude)} />
        <Stat rotulo="Reflexos" valor={sinal(c.reflexos)} />
        <Stat rotulo="Vontade" valor={sinal(c.vontade)} />
        {ATRIBUTOS.map((a) => (
          <Stat key={a} rotulo={abrev(a)} valor={sinal(c.attr[a])} chave={ficha.chave === a} />
        ))}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Seções da ficha" className="no-print min-w-0 lg:sticky lg:top-24">
          <ul className="flex list-none gap-2 overflow-x-auto p-0 pb-1 lg:flex-col">
            {abas.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  aria-current={aba === a.id ? "page" : undefined}
                  onClick={() => setAba(a.id)}
                  className={`w-full whitespace-nowrap rounded-xl border-2 border-noite px-4 py-2.5 text-left font-titulo text-base font-bold transition-colors ${
                    aba === a.id ? "bg-laranja text-noite" : "bg-creme-claro text-noite hover:bg-creme-escuro"
                  }`}
                >
                  {a.nome}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="painel print-sheet flex min-w-0 flex-col gap-6 rounded-2xl border-2 border-noite p-4 sm:p-6">
          {aba === "construcao" && <Construcao ficha={ficha} mudar={mudar} />}
          {aba === "talentos" && <Talentos ficha={ficha} mudar={mudar} />}
          {aba === "pericias" && <Pericias ficha={ficha} mudar={mudar} />}
          {aba === "equipamento" && <Equipamentos ficha={ficha} mudar={mudar} />}
          {aba === "magias" && <Magias ficha={ficha} mudar={mudar} />}
          {aba === "ficha" && <FolhaFinal ficha={ficha} />}
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
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setAba("ficha"); setTimeout(() => window.print(), 50); }} className="btn btn-fantasma">
            Imprimir / PDF
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Apagar a ficha e começar do zero?")) return;
              mudar(FICHA_VAZIA);
              setAba("construcao");
            }}
            className="text-sm text-poeira underline"
          >
            Começar do zero
          </button>
        </div>
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
        <p className="m-0 text-sm text-poeira">Regras do Pathfinder 2e (Remaster) da Paizo, resumidas por nós. Uso de fã. Achou um número errado? Conta pra gente.</p>
      </div>
    </div>
  );
}

type Mudar = (p: Partial<Ficha>) => void;

function Stat({ rotulo, valor, destaque, chave }: { rotulo: string; valor: ReactNode; destaque?: boolean; chave?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-noite px-1 py-2 text-center ${destaque ? "bg-laranja" : chave ? "bg-laranja-claro" : "bg-creme-claro"}`}>
      <span className="font-ficha text-[10px] uppercase leading-none text-noite/70">{rotulo}</span>
      <span className="font-titulo text-xl font-bold leading-tight text-noite">{valor}</span>
    </div>
  );
}

function Secao({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-noite/15 pb-1">
        <h2 className="m-0 font-titulo text-2xl font-bold text-noite">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Chips({ titulo, opcoes, escolhidos, max, bloqueados = [], onChange, extra }: {
  titulo: string;
  opcoes: readonly Atributo[];
  escolhidos: Atributo[];
  max: number;
  bloqueados?: Atributo[];
  onChange: (v: Atributo[]) => void;
  extra?: (a: Atributo) => string;
}) {
  const alternar = (a: Atributo) => {
    if (escolhidos.includes(a)) onChange(escolhidos.filter((x) => x !== a));
    else if (max === 1) onChange([a]);
    else if (escolhidos.length < max) onChange([...escolhidos, a]);
  };
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border-2 border-noite bg-creme p-3">
      <legend className="px-1 font-titulo text-base font-bold text-noite">
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
              className={`rounded-full border-2 border-noite px-3 py-1.5 font-titulo text-sm font-bold disabled:opacity-35 ${ativo ? "bg-noite text-creme" : "bg-creme-claro text-noite hover:bg-creme-escuro"}`}
            >
              {NOME_ATRIBUTO[a]}
              {extra && <span className="ml-1 font-ficha text-[11px] font-normal opacity-70">{extra(a)}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Escolha de uma opção numa lista grande: mostra a escolhida e abre a grade pra trocar.
function Escolha<T extends { id: string; nome: string }>({ titulo, atual, opcoes, detalhe, texto, onEscolher }: {
  titulo: string;
  atual: T | undefined;
  opcoes: T[];
  detalhe: (o: T) => string;
  texto: (o: T) => string;
  onEscolher: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(!atual);
  return (
    <Secao
      titulo={titulo}
      extra={atual && (
        <button type="button" onClick={() => setAberto(!aberto)} className="font-ficha text-[13px] font-bold text-azul underline no-print">
          {aberto ? "Fechar" : "Trocar"}
        </button>
      )}
    >
      {atual && !aberto && (
        <div className="flex flex-col gap-0.5 rounded-xl border-2 border-noite bg-creme p-3">
          <span className="font-titulo text-xl font-bold text-noite">{atual.nome}</span>
          <span className="font-ficha text-[12px] text-azul">{detalhe(atual)}</span>
          <span className="text-sm text-tinta">{texto(atual)}</span>
        </div>
      )}
      {aberto && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2">
          {opcoes.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={atual?.id === o.id}
              onClick={() => {
                onEscolher(o.id);
                setAberto(false);
              }}
              className={`flex flex-col gap-1 rounded-xl border-2 border-noite p-3 text-left transition-transform hover:-translate-y-0.5 ${atual?.id === o.id ? "bg-laranja-claro" : "bg-creme"}`}
            >
              <span className="font-titulo text-lg font-bold leading-tight text-noite">{o.nome}</span>
              <span className="font-ficha text-[11px] text-azul">{detalhe(o)}</span>
              <span className="text-[13px] leading-snug text-tinta">{texto(o)}</span>
            </button>
          ))}
        </div>
      )}
    </Secao>
  );
}

// ---------------------------------------------------------------- Construção

function Construcao({ ficha, mudar }: { ficha: Ficha; mudar: Mudar }) {
  const anc = acharAncestralidade(ficha.ancestralidade);
  const ant = acharAntecedente(ficha.antecedente);
  const cls = acharClasse(ficha.classe);
  const iniciais = atributosIniciais(ficha);
  return (
    <>
      <Escolha
        titulo="Ancestralidade"
        atual={anc}
        opcoes={ANCESTRALIDADES}
        onEscolher={(id) => mudar({ ancestralidade: id })}
        detalhe={(a) => `${a.pv} PV · ${a.tamanho} · ${a.deslocamento} pés · ${[...a.boosts.map(abrev), ...Array(a.livres).fill("livre")].join(", ")}${a.falha ? ` · falha ${abrev(a.falha)}` : ""}`}
        texto={(a) => a.texto}
      />
      {anc && anc.livres > 0 && (
        <Chips titulo={anc.livres === 1 ? "Boost livre da ancestralidade" : "Boosts livres da ancestralidade"} opcoes={ATRIBUTOS} escolhidos={ficha.boostsAncestral} max={anc.livres} bloqueados={anc.boosts} onChange={(v) => mudar({ boostsAncestral: v })} />
      )}

      <Escolha
        titulo="Antecedente"
        atual={ant}
        opcoes={ANTECEDENTES}
        onEscolher={(id) => mudar({ antecedente: id })}
        detalhe={(a) => `${abrev(a.opcoes[0])} ou ${abrev(a.opcoes[1])} · ${PERICIAS.find((p) => p.id === a.pericia)!.nome} · ${a.saber}`}
        texto={(a) => a.texto}
      />
      {ant && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Chips
            titulo="Boost do antecedente"
            opcoes={ant.opcoes}
            escolhidos={ficha.boostAntecedente ? [ficha.boostAntecedente] : []}
            max={1}
            onChange={(v) => mudar({ boostAntecedente: v[0] ?? "", boostAntecedenteLivre: ficha.boostAntecedenteLivre === v[0] ? "" : ficha.boostAntecedenteLivre })}
          />
          <Chips titulo="Boost livre do antecedente" opcoes={ATRIBUTOS} escolhidos={ficha.boostAntecedenteLivre ? [ficha.boostAntecedenteLivre] : []} max={1} bloqueados={ficha.boostAntecedente ? [ficha.boostAntecedente] : []} onChange={(v) => mudar({ boostAntecedenteLivre: v[0] ?? "" })} />
        </div>
      )}

      <Escolha
        titulo="Classe"
        atual={cls}
        opcoes={CLASSES}
        onEscolher={(id) => mudar({ classe: id })}
        detalhe={(k) => `${k.pv} PV/nível · chave ${k.chave.map(abrev).join(" ou ")} · ${k.extras} perícias + INT`}
        texto={(k) => k.texto}
      />
      {cls && cls.chave.length > 1 && (
        <Chips titulo="Atributo-chave" opcoes={cls.chave} escolhidos={ficha.chave ? [ficha.chave] : []} max={1} onChange={(v) => mudar({ chave: v[0] ?? "" })} />
      )}
      {cls?.id === "feiticeiro" && (
        <fieldset className="flex flex-col gap-2 rounded-xl border-2 border-noite bg-creme p-3">
          <legend className="px-1 font-titulo text-base font-bold text-noite">Tradição da linhagem</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(NOME_TRADICAO) as Tradicao[]).map((t) => (
              <button key={t} type="button" aria-pressed={ficha.tradicao === t} onClick={() => mudar({ tradicao: t })} className={`rounded-full border-2 border-noite px-3 py-1.5 font-titulo text-sm font-bold ${ficha.tradicao === t ? "bg-noite text-creme" : "bg-creme-claro text-noite"}`}>
                {NOME_TRADICAO[t]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <Secao titulo="Atributos">
        <p className="m-0 text-sm text-tinta">
          No nível 1 são {LIVRES_NIVEL_1} boosts livres. Depois, mais 4 nos níveis 5, 10, 15 e 20. Atributo em +4 ou mais sobe pela metade: precisa de dois boosts pra ganhar +1.
        </p>
        <Chips titulo="Boosts livres do nível 1" opcoes={ATRIBUTOS} escolhidos={ficha.boostsLivres} max={LIVRES_NIVEL_1} onChange={(v) => mudar({ boostsLivres: v })} />
        {NIVEIS_BOOST.map((n, i) =>
          ficha.nivel >= n ? (
            <Chips
              key={n}
              titulo={`Boosts do nível ${n}`}
              opcoes={ATRIBUTOS}
              escolhidos={ficha.boostsNivel[i] ?? []}
              max={4}
              onChange={(v) => mudar({ boostsNivel: ficha.boostsNivel.map((b, j) => (j === i ? v : b)) })}
            />
          ) : null,
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ATRIBUTOS.map((a) => (
            <div key={a} className="flex flex-col items-center rounded-xl border-2 border-noite bg-creme p-2">
              <span className="font-ficha text-[11px] text-neutro">{abrev(a)}</span>
              <span className="font-titulo text-2xl font-bold text-noite">{sinal(calcular(ficha).attr[a])}</span>
              <span className="font-ficha text-[10px] text-neutro">nível 1: {sinal(iniciais[a])}</span>
            </div>
          ))}
        </div>
      </Secao>
    </>
  );
}

// ---------------------------------------------------------------- Talentos

function AcoesTag({ a }: { a?: Acoes }) {
  if (!a) return null;
  return <span className="font-ficha text-[12px] text-laranja" title="Ações">{NOME_ACOES[a]}</span>;
}

function Talentos({ ficha, mudar }: { ficha: Ficha; mudar: Mudar }) {
  const [escolhendo, setEscolhendo] = useState<Espaco | null>(null);
  if (!ficha.classe || !ficha.ancestralidade) return <p className="m-0 text-tinta">Escolha ancestralidade e classe primeiro, na aba Construção.</p>;
  const lista = espacos(ficha);
  const niveis = [...new Set(lista.map((e) => e.nivel))];
  return (
    <Secao titulo="Talentos">
      <p className="m-0 text-sm text-tinta">Os espaços aparecem conforme o nível. Toque num espaço pra escolher ou trocar o talento.</p>
      <ol className="flex list-none flex-col gap-4 p-0">
        {niveis.map((n) => (
          <li key={n} className="flex flex-col gap-2">
            <span className="font-ficha text-[12px] uppercase text-azul">Nível {n}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {lista.filter((e) => e.nivel === n).map((e) => {
                const t = ficha.talentos[e.chave] ? acharTalento(ficha.talentos[e.chave]) : undefined;
                return (
                  <button key={e.chave} type="button" onClick={() => setEscolhendo(e)} className={`flex flex-col gap-0.5 rounded-xl border-2 border-noite p-3 text-left ${t ? "bg-creme" : "border-dashed bg-creme-claro"}`}>
                    <span className="font-ficha text-[11px] uppercase text-neutro">{TIPOS_ESPACO.find((x) => x.id === e.tipo)!.nome}</span>
                    {t ? (
                      <>
                        <span className="font-titulo text-lg font-bold leading-tight text-noite">
                          {t.nome} <AcoesTag a={t.acoes} />
                        </span>
                        <span className="line-clamp-2 text-[13px] text-tinta">{t.texto}</span>
                      </>
                    ) : (
                      <span className="font-titulo text-lg font-bold text-laranja">+ Escolher talento</span>
                    )}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {escolhendo && (
        <Seletor
          titulo={`Talento de ${TIPOS_ESPACO.find((x) => x.id === escolhendo.tipo)!.nome.toLowerCase()} · nível ${escolhendo.nivel}`}
          itens={talentosPara(ficha, escolhendo)}
          atual={ficha.talentos[escolhendo.chave]}
          bloqueio={(t) => bloqueioTalento(ficha, t, escolhendo)}
          detalhe={(t) => [`Nível ${t.nivel}`, t.preRequisitos && `Requer: ${t.preRequisitos}`, t.pericia && `${PERICIAS.find((p) => p.id === t.pericia!.id)?.nome} ${NOME_PROF_LONGO[t.pericia.prof].toLowerCase()}`].filter(Boolean).join(" · ")}
          acoes={(t) => t.acoes}
          onFechar={() => setEscolhendo(null)}
          onEscolher={(id) => {
            const talentos = { ...ficha.talentos };
            if (id) talentos[escolhendo.chave] = id;
            else delete talentos[escolhendo.chave];
            mudar({ talentos });
            setEscolhendo(null);
          }}
        />
      )}
    </Secao>
  );
}

// Janela de escolha com busca, usada pra talentos e magias.
function Seletor<T extends Talento | Magia>({ titulo, itens, atual, bloqueio, detalhe, acoes, onEscolher, onFechar }: {
  titulo: string;
  itens: T[];
  atual?: string;
  bloqueio: (t: T) => string | null;
  detalhe: (t: T) => string;
  acoes: (t: T) => Acoes | undefined;
  onEscolher: (id: string | null) => void;
  onFechar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busca, setBusca] = useState("");
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const termo = busca.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const visiveis = useMemo(
    () => itens.filter((t) => !termo || `${t.nome} ${t.texto}`.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(termo)),
    [itens, termo],
  );
  return (
    <dialog ref={ref} onClose={onFechar} className="m-auto max-h-[88vh] w-[min(720px,calc(100vw-24px))] rounded-2xl border-2 border-noite bg-creme-claro p-0 text-noite">
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b-2 border-noite bg-creme-claro p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 font-titulo text-xl font-bold">{titulo}</h3>
          <button type="button" onClick={onFechar} className="rounded-full border-2 border-noite px-3 py-1 font-titulo font-bold">Fechar</button>
        </div>
        <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base" />
        {atual && (
          <button type="button" onClick={() => onEscolher(null)} className="self-start font-ficha text-[12px] font-bold text-estrela underline">
            Tirar o escolhido
          </button>
        )}
      </div>
      <ul className="flex list-none flex-col gap-2 p-4">
        {visiveis.length === 0 && <li className="text-tinta">Nada encontrado.</li>}
        {visiveis.map((t) => {
          const motivo = bloqueio(t);
          const ativo = t.id === atual;
          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={!!motivo && !ativo}
                onClick={() => onEscolher(t.id)}
                className={`flex w-full flex-col gap-1 rounded-xl border-2 border-noite p-3 text-left disabled:opacity-45 ${ativo ? "bg-laranja-claro" : "bg-creme hover:bg-creme-escuro"}`}
              >
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-titulo text-lg font-bold leading-tight">{t.nome}</span>
                  <AcoesTag a={acoes(t)} />
                </span>
                <span className="font-ficha text-[11px] text-azul">{detalhe(t)}</span>
                <span className="text-[14px] leading-snug text-tinta">{t.texto}</span>
                {motivo && !ativo && <span className="font-ficha text-[11px] text-estrela">{motivo}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}

// ---------------------------------------------------------------- Perícias

function Pericias({ ficha, mudar }: { ficha: Ficha; mudar: Mudar }) {
  if (!acharClasse(ficha.classe)) return <p className="m-0 text-tinta">Escolha a classe primeiro: é ela que diz quantas perícias você treina.</p>;
  const fixas = periciasFixas(ficha);
  const n = periciasParaEscolher(ficha);
  const c = calcular(ficha);
  const alternar = (p: Pericia) => {
    if (ficha.pericias.includes(p)) mudar({ pericias: ficha.pericias.filter((x) => x !== p) });
    else if (ficha.pericias.length < n) mudar({ pericias: [...ficha.pericias, p] });
  };
  const aumentos = niveisAumentoPericia(ficha.classe).filter((x) => x <= ficha.nivel);
  return (
    <>
      <Secao titulo="Perícias" extra={<span className="font-ficha text-[12px] text-azul">Treinadas no nível 1: {ficha.pericias.length}/{n}</span>}>
        <p className="m-0 text-sm text-tinta">Marque as perícias treinadas no nível 1 (★ já vêm do antecedente ou da classe).</p>
        <ul className="grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2">
          {c.pericias.map((p) => {
            const fixa = fixas.includes(p.id);
            const marcada = fixa || ficha.pericias.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={marcada}
                  disabled={fixa || (!marcada && ficha.pericias.length >= n)}
                  onClick={() => alternar(p.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border-2 border-noite px-3 py-2 text-left disabled:cursor-default ${marcada ? "bg-creme" : "bg-creme-claro"} ${!marcada && ficha.pericias.length >= n ? "opacity-60" : ""}`}
                >
                  <ProfBadge p={p.prof} />
                  <span className="flex-1 font-titulo text-base font-bold text-noite">
                    {fixa && "★ "}
                    {p.nome} <span className="font-ficha text-[11px] font-normal text-neutro">{abrev(p.attr)}</span>
                  </span>
                  <span className="font-titulo text-lg font-bold text-noite">{sinal(p.bonus)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Secao>
      {aumentos.length > 0 && (
        <Secao titulo="Aumentos de perícia">
          <p className="m-0 text-sm text-tinta">Cada aumento sobe uma perícia um grau. Mestre só a partir do nível 7, lendário a partir do 15.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {aumentos.map((nv) => {
              const antes = profPericias({ ...ficha, nivel: nv - 1, aumentos: Object.fromEntries(Object.entries(ficha.aumentos).filter(([k]) => Number(k) < nv)) });
              return (
                <label key={nv} className="flex items-center gap-2 rounded-lg border-2 border-noite bg-creme px-3 py-2">
                  <span className="w-16 font-ficha text-[12px] text-azul">Nível {nv}</span>
                  <select
                    value={ficha.aumentos[String(nv)] ?? ""}
                    onChange={(e) => {
                      const aumentos = { ...ficha.aumentos };
                      if (e.target.value) aumentos[String(nv)] = e.target.value as Pericia;
                      else delete aumentos[String(nv)];
                      mudar({ aumentos });
                    }}
                    className="flex-1 rounded border border-noite/40 bg-creme-claro px-2 py-1 text-noite"
                  >
                    <option value="">— escolher —</option>
                    {PERICIAS.filter((p) => podeAumentar(antes[p.id], nv) || ficha.aumentos[String(nv)] === p.id).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({NOME_PROF_LONGO[antes[p.id]]} → próximo grau)
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </Secao>
      )}
    </>
  );
}

function ProfBadge({ p }: { p: Prof }) {
  const cor = { destreinado: "bg-creme-escuro text-neutro", treinado: "bg-azul-claro text-noite", especialista: "bg-laranja-claro text-noite", mestre: "bg-laranja text-noite", lendario: "bg-estrela text-creme" }[p];
  return (
    <span title={NOME_PROF_LONGO[p]} className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-noite font-titulo text-sm font-bold ${cor}`}>
      {NOME_PROF[p]}
    </span>
  );
}

// ---------------------------------------------------------------- Equipamento

function Equipamentos({ ficha, mudar }: { ficha: Ficha; mudar: Mudar }) {
  const eq = calcularEquipamento(ficha);
  const e = ficha.equipamento;
  const set = (p: Partial<Ficha["equipamento"]>) => mudar({ equipamento: { ...e, ...p } });
  const sel = "w-full rounded-lg border-2 border-noite bg-creme px-3 py-2 text-noite";
  return (
    <>
      <Secao titulo="Defesa" extra={<span className="font-ficha text-[12px] text-azul">CA {eq.ca}{eq.caComEscudo ? ` · ${eq.caComEscudo} com escudo erguido` : ""}</span>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-titulo text-base font-bold text-noite">Armadura</span>
            <select value={e.armadura} onChange={(x) => set({ armadura: x.target.value })} className={sel}>
              <option value="">Sem armadura</option>
              {ARMADURAS.filter((a) => a.id !== "sem-armadura").map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} (+{a.bonusCA} CA, {a.categoria})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-titulo text-base font-bold text-noite">Escudo</span>
            <select value={e.escudo} onChange={(x) => set({ escudo: x.target.value })} className={sel}>
              <option value="">Sem escudo</option>
              {ESCUDOS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} (+{a.bonusCA} CA erguido)
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="m-0 font-ficha text-[12px] text-neutro">
          Proficiência: {NOME_PROF_LONGO[eq.profArmadura]} · Teto de Destreza: {eq.armadura.tetoDes ?? "—"} · Penalidade: {eq.penalidade || "—"} · Deslocamento: {eq.penDeslocamento || "—"}
          {eq.profArmadura === "destreinado" && <strong className="text-estrela"> · Sem treino nessa armadura!</strong>}
        </p>
      </Secao>

      <Secao titulo="Ataques">
        <div className="flex flex-col gap-2">
          {eq.ataques.map((a, i) => (
            <div key={`${a.arma.id}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border-2 border-noite bg-creme p-3">
              <span className="min-w-[140px] flex-1 font-titulo text-lg font-bold text-noite">{a.arma.nome}</span>
              <span className="font-titulo text-lg font-bold text-noite">{a.mapa.map(sinal).join(" / ")}</span>
              <span className="font-ficha text-[13px] text-noite">{a.dano}</span>
              <span className="w-full font-ficha text-[11px] text-neutro">
                {NOME_PROF_LONGO[a.prof]} · {a.arma.tracos.join(", ") || "sem traços"}
                {a.arma.alcance ? ` · ${a.arma.alcance} pés` : ""}
              </span>
              {i > 0 && (
                <button type="button" onClick={() => set({ armas: e.armas.filter((_, j) => j !== i - 1) })} className="font-ficha text-[12px] text-estrela underline no-print">
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
        <select value="" onChange={(x) => x.target.value && set({ armas: [...e.armas, x.target.value] })} className={`${sel} no-print`}>
          <option value="">+ Adicionar arma…</option>
          {(["simples", "marcial", "avancada"] as const).map((cat) => (
            <optgroup key={cat} label={cat === "avancada" ? "Avançadas" : cat === "simples" ? "Simples" : "Marciais"}>
              {ARMAS.filter((a) => a.categoria === cat).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} ({a.dano} {a.tipoDano})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Secao>

      <Secao titulo="Itens">
        <ul className="flex list-none flex-wrap gap-2 p-0">
          {e.itens.map((id, i) => {
            const it = acharItem(id);
            return (
              <li key={`${id}-${i}`} className="flex items-center gap-2 rounded-full border-2 border-noite bg-creme py-1 pl-3 pr-1 text-sm text-noite" title={it?.texto}>
                {it?.nome ?? id}
                <button type="button" aria-label={`Remover ${it?.nome}`} onClick={() => set({ itens: e.itens.filter((_, j) => j !== i) })} className="size-6 rounded-full bg-creme-escuro font-bold no-print">×</button>
              </li>
            );
          })}
        </ul>
        <select value="" onChange={(x) => x.target.value && set({ itens: [...e.itens, x.target.value] })} className={`${sel} no-print`}>
          <option value="">+ Adicionar item…</option>
          {ITENS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome} ({a.preco})
            </option>
          ))}
        </select>
      </Secao>

      <Secao titulo="Anotações">
        <textarea value={ficha.anotacoes} maxLength={5000} onChange={(x) => mudar({ anotacoes: x.target.value })} rows={4} placeholder="Dinheiro, aliados, história, o que quiser." className="rounded-lg border-2 border-noite bg-creme p-3 text-noite" />
      </Secao>
    </>
  );
}

// ---------------------------------------------------------------- Magias

function Magias({ ficha, mudar }: { ficha: Ficha; mudar: Mudar }) {
  const [posto, setPosto] = useState<number | null>(null);
  const info = infoMagia(ficha);
  const c = calcular(ficha);
  if (!info) return <p className="m-0 text-tinta">Essa classe não conjura magias.</p>;
  if (!info.tradicao) return <p className="m-0 text-tinta">Escolha a tradição da linhagem do feiticeiro na aba Construção.</p>;
  const escolhidas = ficha.magias.map(acharMagia).filter((m): m is Magia => !!m);
  const postos = [0, ...info.espacosPorPosto.map((n, i) => (n > 0 ? i + 1 : 0)).filter(Boolean)];
  const limite = (p: number) => (p === 0 ? info.truques : info.espacosPorPosto[p - 1]);
  return (
    <Secao
      titulo={`Magias ${NOME_TRADICAO[info.tradicao].toLowerCase()}s`}
      extra={c.magia && <span className="font-ficha text-[12px] text-azul">Ataque {sinal(c.magia.ataque)} · CD {c.magia.cd} · {NOME_PROF_LONGO[c.magia.prof]}</span>}
    >
      <p className="m-0 text-sm text-tinta">
        {info.tipo === "espontanea"
          ? "Seu repertório: as magias que você sabe. Você pode lançar qualquer uma delas usando um espaço do posto."
          : "Escolha as magias preparadas pro dia, uma por espaço. Dá pra trocar todo dia."}
      </p>
      {postos.map((p) => {
        const daqui = escolhidas.filter((m) => m.nivel === p);
        return (
          <div key={p} className="flex flex-col gap-2 rounded-xl border-2 border-noite bg-creme p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-titulo text-lg font-bold text-noite">{p === 0 ? "Truques" : `${p}º posto`}</span>
              <span className="font-ficha text-[12px] text-azul">{daqui.length}/{limite(p)}</span>
            </div>
            {daqui.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-2 border-t border-noite/15 pt-2">
                <div className="flex flex-col">
                  <span className="font-titulo text-base font-bold text-noite">
                    {m.nome} <AcoesTag a={m.acoes} />
                  </span>
                  <span className="text-[13px] text-tinta">{m.texto}</span>
                </div>
                <button type="button" onClick={() => mudar({ magias: ficha.magias.filter((x) => x !== m.id) })} className="font-ficha text-[12px] text-estrela underline no-print">
                  Tirar
                </button>
              </div>
            ))}
            {daqui.length < limite(p) && (
              <button type="button" onClick={() => setPosto(p)} className="self-start font-titulo text-base font-bold text-laranja no-print">
                + Escolher {p === 0 ? "truque" : "magia"}
              </button>
            )}
          </div>
        );
      })}
      {posto !== null && (
        <Seletor
          titulo={posto === 0 ? "Truques" : `Magias de ${posto}º posto`}
          itens={magiasDisponiveis(ficha, posto)}
          bloqueio={(m) => (ficha.magias.includes(m.id) ? "Já escolhida." : null)}
          detalhe={(m) => [m.alcance, m.alvo, m.defesa && `defesa: ${m.defesa}`, m.duracao].filter(Boolean).join(" · ")}
          acoes={(m) => m.acoes}
          onFechar={() => setPosto(null)}
          onEscolher={(id) => {
            if (id) mudar({ magias: [...ficha.magias, id] });
            setPosto(null);
          }}
        />
      )}
    </Secao>
  );
}

// ---------------------------------------------------------------- Ficha completa (e impressão)

function FolhaFinal({ ficha }: { ficha: Ficha }) {
  const c = calcular(ficha);
  const eq = calcularEquipamento(ficha);
  const info = infoMagia(ficha);
  const talentos = espacos(ficha)
    .map((e) => ({ e, t: ficha.talentos[e.chave] ? acharTalento(ficha.talentos[e.chave]) : undefined }))
    .filter((x) => x.t);
  const magias = ficha.magias.map(acharMagia).filter((m): m is Magia => !!m).sort((a, b) => a.nivel - b.nivel);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Caixa rotulo="Pontos de vida" valor={c.pv} />
        <Caixa rotulo="Classe de armadura" valor={eq.caComEscudo ? `${eq.ca} / ${eq.caComEscudo}` : eq.ca} />
        <Caixa rotulo="CD de classe" valor={c.cdClasse ?? "—"} />
        <Caixa rotulo="Deslocamento" valor={`${c.deslocamento + eq.penDeslocamento} pés`} />
        <Caixa rotulo={`Percepção (${NOME_PROF[c.profs.percepcao]})`} valor={sinal(c.percepcao)} />
        <Caixa rotulo={`Fortitude (${NOME_PROF[c.profs.fortitude]})`} valor={sinal(c.fortitude)} />
        <Caixa rotulo={`Reflexos (${NOME_PROF[c.profs.reflexos]})`} valor={sinal(c.reflexos)} />
        <Caixa rotulo={`Vontade (${NOME_PROF[c.profs.vontade]})`} valor={sinal(c.vontade)} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section>
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Perícias</h3>
          <ul className="list-none p-0">
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
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Ataques</h3>
            <ul className="list-none p-0">
              {eq.ataques.map((a, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-noite/15 py-1">
                  <span className="font-bold">{a.arma.nome}</span>
                  <span className="font-ficha text-[13px]">
                    {a.mapa.map(sinal).join("/")} · {a.dano}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Talentos</h3>
            {talentos.length === 0 ? (
              <p className="m-0 text-sm text-neutro">Nenhum ainda.</p>
            ) : (
              <ul className="list-none p-0">
                {talentos.map(({ e, t }) => (
                  <li key={e.chave} className="border-b border-noite/15 py-1">
                    <span className="font-ficha text-[11px] text-neutro">{e.nivel} · {TIPOS_ESPACO.find((x) => x.id === e.tipo)!.nome}</span>{" "}
                    <span className="font-bold">{t!.nome}</span> <AcoesTag a={t!.acoes} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      {info?.tradicao && (
        <section>
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">
            Magias {NOME_TRADICAO[info.tradicao].toLowerCase()}s {c.magia && <span className="font-ficha text-[13px] font-normal text-azul">ataque {sinal(c.magia.ataque)} · CD {c.magia.cd}</span>}
          </h3>
          <p className="m-0 font-ficha text-[12px] text-neutro">
            Espaços por posto: {info.espacosPorPosto.map((n, i) => (n ? `${i + 1}º: ${n}` : null)).filter(Boolean).join(" · ")}
          </p>
          <ul className="mt-1 list-none columns-1 p-0 sm:columns-2">
            {magias.map((m) => (
              <li key={m.id} className="py-0.5">
                <span className="font-ficha text-[11px] text-neutro">{m.nivel === 0 ? "T" : m.nivel}</span> <span className="font-bold">{m.nome}</span> <AcoesTag a={m.acoes} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {(ficha.equipamento.itens.length > 0 || ficha.anotacoes) && (
        <section>
          <h3 className="mb-2 font-titulo text-xl font-bold text-noite">Itens e anotações</h3>
          {ficha.equipamento.itens.length > 0 && <p className="m-0 text-sm">{ficha.equipamento.itens.map((id) => acharItem(id)?.nome ?? id).join(", ")}</p>}
          {ficha.equipamento.armadura && <p className="m-0 text-sm">Armadura: {eq.armadura.nome}{eq.escudo ? ` · Escudo: ${eq.escudo.nome}` : ""}</p>}
          {ficha.anotacoes && <p className="m-0 mt-2 whitespace-pre-wrap text-sm">{ficha.anotacoes}</p>}
        </section>
      )}
      <p className="m-0 text-sm text-neutro">
        Tamanho {c.tamanho}. D = destreinado, T = treinado, E = especialista, M = mestre, L = lendário. Runas e itens mágicos não entram nas contas.
      </p>
    </div>
  );
}

function Caixa({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border-2 border-noite bg-creme p-3 text-center">
      <span className="font-ficha text-[11px] uppercase text-neutro">{rotulo}</span>
      <span className="font-titulo text-2xl font-bold text-noite">{valor}</span>
    </div>
  );
}
