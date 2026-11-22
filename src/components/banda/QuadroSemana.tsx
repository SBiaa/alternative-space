"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACOES, BANDA, CONSERTO, EFEITOS, PALCOS, PARTES_EQUIP } from "@/lib/banda/config";
import { DESCRICAO_ACAO, NOME_ACAO, NOME_PALCO, NOME_PARTE, TEXTO_AVISO, TEXTOS, TIPO_PALCO } from "@/lib/banda/conteudo";
import { palcoLiberado, oQueFalta } from "@/lib/banda/show";
import type { AcaoDia, Progresso } from "@/lib/banda/tipos";
import { BotaoSom } from "./BotaoSom";
import { CartaoIntegrante, Medidor } from "./Cartao";
import { LogoBanda } from "./LogoBanda";
import { bip } from "./sons";
import { useBanda, type Inicial } from "./useBanda";

const BASE = "/jogos/banda-de-garagem";
export const CHAVE_ULTIMO_SHOW = "banda-de-garagem:ultimo-show";

/** A semana: o quadro dos seis dias, as ações, a banda e, no fim, o show. */
export function QuadroSemana({ inicial }: { inicial: Inicial }) {
  const b = useBanda(inicial);
  const router = useRouter();
  const [aviso, setAviso] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { prog } = b;

  if (!b.pronto) return <p className="text-areia">{TEXTOS.procurando}</p>;
  if (!prog)
    return (
      <p className="m-0">
        {TEXTOS.semBanda} <Link href={BASE} className="text-accent underline">{TEXTOS.criarBanda}</Link>
      </p>
    );

  const rodar = async (f: () => Promise<{ ok: true; prog: Progresso; aviso?: string[]; briga?: { a: string; b: string } | null } | { ok: false; erro: string }>) => {
    setOcupado(true);
    setErro("");
    const r = await f();
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    const msgs = [...(r.aviso ?? []).map(TEXTO_AVISO.humor), ...(r.briga ? [TEXTO_AVISO.briga(r.briga.a, r.briga.b)] : [])];
    setAviso(msgs);
    bip(msgs.length ? 196 : 523);
  };

  return (
    <div className="flex flex-col gap-5">
      <Cabecalho prog={prog} />

      <section aria-labelledby="quadro" className="surface-vidro flex flex-col gap-3 p-4">
        <h2 id="quadro" className="m-0 text-lg">{TEXTOS.semana} {prog.semana}</h2>
        <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: BANDA.diasDeSemana }, (_, i) => {
            const feita = prog.agenda[i] as AcaoDia | undefined;
            const hoje = i === prog.dia;
            return (
              <li key={i} aria-current={hoje ? "step" : undefined} className={`flex min-h-16 flex-col gap-1 rounded-[6px] border p-2 text-sm ${hoje ? "border-accent" : "border-line"}`}>
                <span className="rotulo text-areia">{TEXTOS.dia} {i + 1}</span>
                <span>{feita ? `✓ ${NOME_ACAO[feita]}` : hoje ? TEXTOS.proximoDia : "—"}</span>
              </li>
            );
          })}
          <li aria-current={prog.dia === BANDA.diasDeSemana ? "step" : undefined} className={`flex min-h-16 flex-col gap-1 rounded-[6px] border p-2 text-sm ${prog.dia === BANDA.diasDeSemana ? "border-accent" : "border-line"}`}>
            <span className="rotulo text-areia">{TEXTOS.fimDeSemana}</span>
            <span>{prog.dia === BANDA.diasDeSemana ? TEXTOS.proximoDia : "—"}</span>
          </li>
        </ol>
      </section>

      {prog.dia < BANDA.diasDeSemana ? (
        <section aria-labelledby="acoes" className="flex flex-col gap-3">
          <h2 id="acoes" className="m-0 text-lg">{TEXTOS.escolhaAcao}</h2>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {ACOES.map((a) => (
              <li key={a} className="surface-vidro flex flex-col gap-2 p-3">
                <strong>{NOME_ACAO[a]}</strong>
                <span className="text-sm text-areia">{DESCRICAO_ACAO[a]}</span>
                {a === "compor" ? (
                  <Link href={`${BASE}/compor`} className="botao-laranja inline-flex min-h-11 items-center justify-center no-underline">{NOME_ACAO[a]}</Link>
                ) : (
                  <button
                    type="button"
                    className="botao-laranja min-h-11"
                    disabled={ocupado || prog.dinheiro + EFEITOS[a].dinheiro < 0}
                    onClick={() => rodar(() => b.dia(a))}
                  >
                    {NOME_ACAO[a]}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <FimDeSemana prog={prog} ocupado={ocupado} onTocar={(palco, rep) => rodar(async () => {
          const r = await b.show(palco, rep);
          if (r.ok) {
            try {
              sessionStorage.setItem(CHAVE_ULTIMO_SHOW, JSON.stringify({ semana: r.registro.semana, faltou: r.faltou, saidas: r.saidas }));
            } catch {}
            router.push(`${BASE}/show`);
          }
          return r;
        })} onPular={() => rodar(() => b.pular())} />
      )}

      {aviso.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-warn" role="status">
          {aviso.map((t) => <li key={t}>⚠ {t}</li>)}
        </ul>
      )}
      {erro && <p className="m-0 text-danger" role="alert">{erro}</p>}

      <section aria-labelledby="equip" className="surface-vidro flex flex-col gap-3 p-4">
        <h2 id="equip" className="m-0 text-lg">{TEXTOS.equipamento}</h2>
        <p className="m-0 text-sm text-areia">{TEXTOS.consertarAjuda}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {PARTES_EQUIP.map((k) => {
            const falta = CONSERTO.max - prog.equipamento[k];
            const custo = Math.min(CONSERTO.ganho, falta) * CONSERTO.custoPorPonto;
            return (
              <li key={k} className="flex flex-wrap items-center gap-3">
                <div className="min-w-[220px] flex-1"><Medidor rotulo={NOME_PARTE[k]} valor={prog.equipamento[k]} /></div>
                <button type="button" className="botao-vidro min-h-11" disabled={ocupado || falta <= 0 || prog.dinheiro < custo} onClick={() => rodar(() => b.consertar(k))}>
                  {TEXTOS.consertar} · R$ {custo}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="banda" className="flex flex-col gap-3">
        <h2 id="banda" className="m-0 text-lg">{prog.nome}</h2>
        <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2">
          {prog.membros.map((m) => <li key={m.id} className="surface-vidro p-3"><CartaoIntegrante m={m} /></li>)}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={`${BASE}/demo`} className="botao-vidro inline-flex min-h-11 items-center no-underline">{prog.demo ? TEXTOS.demoGravada : TEXTOS.gravarDemo}</Link>
        <Link href={BASE} className="botao-vidro inline-flex min-h-11 items-center no-underline">{TEXTOS.capa}</Link>
        <BotaoSom />
      </div>
      {!b.logado && (
        <p className="m-0 text-sm text-areia">
          {TEXTOS.guardadaAparelho} <Link href={`/cadastro?next=${BASE}/semana`} className="text-accent underline">{TEXTOS.contaGuardar}</Link>.
        </p>
      )}
    </div>
  );
}

function Cabecalho({ prog }: { prog: Progresso }) {
  const equip = Math.round(PARTES_EQUIP.reduce((s, k) => s + prog.equipamento[k], 0) / PARTES_EQUIP.length);
  const itens: [string, string][] = [
    [TEXTOS.caixa, `R$ ${prog.dinheiro}`],
    [TEXTOS.fama, String(prog.fama)],
    [TEXTOS.entrosamento, String(prog.entrosamento)],
    [TEXTOS.divulgacao, String(prog.divulgacao)],
    [TEXTOS.equipamento, String(equip)],
    [TEXTOS.musicas, String(prog.musicas.length)],
  ];
  return (
    <div className="surface-vidro flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
      <LogoBanda logo={prog.logo} tamanho={56} />
      <strong className="min-w-[140px] flex-1 text-xl">{prog.nome}</strong>
      <dl className="m-0 flex flex-wrap gap-x-6 gap-y-2">
        {itens.map(([t, v]) => (
          <div key={t}><dt className="text-sm text-areia">{t}</dt><dd className="m-0 font-ficha text-lg">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function FimDeSemana({ prog, ocupado, onTocar, onPular }: { prog: Progresso; ocupado: boolean; onTocar: (palco: string, rep: number[]) => void; onPular: () => void }) {
  const liberados = PALCOS.filter((p) => palcoLiberado(prog, p));
  const [palco, setPalco] = useState<string>(liberados[liberados.length - 1]?.slug ?? PALCOS[0].slug);
  const [rep, setRep] = useState<number[]>([]);
  const cfg = PALCOS.find((p) => p.slug === palco)!;
  const repValido = rep.filter((s) => prog.musicas.some((m) => m.slot === s)).slice(0, cfg.musicas);

  const alternar = (slot: number) =>
    setRep(repValido.includes(slot) ? repValido.filter((s) => s !== slot) : repValido.length < cfg.musicas ? [...repValido, slot] : repValido);

  return (
    <section aria-labelledby="fds" className="surface-vidro flex flex-col gap-4 p-4">
      <h2 id="fds" className="m-0 text-lg">{TEXTOS.escolhaPalco}</h2>
      <div className="grid gap-2 md:grid-cols-2">
        {PALCOS.map((p) => {
          const aberto = palcoLiberado(prog, p);
          const falta = oQueFalta(prog, p);
          return (
            <label key={p.slug} className={`flex cursor-pointer flex-col gap-1 rounded-[6px] border p-3 ${palco === p.slug ? "border-accent" : "border-line"} ${aberto ? "" : "opacity-80"}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="palco" value={p.slug} disabled={!aberto} checked={palco === p.slug} onChange={() => setPalco(p.slug)} />
                <strong>{NOME_PALCO[p.slug]}</strong>
                <span className="ml-auto text-sm text-areia">{aberto ? `✓ ${TEXTOS.palcoAberto}` : "🔒"}</span>
              </span>
              <span className="text-sm text-areia">{TIPO_PALCO[p.slug]} · {TEXTOS.lotacao} {p.capacidade} · {TEXTOS.cacheBase} R$ {p.cacheBase}</span>
              {!aberto && (
                <span className="text-sm text-warn">
                  {TEXTOS.palcoFechado} {p.famaMin}{falta.demo ? ` ${TEXTOS.palcoDemo}` : ""}.
                </span>
              )}
            </label>
          );
        })}
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 font-semibold">{TEXTOS.repertorio} ({repValido.length}/{cfg.musicas})</legend>
        {prog.musicas.length === 0 ? <p className="m-0 text-areia">{TEXTOS.semMusicas}</p> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {prog.musicas.map((m) => (
              <label key={m.slot} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[6px] border px-3 ${repValido.includes(m.slot) ? "border-accent" : "border-line"}`}>
                <input type="checkbox" checked={repValido.includes(m.slot)} onChange={() => alternar(m.slot)} />
                <span className="flex-1">{m.titulo}</span>
                <span className="font-ficha text-sm">{m.nota}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="botao-laranja min-h-11" disabled={ocupado || repValido.length === 0} onClick={() => onTocar(palco, repValido)}>{TEXTOS.tocar}</button>
        <button type="button" className="botao-vidro min-h-11" disabled={ocupado} onClick={onPular}>{TEXTOS.pularShow}</button>
      </div>
    </section>
  );
}
