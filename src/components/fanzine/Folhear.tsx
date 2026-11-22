"use client";

import { useState, type ReactNode } from "react";
import { FANZINE, TEXTOS } from "@/lib/fanzine/config";
import type { Pista, VisaoCapitulo } from "@/lib/fanzine/tipos";
import { IconeCheck, IconeLupa, IconeSeta } from "./Icones";

type Props = {
  visao: VisaoCapitulo;
  achadas: string[];
  onMarcar: (pista: Pista) => void;
  // Texto MDX de cada página, já renderizado no servidor.
  textos: Record<string, ReactNode>;
  ocupado: boolean;
};

const T = TEXTOS;

/** Folhear as páginas, com zoom e lupa. Os detalhes também ficam numa lista (teclado e leitor de tela). */
export function Folhear({ visao, achadas, onMarcar, textos, ocupado }: Props) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<number>(FANZINE.zoom.min);
  const [lupa, setLupa] = useState(true);
  const pagina = visao.paginas[i];
  const pistas = visao.pistas.filter((p) => p.pagina === pagina.id);
  const total = visao.paginas.length;
  const mudaZoom = (d: number) => setZoom((z) => Math.min(FANZINE.zoom.max, Math.max(FANZINE.zoom.min, z + d)));

  return (
    <section aria-labelledby="folhear" className="flex flex-col gap-3">
      <h2 id="folhear" className="sr-only">
        {T.folhear.titulo}
      </h2>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={T.folhear.titulo}>
        <button type="button" className="btn h-11 min-w-11 px-3" onClick={() => setI(i - 1)} disabled={i === 0} aria-label={T.folhear.anterior}>
          <IconeSeta esquerda />
        </button>
        <p className="m-0 min-w-28 text-center font-ficha text-sm" aria-live="polite">
          {T.folhear.pagina(i + 1, total)} · {pagina.titulo}
        </p>
        <button type="button" className="btn h-11 min-w-11 px-3" onClick={() => setI(i + 1)} disabled={i === total - 1} aria-label={T.folhear.proxima}>
          <IconeSeta />
        </button>
        <span className="flex-1" />
        <button type="button" className="btn h-11 min-w-11 px-3" onClick={() => mudaZoom(-FANZINE.zoom.passo)} disabled={zoom <= FANZINE.zoom.min} aria-label={T.folhear.menosZoom}>
          −
        </button>
        <span className="font-ficha text-xs text-areia" aria-live="polite">
          {T.folhear.zoom(zoom)}
        </span>
        <button type="button" className="btn h-11 min-w-11 px-3" onClick={() => mudaZoom(FANZINE.zoom.passo)} disabled={zoom >= FANZINE.zoom.max} aria-label={T.folhear.maisZoom}>
          +
        </button>
        <button type="button" className="btn h-11 gap-1.5 whitespace-nowrap px-3" aria-pressed={lupa} onClick={() => setLupa(!lupa)}>
          <IconeLupa /> {T.lupa.titulo}
        </button>
      </div>

      <div className="xerox xerox-grampo overflow-auto" style={{ maxHeight: "72vh" }} tabIndex={0} role="region" aria-label={pagina.titulo}>
        <div className="relative" style={{ width: `${zoom * 100}%`, aspectRatio: `${pagina.largura} / ${pagina.altura}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG próprio da fanzine, com tamanho fixo */}
          <img src={pagina.imagem} alt={pagina.alt} width={pagina.largura} height={pagina.altura} className="block h-full w-full select-none" draggable={false} />
          {lupa &&
            pistas.map((p) => {
              const achada = achadas.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="xerox-area"
                  data-achada={achada}
                  // Pro teclado e o leitor de tela existe a lista logo abaixo; aqui é só o toque na imagem.
                  tabIndex={-1}
                  aria-hidden="true"
                  disabled={ocupado}
                  onClick={() => onMarcar(p)}
                  style={{ left: `${p.area.x * 100}%`, top: `${p.area.y * 100}%`, width: `${p.area.w * 100}%`, height: `${p.area.h * 100}%` }}
                >
                  <span className="xerox-selo">{achada ? <IconeCheck /> : <IconeLupa />}</span>
                </button>
              );
            })}
        </div>
      </div>

      <section aria-labelledby="detalhes" className="surface-vidro flex flex-col gap-2 p-3">
        <h3 id="detalhes" className="etiqueta m-0 text-[11px] text-laranja-claro">
          {T.lupa.detalhes}
        </h3>
        <p className="m-0 text-sm text-areia">{T.lupa.dica}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {pistas.map((p) => {
            const achada = achadas.includes(p.id);
            return (
              <li key={p.id}>
                <button type="button" className="btn min-h-11 w-full justify-start gap-2 px-3 py-2 text-left" onClick={() => onMarcar(p)} disabled={ocupado || achada}>
                  {achada ? <IconeCheck /> : <IconeLupa />}
                  <span className="flex flex-col">
                    <span className="font-semibold">{p.rotulo}</span>
                    <span className="text-xs font-normal text-areia">{p.descricao}</span>
                    <span className="font-ficha text-[11px] font-normal">{achada ? `✓ ${T.lupa.achada}` : T.lupa.naoAchada}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <details className="surface-vidro p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">{T.folhear.lerEmTexto}</summary>
        <div className="prose-zine flex flex-col gap-2 text-sm leading-relaxed text-creme">{textos[pagina.id]}</div>
      </details>
    </section>
  );
}
