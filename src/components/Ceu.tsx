// Estrelas e o brilho laranja no topo de todas as páginas. Só decoração.
export function Ceu() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[900px] w-full"
    >
      <g fill="#ece3be">
        <circle cx="80" cy="140" r="1.4" opacity="0.8" />
        <circle cx="300" cy="60" r="1" opacity="0.6" />
        <circle cx="520" cy="200" r="1.2" opacity="0.5" />
        <circle cx="760" cy="90" r="1" opacity="0.7" />
        <circle cx="1000" cy="40" r="1.4" opacity="0.6" />
        <circle cx="1360" cy="120" r="1.2" opacity="0.8" />
        <circle cx="1240" cy="520" r="1" opacity="0.5" />
        <circle cx="60" cy="620" r="1.2" opacity="0.5" />
        <circle cx="680" cy="760" r="1" opacity="0.5" />
      </g>
      <circle cx="1200" cy="420" r="420" fill="#dd5d05" opacity="0.08" />
    </svg>
  );
}
