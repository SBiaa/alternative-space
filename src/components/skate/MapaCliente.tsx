"use client";

import dynamic from "next/dynamic";

// O Leaflet mexe em window ao carregar: só pode ser montado no navegador.
const carregando = () => <div className="surface-vidro grid h-[65dvh] min-h-[360px] place-items-center text-areia">Abrindo o mapa…</div>;

export const MapaCliente = dynamic(() => import("./MapaSkate"), { ssr: false, loading: carregando });
export const SeletorCliente = dynamic(() => import("./SeletorLocal"), {
  ssr: false,
  loading: () => <div className="surface-vidro grid h-[320px] place-items-center text-areia">Abrindo o mapa…</div>,
});
