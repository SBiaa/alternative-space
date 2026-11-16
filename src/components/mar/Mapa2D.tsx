"use client";

// Mapa plano (projeção equiretangular) do mesmo mundo.json: mesma textura, mesmos marcadores, mesmas ações.
// É o padrão em aparelho fraco e com movimento reduzido.

import { useMemo, useRef, useState } from "react";
import { MUNDO } from "@/lib/mar-sem-fim/conteudo";
import { amostrarArco, type LatLng } from "@/lib/mar-sem-fim/geo";
import { T } from "@/lib/mar-sem-fim/textos";
import type { Estado } from "@/lib/mar-sem-fim/tipos";
import { MARCADORES, pontosDaRotaViagem, posicaoDoBarco, type Planeta } from "./mapa-comum";

const W = 360;
const H = 180;
const xy = (p: LatLng): [number, number] => [p.lng + 180, 90 - p.lat];

type Props = { planeta: Planeta; estado: Estado; agora: number; selecionada: string | null; onSelecionar: (id: string) => void };

export default function Mapa2D({ planeta, estado, agora, selecionada, onSelecionar }: Props) {
  const [zoom, setZoom] = useState(1);
  const [centro, setCentro] = useState<[number, number]>(() => xy(MARCADORES.find((m) => m.id === estado.barco.ilhaAtual) ?? { lat: 0, lng: 0 }));
  const arrasto = useRef<{ x: number; y: number; c: [number, number] } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  // Ao escolher uma ilha (no mapa ou na lista), o mapa centra nela.
  const [anterior, setAnterior] = useState(selecionada);
  if (anterior !== selecionada) {
    setAnterior(selecionada);
    const m = MARCADORES.find((x) => x.id === selecionada);
    if (m) setCentro(xy(m));
  }

  const vw = W / zoom;
  const vh = H / zoom;
  const vx = Math.min(W - vw, Math.max(0, centro[0] - vw / 2));
  const vy = Math.min(H - vh, Math.max(0, centro[1] - vh / 2));
  const barco = posicaoDoBarco(estado, agora);
  const rota = pontosDaRotaViagem(estado);
  const linha = useMemo(() => {
    if (!rota || rota.length < 2) return "";
    const pts: LatLng[] = [];
    for (let i = 0; i < rota.length - 1; i++) pts.push(...amostrarArco(rota[i], rota[i + 1], 20));
    return pts.map((p, i) => `${i ? "L" : "M"}${xy(p).join(" ")}`).join(" ");
  }, [rota]);

  const k = 1 / zoom; // mantém marcadores do mesmo tamanho na tela ao dar zoom
  const mudarZoom = (d: number) => setZoom((z) => Math.min(6, Math.max(1, z + d)));

  return (
    <div className="relative size-full">
      <svg
        ref={svg}
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={T.mundo.mapaAlt}
        className="size-full touch-none select-none bg-noite"
        onPointerDown={(e) => { arrasto.current = { x: e.clientX, y: e.clientY, c: centro }; }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a || !svg.current) return;
          const r = svg.current.getBoundingClientRect();
          const esc = Math.min(r.width / vw, r.height / vh);
          setCentro([a.c[0] - (e.clientX - a.x) / esc, a.c[1] - (e.clientY - a.y) / esc]);
        }}
        onPointerUp={() => { arrasto.current = null; }}
        onPointerLeave={() => { arrasto.current = null; }}
        onWheel={(e) => mudarZoom(e.deltaY < 0 ? 0.4 : -0.4)}
      >
        <image href={planeta.url} x="0" y="0" width={W} height={H} preserveAspectRatio="none" style={{ imageRendering: "auto" }} />
        {linha && <path d={linha} fill="none" stroke="#f2a66e" strokeWidth={1.4 * k} strokeDasharray={`${3 * k} ${2 * k}`} />}
        {MARCADORES.map((m) => {
          const [x, y] = xy(m);
          const st = m.emBreve ? "travada" : (estado.ilhas[m.id]?.status ?? "travada");
          const aberta = !m.emBreve && st !== "travada";
          const sel = selecionada === m.id;
          return (
            <g
              key={m.id}
              role="button"
              tabIndex={0}
              aria-label={`${m.nome}${m.emBreve ? `, ${T.mundo.listaEmBreve}` : `, ${T.ilha.status[st]}`}`}
              aria-pressed={sel}
              className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-laranja-claro [&:focus-visible>circle:first-child]:stroke-[1.5]"
              onClick={(e) => { e.stopPropagation(); onSelecionar(m.id); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelecionar(m.id); } }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <circle cx={x} cy={y} r={11 * k} fill="transparent" stroke="transparent" />
              {aberta ? (
                <>
                  <circle cx={x} cy={y} r={3.4 * k} fill={MUNDO.planeta.corIlha} stroke="#01121e" strokeWidth={0.6 * k} />
                  <circle cx={x} cy={y} r={1.5 * k} fill={MUNDO.planeta.corIlhaPonto} />
                </>
              ) : (
                <circle cx={x} cy={y} r={3 * k} fill="none" stroke={MUNDO.planeta.corIlha} strokeWidth={0.9 * k} strokeDasharray={`${1.2 * k} ${1 * k}`} opacity={0.75} />
              )}
              {sel && <circle cx={x} cy={y} r={5.6 * k} fill="none" stroke={MUNDO.planeta.corIlhaPonto} strokeWidth={1 * k} />}
              {(sel || zoom >= 2.4) && (
                <text x={x} y={y - 7 * k} textAnchor="middle" fontSize={4.2 * k} fill="#ece3be" stroke="#01121e" strokeWidth={1.2 * k} paintOrder="stroke" style={{ pointerEvents: "none" }}>{m.nome}</text>
              )}
            </g>
          );
        })}
        {(() => {
          const [bx, by] = xy(barco);
          return <path d={`M${bx} ${by - 5 * k} L${bx + 3.4 * k} ${by + 2 * k} L${bx - 3.4 * k} ${by + 2 * k} Z`} fill="#dd5d05" stroke="#01121e" strokeWidth={0.7 * k} aria-label={T.mundo.legenda.barco} />;
        })()}
      </svg>
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button type="button" onClick={() => mudarZoom(1)} aria-label={T.mundo.zoomMais} className="gs-redondo text-lg font-semibold" disabled={zoom >= 6}>+</button>
        <button type="button" onClick={() => mudarZoom(-1)} aria-label={T.mundo.zoomMenos} className="gs-redondo text-lg font-semibold" disabled={zoom <= 1}>−</button>
      </div>
    </div>
  );
}
