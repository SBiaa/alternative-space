// Regras de criação de personagem do Pathfinder 2ª edição (Remaster, Player Core), do nível 1 ao 20.
// Atributos são modificadores (começam em 0). Cada boost dá +1 e cada falha tira 1.
// Dentro de um mesmo grupo de boosts (ancestralidade, antecedente, livres) não dá pra repetir atributo.
// Boost num atributo que já está em +4 ou mais é parcial: precisa de dois pra subir 1.
// Talentos, equipamento e magias ficam em src/lib/fichas/pf2e (dados e cálculos que dependem deles).

import {
  NIVEIS_BOOST,
  NIVEL_MINIMO,
  PROGRESSAO,
  niveisAumentoPericia,
  type Alvo,
} from "@/lib/fichas/pf2e/progressao";
import type { ClasseId, Tradicao } from "@/lib/fichas/pf2e/tipos";

export const ATRIBUTOS = ["for", "des", "con", "int", "sab", "car"] as const;
export type Atributo = (typeof ATRIBUTOS)[number];

export const NOME_ATRIBUTO: Record<Atributo, string> = {
  for: "Força",
  des: "Destreza",
  con: "Constituição",
  int: "Inteligência",
  sab: "Sabedoria",
  car: "Carisma",
};

export const PROFS = ["destreinado", "treinado", "especialista", "mestre", "lendario"] as const;
export type Prof = (typeof PROFS)[number];
const BONUS_PROF: Record<Prof, number> = { destreinado: 0, treinado: 2, especialista: 4, mestre: 6, lendario: 8 };
export const NOME_PROF: Record<Prof, string> = { destreinado: "D", treinado: "T", especialista: "E", mestre: "M", lendario: "L" };
export const NOME_PROF_LONGO: Record<Prof, string> = { destreinado: "Destreinado", treinado: "Treinado", especialista: "Especialista", mestre: "Mestre", lendario: "Lendário" };
const proxima = (p: Prof): Prof => PROFS[Math.min(PROFS.indexOf(p) + 1, PROFS.length - 1)];
const maior = (a: Prof, b: Prof): Prof => (PROFS.indexOf(a) >= PROFS.indexOf(b) ? a : b);

export const PERICIAS = [
  { id: "acrobatismo", nome: "Acrobatismo", attr: "des" },
  { id: "arcanismo", nome: "Arcanismo", attr: "int" },
  { id: "atletismo", nome: "Atletismo", attr: "for" },
  { id: "diplomacia", nome: "Diplomacia", attr: "car" },
  { id: "dissimulacao", nome: "Dissimulação", attr: "car" },
  { id: "furtividade", nome: "Furtividade", attr: "des" },
  { id: "intimidacao", nome: "Intimidação", attr: "car" },
  { id: "ladroagem", nome: "Ladroagem", attr: "des" },
  { id: "medicina", nome: "Medicina", attr: "sab" },
  { id: "natureza", nome: "Natureza", attr: "sab" },
  { id: "ocultismo", nome: "Ocultismo", attr: "int" },
  { id: "performance", nome: "Performance", attr: "car" },
  { id: "religiao", nome: "Religião", attr: "sab" },
  { id: "sobrevivencia", nome: "Sobrevivência", attr: "sab" },
  { id: "sociedade", nome: "Sociedade", attr: "int" },
  { id: "manufatura", nome: "Manufatura", attr: "int" },
] as const satisfies readonly { id: string; nome: string; attr: Atributo }[];
export type Pericia = (typeof PERICIAS)[number]["id"];

export type Ancestralidade = {
  id: string;
  nome: string;
  texto: string;
  pv: number;
  tamanho: "Pequeno" | "Médio";
  deslocamento: number;
  boosts: Atributo[];
  livres: number;
  falha?: Atributo;
};

export const ANCESTRALIDADES: Ancestralidade[] = [
  { id: "humano", nome: "Humano", texto: "Versáteis e ambiciosos, cabem em qualquer papel.", pv: 8, tamanho: "Médio", deslocamento: 25, boosts: [], livres: 2 },
  { id: "anao", nome: "Anão", texto: "Teimosos, resistentes e mestres da pedra e do metal.", pv: 10, tamanho: "Médio", deslocamento: 20, boosts: ["con", "sab"], livres: 1, falha: "car" },
  { id: "elfo", nome: "Elfo", texto: "Longevos, ágeis e ligados à magia antiga.", pv: 6, tamanho: "Médio", deslocamento: 30, boosts: ["des", "int"], livres: 1, falha: "con" },
  { id: "gnomo", nome: "Gnomo", texto: "Curiosos, vindos do Primeiro Mundo, sempre atrás de novidade.", pv: 8, tamanho: "Pequeno", deslocamento: 25, boosts: ["con", "car"], livres: 1, falha: "for" },
  { id: "goblin", nome: "Goblin", texto: "Caóticos, criativos e muito mais espertos do que parecem.", pv: 6, tamanho: "Pequeno", deslocamento: 25, boosts: ["des", "car"], livres: 1, falha: "sab" },
  { id: "halfling", nome: "Halfling", texto: "Sortudos, discretos e bons de estrada.", pv: 6, tamanho: "Pequeno", deslocamento: 25, boosts: ["des", "sab"], livres: 1, falha: "for" },
  { id: "leshy", nome: "Leshy", texto: "Espíritos da natureza num corpo de planta.", pv: 8, tamanho: "Pequeno", deslocamento: 25, boosts: ["con", "sab"], livres: 1, falha: "int" },
];

export type Antecedente = { id: string; nome: string; texto: string; opcoes: [Atributo, Atributo]; pericia: Pericia; saber: string };

export const ANTECEDENTES: Antecedente[] = [
  { id: "acolito", nome: "Acólito", texto: "Cresceu num templo, entre ritos e livros sagrados.", opcoes: ["int", "sab"], pericia: "religiao", saber: "Saber (Escrita)" },
  { id: "acrobata", nome: "Acrobata", texto: "Viveu de saltos e piruetas num circo itinerante.", opcoes: ["for", "des"], pericia: "acrobatismo", saber: "Saber (Circo)" },
  { id: "artesao", nome: "Artesão", texto: "Aprendiz de uma guilda, sabe fazer coisas com as mãos.", opcoes: ["for", "int"], pericia: "manufatura", saber: "Saber (Guilda)" },
  { id: "artista", nome: "Artista", texto: "Ganhou a vida no palco, cantando ou atuando.", opcoes: ["des", "car"], pericia: "performance", saber: "Saber (Teatro)" },
  { id: "camponês", nome: "Camponês", texto: "Trabalhou a terra de sol a sol.", opcoes: ["con", "sab"], pericia: "atletismo", saber: "Saber (Agricultura)" },
  { id: "caçador", nome: "Caçador", texto: "Rastreou presas nos ermos pra comer e vender peles.", opcoes: ["des", "sab"], pericia: "sobrevivencia", saber: "Saber (Curtume)" },
  { id: "criminoso", nome: "Criminoso", texto: "Viveu do outro lado da lei, nas sombras da cidade.", opcoes: ["des", "int"], pericia: "furtividade", saber: "Saber (Submundo)" },
  { id: "erudito", nome: "Erudito", texto: "Passou anos estudando numa academia.", opcoes: ["int", "sab"], pericia: "arcanismo", saber: "Saber (Academia)" },
  { id: "guarda", nome: "Guarda", texto: "Patrulhou muralhas e manteve a ordem.", opcoes: ["for", "car"], pericia: "intimidacao", saber: "Saber (Leis)" },
  { id: "herbalista", nome: "Herbalista", texto: "Conhece ervas, chás e unguentos que curam.", opcoes: ["con", "sab"], pericia: "medicina", saber: "Saber (Herbalismo)" },
  { id: "mercador", nome: "Mercador", texto: "Comprou barato, vendeu caro e conhece todo mundo.", opcoes: ["int", "car"], pericia: "diplomacia", saber: "Saber (Comércio)" },
  { id: "soldado", nome: "Soldado", texto: "Marchou num exército e conhece a guerra de perto.", opcoes: ["for", "con"], pericia: "intimidacao", saber: "Saber (Guerra)" },
];

export type Classe = {
  id: ClasseId;
  nome: string;
  texto: string;
  chave: Atributo[];
  pv: number;
  percepcao: Prof;
  fortitude: Prof;
  reflexos: Prof;
  vontade: Prof;
  pericias: Pericia[];
  extras: number;
};

export const CLASSES: Classe[] = [
  { id: "barbaro", nome: "Bárbaro", texto: "Fúria pura: bate forte e aguenta muito.", chave: ["for"], pv: 12, percepcao: "especialista", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: ["atletismo"], extras: 3 },
  { id: "bardo", nome: "Bardo", texto: "Magia ocultista feita de música e inspiração.", chave: ["car"], pv: 8, percepcao: "especialista", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["ocultismo", "performance"], extras: 4 },
  { id: "campeao", nome: "Campeão", texto: "Guerreiro sagrado que protege os aliados.", chave: ["for", "des"], pv: 10, percepcao: "treinado", fortitude: "especialista", reflexos: "treinado", vontade: "especialista", pericias: ["religiao"], extras: 2 },
  { id: "clerigo", nome: "Clérigo", texto: "Canaliza o poder de uma divindade pra curar e punir.", chave: ["sab"], pv: 8, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["religiao"], extras: 2 },
  { id: "druida", nome: "Druida", texto: "Magia primal, ligada aos bichos e às plantas.", chave: ["sab"], pv: 8, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["natureza"], extras: 2 },
  { id: "guerreiro", nome: "Guerreiro", texto: "Mestre das armas, o mais preciso no combate.", chave: ["for", "des"], pv: 10, percepcao: "especialista", fortitude: "especialista", reflexos: "especialista", vontade: "treinado", pericias: ["atletismo"], extras: 3 },
  { id: "ladino", nome: "Ladino", texto: "Ágil, furtivo e cheio de perícias.", chave: ["des"], pv: 8, percepcao: "especialista", fortitude: "treinado", reflexos: "especialista", vontade: "especialista", pericias: ["furtividade"], extras: 7 },
  { id: "mago", nome: "Mago", texto: "Estuda magia arcana em grimórios.", chave: ["int"], pv: 6, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: ["arcanismo"], extras: 2 },
  { id: "monge", nome: "Monge", texto: "Luta de mãos vazias, com corpo e mente afiados.", chave: ["for", "des"], pv: 10, percepcao: "treinado", fortitude: "especialista", reflexos: "especialista", vontade: "especialista", pericias: [], extras: 4 },
  { id: "patrulheiro", nome: "Patrulheiro", texto: "Caçador dos ermos, escolhe uma presa e não larga.", chave: ["for", "des"], pv: 10, percepcao: "especialista", fortitude: "especialista", reflexos: "especialista", vontade: "treinado", pericias: ["natureza", "sobrevivencia"], extras: 4 },
  { id: "feiticeiro", nome: "Feiticeiro", texto: "A magia está no sangue, não nos livros.", chave: ["car"], pv: 6, percepcao: "treinado", fortitude: "treinado", reflexos: "treinado", vontade: "especialista", pericias: [], extras: 2 },
];

export type Equipamento = { armas: string[]; armadura: string; escudo: string; itens: string[] };

export type Ficha = {
  nome: string;
  nivel: number;
  ancestralidade: string;
  antecedente: string;
  classe: string;
  chave: Atributo | "";
  boostsAncestral: Atributo[];
  boostAntecedente: Atributo | "";
  boostAntecedenteLivre: Atributo | "";
  boostsLivres: Atributo[];
  pericias: Pericia[];
  // Boosts dos níveis 5, 10, 15 e 20 (4 em cada, atributos diferentes).
  boostsNivel: Atributo[][];
  // Aumento de perícia por nível ("3" -> "atletismo").
  aumentos: Record<string, Pericia>;
  // Talento escolhido por espaço ("classe-2" -> id do talento).
  talentos: Record<string, string>;
  // Só feiticeiro: tradição que vem da linhagem.
  tradicao: Tradicao | "";
  equipamento: Equipamento;
  // Truques e magias escolhidas (repertório, ou preparadas no dia).
  magias: string[];
  anotacoes: string;
};

export const FICHA_VAZIA: Ficha = {
  nome: "",
  nivel: 1,
  ancestralidade: "",
  antecedente: "",
  classe: "",
  chave: "",
  boostsAncestral: [],
  boostAntecedente: "",
  boostAntecedenteLivre: "",
  boostsLivres: [],
  pericias: [],
  boostsNivel: [[], [], [], []],
  aumentos: {},
  talentos: {},
  tradicao: "",
  equipamento: { armas: [], armadura: "", escudo: "", itens: [] },
  magias: [],
  anotacoes: "",
};

export const NIVEL_MAX = 20;

export const LIVRES_NIVEL_1 = 4;

export const acharAncestralidade = (id: string) => ANCESTRALIDADES.find((a) => a.id === id);
export const acharAntecedente = (id: string) => ANTECEDENTES.find((a) => a.id === id);
export const acharClasse = (id: string) => CLASSES.find((c) => c.id === id);

// Atributos no nível 1 (sem os boosts de nível).
export function atributosIniciais(f: Ficha): Record<Atributo, number> {
  const r = { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 };
  const anc = acharAncestralidade(f.ancestralidade);
  if (anc) {
    for (const a of anc.boosts) r[a]++;
    if (anc.falha) r[anc.falha]--;
  }
  const todos = [...f.boostsAncestral, f.boostAntecedente, f.boostAntecedenteLivre, f.chave, ...f.boostsLivres];
  for (const a of todos) if (a) r[a]++;
  return r;
}

// Atributos no nível da ficha. Boost em +4 ou mais é parcial: dois parciais dão +1.
export function atributos(f: Ficha): Record<Atributo, number> {
  const r = atributosIniciais(f);
  const parciais: Record<Atributo, number> = { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 };
  NIVEIS_BOOST.forEach((n, i) => {
    if (f.nivel < n) return;
    for (const a of f.boostsNivel[i] ?? []) {
      if (r[a] < 4) r[a]++;
      else if (++parciais[a] % 2 === 0) r[a]++;
    }
  });
  return r;
}

// Proficiência da classe num alvo (percepção, salvamentos, armas, armaduras, CD) no nível da ficha.
export function profClasse(f: Ficha, alvo: Alvo): Prof {
  const cls = acharClasse(f.classe);
  if (!cls) return alvo === "desarmado" || alvo === "simples" || alvo === "semArmadura" ? "treinado" : "destreinado";
  let p: Prof = alvo === "percepcao" || alvo === "fortitude" || alvo === "reflexos" || alvo === "vontade" ? cls[alvo] : "destreinado";
  for (const [n, a, prof] of PROGRESSAO[cls.id]) if (a === alvo && n <= f.nivel) p = maior(p, prof);
  return p;
}

// Proficiência em cada perícia, somando os aumentos até o nível da ficha.
export function profPericias(f: Ficha): Record<Pericia, Prof> {
  const treinadas = new Set([...periciasFixas(f), ...f.pericias]);
  const r = Object.fromEntries(PERICIAS.map((p) => [p.id, treinadas.has(p.id) ? "treinado" : "destreinado"])) as Record<Pericia, Prof>;
  for (const n of niveisAumentoPericia(f.classe)) {
    if (n > f.nivel) break;
    const p = f.aumentos[String(n)];
    if (p) r[p] = proxima(r[p]);
  }
  return r;
}

// Até onde dá pra subir uma perícia num aumento feito no nível n.
export function podeAumentar(atual: Prof, n: number): boolean {
  const alvo = proxima(atual);
  return atual !== "lendario" && NIVEL_MINIMO[alvo] <= n;
}

// Perícias que já vêm treinadas (antecedente + classe), sem repetir.
export function periciasFixas(f: Ficha): Pericia[] {
  const fixas = new Set<Pericia>();
  const ant = acharAntecedente(f.antecedente);
  if (ant) fixas.add(ant.pericia);
  for (const p of acharClasse(f.classe)?.pericias ?? []) fixas.add(p);
  return [...fixas];
}

// Quantas perícias a pessoa escolhe: as da classe + Inteligência (nunca negativo).
export function periciasParaEscolher(f: Ficha): number {
  const cls = acharClasse(f.classe);
  if (!cls) return 0;
  return Math.max(0, cls.extras + atributos(f).int);
}

export const bonus = (prof: Prof, mod: number, nivel = 1) => (prof === "destreinado" ? mod : BONUS_PROF[prof] + nivel + mod);

export function calcular(f: Ficha) {
  const attr = atributos(f);
  const anc = acharAncestralidade(f.ancestralidade);
  const ant = acharAntecedente(f.antecedente);
  const cls = acharClasse(f.classe);
  const nv = f.nivel;
  const profs = profPericias(f);
  const prof = (a: Alvo) => profClasse(f, a);
  return {
    attr,
    nivel: nv,
    pv: (anc?.pv ?? 0) + ((cls?.pv ?? 0) + attr.con) * nv,
    // Sem armadura. Com armadura e escudo, ver calcularEquipamento.
    ca: 10 + attr.des + bonus(prof("semArmadura"), 0, nv),
    percepcao: bonus(prof("percepcao"), attr.sab, nv),
    fortitude: bonus(prof("fortitude"), attr.con, nv),
    reflexos: bonus(prof("reflexos"), attr.des, nv),
    vontade: bonus(prof("vontade"), attr.sab, nv),
    profs: {
      percepcao: prof("percepcao"), fortitude: prof("fortitude"), reflexos: prof("reflexos"), vontade: prof("vontade"),
    },
    cdClasse: f.chave && prof("cd") !== "destreinado" ? 10 + bonus(prof("cd"), attr[f.chave], nv) : null,
    magia: f.chave && prof("magia") !== "destreinado" ? { prof: prof("magia"), ataque: bonus(prof("magia"), attr[f.chave], nv), cd: 10 + bonus(prof("magia"), attr[f.chave], nv) } : null,
    deslocamento: anc?.deslocamento ?? 25,
    tamanho: anc?.tamanho ?? "Médio",
    saber: ant?.saber ?? null,
    saberBonus: bonus("treinado", attr.int, nv),
    pericias: PERICIAS.map((p) => ({ ...p, prof: profs[p.id], bonus: bonus(profs[p.id], attr[p.attr], nv) })),
  };
}

const semRepetir = (xs: string[]) => new Set(xs).size === xs.length;

// O que ainda falta pra ficha ficar válida, em ordem. Vazio = pronta.
export function pendencias(f: Ficha): string[] {
  const out: string[] = [];
  const anc = acharAncestralidade(f.ancestralidade);
  const ant = acharAntecedente(f.antecedente);
  const cls = acharClasse(f.classe);
  if (!f.nome.trim()) out.push("Dê um nome ao personagem.");
  if (!anc) out.push("Escolha a ancestralidade.");
  else if (f.boostsAncestral.length !== anc.livres || !semRepetir(f.boostsAncestral) || f.boostsAncestral.some((a) => anc.boosts.includes(a)))
    out.push(`Escolha ${anc.livres === 1 ? "o boost livre" : `os ${anc.livres} boosts livres`} da ancestralidade.`);
  if (!ant) out.push("Escolha o antecedente.");
  else if (!f.boostAntecedente || !ant.opcoes.includes(f.boostAntecedente) || !f.boostAntecedenteLivre || f.boostAntecedenteLivre === f.boostAntecedente)
    out.push("Escolha os dois boosts do antecedente (atributos diferentes).");
  if (!cls) out.push("Escolha a classe.");
  else if (!f.chave || !cls.chave.includes(f.chave)) out.push("Escolha o atributo-chave da classe.");
  if (f.boostsLivres.length !== LIVRES_NIVEL_1 || !semRepetir(f.boostsLivres)) out.push(`Distribua os ${LIVRES_NIVEL_1} boosts livres em atributos diferentes.`);
  if (cls) {
    const fixas = periciasFixas(f);
    const n = periciasParaEscolher(f);
    if (f.pericias.length !== n || !semRepetir(f.pericias) || f.pericias.some((p) => fixas.includes(p)))
      out.push(`Escolha ${n} perícia${n === 1 ? "" : "s"} treinada${n === 1 ? "" : "s"}.`);
  }
  NIVEIS_BOOST.forEach((n, i) => {
    const b = f.boostsNivel[i] ?? [];
    if (f.nivel >= n && (b.length !== 4 || !semRepetir(b))) out.push(`Distribua os 4 boosts do nível ${n}.`);
  });
  if (cls) {
    const faltam = niveisAumentoPericia(f.classe).filter((n) => n <= f.nivel && !f.aumentos[String(n)]);
    if (faltam.length) out.push(`Escolha o aumento de perícia do${faltam.length > 1 ? "s níveis" : " nível"} ${faltam.join(", ")}.`);
  }
  return out;
}

// Ao trocar ancestralidade/antecedente/classe, limpa escolhas que deixaram de valer.
export function ajustar(f: Ficha): Ficha {
  const anc = acharAncestralidade(f.ancestralidade);
  const ant = acharAntecedente(f.antecedente);
  const cls = acharClasse(f.classe);
  const boostsAncestral = anc ? f.boostsAncestral.filter((a) => !anc.boosts.includes(a)).slice(0, anc.livres) : [];
  const boostAntecedente: Ficha["boostAntecedente"] = ant && f.boostAntecedente && ant.opcoes.includes(f.boostAntecedente) ? f.boostAntecedente : "";
  const chave: Ficha["chave"] = cls ? (cls.chave.length === 1 ? cls.chave[0] : f.chave && cls.chave.includes(f.chave) ? f.chave : "") : "";
  const nivel = Math.min(NIVEL_MAX, Math.max(1, Math.round(f.nivel) || 1));
  const boostsNivel = NIVEIS_BOOST.map((_, i) => [...new Set(f.boostsNivel[i] ?? [])].slice(0, 4));
  const g: Ficha = { ...f, nivel, boostsAncestral, boostAntecedente, chave, boostsNivel };
  const fixas = periciasFixas(g);
  const pericias = f.pericias.filter((p) => !fixas.includes(p)).slice(0, periciasParaEscolher(g));
  // Aumentos: refaz em ordem e descarta o que ficou impossível (ex.: perícia que deixou de ser treinada).
  const h: Ficha = { ...g, pericias, aumentos: {} };
  for (const n of niveisAumentoPericia(f.classe)) {
    const p = f.aumentos[String(n)];
    if (!p) continue;
    const atual = profPericias({ ...h, nivel: n - 1 })[p];
    if (podeAumentar(atual, n)) h.aumentos[String(n)] = p;
  }
  return h;
}

export const sinal = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

// Lê uma ficha guardada (localStorage), descartando o que não for válido.
export function lerFicha(json: string | null): Ficha | null {
  if (!json) return null;
  try {
    return normalizarFicha(JSON.parse(json));
  } catch {
    return null;
  }
}

// Limpa uma ficha vinda de fora (navegador, banco). Campo inválido vira vazio.
export function normalizarFicha(o: unknown): Ficha | null {
  if (typeof o !== "object" || !o) return null;
  return normalizarObjeto(o as Record<string, unknown>);
}

// Resumo de uma linha: "Anão · Clérigo".
export function resumoFicha(f: Ficha): string {
  return [acharAncestralidade(f.ancestralidade)?.nome, acharClasse(f.classe)?.nome].filter(Boolean).join(" · ");
}

const objeto = (x: unknown): Record<string, unknown> => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {});
const texto = (x: unknown) => (typeof x === "string" && x.length < 80 ? x : "");
const textos = (x: unknown, max: number) => (Array.isArray(x) ? x.map(texto).filter(Boolean).slice(0, max) : []);

function normalizarObjeto(o: Record<string, unknown>): Ficha {
  const attr = (x: unknown): Atributo | "" => (ATRIBUTOS.includes(x as Atributo) ? (x as Atributo) : "");
  const lista = (x: unknown) => (Array.isArray(x) ? x.map(attr).filter((a): a is Atributo => !!a) : []);
  const ids = new Set<string>(PERICIAS.map((p) => p.id));
  return ajustar({
    nome: typeof o.nome === "string" ? o.nome.slice(0, 60) : "",
    ancestralidade: typeof o.ancestralidade === "string" && acharAncestralidade(o.ancestralidade) ? o.ancestralidade : "",
    antecedente: typeof o.antecedente === "string" && acharAntecedente(o.antecedente) ? o.antecedente : "",
    classe: typeof o.classe === "string" && acharClasse(o.classe) ? o.classe : "",
    chave: attr(o.chave),
    boostsAncestral: lista(o.boostsAncestral),
    boostAntecedente: attr(o.boostAntecedente),
    boostAntecedenteLivre: attr(o.boostAntecedenteLivre),
    boostsLivres: lista(o.boostsLivres).slice(0, LIVRES_NIVEL_1),
    pericias: Array.isArray(o.pericias) ? o.pericias.filter((p: unknown): p is Pericia => typeof p === "string" && ids.has(p)) : [],
    nivel: typeof o.nivel === "number" ? o.nivel : 1,
    boostsNivel: NIVEIS_BOOST.map((_, i) => lista(Array.isArray(o.boostsNivel) ? o.boostsNivel[i] : [])),
    aumentos: Object.fromEntries(
      Object.entries(objeto(o.aumentos)).filter((e): e is [string, Pericia] => /^\d+$/.test(e[0]) && typeof e[1] === "string" && ids.has(e[1])),
    ),
    talentos: Object.fromEntries(
      Object.entries(objeto(o.talentos)).filter((e): e is [string, string] => /^[a-z]+-\d+$/.test(e[0]) && typeof e[1] === "string" && e[1].length < 80),
    ),
    tradicao: (["arcana", "divina", "ocultista", "primal"] as const).find((t) => t === o.tradicao) ?? "",
    equipamento: {
      armas: textos(objeto(o.equipamento).armas, 20),
      armadura: texto(objeto(o.equipamento).armadura),
      escudo: texto(objeto(o.equipamento).escudo),
      itens: textos(objeto(o.equipamento).itens, 100),
    },
    magias: textos(o.magias, 120),
    anotacoes: typeof o.anotacoes === "string" ? o.anotacoes.slice(0, 5000) : "",
  });
}
