// Formato dos dados do Pathfinder 2e (Remaster). Os dados ficam em ./dados/*.ts.
// Textos são resumos em português escritos por nós (não copiar o texto dos livros).
import type { Atributo, Pericia } from "@/lib/pathfinder";

export type Acoes = "1" | "2" | "3" | "reacao" | "livre" | "1a3" | null;

// IDs de referência (os mesmos de src/lib/pathfinder.ts).
export type AncestralidadeId = "humano" | "anao" | "elfo" | "gnomo" | "goblin" | "halfling" | "leshy";
export type ClasseId =
  | "barbaro" | "bardo" | "campeao" | "clerigo" | "druida" | "guerreiro"
  | "ladino" | "mago" | "monge" | "patrulheiro" | "feiticeiro";

export type Prof = "destreinado" | "treinado" | "especialista" | "mestre" | "lendario";

export type Talento = {
  id: string; // kebab-case, único no arquivo todo
  nome: string; // nome em português (pode manter o original entre parênteses se não houver tradução boa)
  nivel: number; // 1..20
  tipo: "ancestralidade" | "classe" | "pericia" | "geral";
  ancestralidade?: AncestralidadeId; // obrigatório se tipo === "ancestralidade"
  classes?: ClasseId[]; // obrigatório se tipo === "classe"
  // Talento de perícia: perícia e proficiência mínima exigidas (ex.: atletismo, "especialista").
  pericia?: { id: Pericia; prof: Prof };
  // Outros pré-requisitos em texto livre (ex.: "Ataque Poderoso"). Os ids exigidos vão em `requer`.
  preRequisitos?: string;
  requer?: string[]; // ids de outros talentos que precisam ter sido escolhidos antes
  acoes?: Acoes;
  tracos?: string[];
  texto: string; // 1 a 3 frases, em português, palavras nossas
};

export type Arma = {
  id: string;
  nome: string;
  categoria: "simples" | "marcial" | "avancada" | "desarmado";
  tipo: "corpo-a-corpo" | "distancia";
  dano: string; // "1d8"
  tipoDano: "C" | "P" | "E"; // contundente, perfurante, cortante
  maos: "1" | "1+" | "2";
  grupo: string; // "espada", "arco", ...
  alcance?: number; // em pés, armas de distância/arremesso
  recarga?: number;
  tracos: string[]; // "ágil", "acuidade", "letal d8", ...
  preco: string; // "1 po", "5 pp"
  volume: string; // "L", "1", "2", "—"
};

export type Armadura = {
  id: string;
  nome: string;
  categoria: "sem" | "leve" | "media" | "pesada";
  bonusCA: number;
  tetoDes: number | null; // null = sem teto
  penalidade: number; // penalidade de verificação (0, -1, ...)
  penDeslocamento: number; // 0, -5, -10
  forca: number | null; // modificador de Força pra ignorar penalidades
  tracos: string[];
  preco: string;
  volume: string;
};

export type Escudo = { id: string; nome: string; bonusCA: number; dureza: number; pv: number; preco: string; volume: string };

export type Item = { id: string; nome: string; preco: string; volume: string; texto: string };

export type Tradicao = "arcana" | "divina" | "ocultista" | "primal";

export type Magia = {
  id: string;
  nome: string;
  nivel: number; // posto (rank): 0 = truque, 1..10
  tradicoes: Tradicao[];
  acoes: Acoes;
  alcance?: string; // "30 pés", "toque"
  alvo?: string; // ou área: "explosão de 10 pés"
  defesa?: "CA" | "Fortitude" | "Reflexos" | "Vontade" | null;
  duracao?: string;
  tracos?: string[];
  texto: string; // 1 a 3 frases, palavras nossas
  ampliado?: string; // resumo do efeito ampliado (heightened), se houver
};

export type { Atributo, Pericia };
