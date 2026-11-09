// Como cada classe melhora do nível 1 ao 20 (Player Core, Remaster).
// Cada entrada diz: a partir do nível N, tal coisa fica em tal proficiência.
// Onde a classe deixa o jogador escolher (ex.: qual salvamento o monge melhora primeiro), usamos a escolha mais comum.

import type { ClasseId, Prof, Tradicao } from "./tipos";

export type Alvo =
  | "percepcao" | "fortitude" | "reflexos" | "vontade"
  | "cd" | "magia"
  | "simples" | "marcial" | "avancada" | "desarmado"
  | "semArmadura" | "leve" | "media" | "pesada";

export type Passo = [nivel: number, alvo: Alvo, prof: Prof];

const T = "treinado", E = "especialista", M = "mestre", L = "lendario";

// Nível 1 já vem em pathfinder.ts (percepção e salvamentos). Aqui ficam armas, armaduras, CD e o que muda depois.
export const PROGRESSAO: Record<ClasseId, Passo[]> = {
  barbaro: [
    [1, "cd", T], [1, "simples", T], [1, "marcial", T], [1, "desarmado", T], [1, "semArmadura", T], [1, "leve", T], [1, "media", T],
    [5, "simples", E], [5, "marcial", E], [5, "desarmado", E],
    [7, "fortitude", M], [9, "reflexos", E], [11, "cd", E],
    [13, "fortitude", L], [13, "simples", M], [13, "marcial", M], [13, "desarmado", M], [13, "semArmadura", E], [13, "leve", E], [13, "media", E],
    [15, "vontade", M], [17, "percepcao", M], [19, "cd", M], [19, "semArmadura", M], [19, "leve", M], [19, "media", M],
  ],
  bardo: [
    [1, "cd", T], [1, "magia", T], [1, "simples", T], [1, "desarmado", T], [1, "semArmadura", T], [1, "leve", T],
    [3, "fortitude", E], [7, "magia", E], [9, "reflexos", E], [11, "percepcao", M],
    [11, "simples", E], [11, "desarmado", E], [13, "semArmadura", E], [13, "leve", E],
    [15, "magia", M], [17, "vontade", M], [19, "magia", L],
  ],
  campeao: [
    [1, "cd", T], [1, "simples", T], [1, "marcial", T], [1, "desarmado", T],
    [1, "semArmadura", T], [1, "leve", T], [1, "media", T], [1, "pesada", T],
    [5, "simples", E], [5, "marcial", E], [5, "desarmado", E],
    [7, "semArmadura", E], [7, "leve", E], [7, "media", E], [7, "pesada", E],
    [9, "fortitude", M], [9, "cd", E], [9, "reflexos", E], [11, "percepcao", E], [11, "vontade", M],
    [13, "simples", M], [13, "marcial", M], [13, "desarmado", M],
    [13, "semArmadura", M], [13, "leve", M], [13, "media", M], [13, "pesada", M],
    [17, "cd", M], [17, "semArmadura", L], [17, "leve", L], [17, "media", L], [17, "pesada", L],
  ],
  clerigo: [
    [1, "cd", T], [1, "magia", T], [1, "simples", T], [1, "desarmado", T], [1, "semArmadura", T],
    [3, "fortitude", E], [5, "percepcao", E], [7, "magia", E], [9, "vontade", M],
    [11, "reflexos", E], [11, "simples", E], [11, "desarmado", E], [13, "semArmadura", E],
    [15, "magia", M], [19, "magia", L],
  ],
  druida: [
    [1, "cd", T], [1, "magia", T], [1, "simples", T], [1, "desarmado", T], [1, "semArmadura", T], [1, "leve", T], [1, "media", T],
    [3, "fortitude", E], [3, "percepcao", E], [5, "reflexos", E], [7, "magia", E],
    [11, "vontade", M], [11, "simples", E], [11, "desarmado", E],
    [13, "semArmadura", E], [13, "leve", E], [13, "media", E], [15, "magia", M], [19, "magia", L],
  ],
  guerreiro: [
    [1, "cd", T], [1, "simples", E], [1, "marcial", E], [1, "desarmado", E], [1, "avancada", T],
    [1, "semArmadura", T], [1, "leve", T], [1, "media", T], [1, "pesada", T],
    [3, "vontade", E], [5, "simples", M], [5, "marcial", M], [5, "desarmado", M], [5, "avancada", E],
    [7, "percepcao", M], [9, "fortitude", M], [11, "cd", E],
    [11, "semArmadura", E], [11, "leve", E], [11, "media", E], [11, "pesada", E],
    [13, "simples", L], [13, "marcial", L], [13, "desarmado", L], [13, "avancada", M],
    [15, "reflexos", M], [17, "semArmadura", M], [17, "leve", M], [17, "media", M], [17, "pesada", M],
    [19, "cd", M], [19, "avancada", L],
  ],
  ladino: [
    [1, "cd", T], [1, "simples", T], [1, "marcial", T], [1, "desarmado", T], [1, "semArmadura", T], [1, "leve", T],
    [5, "simples", E], [5, "marcial", E], [5, "desarmado", E],
    [7, "percepcao", M], [7, "reflexos", M], [9, "fortitude", E], [11, "cd", E],
    [13, "percepcao", L], [13, "reflexos", L], [13, "simples", M], [13, "marcial", M], [13, "desarmado", M],
    [13, "semArmadura", E], [13, "leve", E], [17, "vontade", M], [19, "cd", M],
  ],
  mago: [
    [1, "cd", T], [1, "magia", T], [1, "simples", T], [1, "desarmado", T], [1, "semArmadura", T],
    [5, "reflexos", E], [7, "magia", E], [9, "fortitude", E], [11, "percepcao", E],
    [11, "simples", E], [11, "desarmado", E], [13, "semArmadura", E],
    [15, "magia", M], [17, "vontade", M], [19, "magia", L],
  ],
  monge: [
    [1, "cd", T], [1, "simples", T], [1, "desarmado", T], [1, "semArmadura", E],
    [5, "percepcao", E], [5, "simples", E], [5, "desarmado", E],
    [7, "fortitude", M], [9, "cd", E], [11, "reflexos", M],
    [13, "simples", M], [13, "desarmado", M], [13, "semArmadura", M],
    [15, "vontade", M], [15, "fortitude", L], [15, "percepcao", M],
    [17, "cd", M], [17, "simples", L], [17, "desarmado", L], [17, "semArmadura", L],
  ],
  patrulheiro: [
    [1, "cd", T], [1, "simples", T], [1, "marcial", T], [1, "desarmado", T], [1, "semArmadura", T], [1, "leve", T], [1, "media", T],
    [3, "vontade", E], [5, "simples", E], [5, "marcial", E], [5, "desarmado", E],
    [7, "percepcao", M], [7, "reflexos", M], [9, "cd", E], [11, "fortitude", M],
    [11, "semArmadura", E], [11, "leve", E], [11, "media", E],
    [13, "simples", M], [13, "marcial", M], [13, "desarmado", M],
    [15, "percepcao", L], [15, "reflexos", L], [17, "cd", M],
    [19, "semArmadura", M], [19, "leve", M], [19, "media", M],
  ],
  feiticeiro: [
    [1, "cd", T], [1, "magia", T], [1, "simples", T], [1, "desarmado", T], [1, "semArmadura", T],
    [5, "reflexos", E], [7, "magia", E], [9, "fortitude", E], [11, "percepcao", E],
    [11, "simples", E], [11, "desarmado", E], [13, "semArmadura", E],
    [15, "magia", M], [17, "vontade", M], [19, "magia", L],
  ],
};

// Conjuradores: tradição e se a magia é preparada (escolhe todo dia) ou espontânea (repertório fixo).
// Feiticeiro: a tradição vem da linhagem; o jogador escolhe na ficha.
export const CONJURADORES: Partial<Record<ClasseId, { tradicao: Tradicao | null; tipo: "preparada" | "espontanea" }>> = {
  bardo: { tradicao: "ocultista", tipo: "espontanea" },
  clerigo: { tradicao: "divina", tipo: "preparada" },
  druida: { tradicao: "primal", tipo: "preparada" },
  mago: { tradicao: "arcana", tipo: "preparada" },
  feiticeiro: { tradicao: null, tipo: "espontanea" },
};

// Espaços de magia por posto num nível de personagem. Posto r abre no nível 2r-1 com 2 espaços e ganha o 3º no nível 2r.
// Espontâneos ganham +1 em cada posto. O 10º posto (nível 19) tem 1 espaço só.
export function espacosDeMagia(nivel: number, tipo: "preparada" | "espontanea"): number[] {
  const out: number[] = [];
  for (let r = 1; r <= 9; r++) {
    if (nivel < 2 * r - 1) out.push(0);
    else out.push((nivel >= 2 * r ? 3 : 2) + (tipo === "espontanea" ? 1 : 0));
  }
  out.push(nivel >= 19 ? 1 : 0);
  return out;
}

export const TRUQUES = 5;

// Em que níveis cada coisa aparece.
export const NIVEIS_BOOST = [5, 10, 15, 20];
export const NIVEIS_TALENTO = {
  ancestralidade: [1, 5, 9, 13, 17],
  classe: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  pericia: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  geral: [3, 7, 11, 15, 19],
} as const;
export type TipoEspaco = keyof typeof NIVEIS_TALENTO;

// Ladino ganha talento de perícia e aumento de perícia em todo nível.
export function niveisTalento(tipo: TipoEspaco, classe: string): readonly number[] {
  if (tipo === "pericia" && classe === "ladino") return Array.from({ length: 20 }, (_, i) => i + 1);
  return NIVEIS_TALENTO[tipo];
}
export function niveisAumentoPericia(classe: string): number[] {
  if (classe === "ladino") return Array.from({ length: 19 }, (_, i) => i + 2);
  return [3, 5, 7, 9, 11, 13, 15, 17, 19];
}

// Nível mínimo pra subir uma perícia até cada proficiência.
export const NIVEL_MINIMO: Record<Prof, number> = { destreinado: 1, treinado: 1, especialista: 1, mestre: 7, lendario: 15 };
