// Monte seu Pirata: as peças e o código curto que vira avatar ("pirata:2-1-0-3-1-2-0").
// A ordem das categorias e das opções faz parte do código salvo: só acrescente no fim.

export const CATEGORIAS = [
  { id: "pele", nome: "Pele", opcoes: ["Areia", "Pêssego", "Canela", "Cacau", "Ébano", "Afogado", "Fantasma"] },
  { id: "chapeu", nome: "Chapéu", opcoes: ["Nenhum", "Tricórnio", "Capitão", "Bandana", "Palha", "Coroa"] },
  { id: "barba", nome: "Barba", opcoes: ["Nenhuma", "Bigode", "Cavanhaque", "Barba preta", "Barba ruiva", "Barba grisalha"] },
  { id: "cicatriz", nome: "Cicatriz", opcoes: ["Nenhuma", "Tapa-olho", "Risco no olho", "X na bochecha", "Curativo", "Dente de ouro"] },
  { id: "roupa", nome: "Roupa", opcoes: ["Capitão", "Marujo", "Colete", "Casaco vermelho", "Trapos"] },
  { id: "arma", nome: "Arma", opcoes: ["Nenhuma", "Sabre", "Pistola", "Gancho", "Luneta", "Peixe"] },
  { id: "bicho", nome: "Bichinho", opcoes: ["Nenhum", "Papagaio", "Macaco", "Caranguejo", "Polvo", "Rato"] },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["id"];
export type Pirata = Record<Categoria, number>;

export const PADRAO: Pirata = { pele: 1, chapeu: 1, barba: 3, cicatriz: 1, roupa: 0, arma: 1, bicho: 1 };

const PREFIXO = "pirata:";

export const codigoPirata = (p: Pirata) => PREFIXO + CATEGORIAS.map((c) => p[c.id]).join("-");

// null = não é um pirata válido (texto qualquer, número fora da lista, categoria faltando).
export function lerPirata(v: unknown): Pirata | null {
  if (typeof v !== "string" || !v.startsWith(PREFIXO)) return null;
  const partes = v.slice(PREFIXO.length).split("-");
  if (partes.length !== CATEGORIAS.length) return null;
  const out = {} as Pirata;
  for (const [i, c] of CATEGORIAS.entries()) {
    if (!/^\d{1,2}$/.test(partes[i])) return null;
    const n = Number(partes[i]);
    if (n >= c.opcoes.length) return null;
    out[c.id] = n;
  }
  return out;
}

export const pirataValido = (v: unknown) => lerPirata(v) !== null;

export function sortearPirata(rand: () => number = Math.random): Pirata {
  const out = {} as Pirata;
  for (const c of CATEGORIAS) out[c.id] = Math.floor(rand() * c.opcoes.length);
  return out;
}

// Nome de cartaz: título pelo chapéu, apelido pela cicatriz/barba, sobrenome pelo bichinho.
const TITULOS = ["Corsário", "Imediato", "Capitão", "Marujo", "Grumete", "Rei Pirata"];
const APELIDOS_CICATRIZ = ["", "Caolho", "Olho-Torto", "Cara-Riscada", "Cabeça-Dura", "Sorriso-de-Ouro"];
const APELIDOS_BARBA = ["Cara-Lisa", "Bigodudo", "Barbicha", "Barba-Negra", "Barba-Ruiva", "Barba-Branca"];
const SOBRENOMES = ["", "do Papagaio", "do Macaco", "das Pinças", "dos Oito Braços", "do Porão"];
const ARMAS = ["", "", "", "Mão-de-Gancho", "", "do Bacalhau"];

export function nomePirata(p: Pirata): string {
  const apelido = APELIDOS_CICATRIZ[p.cicatriz] || ARMAS[p.arma] || APELIDOS_BARBA[p.barba];
  return [TITULOS[p.chapeu], apelido, SOBRENOMES[p.bicho]].filter(Boolean).join(" ");
}

// Recompensa do cartaz: sempre a mesma pro mesmo pirata.
export function recompensa(p: Pirata): number {
  let h = 7;
  for (const ch of codigoPirata(p)) h = (h * 31 + ch.charCodeAt(0)) % 99991;
  return 1000 + (h % 90) * 100 + (p.chapeu === 5 ? 50000 : 0);
}
