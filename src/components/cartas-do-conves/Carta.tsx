import { FRASES, RARIDADES, TIPOS_CARTA, frasesDeEfeitos } from "@/lib/cartas-do-conves/config";
import { TEXTOS } from "@/lib/cartas-do-conves/textos";
import type { Carta as CartaT } from "@/lib/cartas-do-conves/tipos";
import { Icone } from "./Icone";

/** Texto completo da carta, pra leitor de tela e pro tooltip: tipo, custo, efeitos e se exaure. */
export function textoDaCarta(c: CartaT): string {
  const efeitos = frasesDeEfeitos(c.efeitos);
  if (c.exaurir) efeitos.push(FRASES.exaurir);
  return `${c.nome}. ${TIPOS_CARTA[c.tipo].nome}, ${FRASES.custo(c.custo)}, ${RARIDADES[c.raridade]}. ${efeitos.join(". ")}.`;
}

type Props = {
  carta: CartaT;
  /** Menor, pra mão no celular em paisagem. */
  compacta?: boolean;
  selecionada?: boolean;
  /** Sem energia: fica apagada, mas continua tocável (o jogo explica por que não dá). */
  apagada?: boolean;
  bloqueada?: boolean;
  /** Passa a cuidar do clique; sem isso a carta é só um cartão de leitura. */
  onClick?: () => void;
  atalho?: number;
  rotuloExtra?: string;
  className?: string;
};

// Carta como pequena carta náutica: papel creme, custo em Space Mono, tipo com ícone e nome.
export function Carta({ carta, compacta, selecionada, apagada, bloqueada, onClick, atalho, rotuloExtra, className = "" }: Props) {
  const tipo = TIPOS_CARTA[carta.tipo];
  const frases = frasesDeEfeitos(carta.efeitos);
  const tam = compacta ? "w-[104px] min-h-[136px] p-1.5 text-[11px]" : "w-[168px] min-h-[220px] p-3 text-sm";
  const base = `relative flex shrink-0 flex-col gap-1 rounded-lg border-2 text-left text-noite transition-transform motion-reduce:transition-none ${tam}`;
  const cor = bloqueada ? "border-line-strong bg-surface-3 text-faint" : selecionada ? "-translate-y-2 border-laranja bg-creme-claro ring-2 ring-laranja-claro motion-reduce:translate-y-0" : "border-creme-escuro bg-creme-claro";
  const conteudo = (
    <>
      <span className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 font-semibold uppercase tracking-wide">
          <Icone nome={tipo.icone} className={compacta ? "size-3.5" : "size-4"} />
          <span className={compacta ? "text-[10px]" : "text-[11px]"}>{tipo.nome}</span>
        </span>
        <span className={`grid place-items-center rounded-full border-2 border-noite bg-laranja-claro font-ficha font-bold text-noite ${compacta ? "size-6 text-[12px]" : "size-8 text-base"}`} aria-hidden="true">
          {carta.custo}
        </span>
      </span>
      <span className={`font-semibold leading-tight ${compacta ? "text-[12px]" : "text-base"}`}>{carta.nome}</span>
      <span className="flex flex-1 flex-col gap-0.5 leading-snug">
        {frases.map((f) => (
          <span key={f}>{f}</span>
        ))}
        {carta.exaurir && <span className="font-semibold">{TEXTOS.carta.exaurir}</span>}
      </span>
      <span className="flex items-center justify-between font-ficha text-[10px] uppercase text-neutro">
        <span>{RARIDADES[carta.raridade]}</span>
        {atalho !== undefined && <span aria-hidden="true">[{atalho}]</span>}
      </span>
      {bloqueada && <Icone nome="cadeado" className="absolute right-1.5 top-8 size-4" />}
    </>
  );
  const rotulo = `${textoDaCarta(carta)}${rotuloExtra ? ` ${rotuloExtra}` : ""}`;
  if (!onClick) {
    return (
      <div role="group" aria-label={rotulo} className={`${base} ${cor} ${className}`}>
        {conteudo}
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={rotulo} aria-pressed={selecionada} aria-keyshortcuts={atalho ? String(atalho) : undefined} className={`${base} ${cor} ${apagada ? "opacity-60" : ""} cursor-pointer touch-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro ${className}`}>
      {conteudo}
    </button>
  );
}
