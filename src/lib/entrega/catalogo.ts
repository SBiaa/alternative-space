// Catálogo inicial dos implantes. Vai pro banco pelo seed (npm run seed:entrega); o jogo lê do banco.
import type { Efeito } from "./regras";

export type ImplanteSeed = { slug: string; name: string; description: string; prices: number[]; effects: Efeito[] };

export const CATALOGO: ImplanteSeed[] = [
  {
    slug: "pneus-de-garra",
    name: "Pneus de garra",
    description: "Mais aderência na chuva e nas poças. A moto escorrega menos nas curvas.",
    prices: [120, 280, 520],
    effects: [{ aderencia: 0.2 }, { aderencia: 0.4 }, { aderencia: 0.65 }],
  },
  {
    slug: "motor-overclock",
    name: "Motor overclock",
    description: "Velocidade máxima maior.",
    prices: [150, 320, 600],
    effects: [{ velMax: 0.08 }, { velMax: 0.15 }, { velMax: 0.22 }],
  },
  {
    slug: "reflexo-sintetico",
    name: "Reflexo sintético",
    description: "A câmera abre um pouco mais e os perigos aparecem antes.",
    prices: [100, 240, 450],
    effects: [{ visao: 0.1 }, { visao: 0.2 }, { visao: 0.3 }],
  },
  {
    slug: "amortecedor-de-carga",
    name: "Amortecedor de carga",
    description: "O pacote perde menos estado em cada batida.",
    prices: [110, 260, 480],
    effects: [{ amortecedor: 0.15 }, { amortecedor: 0.3 }, { amortecedor: 0.45 }],
  },
  {
    slug: "gps-ocular",
    name: "GPS ocular",
    description: "Além da seta, desenha no chão o caminho mais curto até o destino.",
    prices: [180],
    effects: [{ gps: 1 }],
  },
  {
    slug: "nitro",
    name: "Nitro",
    description: "Libera o boost no espaço (ou no botão). Nos níveis seguintes, mais cargas por turno.",
    prices: [200, 350, 550],
    effects: [{ nitroCargas: 2 }, { nitroCargas: 4 }, { nitroCargas: 6 }],
  },
];
