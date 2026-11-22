// Ícones do jogo, desenhados em 24x24 com traço (herdam a cor do texto). Sempre acompanham um texto: nunca são a única informação.

const TRACOS: Record<string, string> = {
  espada: "M5 19l4-4 M3 21l2-2 M8.5 12.5l9-9h3v3l-9 9z M7 14l3 3",
  escudo: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z",
  vela: "M12 3v15 M12 4l6 11h-6 M12 8L7 15h5 M5 20h14",
  gota: "M12 3c3 4 6 7 6 10a6 6 0 01-12 0c0-3 3-6 6-10z",
  ancora: "M12 3.5a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6z M12 7v13 M7 12H5a7 7 0 0014 0h-2 M8 10h8",
  onda: "M3 9c3-3 6 3 9 0s6 3 9 0 M3 15c3-3 6 3 9 0s6 3 9 0",
  bussola: "M12 3a9 9 0 100 18 9 9 0 000-18z M15.5 8.5l-2 5-5 2 2-5z",
  panela: "M5 10h14v6a4 4 0 01-4 4H9a4 4 0 01-4-4z M3 10h18 M9 6c0-1.5 1-2 1-3 M14 6c0-1.5 1-2 1-3",
  cruz: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  martelo: "M14 4l6 6-3 3-6-6z M12 9L4 17l3 3 8-8",
  nota: "M9 18V6l10-2v12 M9 18a3 3 0 11-6 0 3 3 0 016 0z M19 16a3 3 0 11-6 0 3 3 0 016 0z",
  mira: "M12 4a8 8 0 100 16 8 8 0 000-16z M12 1v5 M12 18v5 M1 12h5 M18 12h5",
  rosa: "M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z",
  ouro: "M12 4a8 8 0 100 16 8 8 0 000-16z M12 8v8 M9.5 10.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4",
  folego: "M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z",
  energia: "M13 2L5 14h6l-1 8 8-12h-6z",
  baralho: "M6 7h9v13H6z M9 4h9v13",
  exaurir: "M6 6l12 12 M18 6L6 18",
  evento: "M9 9a3 3 0 116 0c0 2-3 2-3 5 M12 18v.5",
  bau: "M4 10h16v9H4z M4 10a8 5 0 0116 0 M12 13v3",
  gaivota: "M2 10c4 0 6 2 10 6 4-4 6-6 10-6 M12 16v4",
  caranguejo: "M7 15a5 4 0 0110 0z M4 8l3 3 M20 8l-3 3 M5 19l3-3 M19 19l-3-3",
  "agua-viva": "M5 11a7 7 0 0114 0z M8 11v7 M12 11v9 M16 11v7",
  pirata: "M4 9h16 M6 9l1-5h10l1 5 M7 9v2a5 5 0 0010 0V9 M9 15v3 M15 15v3",
  sereia: "M12 3a3 3 0 100 6 3 3 0 000-6z M12 9v6c0 3-3 4-5 6 M12 15c0 3 3 4 5 6",
  fantasma: "M6 21V10a6 6 0 0112 0v11l-3-2-3 2-3-2z M10 11v1 M14 11v1",
  moreia: "M3 16c4-8 8 0 12-4s4-5 6-3 M20 8l1.5-1.5",
  raio: "M13 2L5 14h6l-1 8 8-12h-6z",
  polvo: "M12 3a6 6 0 00-6 6c0 2 1 3 1 5s-2 3-3 6 M12 3a6 6 0 016 6c0 2-1 3-1 5s2 3 3 6 M10 15v6 M14 15v6",
  astrolabio: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7a5 5 0 100 10 5 5 0 000-10z M12 3v4 M12 17v4",
  barril: "M7 4h10c1 3 1 13 0 16H7c-1-3-1-13 0-16z M6 9h12 M6 15h12",
  sino: "M12 3v2 M6 17h12 M7 17c0-3-1-4-1-7a6 6 0 0112 0c0 3-1 4-1 7 M10 20a2 2 0 004 0",
  biscoito: "M12 3a9 9 0 100 18 9 9 0 000-18z M9 9v.5 M14 8v.5 M10 14v.5 M15 13v.5",
  corda: "M5 7c4-4 10 0 14-3 M5 12c4-4 10 0 14-3 M5 17c4-4 10 0 14-3",
  lanterna: "M9 3h6 M8 6h8l1 14H7z M12 10a2 2 0 100 4 2 2 0 000-4z",
  check: "M5 13l4 4L19 7",
  cadeado: "M6 11h12v9H6z M8 11V8a4 4 0 018 0v3",
  som: "M4 9v6h4l5 4V5L8 9z M16 9a4 4 0 010 6",
  mudo: "M4 9v6h4l5 4V5L8 9z M17 9l4 6 M21 9l-4 6",
};

export function Icone({ nome, className = "size-5", titulo }: { nome: string; className?: string; titulo?: string }) {
  const d = TRACOS[nome] ?? TRACOS.rosa;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} role={titulo ? "img" : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <path d={d} />
    </svg>
  );
}

/** Rosa dos ventos, só decoração. */
export function RosaDosVentos({ className = "size-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="38" />
      <circle cx="50" cy="50" r="30" strokeDasharray="2 4" />
      <path d="M50 6l8 36 36 8-36 8-8 36-8-36-36-8 36-8z" />
      <path d="M50 20l4 26 26 4-26 4-4 26-4-26-26-4 26-4z" strokeOpacity="0.5" />
    </svg>
  );
}
