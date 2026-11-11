// Sugestões de talentos pra preencher as vagas da ficha. A pessoa pode digitar qualquer outro nome:
// a lista só ajuda a lembrar dos mais comuns do Player Core. Número = nível mínimo.
import type { TipoTalento } from "./pathfinder";

type Sugestao = [number, string];

const GERAIS: Sugestao[] = [
  [1, "Adoção Ancestral"], [1, "Armadura Leve"], [1, "Ágil"], [1, "Durão"], [1, "Encouraçado"], [1, "Incansável"],
  [1, "Iniciativa Aprimorada"], [1, "Prontidão"], [1, "Robustez"], [1, "Treinamento com Arma"], [1, "Treinamento com Escudo"],
  [3, "Ancestralidade Ampliada"], [3, "Expertise em Armadura"], [3, "Passo Rápido"], [7, "Expertise em Perícias"],
  [11, "Recuperação Rápida"], [11, "Mestre da Furtividade"], [19, "Alma Indomável"],
];

const PERICIA: Sugestao[] = [
  [1, "Aprender Feitiço"], [1, "Arte Marcial do Corpo"], [1, "Assistência em Batalha"], [1, "Bom de Lábia"], [1, "Coleta Rápida"],
  [1, "Cura em Combate"], [1, "Escalada Rápida"], [1, "Esgueirar Rápido"], [1, "Impressão Imponente"], [1, "Medicina Natural"],
  [1, "Mentira Convincente"], [1, "Reconhecer Magia"], [1, "Rolamento de Gato"], [1, "Seguir Rastros Rápido"], [1, "Sobrevivente Experiente"],
  [1, "Suporte Rápido"], [1, "Treinamento Adicional em Saber"], [2, "Assustar com Grito"], [2, "Medicina Contínua"],
  [2, "Mão Leve Rápida"], [7, "Cura Rápida"], [7, "Intimidação em Massa"], [7, "Salto Impossível"], [15, "Esquecer Sem Rastro"],
];

const ANCESTRAIS: Record<string, Sugestao[]> = {
  humano: [[1, "Adaptação Natural"], [1, "Engenhosidade Humana"], [1, "Treino Geral"], [1, "Versatilidade Cooperativa"], [5, "Natureza Adaptativa"], [9, "Determinação Humana"]],
  anao: [[1, "Treinamento com Armas Anãs"], [1, "Conhecimento da Pedra"], [1, "Robusto como Rocha"], [5, "Anão Inabalável"], [9, "Bota de Ferro"], [13, "Resistência Anã"]],
  elfo: [[1, "Treinamento com Armas Élficas"], [1, "Passo Ligeiro"], [1, "Conhecimento Antigo"], [5, "Sentidos Élficos"], [9, "Magia Ancestral"], [13, "Elegância Élfica"]],
  gnomo: [[1, "Treinamento com Armas Gnomas"], [1, "Obsessão Gnoma"], [1, "Magia Primeiro Mundo"], [5, "Faro Feérico"], [9, "Fascínio do Primeiro Mundo"]],
  goblin: [[1, "Treinamento com Armas Goblins"], [1, "Canção Goblin"], [1, "Rato de Lixo"], [5, "Pulo Rápido"], [9, "Coragem Goblin"]],
  halfling: [[1, "Treinamento com Armas Halflings"], [1, "Sorte Halfling"], [1, "Discreto"], [5, "Sorte Compartilhada"], [9, "Pequeno e Ágil"]],
  leshy: [[1, "Raízes Profundas"], [1, "Sementes Mágicas"], [1, "Folhagem"], [5, "Floração"], [9, "Abraço da Floresta"]],
};

const CLASSE: Record<string, Sugestao[]> = {
  alquimista: [[1, "Bomba Rápida"], [1, "Alquimia Atenta"], [2, "Bomba Adicional"], [4, "Bomba Longa"], [6, "Elixir Potente"]],
  barbaro: [[1, "Golpe Repentino"], [1, "Fúria Mais Rápida"], [2, "Investida Repentina"], [4, "Fúria Intimidadora"], [6, "Golpe Ameaçador"]],
  bardo: [[1, "Recital Versátil"], [1, "Hino de Cura"], [2, "Composição Inspiradora"], [4, "Musa Melódica"], [6, "Hino Dobrado"]],
  campeao: [[1, "Escudo Protetor"], [1, "Ataque Sagrado"], [2, "Investida Divina"], [4, "Defesa Ampliada"], [6, "Cura com Imposição"]],
  clerigo: [[1, "Cura Ampliada"], [1, "Domínio Iniciado"], [2, "Comunhão Vital"], [4, "Canal Direcionado"], [6, "Fonte Abundante"]],
  druida: [[1, "Forma Selvagem"], [1, "Companheiro Animal"], [2, "Poder Elemental"], [4, "Forma de Fera"], [6, "Clima Selvagem"]],
  espadachim: [[1, "Golpe Ousado"], [1, "Ataque com Floreio"], [2, "Finta Rápida"], [4, "Riposte"], [6, "Desafio Pessoal"]],
  feiticeiro: [[1, "Magia Alcançada"], [1, "Feitiço Familiar"], [2, "Linhagem Ampliada"], [4, "Magia Divergente"], [6, "Magia Dupla"]],
  guerreiro: [[1, "Golpe Duplo"], [1, "Ataque Poderoso"], [1, "Investida Repentina"], [2, "Golpe Intimidador"], [4, "Bloqueio Agressivo"], [6, "Ataque Atordoante"]],
  investigador: [[1, "Pista Rápida"], [1, "Evidência Decisiva"], [2, "Dedução Rápida"], [4, "Olhar Detalhista"], [6, "Teoria Sólida"]],
  ladino: [[1, "Finta Debilitante"], [1, "Ataque Gêmeo"], [2, "Esgueirar Melhorado"], [4, "Golpe Debilitante"], [6, "Truque Sujo"]],
  mago: [[1, "Magia Alcançada"], [1, "Familiar"], [2, "Contramágica"], [4, "Magia Ampliada"], [6, "Feitiço Repetido"]],
  monge: [[1, "Postura do Dragão"], [1, "Postura do Tigre"], [1, "Ki Mágico"], [2, "Golpe Atordoante"], [4, "Rajada Ágil"], [6, "Postura da Garça"]],
  oraculo: [[1, "Revelação do Mistério"], [1, "Visão Sobrenatural"], [2, "Bênção Divina"], [4, "Revelação Avançada"], [6, "Maldição Domada"]],
  patrulheiro: [[1, "Tiro Duplo"], [1, "Companheiro Animal"], [1, "Rastreio de Caçador"], [2, "Ataque Gêmeo"], [4, "Tiro Rápido"], [6, "Armadilha Rápida"]],
  bruxo: [[1, "Feitiço Ampliado"], [1, "Lição do Patrono"], [2, "Caldeirão"], [4, "Familiar Melhorado"], [6, "Lição Maior"]],
};

// Nomes sugeridos pra uma vaga, só os que já dá pra pegar naquele nível.
export function sugestoesTalento(tipo: TipoTalento, nivel: number, ancestralidade: string, classe: string): string[] {
  const fonte = tipo === "geral" ? [...GERAIS, ...PERICIA] : tipo === "pericia" ? PERICIA : tipo === "ancestralidade" ? ANCESTRAIS[ancestralidade] ?? [] : CLASSE[classe] ?? [];
  return fonte.filter(([n]) => n <= nivel).map(([, nome]) => nome);
}
