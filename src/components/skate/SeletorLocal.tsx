"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { ATRIBUICAO, CENTRO_PADRAO, iconeEscolhido, TILE_URL, ZOOM_PADRAO, ZOOM_PERTO } from "./leaflet";

export type Ponto = { lat: number; lng: number };

function Clique({ onEscolher }: { onEscolher: (p: Ponto) => void }) {
  useMapEvents({ click: (e) => onEscolher({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Começa onde a pessoa está e já marca o ponto ali (geralmente ela cadastra o pico estando nele).
function IrPraMim({ onEscolher, temPonto }: { onEscolher: (p: Ponto) => void; temPonto: boolean }) {
  const mapa = useMap();
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        mapa.setView([p.coords.latitude, p.coords.longitude], ZOOM_PERTO + 3);
        if (!temPonto) onEscolher({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 },
    );
    // Só ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa]);
  return null;
}

// Mapa pequeno do formulário: toque pra marcar o pico.
export default function SeletorLocal({ ponto, onEscolher }: { ponto: Ponto | null; onEscolher: (p: Ponto) => void }) {
  return (
    <div className="h-[320px] overflow-hidden rounded-lg border line-sutil">
      <MapContainer center={ponto ? [ponto.lat, ponto.lng] : CENTRO_PADRAO} zoom={ponto ? ZOOM_PERTO + 3 : ZOOM_PADRAO} className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={ATRIBUICAO} maxZoom={19} />
        <Clique onEscolher={onEscolher} />
        <IrPraMim onEscolher={onEscolher} temPonto={ponto !== null} />
        {ponto && (
          <Marker
            position={[ponto.lat, ponto.lng]}
            icon={iconeEscolhido()}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng();
                onEscolher({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
