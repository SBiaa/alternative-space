// Tipos e textos fixos do Skate Universe. Não importa nada de servidor: serve pra páginas e componentes.

export const NIVEIS = ["basico", "intermediario", "avancado"] as const;
export type Nivel = (typeof NIVEIS)[number];

export const NOME_NIVEL: Record<Nivel, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export type Manobra = {
  nome: string;
  slug: string;
  nivel: Nivel;
  ordem: number;
  resumo: string;
  obstaculo: string;
  prerequisitos: string[];
  video?: string;
};

export type Materia = {
  titulo: string;
  slug: string;
  cidade: string;
  nomeCidade: string;
  epoca: string;
  ano: number;
  autor: string;
  resumo: string;
  capa?: string;
  rascunho?: boolean;
};

export const TIPOS_SPOT = ["pico", "pista", "shop"] as const;
export type TipoSpot = (typeof TIPOS_SPOT)[number];

export const NOME_TIPO: Record<TipoSpot, string> = {
  pico: "Pico de rua",
  pista: "Pista",
  shop: "Skate shop",
};

export const OBSTACULOS = ["borda", "corrimão", "escada", "gap", "banco", "rampa", "bowl", "manual pad", "chão liso", "transição"] as const;

export type StatusSpot = "pendente" | "aprovado" | "recusado";

// Ponto no mapa: vem do banco (comunidade) ou do OpenStreetMap.
export type Pino = {
  id: string;
  origem: "comunidade" | "osm";
  tipo: TipoSpot;
  nome: string;
  lat: number;
  lng: number;
  descricao?: string;
  obstaculos?: string[];
  descobertoPor?: string;
};

export type Spot = {
  id: string;
  tipo: TipoSpot;
  nome: string;
  descricao: string;
  lat: number;
  lng: number;
  cidade: string;
  obstaculos: string[];
  descobertoPor: string;
  nomeDescobridor: string;
  status: StatusSpot;
  createdAt: string;
};

// Link pro app de mapas do celular traçar a rota (a voz tipo GPS fica pra próxima versão).
export const linkComoChegar = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
