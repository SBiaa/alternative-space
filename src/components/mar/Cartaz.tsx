// Cartaz de procurado do Mar Sem Fim: papel envelhecido, nome grande em Space Grotesk e recompensa em Space Mono.
// Desenho próprio (nada de copiar cartaz de outra obra). Aparece na cabine de quem tem pirata.
import Link from "next/link";
import { T, formatarNumero, preencher } from "@/lib/mar-sem-fim/textos";
import type { DadosCartaz } from "@/lib/mar-sem-fim/tipos";
import { BandeiraArte, PirataArte, RosaDosVentos } from "./Pecas";

export function CartazProcurado({ c }: { c: DadosCartaz }) {
  const valor = formatarNumero(c.recompensa);
  return (
    <figure
      className="relative m-0 flex w-full max-w-[340px] flex-col items-center gap-3 overflow-hidden rounded-[8px] bg-creme-escuro px-5 pb-5 pt-6 text-tinta"
      aria-label={preencher(T.cartaz.alt, { nome: c.nome, barco: c.barco, valor: `${valor} ${T.unidades.moeda}` })}
    >
      <RosaDosVentos className="pointer-events-none absolute -left-6 -top-6 size-28 text-azul/15" />
      <div className="pointer-events-none absolute inset-2 rounded-[6px] border border-azul/35" aria-hidden="true" />
      <p className="etiqueta m-0 text-azul">{T.cartaz.titulo}</p>
      <div className="flex w-[168px] items-end justify-center rounded-[4px] border border-azul/40 bg-creme-claro pt-2">
        <PirataArte aparencia={c.aparencia} rotulo={c.nome} className="block w-[132px]" />
      </div>
      <p className="m-0 break-words text-center text-[34px] font-bold leading-[1] tracking-[-0.02em] text-noite">{c.nome}</p>
      <p className="m-0 text-xs text-neutro">{T.cartaz.subtitulo}</p>
      <div className="flex flex-col items-center">
        <span className="etiqueta text-[10px] text-neutro">{T.cartaz.recompensa}</span>
        <span className="font-ficha text-[30px] font-bold leading-tight text-estrela">{valor}</span>
        <span className="font-ficha text-[11px] text-neutro">{T.unidades.moeda}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 border-t border-azul/25 pt-3 text-sm">
        <BandeiraArte bandeira={c.bandeira} rotulo={c.barco} className="block w-[42px]" />
        <span><span className="text-neutro">{T.cartaz.barco}: </span><strong className="text-noite">{c.barco}</strong></span>
      </div>
    </figure>
  );
}

/** Bloco da cabine: o cartaz, o link pra baixar como imagem e o aviso do que é público. */
export function BlocoCartaz({ c, apelido, dono }: { c: DadosCartaz | null; apelido: string; dono: boolean }) {
  if (!c) {
    if (!dono) return null;
    return (
      <section className="flex flex-col gap-3" aria-labelledby="cartaz">
        <h2 id="cartaz" className="m-0 text-2xl font-semibold">{T.cartaz.secao}</h2>
        <p className="m-0 text-areia">{T.cartaz.semPirata}</p>
        <Link href="/jogos/mar-sem-fim/novo" className="btn bg-laranja self-start text-tinta no-underline">{T.cartaz.criar}</Link>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3" aria-labelledby="cartaz">
      <h2 id="cartaz" className="m-0 text-2xl font-semibold">{dono ? T.cartaz.meu : T.cartaz.secao}</h2>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
        <CartazProcurado c={c} />
        <div className="flex flex-col gap-2">
          <a href={`/t/${encodeURIComponent(apelido)}/cartaz.png`} download={`cartaz-${apelido}.png`} className="btn btn-fantasma no-underline">{T.cartaz.compartilhar}</a>
          <p className="m-0 max-w-[320px] text-xs text-poeira">{T.cartaz.descricaoPublica} {T.aviso}</p>
        </div>
      </div>
    </section>
  );
}
