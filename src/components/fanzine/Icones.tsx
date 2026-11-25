// Ícones inline (sem biblioteca). Todos decorativos: o significado vem sempre do texto ao lado.
const base = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

export const IconeCheck = () => (
  <svg {...base}>
    <path d="M4 12.5 9.5 18 20 6" />
  </svg>
);
export const IconeX = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconeLupa = () => (
  <svg {...base}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15 15 6 6" />
  </svg>
);
export const IconeLigar = () => (
  <svg {...base}>
    <path d="M9.5 14.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14.5 9.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
export const IconeSeta = ({ esquerda = false }: { esquerda?: boolean }) => (
  <svg {...base}>
    <path d={esquerda ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);
