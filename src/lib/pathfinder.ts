// Regras de criação de personagem do Pathfinder 2ª edição (Remaster, Player Core), nível 1.
// Atributos são modificadores (começam em 0). Cada boost dá +1 e cada falha tira 1.
// Dentro de um mesmo grupo de boosts (ancestralidade, antecedente, livres) não dá pra repetir atributo.

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

export type Prof = "destreinado" | "treinado" | "especialista";
const BONUS_PROF: Record<Prof, number> = { destreinado: 0, treinado: 2, especialista: 4 };
export const NOME_PROF: Record<Prof, string> = { destreinado: "D", treinado: "T", especialista: "E" };

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
  id: string;
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

export type Ficha = {
  nome: string;
  ancestralidade: string;
  antecedente: string;
  classe: string;
  chave: Atributo | "";
  boostsAncestral: Atributo[];
  boostAntecedente: Atributo | "";
  boostAntecedenteLivre: Atributo | "";
  boostsLivres: Atributo[];
  pericias: Pericia[];
};

export const FICHA_VAZIA: Ficha = {
  nome: "",
  ancestralidade: "",
  antecedente: "",
  classe: "",
  chave: "",
  boostsAncestral: [],
  boostAntecedente: "",
  boostAntecedenteLivre: "",
  boostsLivres: [],
  pericias: [],
};

export const LIVRES_NIVEL_1 = 4;

export const acharAncestralidade = (id: string) => ANCESTRALIDADES.find((a) => a.id === id);
export const acharAntecedente = (id: string) => ANTECEDENTES.find((a) => a.id === id);
export const acharClasse = (id: string) => CLASSES.find((c) => c.id === id);

export function atributos(f: Ficha): Record<Atributo, number> {
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

const bonus = (prof: Prof, mod: number, nivel = 1) => (prof === "destreinado" ? mod : BONUS_PROF[prof] + nivel + mod);

export function calcular(f: Ficha) {
  const attr = atributos(f);
  const anc = acharAncestralidade(f.ancestralidade);
  const ant = acharAntecedente(f.antecedente);
  const cls = acharClasse(f.classe);
  const treinadas = new Set([...periciasFixas(f), ...f.pericias]);
  return {
    attr,
    pv: (anc?.pv ?? 0) + (cls?.pv ?? 0) + attr.con,
    // Sem armadura: todas as classes do nível 1 são treinadas em defesa sem armadura.
    ca: 10 + attr.des + bonus("treinado", 0),
    percepcao: bonus(cls?.percepcao ?? "treinado", attr.sab),
    fortitude: bonus(cls?.fortitude ?? "treinado", attr.con),
    reflexos: bonus(cls?.reflexos ?? "treinado", attr.des),
    vontade: bonus(cls?.vontade ?? "treinado", attr.sab),
    cdClasse: f.chave ? 10 + bonus("treinado", attr[f.chave]) : null,
    deslocamento: anc?.deslocamento ?? 25,
    tamanho: anc?.tamanho ?? "Médio",
    saber: ant?.saber ?? null,
    saberBonus: bonus("treinado", attr.int),
    pericias: PERICIAS.map((p) => {
      const prof: Prof = treinadas.has(p.id) ? "treinado" : "destreinado";
      return { ...p, prof, bonus: bonus(prof, attr[p.attr]) };
    }),
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
  const g: Ficha = { ...f, boostsAncestral, boostAntecedente, chave };
  const fixas = periciasFixas(g);
  const pericias = f.pericias.filter((p) => !fixas.includes(p)).slice(0, periciasParaEscolher(g));
  return { ...g, pericias };
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
  });
}
