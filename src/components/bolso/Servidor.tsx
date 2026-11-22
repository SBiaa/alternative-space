// Peças de leitura (sem estado): texto da cena em MDX, ficha compacta e lista de recompensas.
import { MDXRemote } from "next-mdx-remote/rsc";
import { ATRIBUTOS, TALENTOS } from "@/lib/bolso/config";
import type { Aventura } from "@/lib/bolso/conteudo";
import type { Recompensas } from "@/lib/bolso/motor";
import type { Personagem } from "@/lib/bolso/personagem";
import type { Estado } from "@/lib/bolso/save";
import { Retrato } from "./Retrato";

// O texto da cena é MDX curto do próprio repositório (content/mesa-de-bolso). Nada que o jogador digita passa por aqui.
export function CenaTexto({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-3 text-base leading-relaxed [&_em]:italic [&_p]:m-0 [&_strong]:font-semibold">
      <MDXRemote source={texto} />
    </div>
  );
}

export const nomesDosTalentos = (ids: string[]) => ids.map((id) => TALENTOS.find((t) => t.id === id)?.nome ?? id);

export function Atributos({ attrs }: { attrs: Personagem["attrs"] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 font-ficha text-sm">
      {ATRIBUTOS.map((a) => (
        <li key={a.id}>
          {a.nome} {attrs[a.id]}
        </li>
      ))}
    </ul>
  );
}

// Fôlego: caixinhas cheias e vazias, e o número por extenso (nunca só pela forma).
export function Folego({ atual, max }: { atual: number; max: number }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Fôlego ${atual} de ${max}`}>
      <span className="etiqueta text-[11px] text-areia">Fôlego</span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`h-3 w-4 rounded-sm border border-laranja-claro ${i < atual ? "bg-laranja-claro" : "bg-transparent"}`} />
        ))}
      </span>
      <span className="font-ficha text-sm">{atual}/{max}</span>
    </div>
  );
}

export function FichaCompacta({ estado, aventura }: { estado: Estado; aventura: Aventura }) {
  const p = estado.personagem;
  const itens = estado.itens.map((id) => aventura.itens.find((i) => i.id === id)).filter((x) => !!x);
  const marcas = estado.marcas.map((id) => aventura.marcas.find((m) => m.id === id)).filter((x) => !!x);
  return (
    <section aria-label="Sua personagem" className="surface-vidro flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Retrato retrato={p.retrato} nome={p.nome} tamanho={64} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="m-0 truncate text-lg font-semibold">{p.nome}</p>
          <Atributos attrs={p.attrs} />
          <p className="m-0 text-xs text-areia">Talentos: {nomesDosTalentos(p.talentos).join(", ")}</p>
        </div>
      </div>
      <Folego atual={estado.folego} max={estado.folegoMax} />
      {(itens.length > 0 || marcas.length > 0) && (
        <dl className="m-0 grid gap-1 text-sm">
          {itens.length > 0 && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold">Itens:</dt>
              <dd className="m-0">{itens.map((i) => i!.nome).join(", ")}</dd>
            </div>
          )}
          {marcas.length > 0 && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold">Marcas:</dt>
              <dd className="m-0">{marcas.map((m) => m!.nome).join(", ")}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

export function ListaRecompensas({ recompensas }: { recompensas: Recompensas }) {
  const vazio = !recompensas.itens.length && !recompensas.marcas.length;
  if (vazio) return <p className="m-0 text-sm text-neutro">Nenhum item nem marca desta vez.</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
      {recompensas.itens.map((i) => (
        <li key={`i-${i.id}`}>
          <strong>Item: {i.nome}.</strong> {i.descricao}
        </li>
      ))}
      {recompensas.marcas.map((m) => (
        <li key={`m-${m.id}`}>
          <strong>Marca: {m.nome}.</strong> {m.descricao}
        </li>
      ))}
    </ul>
  );
}
