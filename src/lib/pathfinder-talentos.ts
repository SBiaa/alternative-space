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
  catfolk: [[1, "Pés de Gato"], [1, "Curiosidade Felina"], [1, "Garras Afiadas"], [1, "Sorte do Gato"], [5, "Pouso Seguro"], [9, "Nove Vidas"], [13, "Agilidade Felina"]],
  orc: [[1, "Ferocidade Orc"], [1, "Treinamento com Armas Orcs"], [1, "Visão Ameaçadora"], [5, "Ferocidade Incansável"], [9, "Pele de Pedra"], [13, "Fúria Orc"]],
  kobold: [[1, "Sopro de Dragão"], [1, "Armadilheiro"], [1, "Escamas Fortes"], [5, "Armadilha Rápida"], [9, "Asas de Dragão"]],
  tengu: [[1, "Bico Afiado"], [1, "Treinamento com Armas Tengu"], [1, "Ouvido Fino"], [5, "Pena Mágica"], [9, "Asas Tengu"]],
  ysoki: [[1, "Bolsas nas Bochechas"], [1, "Esquiva de Rato"], [1, "Faro de Rato"], [5, "Enxame de Ratos"], [9, "Mordida Infectada"]],
  kitsune: [[1, "Forma de Raposa"], [1, "Fogo de Raposa"], [1, "Truque de Kitsune"], [5, "Ilusão de Kitsune"], [9, "Cauda Extra"]],
  hobgoblin: [[1, "Treinamento com Armas Hobgoblins"], [1, "Disciplina Militar"], [1, "Alquimia Hobgoblin"], [5, "Formação"], [9, "Comandante Nato"]],
  iruxi: [[1, "Cauda Iruxi"], [1, "Mordida Iruxi"], [1, "Sangue Frio"], [5, "Pele Escamosa"], [9, "Regeneração"]],
  kholo: [[1, "Mordida Kholo"], [1, "Risada Kholo"], [1, "Tática de Bando"], [5, "Caçada do Clã"], [9, "Mordida Esmagadora"]],
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
  animista: [[1, "Canalizar Aparição"], [1, "Visão Espiritual"], [1, "Cantos Espirituais"], [2, "Aparição Inspiradora"], [4, "Vínculo Profundo"], [6, "Dança dos Espíritos"]],
  kineticista: [[1, "Explosão Extra"], [1, "Base Cinética"], [1, "Escudo Elemental"], [2, "Explosão Canalizada"], [4, "Muralha Elemental"], [6, "Forma Elemental"]],
  inventor: [[1, "Variável Experimental"], [1, "Ajuste Rápido"], [1, "Peça Reserva"], [2, "Explosão Controlada"], [4, "Sobrecarga Melhorada"], [6, "Nova Variável"]],
  pistoleiro: [[1, "Tiro Atordoante"], [1, "Recarga Acrobática"], [1, "Tiro Duplo"], [2, "Tiro Preciso"], [4, "Tiro no Escuro"], [6, "Tiro em Ricochete"]],
  magus: [[1, "Golpe Arcano"], [1, "Escudo Mágico"], [1, "Investida Arcana"], [2, "Feitiço Canalizado"], [4, "Magia Combativa"], [6, "Conflux Ampliado"]],
  invocador: [[1, "Ataque em Dupla"], [1, "Truque Extra"], [1, "Eidolon Ágil"], [2, "Evolução Expandida"], [4, "Proteção do Eidolon"], [6, "Forma Ampliada"]],
  psiquico: [[1, "Truque Ampliado"], [1, "Mente Afiada"], [1, "Telepatia Básica"], [2, "Mente Blindada"], [4, "Pulso Psíquico"], [6, "Mente Dividida"]],
  taumaturgo: [[1, "Implemento Extra"], [1, "Ritual Esotérico"], [1, "Sinal Protetor"], [2, "Conhecimento Esotérico"], [4, "Exploit Melhorado"], [6, "Amuleto Duplo"]],
  comandante: [[1, "Ordem Rápida"], [1, "Grito de Guerra"], [1, "Plano de Batalha"], [2, "Tática Ofensiva"], [4, "Formação Defensiva"], [6, "Contra-ataque Coordenado"]],
  guardiao: [[1, "Golpe Protetor"], [1, "Provocação Intimidadora"], [1, "Escudo Humano"], [2, "Bloqueio Firme"], [4, "Muralha Viva"], [6, "Reação Dupla"]],
  exemplar: [[1, "Centelha Ampliada"], [1, "Ícone Extra"], [1, "Salto Heroico"], [2, "Epíteto Novo"], [4, "Golpe Divino"], [6, "Aura de Glória"]],
  bruxo: [[1, "Feitiço Ampliado"], [1, "Lição do Patrono"], [2, "Caldeirão"], [4, "Familiar Melhorado"], [6, "Lição Maior"]],
};

// Arquétipos: o talento de dedicação entra numa vaga de classe a partir do nível 2.
// Os multiclasse (de outra classe) seguem o mesmo esquema.
const ARQUETIPOS: Sugestao[] = [
  "Acrobata", "Arqueiro", "Assassino", "Bastião", "Cavaleiro", "Duelista", "Lutador Marcial", "Médico", "Sentinela", "Treinador de Bestas",
  "Alquimista", "Bárbaro", "Bardo", "Campeão", "Clérigo", "Druida", "Espadachim", "Feiticeiro", "Guerreiro", "Investigador",
  "Ladino", "Mago", "Monge", "Oráculo", "Patrulheiro", "Bruxo",
  "Animista", "Kineticista", "Inventor", "Pistoleiro", "Magus", "Invocador", "Psíquico", "Taumaturgo", "Comandante", "Guardião", "Exemplar",
].map((n): Sugestao => [2, `Dedicação de ${n}`]);

// Nomes sugeridos pra uma vaga, só os que já dá pra pegar naquele nível.
export function sugestoesTalento(tipo: TipoTalento, nivel: number, ancestralidade: string, classe: string): string[] {
  const fonte = tipo === "geral" ? [...GERAIS, ...PERICIA] : tipo === "pericia" ? PERICIA : tipo === "ancestralidade" ? ANCESTRAIS[ancestralidade] ?? [] : [...(CLASSE[classe] ?? []), ...ARQUETIPOS];
  return fonte.filter(([n]) => n <= nivel).map(([, nome]) => nome);
}
