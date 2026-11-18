/**
 * Textos de ajuda da interface. Escritos por nós, em linguagem simples,
 * para quem nunca jogou Shadowrun. Não são cópia dos livros oficiais.
 *
 * `text`  = o que é, em uma ou duas frases.
 * `fits`  = completa a frase "Combina com quem quer…".
 */
import type { AttrKey, PriorityCategory, TalentKey } from '@/lib/fichas/sr5/types';

export interface Help {
  text: string;
  fits?: string;
}

export const PRIORITY_HELP: Record<PriorityCategory, Help> = {
  metatype: {
    text: 'Define a “raça” do personagem e dá pontos especiais para Trunfo e, se tiver, Magia ou Ressonância. Quanto mais alta a letra, mais opções de metatipo.',
    fits: 'jogar de troll, anão ou ork, ou ter bastante Trunfo.',
  },
  talent: {
    text: 'Decide se o personagem usa magia, tem poderes de adepto, conversa com a Matriz como tecnomante ou é mundano. Letras altas dão mais poder sobrenatural.',
    fits: 'que o personagem seja mago, adepto ou tecnomante.',
  },
  attributes: {
    text: 'Pontos para distribuir nos oito atributos básicos (força, agilidade, inteligência…). Eles sustentam quase tudo o que o personagem faz.',
    fits: 'um personagem fisicamente forte ou mentalmente afiado em várias frentes.',
  },
  skills: {
    text: 'Pontos para comprar perícias (o que o personagem sabe fazer) e grupos de perícias. Determina em quantas coisas ele é bom.',
    fits: 'um especialista em muitas áreas ou alguém muito bom no que faz.',
  },
  resources: {
    text: 'Dinheiro inicial (nuyen, ¥) para comprar armas, armaduras, implantes, veículos e onde morar.',
    fits: 'muito ciberware, equipamento caro ou um estilo de vida confortável.',
  },
};

export const METATYPE_HELP: Record<string, Help> = {
  Human: {
    text: 'A metaraça mais comum. Sem atributos acima da média, mas com mais Trunfo e disponível em qualquer prioridade.',
    fits: 'flexibilidade total e gastar a prioridade mais alta em outra coisa.',
  },
  Elf: {
    text: 'Elegantes e de vida longa. Mais ágeis e carismáticos que humanos e enxergam bem na penumbra.',
    fits: 'um rosto do grupo, um atirador ágil ou um mago carismático.',
  },
  Dwarf: {
    text: 'Baixos, robustos e teimosos. Resistentes a doenças e venenos, enxergam o calor dos corpos e têm muita força de vontade.',
    fits: 'um técnico durão, um mago resistente ou alguém difícil de derrubar.',
  },
  Ork: {
    text: 'Grandes e fortes, com presas. Muito Corpo e Força, um pouco menos de Lógica e Carisma; enxergam bem na penumbra.',
    fits: 'linha de frente barata: músculo sem gastar prioridade alta.',
  },
  Troll: {
    text: 'Enormes, com chifres e pele com placas de osso. O máximo em Corpo e Força, alcance maior no corpo a corpo, mas tudo custa mais para alguém do tamanho deles.',
    fits: 'ser a parede do grupo e bater (ou aguentar) mais que todo mundo.',
  },
};

export const TALENT_HELP: Partial<Record<TalentKey, Help>> = {
  magician: {
    text: 'Lança magias, invoca espíritos e enxerga o plano astral. É o usuário de magia completo.',
    fits: 'resolver problemas com feitiços e ter espíritos como aliados.',
  },
  mysticAdept: {
    text: 'Mistura de mago e adepto: lança magias e também compra poderes que melhoram o próprio corpo, dividindo a Magia entre os dois.',
    fits: 'um pouco de tudo no lado mágico, aceitando ser menos forte em cada parte.',
  },
  adept: {
    text: 'Canaliza a magia para dentro do próprio corpo: reflexos sobre-humanos, golpes letais, sentidos aguçados. Não lança magias.',
    fits: 'um artista marcial místico, um atirador impossível ou um negociador hipnótico.',
  },
  aspectedMagician: {
    text: 'Mago especializado em um só campo: só magias, só espíritos ou só encantamento. Mais barato, mais limitado.',
    fits: 'magia em uma área específica sem gastar a prioridade A.',
  },
  technomancer: {
    text: 'Conversa com a Matriz direto da mente, sem computador. Usa formas complexas e cria sprites (entidades digitais).',
    fits: 'ser o hacker do grupo de um jeito sobrenatural.',
  },
  mundane: {
    text: 'Sem magia nem Ressonância. Pode usar ciberware à vontade sem perder nada mágico.',
    fits: 'um samurai de rua cheio de implantes, um piloto ou um decker.',
  },
};

export const ATTR_HELP: Record<AttrKey, Help> = {
  BOD: { text: 'Resistência física: aguentar dano, venenos e doenças. Define o monitor de dano físico.', fits: 'aguentar tiros e porrada.' },
  AGI: { text: 'Coordenação e precisão. Base de quase todo combate armado e de ações furtivas.', fits: 'atirar, lutar ou se esgueirar bem.' },
  REA: { text: 'Velocidade de reação. Entra na iniciativa, na defesa contra ataques e na pilotagem.', fits: 'agir primeiro e desviar.' },
  STR: { text: 'Força bruta: dano no corpo a corpo, carregar peso, correr e nadar.', fits: 'bater forte e carregar armas pesadas.' },
  CHA: { text: 'Presença e lábia. Base das perícias sociais e dos pontos de contato.', fits: 'convencer, negociar e ter bons contatos.' },
  INT: { text: 'Instinto e percepção. Entra na iniciativa e em perceber o que está acontecendo.', fits: 'notar emboscadas e agir rápido.' },
  LOG: { text: 'Raciocínio e memória. Base de perícias técnicas, de hacking e de medicina.', fits: 'hackear, consertar e saber coisas.' },
  WIL: { text: 'Força de vontade. Resiste a magia, medo e cansaço; define o monitor de atordoamento.', fits: 'não se abalar e resistir ao dreno mágico.' },
  EDG: { text: 'Sorte e ousadia. Gaste para rolar de novo, agir antes ou escapar da morte por um triz.', fits: 'virar o jogo nos momentos críticos.' },
  MAG: { text: 'A força da conexão mágica. Limita magias, poderes e espíritos.', fits: 'magia mais potente.' },
  RES: { text: 'A força da conexão do tecnomante com a Matriz.', fits: 'formas complexas e sprites mais fortes.' },
  ESS: { text: 'O quanto do corpo ainda é original. Implantes gastam Essência e reduzem Magia e Ressonância.', fits: '' },
};

export const KNOWLEDGE_CATEGORY_HELP: Record<string, Help> = {
  Academic: { text: 'Conhecimento de estudo formal: história, biologia, literatura, magia teórica. Usa Lógica.' },
  Professional: { text: 'Saber de uma profissão: segurança corporativa, medicina, engenharia. Usa Lógica.' },
  Street: { text: 'Saber das ruas: gangues, pontos de venda, quem manda no bairro. Usa Intuição.' },
  Interest: { text: 'Hobbies e paixões: música, esportes, jogos, culinária. Usa Intuição.' },
  Language: { text: 'Idiomas. O nativo é de graça; os outros você compra como perícia. Usa Intuição.' },
};

export const SKILL_CATEGORY_HELP: Record<string, Help> = {
  'Combat Active': { text: 'Lutar e atirar.' },
  'Physical Active': { text: 'Corpo em ação: correr, nadar, se esconder, perceber.' },
  'Social Active': { text: 'Lidar com pessoas: convencer, enganar, intimidar, liderar.' },
  'Magical Active': { text: 'Usar magia: lançar feitiços, invocar espíritos, encantar objetos.' },
  'Pseudo-Magical Active': { text: 'Teoria mágica que qualquer pessoa pode estudar.' },
  'Resonance Active': { text: 'Habilidades exclusivas de tecnomantes.' },
  'Technical Active': { text: 'Mexer com máquinas, computadores, química e medicina.' },
  'Vehicle Active': { text: 'Pilotar e usar armas montadas em veículos.' },
};

export const SKILL_HELP: Record<string, Help> = {
  'Aeronautics Mechanic': { text: 'Consertar e modificar aviões, helicópteros e drones aéreos.' },
  Alchemy: { text: 'Prender magias em objetos para disparar depois (preparações).', fits: 'deixar magias prontas para usar.' },
  'Animal Handling': { text: 'Treinar, acalmar e montar animais.' },
  Arcana: { text: 'Teoria mágica: criar fórmulas de magia e projetar focos.' },
  Archery: { text: 'Arcos e bestas.' },
  Armorer: { text: 'Consertar e modificar armas e armaduras.' },
  Artificing: { text: 'Criar focos mágicos (objetos que guardam poder).' },
  Artisan: { text: 'Trabalhos manuais e artísticos: pintura, escultura, culinária fina.' },
  Assensing: { text: 'Ler auras no plano astral: emoções, saúde, magia ativa.', fits: 'investigar com a visão astral.' },
  'Astral Combat': { text: 'Lutar no plano astral contra espíritos e outros magos.' },
  Automatics: { text: 'Submetralhadoras, fuzis de assalto e armas automáticas.', fits: 'muito tiro em pouco tempo.' },
  'Automotive Mechanic': { text: 'Consertar e modificar carros, motos e veículos terrestres.' },
  Banishing: { text: 'Expulsar espíritos de volta ao lugar de onde vieram.' },
  Binding: { text: 'Prender um espírito a você por um tempo longo, com vários serviços.' },
  Biotechnology: { text: 'Bioware, clonagem e tecido cultivado.' },
  Blades: { text: 'Facas, espadas e lâminas em geral.' },
  Chemistry: { text: 'Química: drogas, venenos, explosivos improvisados.' },
  Clubs: { text: 'Bastões, cassetetes e objetos contundentes.' },
  Compiling: { text: 'Criar sprites, as entidades digitais do tecnomante.' },
  Computer: { text: 'Usar computadores e a Matriz de forma legal: buscar dados, editar arquivos.' },
  Con: { text: 'Enganar e mentir de forma convincente.', fits: 'ser o golpista do grupo.' },
  Counterspelling: { text: 'Defender você e os aliados de magias inimigas e desfazer feitiços.' },
  Cybercombat: { text: 'Atacar ícones na Matriz.' },
  Cybertechnology: { text: 'Instalar e consertar ciberware.' },
  Decompiling: { text: 'Destruir sprites.' },
  Demolitions: { text: 'Preparar e desarmar explosivos.' },
  Disenchanting: { text: 'Destruir ou desativar objetos e preparações mágicas.' },
  Disguise: { text: 'Mudar a aparência para não ser reconhecido.' },
  Diving: { text: 'Mergulho com equipamento.' },
  'Electronic Warfare': { text: 'Interferir em sinais e comunicações, controlar sensores.' },
  'Escape Artist': { text: 'Escapar de algemas, cordas e lugares apertados.' },
  Etiquette: { text: 'Se encaixar em qualquer ambiente sem chamar atenção: corporação, gangue, festa chique.' },
  'Exotic Melee Weapon': { text: 'Uma arma corpo a corpo incomum específica (chicote monofilamento, por exemplo).' },
  'Exotic Ranged Weapon': { text: 'Uma arma a distância incomum específica.' },
  'Pilot Exotic Vehicle': { text: 'Um tipo de veículo incomum específico.' },
  'First Aid': { text: 'Estancar sangramentos e estabilizar feridos no meio da ação.' },
  Flight: { text: 'Voar com o próprio corpo (para quem consegue).' },
  Forgery: { text: 'Falsificar documentos, assinaturas e objetos.' },
  'Free-Fall': { text: 'Saltos de paraquedas, rapel e quedas controladas.' },
  Gunnery: { text: 'Armas montadas em veículos e drones.' },
  Gymnastics: { text: 'Equilíbrio, saltos e acrobacias; também ajuda a esquivar.' },
  Hacking: { text: 'Invadir sistemas na Matriz e burlar segurança digital.', fits: 'ser o decker do grupo.' },
  Hardware: { text: 'Montar e consertar aparelhos eletrônicos.' },
  'Heavy Weapons': { text: 'Metralhadoras pesadas, lança-granadas e lança-mísseis.' },
  Impersonation: { text: 'Fingir ser outra pessoa específica.' },
  'Industrial Mechanic': { text: 'Máquinas industriais, sistemas de ventilação e encanamento.' },
  Instruction: { text: 'Ensinar outras pessoas.' },
  Intimidation: { text: 'Assustar e pressionar alguém a fazer o que você quer.' },
  Leadership: { text: 'Comandar e inspirar aliados no meio da confusão.' },
  Locksmith: { text: 'Abrir fechaduras mecânicas.' },
  Longarms: { text: 'Espingardas e fuzis de precisão.', fits: 'ser o atirador de longe.' },
  Medicine: { text: 'Tratamento médico de verdade: cirurgia, diagnóstico, recuperação.' },
  'Nautical Mechanic': { text: 'Consertar barcos e veículos aquáticos.' },
  Navigation: { text: 'Se orientar com mapa, bússola ou estrelas.' },
  Negotiation: { text: 'Barganhar e fechar acordos melhores.', fits: 'ser o “rosto” que fecha contratos.' },
  Palming: { text: 'Truques de mão: bater carteira, esconder objetos pequenos.' },
  Perception: { text: 'Notar detalhes, ouvir passos, perceber que algo está errado.', fits: 'não ser pego de surpresa (todo mundo deveria ter).' },
  Performance: { text: 'Tocar, cantar, atuar para um público.' },
  'Pilot Aerospace': { text: 'Veículos que vão ao espaço suborbital.' },
  'Pilot Aircraft': { text: 'Aviões, helicópteros e drones aéreos.' },
  'Pilot Ground Craft': { text: 'Carros, motos e caminhões.', fits: 'ser o motorista de fuga.' },
  'Pilot Walker': { text: 'Veículos com pernas.' },
  'Pilot Watercraft': { text: 'Barcos e submarinos.' },
  Pistols: { text: 'Pistolas de todos os tamanhos e tasers.' },
  Registering: { text: 'Prender um sprite ao tecnomante para usar por mais tempo.' },
  'Ritual Spellcasting': { text: 'Magias longas feitas com preparo, às vezes com outros magos.' },
  Running: { text: 'Correr rápido e por mais tempo.' },
  Sneaking: { text: 'Andar sem ser visto nem ouvido.', fits: 'entrar onde não foi convidado.' },
  Software: { text: 'Programar e criar ferramentas digitais.' },
  Spellcasting: { text: 'Lançar magias. A perícia principal de quem usa feitiços.', fits: 'ser o mago de combate ou de suporte.' },
  Summoning: { text: 'Chamar espíritos para ajudar por pouco tempo.', fits: 'ter aliados mágicos sob demanda.' },
  Survival: { text: 'Sobreviver fora da cidade: abrigo, comida, água.' },
  Swimming: { text: 'Nadar.' },
  'Throwing Weapons': { text: 'Facas de arremesso, granadas, shurikens.' },
  Tracking: { text: 'Seguir rastros e pegadas.' },
  'Unarmed Combat': { text: 'Luta sem armas: socos, chutes, artes marciais.', fits: 'bater sem precisar de arma.' },
};

export const SKILL_GROUP_HELP: Record<string, Help> = {
  acting: { text: 'Trapaça, Personificação e Performance juntas.' },
  athletics: { text: 'Voo, Ginástica, Corrida e Natação juntas.' },
  biotech: { text: 'Bioengenharia, Cibertecnologia, Primeiros Socorros e Medicina juntas.' },
  'close-combat': { text: 'Lâminas, Bastões e Combate Desarmado juntas.' },
  conjuring: { text: 'Banimento, Vinculação e Invocação: tudo sobre espíritos.' },
  cracking: { text: 'Cibercombate, Guerra Eletrônica e Hackear: o pacote do hacker.' },
  electronics: { text: 'Computador, Hardware e Software juntas.' },
  enchanting: { text: 'Alquimia, Artificiaria e Desencantação: magia em objetos.' },
  firearms: { text: 'Automáticas, Armas de Cano Longo e Pistolas juntas.' },
  influence: { text: 'Etiqueta, Liderança e Negociação juntas.' },
  engineering: { text: 'As quatro mecânicas: aeronáutica, automotiva, industrial e náutica.' },
  outdoors: { text: 'Navegação, Sobrevivência e Rastrear juntas.' },
  sorcery: { text: 'Contramágica, Conjuração Ritual e Conjuração: tudo sobre lançar magias.' },
  stealth: { text: 'Disfarce, Empalmar e Esgueirar juntas.' },
  tasking: { text: 'Compilar, Descompilar e Registrar: o trabalho do tecnomante com sprites.' },
};

export const QUALITY_HELP: Record<string, Help> = {
  Ambidextrous: { text: 'Usa as duas mãos igualmente bem, sem penalidade com a mão “errada”.' },
  'Analytical Mind': { text: 'Facilidade para resolver quebra-cabeças lógicos, análises e investigações.' },
  Aptitude: { text: 'Escolha uma perícia: ela pode chegar ao nível 7 em vez de 6.', fits: 'ser o melhor do mundo em uma coisa.' },
  'Astral Chameleon': { text: 'Sua aura se mistura ao ambiente; rastros astrais somem mais rápido.' },
  Bilingual: { text: 'Tem dois idiomas nativos.' },
  Blandness: { text: 'Rosto e jeito tão comuns que ninguém lembra de você.', fits: 'passar despercebido.' },
  Catlike: { text: 'Movimentos silenciosos e graciosos; ajuda a se esgueirar.' },
  Codeslinger: { text: 'Uma ação específica na Matriz fica mais fácil para você.' },
  'Double-Jointed': { text: 'Articulações muito flexíveis: escapar de amarras e caber em lugares apertados.' },
  'Exceptional Attribute': { text: 'Um atributo pode passar do máximo normal do metatipo em 1.', fits: 'um atributo extraordinário.' },
  'First Impression': { text: 'Causa ótima primeira impressão ao conhecer alguém.' },
  'Focused Concentration': { text: 'Consegue manter magias ativas com menos esforço.' },
  Gearhead: { text: 'Tira mais desempenho de veículos em manobras arriscadas.' },
  Guts: { text: 'Mais coragem diante de medo e horror.' },
  'High Pain Tolerance': { text: 'Ignora parte da dor dos ferimentos (por nível).', fits: 'continuar lutando machucado.' },
  'Home Ground': { text: 'Conhece um lugar como a palma da mão e leva vantagem lá.' },
  'Human-Looking': { text: 'Um metahumano que passa por humano, evitando preconceito.' },
  'Indomitable (Mental)': { text: 'Aumenta o limite Mental (por nível).' },
  'Indomitable (Physical)': { text: 'Aumenta o limite Físico (por nível).' },
  'Indomitable (Social)': { text: 'Aumenta o limite Social (por nível).' },
  Juryrigger: { text: 'Bom em consertos improvisados e gambiarras.' },
  Lucky: { text: 'Trunfo pode passar do máximo normal em 1.', fits: 'escapar das piores situações.' },
  'Magic Resistance': { text: 'Resiste melhor a magias, inclusive as que ajudam você.' },
  'Mentor Spirit': { text: 'Um espírito-guia que inspira o personagem e dá vantagens em troca de seguir seu jeito.', fits: 'um mago ou adepto com personalidade forte.' },
  'Natural Athlete': { text: 'Facilidade com esportes e esforço físico.' },
  'Natural Hardening': { text: 'A mente resiste melhor a ataques de biofeedback na Matriz.' },
  'Natural Immunity (Natural)': { text: 'Imune a uma doença ou toxina natural específica.' },
  'Natural Immunity (Synthetic)': { text: 'Imune a uma droga ou toxina sintética específica.' },
  'Photographic Memory': { text: 'Lembra de quase tudo que viu ou ouviu.' },
  'Quick Healer': { text: 'Se recupera de ferimentos mais rápido.' },
  'Resistance to Pathogens': { text: 'Resiste melhor a doenças.' },
  'Resistance to Toxins': { text: 'Resiste melhor a venenos e drogas.' },
  'Resistance to Pathogens and Toxins': { text: 'Resiste melhor a doenças, venenos e drogas.' },
  'Spirit Affinity': { text: 'Um tipo de espírito simpatiza com você e colabora mais.' },
  Toughness: { text: 'Aguenta mais dano antes de se machucar de verdade.', fits: 'ser difícil de derrubar.' },
  'Will to Live': { text: 'Aguenta mais tempo à beira da morte (caixas extras de excedente).' },
  'Addiction (Mild)': { text: 'Dependência leve de uma droga ou hábito; incomoda de vez em quando.' },
  'Addiction (Moderate)': { text: 'Dependência que exige atenção constante.' },
  'Addiction (Severe)': { text: 'Dependência séria que atrapalha o dia a dia.' },
  'Addiction (Burnout)': { text: 'Dependência no limite; a vida gira em torno dela.' },
  'Allergy (Uncommon, Mild)': { text: 'Alergia a algo raro, com reação leve.' },
  'Allergy (Uncommon, Moderate)': { text: 'Alergia a algo raro, com reação moderada.' },
  'Allergy (Uncommon, Severe)': { text: 'Alergia a algo raro, com reação forte.' },
  'Allergy (Uncommon, Extreme)': { text: 'Alergia a algo raro, com reação perigosa.' },
  'Allergy (Common, Mild)': { text: 'Alergia a algo comum, com reação leve.' },
  'Allergy (Common, Moderate)': { text: 'Alergia a algo comum, com reação moderada.' },
  'Allergy (Common, Severe)': { text: 'Alergia a algo comum, com reação forte.' },
  'Allergy (Common, Extreme)': { text: 'Alergia a algo comum, com reação perigosa.' },
  'Astral Beacon': { text: 'Sua aura chama atenção no plano astral; é fácil de rastrear.' },
  'Bad Luck': { text: 'Às vezes, usar Trunfo dá exatamente o resultado oposto.' },
  'Bad Rep': { text: 'Tem fama ruim nas ruas desde o começo.' },
  'Code of Honor': { text: 'Segue um código que não quebra nem quando seria conveniente.' },
  Codeblock: { text: 'Uma ação específica na Matriz é difícil para você.' },
  'Combat Paralysis': { text: 'Trava no começo de um combate.' },
  'Dependent (Nuisance)': { text: 'Alguém que depende de você e às vezes atrapalha.' },
  'Dependent (Inconvenience)': { text: 'Alguém que depende de você e exige tempo e dinheiro.' },
  'Dependent (Demanding)': { text: 'Alguém que depende muito de você; é uma responsabilidade grande.' },
  'Distinctive Style': { text: 'Visual marcante que todo mundo lembra.' },
  'Elf Poser': { text: 'Humano que tenta se passar por elfo.' },
  Gremlins: { text: 'Aparelhos costumam falhar perto de você (por nível).' },
  Incompetent: { text: 'Totalmente inapto em um grupo de perícias.' },
  'Insomnia (Basic)': { text: 'Dorme mal e demora a se recuperar do cansaço.' },
  'Insomnia (Full)': { text: 'Quase não dorme; o cansaço pesa bastante.' },
  'Loss of Confidence': { text: 'Perdeu a confiança em uma perícia que dominava.' },
  'Low Pain Tolerance': { text: 'Sente mais os ferimentos.' },
  'Ork Poser': { text: 'Humano ou elfo que tenta se passar por ork.' },
  'Prejudiced (Common, Biased)': { text: 'Não gosta de um grupo comum de pessoas.' },
  'Prejudiced (Common, Outspoken)': { text: 'Fala abertamente contra um grupo comum de pessoas.' },
  'Prejudiced (Common, Radical)': { text: 'Odeia um grupo comum de pessoas e age contra ele.' },
  'Prejudiced (Specific, Biased)': { text: 'Não gosta de um grupo específico de pessoas.' },
  'Prejudiced (Specific, Outspoken)': { text: 'Fala abertamente contra um grupo específico.' },
  'Prejudiced (Specific, Radical)': { text: 'Odeia um grupo específico e age contra ele.' },
  Scorched: { text: 'Já sofreu um ataque mental na Matriz e ficou com sequelas.' },
  'Sensitive System': { text: 'O corpo rejeita implantes com facilidade.', fits: '' },
  'Simsense Vertigo': { text: 'Fica desorientado com realidade aumentada e simsense.' },
  'SINner (Corporate)': { text: 'Tem uma identidade oficial de corporação: registrado e rastreável.' },
  'SINner (National)': { text: 'Tem identidade oficial de um país: registrado e rastreável.' },
  'SINner (Corporate Limited)': { text: 'Identidade corporativa limitada: registrado, com menos privilégios.' },
  'SINner (Criminal)': { text: 'Identidade oficial marcada com ficha criminal.' },
  'Social Stress': { text: 'Situações sociais de um certo tipo deixam você tenso.' },
  'Spirit Bane': { text: 'Um tipo de espírito odeia você.' },
  Uncouth: { text: 'Grosso e impulsivo; aprender perícias sociais custa o dobro.' },
  Uneducated: { text: 'Pouco estudo; perícias técnicas e acadêmicas custam o dobro.' },
  'Unsteady Hands': { text: 'Mãos que tremem em momentos de tensão.' },
  'Weak Immune System': { text: 'Fica doente com facilidade.' },
};

export const POWER_HELP: Record<string, Help> = {
  'Adrenaline Boost': { text: 'Explosão de velocidade no começo de um combate.' },
  'Astral Perception': { text: 'Enxergar o plano astral como um mago.' },
  'Attribute Boost': { text: 'Aumenta um atributo físico por pouco tempo.' },
  'Combat Sense': { text: 'Sexto sentido para perigo em combate; ajuda a se defender.' },
  'Critical Strike': { text: 'Golpes desarmados causam mais dano.' },
  'Danger Sense': { text: 'Pressente emboscadas e surpresas.' },
  'Enhanced Perception': { text: 'Sentidos mais aguçados em testes de percepção.' },
  'Enhanced Accuracy (skill)': { text: 'Mais precisão com um tipo de arma.' },
  'Improved Ability (skill)': { text: 'Bônus em uma perícia escolhida.' },
  'Improved Physical Attribute': { text: 'Aumenta permanentemente um atributo físico.' },
  'Improved Potential (Social)': { text: 'Aumenta o limite Social.' },
  'Improved Potential (Mental)': { text: 'Aumenta o limite Mental.' },
  'Improved Potential (Physical)': { text: 'Aumenta o limite Físico.' },
  'Improved Reflexes': { text: 'Reflexos sobre-humanos: mais Reação e dados de iniciativa.', fits: 'agir antes e mais vezes.' },
  'Improved Sense': { text: 'Um sentido especial, como visão no escuro ou audição extra.' },
  'Killing Hands': { text: 'Golpes desarmados podem causar dano físico mortal.' },
  Kinesics: { text: 'Controle total da linguagem corporal: mentir e esconder emoções.' },
  'Light Body': { text: 'Saltos maiores e quedas mais suaves.' },
  'Missile Parry': { text: 'Pegar ou desviar projéteis arremessados.' },
  'Mystic Armor': { text: 'Uma armadura mágica invisível que protege o corpo.' },
  'Natural Immunity': { text: 'Resiste a doenças e venenos.' },
  'Pain Resistance': { text: 'Ignora parte da dor dos ferimentos.' },
  'Rapid Healing': { text: 'Cura mais rápido.' },
  'Spell Resistance': { text: 'Resiste melhor a magias.' },
  'Traceless Walk': { text: 'Anda sem deixar pegadas nem fazer barulho de passos.' },
  'Voice Control': { text: 'Imitar vozes e controlar volume e tom.' },
  'Wall Running': { text: 'Correr por paredes por alguns metros.' },
};

export const SPELL_CATEGORY_HELP: Record<string, Help> = {
  Combat: { text: 'Magias de ataque direto: bolas de fogo, raios, golpes de mana.' },
  Detection: { text: 'Perceber à distância: ver através de paredes, ler mentes, achar pessoas.' },
  Health: { text: 'Curar, fortalecer e tratar o corpo.' },
  Illusion: { text: 'Enganar os sentidos: invisibilidade, imagens falsas, silêncio.' },
  Manipulation: { text: 'Controlar mentes, mover objetos, criar barreiras e transformar coisas.' },
  Rituals: { text: 'Magias longas, feitas com preparo e tempo.' },
};

export const TRADITION_HELP: Record<string, Help> = {
  Hermetic: { text: 'Magia como ciência: estudo, fórmulas e lógica. Resiste ao dreno com Vontade + Lógica.', fits: 'um mago acadêmico.' },
  Shamanic: { text: 'Magia como relação com a natureza e os espíritos. Resiste ao dreno com Vontade + Carisma.', fits: 'um xamã ligado a espíritos e totens.' },
};

export const STREAM_HELP: Record<string, Help> = {
  Default: { text: 'O jeito padrão do tecnomante lidar com a Matriz. Resiste ao desvanecimento com Vontade + Ressonância.' },
};

export const LIFESTYLE_HELP: Record<string, Help> = {
  Street: { text: 'Mora na rua. Não custa nada, mas é perigoso e desconfortável.' },
  Squatter: { text: 'Um canto improvisado em prédio abandonado ou abrigo.' },
  Low: { text: 'Apartamento pequeno em bairro barra-pesada.' },
  Medium: { text: 'Apartamento decente em bairro seguro.', fits: 'um pouco de conforto e segurança.' },
  High: { text: 'Bom apartamento em área protegida, com serviços.' },
  Luxury: { text: 'O melhor que o dinheiro compra.' },
  'Hospitalized, Basic': { text: 'Internado em tratamento básico.' },
  'Hospitalized, Intensive': { text: 'Internado em terapia intensiva.' },
};

export const GEAR_KIND_HELP: Record<string, Help> = {
  weapon: { text: 'Armas de fogo, lâminas e armas exóticas.' },
  armor: { text: 'Roupas e coletes que reduzem o dano recebido.' },
  cyberware: { text: 'Implantes de máquina. Gastam Essência.' },
  bioware: { text: 'Implantes biológicos cultivados. Gastam Essência.' },
  gear: { text: 'Todo o resto: comlinks, munição, ferramentas, drogas, identidades falsas.' },
};

export const GRADE_HELP: Record<string, Help> = {
  standard: { text: 'Implante comum.' },
  alpha: { text: 'Melhor acabamento: gasta 20% menos Essência, custa 20% mais e é mais difícil de achar.' },
  used: { text: 'De segunda mão: mais barato e fácil de achar, mas gasta 25% mais Essência.' },
};

export { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryCategory, type GlossaryEntry } from './glossary';

export const COMPLEX_FORM_HELP: Record<string, Help> = {
  Cleaner: { text: 'Apaga marcas e rastros que o tecnomante deixou, baixando a atenção que ele atraiu.' },
  'Diffusion of [Matrix Attribute]': { text: 'Enfraquece um atributo de Matriz de um aparelho alvo.' },
  Editor: { text: 'Mexe em um arquivo: lê, copia, altera ou apaga sem precisar de programa.' },
  'Infusion of [Matrix Attribute]': { text: 'Reforça um atributo de Matriz de um aparelho por um tempo.' },
  'Static Veil': { text: 'Esconde uma persona, deixando-a mais difícil de achar na Matriz.' },
  'Pulse Storm': { text: 'Enche os sentidos de uma persona com ruído, atrapalhando o que ela faz.' },
  Puppeteer: { text: 'Força um aparelho a executar uma ação que você escolhe.' },
  'Resonance Channel': { text: 'Abre um canal de comunicação mais difícil de interferir.' },
  'Resonance Spike': { text: 'Ataque direto que danifica um aparelho.' },
  'Resonance Veil': { text: 'Faz o alvo acreditar em algo falso na Matriz (uma ilusão digital).' },
  'Static Bomb': { text: 'Some de vista por um instante: todos perdem a pista de você.' },
  Stitches: { text: 'Conserta um sprite danificado.' },
  'Transcendent Grid': { text: 'Acessa qualquer grade da Matriz sem precisar de assinatura.' },
  Tattletale: { text: 'Faz uma persona chamar atenção, como se estivesse fazendo algo ilegal.' },
};
