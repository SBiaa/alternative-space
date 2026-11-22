import L from "leaflet";
import type { TipoSpot } from "@/lib/skate/tipos";

// Peças do Leaflet compartilhadas pelo mapa e pelo seletor de local. Só roda no navegador.

export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Sem localização: centro do Brasil, bem afastado. Com localização: zoom de bairro.
export const CENTRO_PADRAO: [number, number] = [-15.78, -47.93];
export const ZOOM_PADRAO = 4;
export const ZOOM_PERTO = 14;

export const COR_TIPO: Record<TipoSpot, string> = {
  pico: "#dd5d05",
  pista: "#8fd6a4",
  shop: "#f2c14e",
};

const LETRA: Record<TipoSpot, string> = { pico: "P", pista: "S", shop: "$" };

// Pino desenhado em HTML: não depende das imagens padrão do Leaflet (que quebram com o bundler).
export function iconeDe(tipo: TipoSpot, comunidade = false) {
  const borda = comunidade ? "#ece3be" : "#01121e";
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
    html: `<span style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:${COR_TIPO[tipo]};border:2px solid ${borda};color:#01121e;font:700 13px/1 system-ui,sans-serif;box-shadow:0 2px 6px rgb(0 0 0/.4)">${LETRA[tipo]}</span>`,
  });
}

export const iconeEscolhido = () =>
  L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 30],
    html: `<span style="display:block;width:32px;height:32px;font-size:30px;line-height:32px;text-align:center;filter:drop-shadow(0 2px 3px rgb(0 0 0/.5))">📍</span>`,
  });
