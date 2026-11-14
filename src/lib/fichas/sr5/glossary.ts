/**
 * Glossário de Shadowrun 5ª edição, acessível em qualquer tela da ficha.
 *
 * Escrito por nós, com nossas palavras, para quem nunca jogou. Não é cópia dos
 * livros oficiais: resume a ideia de cada regra para orientar; na mesa, vale o livro.
 * O termo em inglês vai entre parênteses quando ajuda a achar a regra nos livros.
 */

export const GLOSSARY_CATEGORIES = [
  'Criação',
  'Testes e dados',
  'Combate',
  'Dano e cura',
  'Magia',
  'Matriz',
  'Riggers e veículos',
  'Equipamento',
  'Ruas e mundo',
] as const;

export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export interface GlossaryEntry {
  term: string;
  text: string;
  category: GlossaryCategory;
}

type Entry = Omit<GlossaryEntry, 'category'>;

const CRIACAO: Entry[] = [
  { term: 'Prioridades', text: 'Sistema de criação: você ordena de A (mais importante) a E (menos) cinco áreas: metatipo, magia, atributos, perícias e recursos. Cada letra só pode ser usada uma vez.' },
  { term: 'Metatipo', text: 'A “raça” do personagem: humano, elfo, anão, ork ou troll.' },
  { term: 'Atributo', text: 'Capacidade básica do personagem (força, agilidade, lógica…). Normalmente de 1 a 6.' },
  { term: 'Máximo natural', text: 'O valor mais alto que um atributo pode ter para o seu metatipo. Na criação, só um atributo físico ou mental pode chegar lá.' },
  { term: 'Pontos especiais', text: 'Pontos da prioridade de Metatipo usados só em Trunfo, Magia e Ressonância.' },
  { term: 'Trunfo (Edge)', text: 'Sorte e ousadia. Você gasta para rolar dados de novo ou escapar de situações impossíveis.' },
  { term: 'Perícia', text: 'Algo que o personagem aprendeu a fazer. Nível 1 é iniciante; 6 é profissional de elite.' },
  { term: 'Grupo de perícias', text: 'Um pacote de perícias relacionadas compradas juntas, mais barato. Para subir uma só, você usa karma.' },
  { term: 'Especialização', text: 'Um foco dentro de uma perícia (ex.: Pistolas → Revólveres) que dá +2 dados quando se aplica.' },
  { term: 'Conhecimento', text: 'Perícias de saber: gangues, história, idiomas. Os pontos são de graça: (Intuição + Lógica) × 2.' },
  { term: 'Karma', text: 'Moeda de evolução do personagem. Na criação você tem 25 para comprar qualidades e extras. Até 7 sobram para o jogo.' },
  { term: 'Nuyen (¥)', text: 'O dinheiro do mundo de Shadowrun. Na criação, até 5.000¥ sobram para o jogo.' },
  { term: 'Qualidade', text: 'Vantagem (positiva, custa karma) ou desvantagem (negativa, dá karma). No máximo 25 de karma em cada tipo.' },
  { term: 'Essência', text: 'Começa em 6. Implantes gastam Essência. Se chegar a 0, o personagem morre; para quem tem magia, cada ponto perdido também reduz Magia.' },
  { term: 'Disponibilidade', text: 'O quão difícil é conseguir um item. Na criação, o limite é 12. R = restrito (precisa de licença); F = proibido.' },
  { term: 'Limite', text: 'Teto de sucessos que você pode usar num teste. Há limites Físico, Mental e Social, calculados dos atributos.' },
  { term: 'Contato', text: 'Alguém que o personagem conhece. Conexão = quanto poder/alcance a pessoa tem; Lealdade = quanto ela gosta de você.' },
  { term: 'Estilo de vida', text: 'Onde e como o personagem vive. É pago por mês.' },
  { term: 'Atributos derivados', text: 'Valores calculados a partir dos atributos, sem pontos próprios: iniciativa, limites, monitores de condição, Compostura, Ler Pessoas, Memória, Levantar/Carregar e movimento.' },
  { term: 'Evolução com karma', text: 'Depois da criação, tudo sobe com karma. Em linhas gerais: atributo custa o novo nível × 5; perícia, o novo nível × 2; perícia nova, 2; especialização, 7; magia ou forma complexa nova, 5.' },
];

const TESTES: Entry[] = [
  { term: 'Parada de dados (Dice pool)', text: 'Quantos dados de seis faces você rola num teste. Quase sempre é atributo + perícia, mais ou menos modificadores.' },
  { term: 'Sucesso (Hit)', text: 'Cada dado que cai 5 ou 6. Você não soma os números: conta quantos sucessos tirou.' },
  { term: 'Limiar (Threshold)', text: 'Quantos sucessos o teste exige. Como referência: 1 é fácil, 2 é médio, 4 é difícil e 6 ou mais é para especialistas.' },
  { term: 'Sucessos líquidos (Net hits)', text: 'O que sobra depois de descontar o limiar ou os sucessos do oponente. Muitas regras crescem com eles: mais dano, mais informação, mais tempo de efeito.' },
  { term: 'Teste resistido (Opposed test)', text: 'Os dois lados rolam e quem tirar mais sucessos vence. Empate favorece quem está se defendendo.' },
  { term: 'Teste estendido', text: 'Tarefa demorada: você rola várias vezes e soma os sucessos até chegar ao limiar. A cada nova rolagem perde 1 dado, então não dá para tentar para sempre.' },
  { term: 'Falha (Glitch)', text: 'Quando mais da metade dos dados rolados dá 1. Algo sai errado, mesmo que você tenha conseguido sucessos.' },
  { term: 'Falha crítica (Critical glitch)', text: 'Uma falha sem nenhum sucesso. É o desastre: a arma trava, o alarme dispara, o carro capota.' },
  { term: 'Sem treino (Defaulting)', text: 'Tentar algo sem a perícia: rola só o atributo, com −1. Algumas perícias muito técnicas ou mágicas não permitem isso.' },
  { term: 'Trabalho em equipe', text: 'Ajudantes rolam primeiro; cada sucesso deles vira um dado extra para quem lidera o teste, e cada ajudante que acerta aumenta em 1 o limite do líder.' },
  { term: 'Comprar sucessos', text: 'Em situações sem pressão, o mestre pode deixar você trocar dados por sucessos garantidos: cada 4 dados viram 1 sucesso, sem rolar.' },
  { term: 'Romper o limite (Push the Limit)', text: 'Uso de Trunfo antes de rolar: soma seu Trunfo à parada, os 6 são rolados de novo e geram mais sucessos (regra dos seis), e o teste ignora o limite.' },
  { term: 'Segunda chance', text: 'Uso de Trunfo depois de rolar: rola de novo todos os dados que não deram sucesso.' },
  { term: 'Outros usos de Trunfo', text: 'Também dá para agir primeiro no turno, ganhar 5 dados de iniciativa por um turno, anular uma falha (ou rebaixar uma falha crítica) e agir uma última vez antes de desmaiar. Os pontos voltam no começo de cada sessão ou quando o mestre recompensa.' },
  { term: 'Queimar Trunfo', text: 'Gastar 1 ponto permanente de Trunfo para sobreviver a algo que mataria o personagem ou garantir um sucesso decisivo. O ponto só volta comprando com karma.' },
  { term: 'Modificadores', text: 'Dados somados ou tirados da parada por condições: escuridão, ferimentos, cobertura, equipamento, ajuda. Um teste pode ter vários ao mesmo tempo.' },
];

const COMBATE: Entry[] = [
  { term: 'Iniciativa', text: 'Define quem age primeiro no combate: Reação + Intuição + dados. O máximo é 5 dados.' },
  { term: 'Turno de combate e passes', text: 'Todos agem em ordem de iniciativa. No fim de cada passe, todo mundo perde 10 de iniciativa; quem ainda tiver mais que 0 age de novo. Iniciativa alta = mais ações por turno.' },
  { term: 'Ações (livre, simples, complexa)', text: 'Em cada passe você faz uma ação complexa (como atirar em rajada longa ou lançar magia) ou duas simples (como sacar e mirar), mais uma ação livre (como falar uma frase curta).' },
  { term: 'Ação de interrupção', text: 'Reações fora da sua vez, como esquivar, aparar ou entrar em defesa total. Custam pontos de iniciativa, então defender demais faz você agir menos.' },
  { term: 'Defesa', text: 'Quem é atacado rola Reação + Intuição contra os sucessos do atacante. Se empatar ou ganhar, o ataque erra.' },
  { term: 'Defesa total', text: 'Você abre mão de 10 de iniciativa para somar sua Vontade a todas as defesas até o fim do turno.' },
  { term: 'Surpresa', text: 'No começo de uma emboscada, quem não percebe a tempo perde iniciativa e não pode reagir direito contra o primeiro golpe.' },
  { term: 'Precisão (Accuracy)', text: 'O limite das armas. Num ataque, os sucessos não passam da Precisão da arma, por melhor que seja o atirador.' },
  { term: 'Valor de dano (VD)', text: 'O dano base de um ataque. Os sucessos líquidos do atacante somam ao VD antes de o alvo resistir.' },
  { term: 'Penetração de armadura (PA)', text: 'Número negativo da arma que reduz a armadura do alvo na hora de resistir ao dano. PA −4 contra armadura 12 deixa armadura 8.' },
  { term: 'Modos de disparo', text: 'TS = um tiro por ação; SA = semiautomático, dois tiros rápidos; RR = rajada curta de três balas; AU = automático. Mais balas dão mais dano ou atrapalham a esquiva, mas geram recuo.' },
  { term: 'Recuo e compensação', text: 'Cada bala depois da primeira no mesmo turno soma recuo, que tira dados dos tiros seguintes. A compensação vem da Força e de acessórios como coronha e cano com amortecedor.' },
  { term: 'Alcance (Reach)', text: 'Vantagem no corpo a corpo de quem tem braço ou arma mais longa. Trolls já nascem com alcance maior.' },
  { term: 'Cobertura', text: 'Estar atrás de algo dá dados extras para se defender de tiros. Cobertura total impede ser alvo direto.' },
  { term: 'Mira', text: 'Gastar ações mirando antes de atirar dá dados extras, até um máximo, desde que você não seja interrompido.' },
];

const DANO: Entry[] = [
  { term: 'Monitor de condição', text: 'Caixas de dano. O Físico mede ferimentos; o de Atordoamento mede cansaço e pancada. Cada 3 caixas marcadas dão −1 nos testes.' },
  { term: 'Tamanho dos monitores', text: 'Monitor Físico: 8 + metade do Corpo (arredondada para cima). Monitor de Atordoamento: 8 + metade da Vontade.' },
  { term: 'Resistir ao dano', text: 'O alvo rola Corpo + Armadura (já reduzida pela PA). Cada sucesso tira 1 ponto do dano; o que sobra vira caixas marcadas.' },
  { term: 'Dano físico × atordoamento', text: 'Físico (P) são ferimentos de verdade; atordoamento (S) é pancada e exaustão. Se o dano de um ataque físico for menor que a armadura do alvo, ele vira atordoamento.' },
  { term: 'Modificador de ferimento', text: 'A cada 3 caixas marcadas em qualquer monitor, −1 dado em quase todos os testes. Ferimentos se somam entre os dois monitores.' },
  { term: 'Inconsciente', text: 'Com o monitor de Atordoamento cheio, você apaga. Qualquer dano de atordoamento além disso passa para o monitor Físico.' },
  { term: 'Excedente (Overflow)', text: 'Com o monitor Físico cheio, o personagem está morrendo. Ele aguenta mais caixas iguais ao seu Corpo; passou disso, morre. Sem ajuda, perde uma caixa a mais de tempos em tempos.' },
  { term: 'Primeiros socorros', text: 'Tratamento rápido logo depois do ferimento: cada sucesso cura uma caixa. Só funciona uma vez por ferimento.' },
  { term: 'Cura natural', text: 'Descansando, você rola Corpo + Vontade: atordoamento sara em horas; dano físico, em dias. Implantes demais e magia de cura mudam esse ritmo.' },
  { term: 'Estabilizar', text: 'Parar a perda de caixas de quem está no excedente. É o primeiro passo antes de qualquer cura.' },
];

const MAGIA: Entry[] = [
  { term: 'Desperto (Awakened)', text: 'Quem tem o atributo Magia: magos, adeptos e afins. O contrário é mundano.' },
  { term: 'Plano astral', text: 'Uma dimensão mágica paralela que magos e alguns adeptos enxergam.' },
  { term: 'Tradição', text: 'A forma como o mago entende a magia (hermética, xamânica). Define que atributos resistem ao dreno e que espíritos ele invoca.' },
  { term: 'Dreno', text: 'O cansaço que a magia causa em quem lança. Resistido por Vontade + outro atributo da tradição.' },
  { term: 'Força da magia (Force)', text: 'O nível de poder que o mago escolhe ao lançar. Serve de limite para os sucessos e aumenta o dreno. Pode ir até o dobro da Magia.' },
  { term: 'Forçar a magia (Overcasting)', text: 'Quando os sucessos passam da sua Magia, o dreno deixa de ser cansaço e vira ferimento físico. Poder demais cobra caro.' },
  { term: 'Sustentar magia', text: 'Magias que duram (como invisibilidade ou armadura) precisam ser mantidas. Cada uma mantida dá −2 dados em todos os seus testes.' },
  { term: 'Magia de mana × física', text: 'Mana só afeta seres vivos e mágicos e é resistida com Vontade. Física afeta qualquer coisa, inclusive máquinas e câmeras, e é resistida com Corpo.' },
  { term: 'Magia direta × indireta', text: 'Direta acerta o alvo por dentro: não dá para esquivar e armadura não protege. Indireta cria algo real (fogo, raio, ácido): dá para esquivar e a armadura ajuda.' },
  { term: 'Linha de visão', text: 'Para lançar a maioria das magias você precisa ver o alvo, com os próprios olhos ou pela visão astral. Câmeras e telas não servem.' },
  { term: 'Espírito', text: 'Entidade do plano astral que o mago invoca para ajudar. Tem Força (poder) e deve um número de serviços igual aos sucessos líquidos da invocação.' },
  { term: 'Serviço', text: 'Uma tarefa que o espírito cumpre para você: lutar, vigiar, carregar algo, usar um poder. Quando os serviços acabam, ele vai embora.' },
  { term: 'Foco', text: 'Objeto mágico ligado ao dono com karma: dá dados para lançar, invocar ou lutar. Usar focos demais pode viciar.' },
  { term: 'Percepção astral', text: 'Olhar o plano astral sem sair do corpo: ver auras, emoções, magia ativa e espíritos. Enquanto faz isso, você também fica visível e vulnerável lá.' },
  { term: 'Projeção astral', text: 'O mago deixa o corpo e viaja pelo plano astral. O corpo fica largado e indefeso até ele voltar. Adeptos não projetam.' },
  { term: 'Aura', text: 'A “assinatura” de tudo que é vivo ou mágico no plano astral. Revela saúde, emoções, implantes e se a pessoa é Desperta.' },
  { term: 'Assinatura astral', text: 'Rastro que magia deixa no lugar e no alvo por um tempo. Outro mago pode segui-lo até você.' },
  { term: 'Fundo mágico (Background count)', text: 'Lugares marcados por sofrimento ou poder (cemitérios, zonas tóxicas, templos) que atrapalham a magia, tirando dados.' },
  { term: 'Iniciação', text: 'Passo de evolução mágica, pago com karma. Cada grau aumenta o máximo de Magia e libera uma técnica de metamagia.' },
  { term: 'Metamagia', text: 'Técnicas avançadas que só iniciados aprendem, como esconder a aura ou lançar magias com mais controle.' },
  { term: 'Espírito mentor', text: 'Um arquétipo espiritual (Urso, Lobo, Corvo…) que guia o Desperto. Dá bônus em troca de seguir o jeito dele, com uma pequena desvantagem.' },
  { term: 'Pontos de poder', text: 'O “orçamento” de poderes do adepto. O adepto recebe igual à Magia; o adepto místico compra com karma.' },
  { term: 'Ritual', text: 'Magia lenta, feita com preparo e às vezes com vários magos. Alcança alvos longe ou cria efeitos permanentes, como barreiras mágicas.' },
  { term: 'Preparação alquímica', text: 'Magia guardada num objeto para ser disparada depois, por toque, comando ou gatilho. Perde força com o tempo.' },
  { term: 'Reagentes', text: 'Materiais mágicos raros, comprados em drams, usados para ajudar em rituais, preparações e invocações.' },
];

const MATRIZ: Entry[] = [
  { term: 'Matriz', text: 'A rede mundial de computadores do mundo de Shadowrun, vista em realidade virtual ou aumentada.' },
  { term: 'Realidade aumentada (RA)', text: 'Informação digital sobreposta ao mundo real, vista em óculos, lentes ou implantes. É como quase todo mundo usa a Matriz no dia a dia.' },
  { term: 'Realidade virtual (RV)', text: 'Mergulho completo na Matriz: o corpo fica parado e a mente vive lá dentro. É mais rápido que RA, mas mais arriscado.' },
  { term: 'RV fria × RV quente', text: 'Fria é segura: dano da Matriz vira só atordoamento. Quente dá mais velocidade e dados, mas o dano vira ferimento físico e pode matar.' },
  { term: 'Simsense', text: 'Sensações gravadas ou transmitidas direto para o cérebro. Base da RV, do entretenimento e, em versões ilegais (BTL), de drogas digitais.' },
  { term: 'Persona e ícone', text: 'Persona é você na Matriz; ícone é a aparência de qualquer coisa lá dentro: pessoas, arquivos, aparelhos, programas.' },
  { term: 'Grade (Grid)', text: 'Uma rede de acesso à Matriz, geralmente de uma corporação ou cidade. Estar na grade errada para o alvo tira dados.' },
  { term: 'Host', text: 'Um “prédio” virtual de uma empresa ou organização, com segurança própria. Os dados valiosos costumam estar dentro de um.' },
  { term: 'Atributos de Matriz', text: 'Ataque, Adulteração (Sleaze), Processamento de Dados e Firewall, apelidados de ASDF. Medem força ofensiva, furtividade, velocidade e defesa de um aparelho.' },
  { term: 'Marca (Mark)', text: 'Uma permissão invisível que você planta num alvo. Quanto mais marcas (até 3), mais coisas você pode fazer com ele. O dono legítimo tem 4.' },
  { term: 'Supervisão (Overwatch)', text: 'Pontuação secreta que cresce a cada ação ilegal do hacker. Chegando a 40, a polícia da Matriz te derruba, causa dano e revela onde você está.' },
  { term: 'Convergência', text: 'O momento em que a Supervisão chega ao máximo: o hacker é jogado para fora, sofre dano e sua localização física é entregue às autoridades.' },
  { term: 'Ruído', text: 'Interferência por distância, paredes grossas ou bloqueadores de sinal. Tira dados das ações na Matriz.' },
  { term: 'Bônus sem fio', text: 'Muitos equipamentos funcionam melhor ligados à Matriz. Em troca, ficam expostos a hackers inimigos.' },
  { term: 'Comlink', text: 'O “celular” do Sexto Mundo: telefone, computador, carteira, documento e porta de entrada para a Matriz. Todo mundo tem um.' },
  { term: 'Ciberdeck', text: 'Computador especializado do decker para invadir sistemas. Seus atributos de Matriz podem ser reorganizados conforme a situação.' },
  { term: 'Decker', text: 'Hacker que usa ciberdeck para invadir sistemas, roubar dados e derrubar defesas.' },
  { term: 'Tecnomante', text: 'Alguém que acessa a Matriz com a própria mente, sem aparelhos. Usa formas complexas e sprites.' },
  { term: 'Forma complexa', text: 'O equivalente às magias para tecnomantes: efeitos que eles criam na Matriz com a mente.' },
  { term: 'Sprite', text: 'Entidade digital criada por um tecnomante para ajudá-lo na Matriz.' },
  { term: 'Desvanecimento (Fading)', text: 'O dreno do tecnomante: o esforço mental de usar formas complexas e compilar sprites.' },
  { term: 'Biofeedback', text: 'Dano que a Matriz causa direto no cérebro de quem está em RV. É o que faz IC e hackers serem perigosos de verdade.' },
  { term: 'Choque de despejo (Dumpshock)', text: 'Ser desconectado à força da RV. Causa dano e deixa a pessoa desorientada por um tempo.' },
  { term: 'IC', text: 'Programas de segurança que patrulham um host e atacam invasores. Uns só atrasam, outros rastreiam, outros queimam o cérebro.' },
  { term: 'Aranha (Spider)', text: 'Hacker de segurança que vigia um host por dentro e caça invasores, geralmente com apoio de IC.' },
  { term: 'Programas', text: 'Software rodando no deck que melhora ações específicas: mais dano, mais furtividade, mais defesa. O deck só roda alguns por vez.' },
];

const RIGGERS: Entry[] = [
  { term: 'Rigger', text: 'Especialista em veículos e drones que se conecta a eles pela mente, pilotando como se fossem o próprio corpo.' },
  { term: 'Interface de controle (Control rig)', text: 'Implante que deixa o rigger “entrar” no veículo e controlá-lo direto pelo cérebro, mais rápido que qualquer piloto comum.' },
  { term: 'Entrar no veículo (Jump in)', text: 'O rigger passa a sentir o veículo como seu corpo, em RV. Usa as próprias perícias, mas sente o dano que o veículo sofre.' },
  { term: 'Console de comando (RCC)', text: 'Computador do rigger que comanda uma rede de drones, compartilha programas entre eles e protege essa rede de hackers.' },
  { term: 'Drone', text: 'Veículo sem tripulação, de um inseto espião a um tanque de combate. Age sozinho com seu piloto automático ou sob comando do rigger.' },
  { term: 'Piloto (atributo)', text: 'A “inteligência” do piloto automático de um veículo ou drone. Ele rola Piloto + o autosoft certo quando age sozinho.' },
  { term: 'Autosoft', text: 'Programa que ensina um drone a fazer algo: pilotar, mirar, evitar ataques, perceber. Funciona como a perícia do drone.' },
  { term: 'Atributos de veículo', text: 'Manuseio (limite em manobras), Velocidade, Aceleração, Corpo (resistência), Armadura, Piloto e Sensor.' },
  { term: 'Sensor', text: 'O conjunto de câmeras e detectores do veículo ou drone. Define o quanto ele percebe.' },
];

const EQUIPAMENTO: Entry[] = [
  { term: 'Ciberware / Bioware', text: 'Implantes de máquina ou biológicos que melhoram o corpo, ao custo de Essência.' },
  { term: 'Grau do implante', text: 'Qualidade de fabricação: usado, padrão, alfa e superiores. Graus melhores gastam menos Essência e custam muito mais.' },
  { term: 'Capacidade', text: 'Espaço dentro de um implante ou equipamento para receber acessórios. Um ciberolho, por exemplo, tem vagas para visão noturna, zoom etc.' },
  { term: 'Valor de armadura', text: 'Quanto a roupa ou colete protege. Só vale a melhor peça principal; acessórios com “+” (capacete, escudo) somam a ela.' },
  { term: 'Smartgun e smartlink', text: 'Sistema que conecta a arma aos seus olhos: mostra a mira na visão e dá dados extras para acertar.' },
  { term: 'Munição especial', text: 'Balas que mudam o ataque: APDS atravessa armadura, gel derruba sem matar, explosiva causa mais dano, e por aí vai.' },
  { term: 'SIN falso', text: 'Identidade falsificada com nível de 1 a 6. Toda vez que é checada, o sistema testa contra esse nível; um SIN ruim cai fácil.' },
  { term: 'Licença', text: 'Permissão para portar itens restritos (R), presa a um SIN. Licença falsa precisa de um SIN falso para existir.' },
  { term: 'Certificado de crédito (Credstick)', text: 'Cartão de dinheiro eletrônico. Os sem registro são o jeito das ruas de pagar sem deixar rastro.' },
  { term: 'Kit de primeiros socorros (Medkit)', text: 'Equipamento médico portátil que ajuda nos testes de primeiros socorros e pode até orientar quem não sabe.' },
];

const MUNDO: Entry[] = [
  { term: 'Sexto Mundo', text: 'A era atual, que começou quando a magia voltou ao mundo. O jogo se passa no fim da década de 2070.' },
  { term: 'Despertar', text: 'O retorno da magia em 2011: dragões reapareceram, espíritos voltaram e algumas pessoas nasceram com o dom.' },
  { term: 'Goblinização', text: 'Em 2021, parte da humanidade se transformou de repente em orks e trolls. Origem de muito preconceito até hoje.' },
  { term: 'Metahumanidade', text: 'Todos os tipos de pessoas juntos: humanos, elfos, anões, orks e trolls, com suas variantes.' },
  { term: 'Megacorporação', text: 'Empresa gigantesca mais poderosa que muitos países, com exército, polícia e leis próprias. As maiores são chamadas de AAA.' },
  { term: 'Extraterritorialidade', text: 'Direito das grandes corporações de ter território próprio onde só as leis delas valem, como uma embaixada.' },
  { term: 'Shadowrunner', text: 'Profissional do crime contratado para trabalhos sujos entre corporações.' },
  { term: 'Corrida (Run)', text: 'Um trabalho nas sombras: roubo de dados, extração de pessoas, sabotagem, proteção, entrega.' },
  { term: 'Sr. Johnson', text: 'Nome genérico do contratante de uma corrida. Quase sempre representa uma corporação e nunca diz quem é de verdade.' },
  { term: 'Fixer', text: 'Intermediário que conecta runners a trabalhos, equipamentos e outros contatos, cobrando sua parte.' },
  { term: 'Face', text: 'O “rosto” do grupo: negocia com o Sr. Johnson, engana guardas e consegue informações conversando.' },
  { term: 'Samurai de rua', text: 'Guerreiro de aluguel cheio de implantes de combate. Costuma seguir algum código de honra próprio.' },
  { term: 'SIN', text: 'Número de identidade oficial. Quem não tem é “sem-SIN”: invisível para o sistema, mas sem direitos.' },
  { term: 'Barrens', text: 'Áreas abandonadas e sem lei das cidades, onde vivem os mais pobres e os sem-SIN. Policiamento quase não chega.' },
  { term: 'Segurança privada', text: 'A polícia das cidades é terceirizada para empresas, que atendem primeiro quem paga e protegem os interesses do contrato.' },
  { term: 'Dragão', text: 'Criaturas antigas, enormes e inteligentes. Alguns comandam corporações e influenciam a política mundial.' },
  { term: 'Crash', text: 'Colapsos da Matriz causados por vírus e ataques, que destruíram a rede antiga e mudaram as regras de segurança digital.' },
  { term: 'Reputação de rua (Street Cred)', text: 'O quanto o personagem é respeitado no submundo. Cresce com corridas bem-feitas.' },
  { term: 'Notoriedade', text: 'Fama ruim: traições, falhas e escândalos. Faz contatos e contratantes desconfiarem de você.' },
  { term: 'Consciência pública', text: 'O quanto o público e as autoridades sabem sobre você. Muito alto é péssimo para quem vive nas sombras.' },
  { term: 'Trid', text: 'A TV do futuro, em projeção tridimensional.' },
  { term: 'Gírias das ruas', text: 'Chummer = camarada; drek = lixo, porcaria; frag = palavrão genérico; wiz = muito bom; omae = amigo; null sheen = sem problemas; drekhead = idiota.' },
];

const SECTIONS: [GlossaryCategory, Entry[]][] = [
  ['Criação', CRIACAO],
  ['Testes e dados', TESTES],
  ['Combate', COMBATE],
  ['Dano e cura', DANO],
  ['Magia', MAGIA],
  ['Matriz', MATRIZ],
  ['Riggers e veículos', RIGGERS],
  ['Equipamento', EQUIPAMENTO],
  ['Ruas e mundo', MUNDO],
];

export const GLOSSARY: GlossaryEntry[] = SECTIONS.flatMap(([category, entries]) =>
  entries.map((e) => ({ ...e, category })),
);
