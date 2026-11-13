// Ícones de traço simples (24×24) do Muro Livre. Sempre acompanhados de texto: nunca só cor ou só ícone.

const D: Record<string, string> = {
  caderno: "M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3Zm0 0v16m4-12h6m-6 4h6",
  muros: "M3 6h18v12H3V6Zm0 6h18M9 6v6m6 0v6",
  crew: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0m2-9a2.5 2.5 0 1 0 0-5m2 14a5 5 0 0 0-3-4.6",
  material: "M8 3h8v3H8V3Zm-1 3h10v15H7V6Zm0 6h10",
  nuvem: "M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 8.5a4 4 0 0 1 0 9.5H7Zm1 3 1-2m4 2 1-2m4 2 1-2",
  cadeado: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5V11Z",
  lapis: "m4 20 1-4L16 5l3 3L8 19l-4 1Zm9-12 3 3",
  lata: "M8 9h8v12H8V9Zm1-3h6v3H9V6Zm2-3h2v3h-2V3",
  regua: "M4 8h16v8H4V8Zm3 0v3m3-3v4m3-4v3m3-3v4",
  relogio: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2",
  alerta: "M12 3 2 20h20L12 3Zm0 6v5m0 3v.5",
  check: "m5 12 5 5 9-10",
  play: "M8 5v14l11-7L8 5Z",
  pause: "M8 5v14m8-14v14",
  rapido: "m4 5 8 7-8 7V5Zm9 0 8 7-8 7V5Z",
  moeda: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v8m-2.5-6h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4",
  estrela: "m12 3 2.7 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.5 19.7l1.2-6.1L3.2 9.4l6.1-.8L12 3Z",
  ajustes: "M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6m-4 4v6",
  pincel: "M18 3 9 12l3 3 9-9-3-3ZM8 13c-3 0-4 2-4 5 3 0 5-1 5-4",
  gota: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z",
  casa: "M3 11 12 4l9 7M6 10v10h12V10",
  voltar: "M15 5 8 12l7 7",
};

export function Icone({ nome, tam = 20, titulo }: { nome: keyof typeof D | string; tam?: number; titulo?: string }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" role={titulo ? "img" : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true} focusable="false">
      <path d={D[nome] ?? D.alerta} />
    </svg>
  );
}
