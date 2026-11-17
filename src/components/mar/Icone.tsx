// Ícones de traço do Mar Sem Fim (mar, ofício, evento, estado). Sempre vêm com texto ao lado: nunca só ícone, nunca só cor.

const CAMINHOS: Record<string, string> = {
  floco: "M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9 4.5l3 2.5 3-2.5M9 19.5l3-2.5 3 2.5",
  coral: "M12 21v-7M12 14c-3 0-5-2-5-5M12 14c3 0 5-2 5-6M7 9c-2 0-3-1-3-3M17 8c2 0 3-1 3-3M9 21h6",
  farol: "M10 21l1-12h2l1 12M9 9h6l-1-4h-4zM12 5V2M5 6l3 1.5M19 6l-3 1.5M7 21h10",
  vento: "M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7",
  bussola: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z",
  panela: "M5 10h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM3 10h18M9 6c0-2 2-2 2-4M14 6c0-2 2-2 2-4",
  cruz: "M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z",
  martelo: "M4 20l9-9M12 5l3-2 6 6-2 3-3-1-3 3-4-4 3-3z",
  nota: "M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z",
  alvo: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h.01",
  raio: "M13 2L5 14h6l-1 8 8-12h-6z",
  barco: "M3 15h18l-3 5H6zM12 15V3l6 9h-6zM10 6L5 15",
  olho: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  boia: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5.6 5.6l3.2 3.2M18.4 5.6l-3.2 3.2M5.6 18.4l3.2-3.2M18.4 18.4l-3.2-3.2",
  cadeado: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  ilha: "M3 19h18M7 19c0-4 2-7 5-7s5 3 5 7M12 12V6M12 6c-2 0-4 1-5 3M12 6c2 0 4 1 5 3",
  estrela: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  moeda: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4",
  cartaz: "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5",
  mapa: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  globo: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  check: "M5 12l4 4 10-10",
  seta: "M5 12h14M13 6l6 6-6 6",
};

export function Icone({ nome, tamanho = 18, className }: { nome: string; tamanho?: number; className?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={CAMINHOS[nome] ?? CAMINHOS.bussola} />
    </svg>
  );
}
