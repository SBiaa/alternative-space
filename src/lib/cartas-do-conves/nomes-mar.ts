// Nomes emprestados do Mar Sem Fim (content/mar-sem-fim/ na branch mar-sem-fim: mundo.json, oficios.json e ilhas/).
// Cópia mínima e só leitura: este jogo não mexe na economia, no pirata nem nas viagens do Mar Sem Fim.
// Quando o Mar Sem Fim entrar no master, um teste compara esta lista com os JSON dele (ver cartas-do-conves.test.ts).

export const MARES = {
  nascente: "Mar do Nascente",
  poente: "Mar do Poente",
  boreal: "Mar Boreal",
  austral: "Mar Austral",
  parados: "Os Mares Parados",
} as const;

/** Os ofícios do Mar Sem Fim (id e nome). O baralho e a passiva de cada um ficam em content/cartas-do-conves/oficios.json. */
export const OFICIOS_MAR = [
  { id: "navegador", nome: "Navegador" },
  { id: "cozinheira", nome: "Cozinheira" },
  { id: "medico", nome: "Médico" },
  { id: "carpinteira", nome: "Carpinteira" },
  { id: "musico", nome: "Músico" },
  { id: "atirador", nome: "Atirador" },
] as const;

/** Mar e ilha de cada trecho da travessia (índice 0 = trecho 1). */
export const TRECHOS = [
  { mar: MARES.nascente, ilha: "Farol Velho" },
  { mar: MARES.poente, ilha: "Ponta do Vento" },
  { mar: MARES.parados, ilha: "Recife das Lanternas" },
] as const;
