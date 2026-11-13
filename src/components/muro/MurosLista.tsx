"use client";

import Link from "next/link";
import { CAMADAS } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { podeIniciar } from "@/lib/muro/negociacao";
import { SemCrew } from "./CadernoTela";
import { useMuro } from "./useMuro";
import { AdesivoAuth, Progresso, brl } from "./visual";

const BASE = "/jogos/muro-livre";

export function MurosLista() {
  const m = useMuro();
  const prog = m.prog;
  if (!prog) return <SemCrew />;
  const lista = prog.jobs.filter((j) => j.aceita && (j.status === "em_andamento" || (j.status === "aberta" && j.auth === "autorizado")));
  const entregues = prog.jobs.filter((j) => j.status === "entregue" && !j.encontro).slice(-4).reverse();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="muro-titulo m-0 text-[30px] sm:text-[40px]">{TEXTOS.abas.muros}</h1>
      {lista.length === 0 && <p className="muro-nota m-0">Nenhum mural em andamento. Aceite uma encomenda no caderno.</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        {lista.map((j, i) => (
          <Link key={j.id} href={`${BASE}/muro/${j.id}`} className="muro-pagina flex flex-col gap-2 text-noite no-underline" style={{ ["--inclina" as string]: `${i % 2 ? 0.7 : -0.7}deg` }}>
            <h2 className="muro-titulo m-0 text-lg">{j.nomeCliente}</h2>
            <p className="m-0 flex flex-wrap items-center gap-2 text-sm">{TEXTOS.tamanhos[j.tamanho]} · {brl(j.pagamento)} · prazo dia {j.prazo}<AdesivoAuth auth={j.auth} revisao={j.revisao} /></p>
            {j.status === "aberta" && !podeIniciar(prog, j).ok && <p className="muro-nota m-0">Ainda não começou</p>}
            <div className="flex flex-col gap-1">
              {CAMADAS.map((c) => (
                <div key={c} className="flex items-center gap-2 text-xs"><span className="w-28">{TEXTOS.muro.camada[c]}</span><div className="flex-1"><Progresso valor={j.camadas[c].progresso} rotulo={`${TEXTOS.muro.camada[c]} de ${j.nomeCliente}`} /></div><span className="muro-medida w-10 text-right">{Math.round(j.camadas[c].progresso)}%</span></div>
              ))}
            </div>
          </Link>
        ))}
      </div>
      {entregues.length > 0 && (
        <section aria-labelledby="entregues" className="flex flex-col gap-2">
          <h2 id="entregues" className="m-0 text-lg font-bold">Entregues</h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {entregues.map((j) => <li key={j.id} className="muro-medida">{j.nomeCliente} · {TEXTOS.muro.entregueEm(j.qualFinal ?? 0)} · {brl(j.pago ?? 0)}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
