// Catálogo de equipamento do Player Core (Remaster): armas, armaduras, escudos e itens comuns.
// Volume em décimos: 1 = L (leve), 10 = 1 de Volume. Preço em peças de cobre (1 po = 100 pc).
// Força da armadura é o modificador mínimo pra ignorar a penalidade.

export type CatArma = "simples" | "marciais" | "avancadas";
export type CatArmadura = "leve" | "media" | "pesada";
type Prof = "destreinado" | "treinado" | "especialista" | "mestre" | "lendario";

export type Arma = {
  id: string;
  nome: string;
  cat: CatArma;
  distancia: boolean;
  dado: number;
  dano: "C" | "P" | "E";
  maos: 1 | 2;
  volume: number;
  preco: number;
  alcance?: number;
  tracos: string[];
};

const a = (id: string, nome: string, cat: CatArma, dado: number, dano: Arma["dano"], volume: number, preco: number, tracos: string[] = [], extra: Partial<Arma> = {}): Arma => ({
  id, nome, cat, distancia: false, dado, dano, maos: 1, volume, preco, tracos, ...extra,
});
const L = 1;

export const ARMAS: Arma[] = [
  a("punho", "Punho", "simples", 4, "E", 0, 0, ["ágil", "acuidade", "não letal", "desarmado"]),
  a("adaga", "Adaga", "simples", 4, "P", L, 20, ["ágil", "acuidade", "arremesso 10", "versátil C"]),
  a("bordao", "Bordão", "simples", 4, "E", 10, 0, ["duas mãos d8"]),
  a("clava", "Clava", "simples", 6, "E", 10, 0, ["arremesso 10"]),
  a("foice", "Foice", "simples", 4, "C", L, 20, ["ágil", "acuidade", "derrubar"]),
  a("lanca", "Lança", "simples", 6, "P", 10, 10, ["arremesso 20"]),
  a("lanca-longa", "Lança longa", "simples", 8, "P", 20, 50, ["alcance"], { maos: 2 }),
  a("maca", "Maça", "simples", 6, "E", 10, 100, ["empurrar"]),
  a("maca-estrela", "Maça-estrela", "simples", 6, "E", 10, 100, ["versátil P"]),
  a("besta", "Besta", "simples", 8, "P", 10, 300, ["recarga 1"], { distancia: true, alcance: 120, maos: 2 }),
  a("besta-mao", "Besta de mão", "simples", 6, "P", L, 300, ["recarga 1"], { distancia: true, alcance: 60 }),
  a("dardo", "Dardo", "simples", 4, "P", L, 1, ["ágil", "arremesso"], { distancia: true, alcance: 20 }),
  a("funda", "Funda", "simples", 6, "E", L, 0, ["propulsiva", "recarga 1"], { distancia: true, alcance: 50 }),
  a("alabarda", "Alabarda", "marciais", 10, "P", 20, 200, ["alcance", "versátil C"], { maos: 2 }),
  a("chicote", "Chicote", "marciais", 4, "C", 10, 10, ["acuidade", "alcance", "desarmar", "não letal", "derrubar"]),
  a("cimitarra", "Cimitarra", "marciais", 6, "C", 10, 100, ["enérgica", "varrer"]),
  a("espada-curta", "Espada curta", "marciais", 6, "P", L, 90, ["ágil", "acuidade", "versátil C"]),
  a("espada-grande", "Espada grande", "marciais", 12, "C", 20, 100, ["versátil P"], { maos: 2 }),
  a("espada-longa", "Espada longa", "marciais", 8, "C", 10, 100, ["versátil P"]),
  a("glaive", "Glaive", "marciais", 8, "C", 20, 100, ["mortal d8", "enérgica", "alcance"], { maos: 2 }),
  a("machadinha", "Machadinha", "marciais", 6, "C", L, 40, ["ágil", "varrer", "arremesso 10"]),
  a("machado-batalha", "Machado de batalha", "marciais", 8, "C", 10, 100, ["varrer"]),
  a("machado-grande", "Machado grande", "marciais", 12, "C", 20, 200, ["varrer"], { maos: 2 }),
  a("malho", "Malho", "marciais", 12, "E", 20, 300, ["empurrar"], { maos: 2 }),
  a("mangual", "Mangual", "marciais", 6, "E", 10, 80, ["desarmar", "varrer", "derrubar"]),
  a("martelo-guerra", "Martelo de guerra", "marciais", 8, "E", 10, 100, ["empurrar"]),
  a("picareta", "Picareta", "marciais", 6, "P", 10, 70, ["fatal d10"]),
  a("rapieira", "Rapieira", "marciais", 6, "P", 10, 200, ["mortal d8", "desarmar", "acuidade"]),
  a("tridente", "Tridente", "marciais", 8, "P", 10, 100, ["arremesso 20"]),
  a("arco-curto", "Arco curto", "marciais", 6, "P", 10, 300, ["mortal d10"], { distancia: true, alcance: 60, maos: 2 }),
  a("arco-curto-composto", "Arco curto composto", "marciais", 6, "P", 10, 1400, ["mortal d10", "propulsiva"], { distancia: true, alcance: 60, maos: 2 }),
  a("arco-longo", "Arco longo", "marciais", 8, "P", 20, 600, ["mortal d10", "rajada 30"], { distancia: true, alcance: 100, maos: 2 }),
  a("arco-longo-composto", "Arco longo composto", "marciais", 8, "P", 20, 2000, ["mortal d10", "propulsiva", "rajada 30"], { distancia: true, alcance: 100, maos: 2 }),
  a("espada-bastarda", "Espada bastarda", "avancadas", 8, "C", 10, 400, ["duas mãos d12"]),
];

export type Armadura = { id: string; nome: string; cat: CatArmadura; ca: number; desMax: number; penalidade: number; velocidade: number; forca: number; volume: number; preco: number };
const ar = (id: string, nome: string, cat: CatArmadura, ca: number, desMax: number, penalidade: number, velocidade: number, forca: number, volume: number, preco: number): Armadura => ({
  id, nome, cat, ca, desMax, penalidade, velocidade, forca, volume, preco,
});

export const ARMADURAS: Armadura[] = [
  ar("acolchoada", "Armadura acolchoada", "leve", 1, 3, 0, 0, 0, L, 20),
  ar("couro", "Armadura de couro", "leve", 1, 4, -1, 0, 1, 10, 200),
  ar("couro-batido", "Couro batido", "leve", 2, 3, -1, 0, 1, 10, 300),
  ar("camisao-malha", "Camisão de cota de malha", "leve", 2, 3, -1, 0, 1, 10, 500),
  ar("gibao-peles", "Gibão de peles", "media", 3, 2, -2, -5, 2, 20, 200),
  ar("escamas", "Armadura de escamas", "media", 3, 2, -2, -5, 2, 20, 400),
  ar("cota-malha", "Cota de malha", "media", 4, 1, -2, -5, 3, 20, 600),
  ar("couraca", "Couraça", "media", 4, 1, -2, -5, 3, 20, 800),
  ar("talas", "Cota de talas", "pesada", 5, 1, -3, -10, 3, 30, 1300),
  ar("meia-armadura", "Meia-armadura", "pesada", 5, 1, -3, -10, 3, 30, 1800),
  ar("armadura-completa", "Armadura completa", "pesada", 6, 0, -3, -10, 4, 40, 3000),
];

export type Escudo = { id: string; nome: string; ca: number; dureza: number; pv: number; volume: number; preco: number };
export const ESCUDOS: Escudo[] = [
  { id: "broquel", nome: "Broquel", ca: 1, dureza: 3, pv: 6, volume: L, preco: 100 },
  { id: "madeira", nome: "Escudo de madeira", ca: 2, dureza: 3, pv: 12, volume: 10, preco: 100 },
  { id: "aco", nome: "Escudo de aço", ca: 2, dureza: 5, pv: 20, volume: 10, preco: 200 },
  { id: "torre", nome: "Escudo de torre", ca: 2, dureza: 5, pv: 20, volume: 40, preco: 1000 },
];

// Itens comuns pra sugerir na lista. [nome, volume em décimos, preço em pc]
export const ITENS_COMUNS: [string, number, number][] = [
  ["Kit de aventureiro", 10, 70], ["Mochila", L, 10], ["Saco de dormir", L, 1], ["Corda (15 m)", L, 5], ["Tocha", L, 1],
  ["Rações (1 semana)", L, 40], ["Odre", L, 1], ["Pederneira", 0, 1], ["Kit de cura", 10, 500], ["Ferramentas de ladrão", L, 300],
  ["Kit de alquimista", 20, 500], ["Livro de magias", L, 100], ["Símbolo religioso", L, 10], ["Bolsa de componentes", L, 500],
  ["Instrumento musical", 10, 200], ["Flechas (10)", L, 1], ["Virotes (10)", L, 1], ["Poção de cura menor", L, 400],
];

// Combate por classe: armas no nível 1, se é treinada em marciais, armaduras treinadas,
// marcos de proficiência em armas e o nível em que ganha especialização em armas.
type Combate = { armas: [number, Prof][]; marciais: boolean; armaduras: CatArmadura[]; especializacao: number };
const MARCIAL = (armaduras: CatArmadura[]): Combate => ({ armas: [[1, "treinado"], [5, "especialista"], [13, "mestre"]], marciais: true, armaduras, especializacao: 7 });
const CONJ = (armaduras: CatArmadura[] = []): Combate => ({ armas: [[1, "treinado"], [11, "especialista"]], marciais: false, armaduras, especializacao: 13 });

export const COMBATE_CLASSE: Record<string, Combate> = {
  alquimista: { armas: [[1, "treinado"], [7, "especialista"], [15, "mestre"]], marciais: false, armaduras: ["leve", "media"], especializacao: 7 },
  barbaro: MARCIAL(["leve", "media"]),
  bardo: CONJ(["leve"]),
  campeao: MARCIAL(["leve", "media", "pesada"]),
  clerigo: CONJ(),
  druida: CONJ(["leve", "media"]),
  espadachim: MARCIAL(["leve"]),
  feiticeiro: CONJ(),
  guerreiro: { armas: [[1, "especialista"], [5, "mestre"], [13, "lendario"]], marciais: true, armaduras: ["leve", "media", "pesada"], especializacao: 7 },
  investigador: MARCIAL(["leve"]),
  ladino: MARCIAL(["leve"]),
  mago: CONJ(),
  monge: { armas: [[1, "treinado"], [5, "especialista"], [13, "mestre"]], marciais: false, armaduras: [], especializacao: 7 },
  oraculo: CONJ(["leve"]),
  patrulheiro: MARCIAL(["leve", "media"]),
  bruxo: CONJ(),
};

export const acharArma = (id: string) => ARMAS.find((x) => x.id === id);
export const acharArmadura = (id: string) => ARMADURAS.find((x) => x.id === id);
export const acharEscudo = (id: string) => ESCUDOS.find((x) => x.id === id);

export const NOME_DANO: Record<Arma["dano"], string> = { C: "cortante", P: "perfurante", E: "concussão" };
export const NOME_CAT_ARMA: Record<CatArma, string> = { simples: "Simples", marciais: "Marciais", avancadas: "Avançadas" };
export const NOME_CAT_ARMADURA: Record<CatArmadura, string> = { leve: "Leve", media: "Média", pesada: "Pesada" };

// "1 po 5 pp" a partir de peças de cobre.
export function formatarPreco(pc: number): string {
  if (!pc) return "—";
  const po = Math.floor(pc / 100);
  const pp = Math.floor((pc % 100) / 10);
  const c = pc % 10;
  return [po && `${po} po`, pp && `${pp} pp`, c && `${c} pc`].filter(Boolean).join(" ");
}

// Volume em décimos → "2", "L", "1; 3 L".
export function formatarVolume(d: number): string {
  const inteiro = Math.floor(d / 10);
  const l = d % 10;
  if (!inteiro && !l) return "—";
  if (!l) return `${inteiro}`;
  return inteiro ? `${inteiro}; ${l} L` : `${l} L`;
}
