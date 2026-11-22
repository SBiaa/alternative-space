"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Map as MapaLeaflet } from "leaflet";
import { linkComoChegar, NOME_TIPO, TIPOS_SPOT, type Pino, type TipoSpot } from "@/lib/skate/tipos";
import { ATRIBUICAO, CENTRO_PADRAO, COR_TIPO, iconeDe, TILE_URL, ZOOM_PADRAO, ZOOM_PERTO } from "./leaflet";

type Estado = "ocioso" | "carregando" | "longe" | "erro";

// Busca os pinos da área visível quando o mapa para de mexer.
function Buscador({ onPinos, onEstado }: { onPinos: (p: Pino[]) => void; onEstado: (e: Estado) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pedido = useRef<AbortController | null>(null);

  const buscar = useCallback(
    (mapa: MapaLeaflet) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const b = mapa.getBounds();
        const caixa = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map((v) => v.toFixed(4)).join(",");
        pedido.current?.abort();
        const ctrl = new AbortController();
        pedido.current = ctrl;
        onEstado("carregando");
        try {
          const r = await fetch(`/api/skate/pinos?caixa=${caixa}`, { signal: ctrl.signal });
          const j = (await r.json()) as { pinos?: Pino[]; longe?: boolean; avisos?: { osm: boolean; comunidade: boolean } };
          if (j.longe) return onEstado("longe");
          onPinos(j.pinos ?? []);
          onEstado(j.avisos?.osm || j.avisos?.comunidade ? "erro" : "ocioso");
        } catch (e) {
          if ((e as Error).name !== "AbortError") onEstado("erro");
        }
      }, 500);
    },
    [onPinos, onEstado],
  );

  const mapa = useMapEvents({ moveend: () => buscar(mapa) });
  useEffect(() => buscar(mapa), [buscar, mapa]);
  return null;
}

// Pede a localização uma vez ao abrir e pelo botão "perto de mim".
function Localizador({ pedir }: { pedir: number }) {
  const mapa = useMap();
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => mapa.setView([p.coords.latitude, p.coords.longitude], ZOOM_PERTO),
      () => {},
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [mapa, pedir]);
  return null;
}

const AVISO: Record<Exclude<Estado, "ocioso">, string> = {
  carregando: "Procurando picos…",
  longe: "Chega mais perto pra ver os picos.",
  erro: "Parte dos picos não carregou. Mexe no mapa pra tentar de novo.",
};

export default function MapaSkate() {
  const [pinos, setPinos] = useState<Pino[]>([]);
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [visiveis, setVisiveis] = useState<Set<TipoSpot>>(new Set(TIPOS_SPOT));
  const [pedirLocal, setPedirLocal] = useState(0);

  const alternar = (t: TipoSpot) =>
    setVisiveis((v) => {
      const n = new Set(v);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  const mostrados = pinos.filter((p) => visiveis.has(p.tipo));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {TIPOS_SPOT.map((t) => (
          <button key={t} type="button" onClick={() => alternar(t)} aria-pressed={visiveis.has(t)} className={`botao-vidro inline-flex items-center gap-2 text-sm ${visiveis.has(t) ? "" : "opacity-50"}`}>
            <span aria-hidden className="inline-block size-3 rounded-full" style={{ background: COR_TIPO[t] }} />
            {NOME_TIPO[t]}
          </button>
        ))}
        <button type="button" onClick={() => setPedirLocal((n) => n + 1)} className="botao-vidro text-sm">
          📍 Perto de mim
        </button>
      </div>

      <div className="relative h-[65dvh] min-h-[360px] overflow-hidden rounded-lg border line-sutil">
        <MapContainer center={CENTRO_PADRAO} zoom={ZOOM_PADRAO} className="h-full w-full" scrollWheelZoom>
          <TileLayer url={TILE_URL} attribution={ATRIBUICAO} maxZoom={19} />
          <Buscador onPinos={setPinos} onEstado={setEstado} />
          <Localizador pedir={pedirLocal} />
          {mostrados.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={iconeDe(p.tipo, p.origem === "comunidade")}>
              <Popup>
                <div className="flex min-w-[180px] flex-col gap-1 text-noite">
                  <strong className="text-base">{p.nome}</strong>
                  <span className="text-xs uppercase tracking-wider">{NOME_TIPO[p.tipo]}</span>
                  {p.descricao && <span className="text-sm">{p.descricao}</span>}
                  {p.obstaculos && p.obstaculos.length > 0 && <span className="text-sm">Tem: {p.obstaculos.join(", ")}</span>}
                  <span className="text-xs text-neutro">{p.origem === "comunidade" ? `Descoberto por ${p.descobertoPor}` : "Dados do OpenStreetMap"}</span>
                  <span className="mt-1 flex gap-3 text-sm">
                    {p.origem === "comunidade" && <Link href={`/skate/picos/${p.id}`}>Ver pico</Link>}
                    <a href={linkComoChegar(p.lat, p.lng)} target="_blank" rel="noopener noreferrer">Como chegar</a>
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {estado !== "ocioso" && (
          <p role="status" className="pointer-events-none absolute inset-x-0 top-3 z-[1000] mx-auto w-fit max-w-[90%] rounded-md bg-noite/90 px-3 py-2 text-center text-sm text-creme">
            {AVISO[estado]}
          </p>
        )}
      </div>
      <p className="m-0 text-sm text-areia">
        {mostrados.length === 1 ? "1 lugar nesta área." : `${mostrados.length} lugares nesta área.`} Pinos com borda clara foram descobertos pela comunidade.
      </p>
    </div>
  );
}
