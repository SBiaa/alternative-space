"use client";

import { useEffect, useState } from "react";
import { meusVotos, votarDilema, type RespostaVoto } from "@/app/actions/dilemas";
import { DILEMAS, porcentagens, temOutrosVotos } from "@/lib/dilemas";

const CHAVE = "dilemas-shinobi:escolhas";

function lerLocais(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "{}");
  } catch {
    return {};
  }
}

export function DilemasShinobi() {
  const [i, setI] = useState(0);
  const [escolhas, setEscolhas] = useState<Record<string, number>>({});
  const [resp, setResp] = useState<Record<string, RespostaVoto>>({});
  const [enviando, setEnviando] = useState(false);

  // Escolhas salvas: as da conta valem mais que as do navegador.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    setEscolhas(lerLocais());
    meusVotos().then((v) => setEscolhas((e) => ({ ...e, ...v })));
  }, []);

  const d = DILEMAS[i];
  const minha = escolhas[d.id];
  const r = resp[d.id];

  // Já respondeu esse antes? Busca o placar sem pedir pra votar de novo.
  useEffect(() => {
    if (minha === undefined || resp[d.id]) return;
    votarDilema(d.id, minha).then((x) => setResp((p) => ({ ...p, [d.id]: x })));
  }, [d.id, minha, resp]);

  const votar = async (opcao: number) => {
    if (minha !== undefined || enviando) return;
    setEnviando(true);
    setEscolhas((e) => {
      const n = { ...e, [d.id]: opcao };
      try {
        localStorage.setItem(CHAVE, JSON.stringify(n));
      } catch {}
      return n;
    });
    const x = await votarDilema(d.id, opcao);
    // Se a conta já tinha voto nesse dilema, fica o da conta.
    if (x.jaVotou !== undefined) setEscolhas((e) => ({ ...e, [d.id]: x.jaVotou! }));
    setResp((p) => ({ ...p, [d.id]: x }));
    setEnviando(false);
  };

  const ir = (n: number) => setI((n + DILEMAS.length) % DILEMAS.length);
  const pct = r?.placar ? porcentagens(r.placar.contagem) : [];
  const mostrarNumeros = !!r?.placar && temOutrosVotos(r.placar, r.contou);

  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border-[6px] border-creme bg-noite p-4 sm:p-6">
      <div className="flex items-center justify-between text-sm text-areia">
        <span>Dilema {i + 1} de {DILEMAS.length}</span>
        <span>{Object.keys(escolhas).filter((k) => DILEMAS.some((x) => x.id === k)).length} respondidos</span>
      </div>

      <p className="m-0 text-lg font-semibold leading-snug text-creme sm:text-2xl">{d.pergunta}</p>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {d.opcoes.map((o, k) => {
          const sua = minha === k;
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => votar(k)}
                disabled={minha !== undefined || enviando}
                aria-pressed={sua}
                className={`relative w-full overflow-hidden rounded-md border px-4 py-3 text-left text-[15px] text-creme transition-colors ${
                  sua ? "border-laranja-claro" : "border-creme/25"
                } ${minha === undefined ? "cursor-pointer hover:border-creme/60 hover:bg-creme/5" : "cursor-default"}`}
              >
                {mostrarNumeros && (
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${sua ? "bg-laranja/35" : "bg-creme/12"}`}
                    style={{ width: `${pct[k]}%` }}
                  />
                )}
                <span className="relative flex items-center justify-between gap-3">
                  <span>
                    {o}
                    {sua && <span className="ml-2 text-xs text-laranja-claro">sua escolha</span>}
                  </span>
                  {mostrarNumeros && <span className="font-semibold tabular-nums">{pct[k]}%</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite" className="min-h-5 text-sm text-areia">
        {minha === undefined ? (
          "Escolha uma. Depois você vê o que o resto da tripulação respondeu."
        ) : !r ? (
          "Contando os votos..."
        ) : !r.placar ? (
          "Não deu pra carregar os votos agora. Tenta de novo daqui a pouco."
        ) : mostrarNumeros ? (
          <>
            {r.placar.total} {r.placar.total === 1 ? "voto" : "votos"} da tripulação.
            {!r.contou && " Seu voto não entrou na conta: entre na sua conta pra ele contar."}
          </>
        ) : r.contou ? (
          "Você foi o primeiro a responder esse. Volte depois pra ver o que os outros acharam."
        ) : (
          "Ninguém votou nesse ainda. Entre na sua conta pra ser o primeiro voto."
        )}
      </div>

      <div className="flex justify-between gap-3">
        <button type="button" onClick={() => ir(i - 1)} className="rounded-md border border-creme/25 px-4 py-2 text-sm text-creme hover:border-creme/60">
          ← Anterior
        </button>
        <button type="button" onClick={() => ir(i + 1)} className="rounded-md bg-laranja px-4 py-2 text-sm font-semibold text-creme hover:brightness-110">
          Próximo →
        </button>
      </div>
    </div>
  );
}
