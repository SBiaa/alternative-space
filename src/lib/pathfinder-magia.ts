// Conjuração das classes do Player Core (Remaster): tradição, tipo, espaços por círculo e sugestões de magias.
// As magias são texto livre; a lista só sugere as mais comuns de cada tradição.

export const TRADICOES = ["arcana", "divina", "ocultista", "primal"] as const;
export type Tradicao = (typeof TRADICOES)[number];
export const NOME_TRADICAO: Record<Tradicao, string> = { arcana: "Arcana", divina: "Divina", ocultista: "Ocultista", primal: "Primal" };

type Conjuracao = {
  // "escolha" = depende da linhagem/patrono; a pessoa escolhe na ficha.
  tradicao: Tradicao | "escolha";
  tipo: "preparada" | "espontanea";
  // Espaços num círculo recém-aberto e no nível seguinte.
  espacos: [number, number];
  // Conjurador limitado (magus, invocador): só os dois círculos mais altos têm espaços.
  limitado?: boolean;
};

export const CONJURACAO: Record<string, Conjuracao> = {
  bardo: { tradicao: "ocultista", tipo: "espontanea", espacos: [2, 3] },
  clerigo: { tradicao: "divina", tipo: "preparada", espacos: [2, 3] },
  druida: { tradicao: "primal", tipo: "preparada", espacos: [2, 3] },
  feiticeiro: { tradicao: "escolha", tipo: "espontanea", espacos: [3, 4] },
  mago: { tradicao: "arcana", tipo: "preparada", espacos: [2, 3] },
  oraculo: { tradicao: "divina", tipo: "espontanea", espacos: [3, 4] },
  bruxo: { tradicao: "escolha", tipo: "preparada", espacos: [2, 3] },
  animista: { tradicao: "divina", tipo: "preparada", espacos: [2, 3] },
  psiquico: { tradicao: "ocultista", tipo: "espontanea", espacos: [2, 2] },
  magus: { tradicao: "arcana", tipo: "preparada", espacos: [1, 2], limitado: true },
  invocador: { tradicao: "escolha", tipo: "espontanea", espacos: [1, 2], limitado: true },
};

export const TRUQUES_POR_DIA = 5;
export const MAX_FOCO = 3;

export type VagaMagia = { chave: string; circulo: number };

// Círculo mais alto que dá pra conjurar (também é o círculo dos truques).
export const circuloMaximo = (nivel: number) => Math.min(10, Math.ceil(nivel / 2));

// Todas as vagas de magia da ficha: truques primeiro, depois círculo 1, 2…
export function vagasMagia(f: { classe: string; nivel: number }): VagaMagia[] {
  const c = CONJURACAO[f.classe];
  if (!c) return [];
  const out: VagaMagia[] = [];
  for (let i = 1; i <= TRUQUES_POR_DIA; i++) out.push({ chave: `truque-${i}`, circulo: 0 });
  if (c.limitado) {
    // Círculo mais alto: 1 espaço quando abre, 2 no nível seguinte; o de baixo fica com 2.
    const topo = Math.min(9, circuloMaximo(f.nivel));
    for (let r = Math.max(1, topo - 1); r <= topo; r++) {
      const qtd = r === topo && f.nivel === 2 * r - 1 ? c.espacos[0] : c.espacos[1];
      for (let i = 1; i <= qtd; i++) out.push({ chave: `r${r}-${i}`, circulo: r });
    }
    return out;
  }
  for (let r = 1; r <= 9; r++) {
    const abre = 2 * r - 1;
    if (f.nivel < abre) break;
    const qtd = f.nivel > abre ? c.espacos[1] : c.espacos[0];
    for (let i = 1; i <= qtd; i++) out.push({ chave: `r${r}-${i}`, circulo: r });
  }
  if (f.nivel >= 19) out.push({ chave: "r10-1", circulo: 10 });
  return out;
}

// [círculo, nome, tradições: A D O P]
const MAGIAS: [number, string, string][] = [
  [0, "Arco Elétrico", "AP"], [0, "Detectar Magia", "ADOP"], [0, "Escudo", "ADO"], [0, "Explosão Cáustica", "AP"], [0, "Ignição", "AP"],
  [0, "Lança Divina", "D"], [0, "Luz", "ADOP"], [0, "Mão Telecinética", "AO"], [0, "Mensagem", "ADO"], [0, "Prestidigitação", "ADOP"],
  [0, "Atordoar", "ADO"], [0, "Estabilizar", "DP"], [0, "Congelar", "AP"], [0, "Espinhos", "P"], [0, "Som Fantasma", "AO"],
  [1, "Cura", "DP"], [1, "Dano", "D"], [1, "Rajada de Força", "AO"], [1, "Armadura Mística", "ADOP"], [1, "Sono", "AO"],
  [1, "Medo", "ADOP"], [1, "Bênção", "DO"], [1, "Enfeitiçar", "AOP"], [1, "Sopro de Fogo", "AP"], [1, "Graxa", "AP"],
  [1, "Arma Rúnica", "ADO"], [1, "Disfarce Ilusório", "AO"], [1, "Santuário", "DO"], [1, "Emaranhar", "P"], [1, "Saltar", "AP"],
  [2, "Invisibilidade", "AO"], [2, "Aumentar", "AP"], [2, "Dissipar Magia", "ADOP"], [2, "Resistir Energia", "ADOP"], [2, "Silêncio", "DO"],
  [2, "Ver o Invisível", "ADO"], [2, "Escuridão", "ADOP"], [2, "Teia", "AP"], [2, "Resiliência do Carvalho", "P"], [2, "Mente Clara", "DOP"],
  [3, "Bola de Fogo", "AP"], [3, "Relâmpago", "AP"], [3, "Lentidão", "AOP"], [3, "Acelerar", "AOP"], [3, "Paralisar", "AO"],
  [3, "Toque Vampírico", "ADO"], [3, "Cegueira", "ADOP"], [3, "Heroísmo", "DO"], [3, "Respirar na Água", "ADP"],
  [4, "Voo", "AO"], [4, "Porta Dimensional", "AO"], [4, "Muralha de Fogo", "AP"], [4, "Confusão", "AO"], [4, "Libertação", "DP"],
  [5, "Cone de Frio", "AP"], [5, "Muralha de Pedra", "AP"], [5, "Visão Verdadeira", "ADO"], [5, "Ondas de Sombra", "AO"],
  [6, "Desintegrar", "A"], [6, "Teletransporte", "AO"], [6, "Corrente de Relâmpagos", "AP"], [7, "Dedo da Morte", "D"],
  [7, "Mudança de Plano", "ADOP"], [8, "Terremoto", "P"], [9, "Chuva de Meteoros", "A"], [10, "Desejo", "A"],
];
const LETRA: Record<Tradicao, string> = { arcana: "A", divina: "D", ocultista: "O", primal: "P" };

// Sugestões de magias pra uma vaga: truques só na vaga de truque; nas outras, qualquer círculo até o da vaga.
export function sugestoesMagia(tradicao: Tradicao | "", circulo: number): string[] {
  if (!tradicao) return [];
  return MAGIAS.filter(([r, , t]) => t.includes(LETRA[tradicao]) && (circulo === 0 ? r === 0 : r > 0 && r <= circulo)).map(([, n]) => n);
}
