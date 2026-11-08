// Regras puras do Fruta Misteriosa: poderes, fase, física e estrelas.
// Nada aqui importa o Phaser, então dá pra testar com vitest.

export const W = 960;
export const H = 540;

/** Altura da superfície da água. Encostou abaixo disso, afundou. */
export const AGUA_Y = 462;

export type Ret = { x: number; y: number; w: number; h: number };
export type Ponto = { x: number; y: number };

// ---------- poderes ----------

export type PoderId = "borracha" | "gigante" | "fumaca" | "nanica" | "soluco";

/**
 * Configuração de um poder. O jogador é um só e troca de "modo":
 * fruta nova é só mais um objeto destes.
 */
export type Poder = {
  id: PoderId | "base";
  nome: string;
  /** O que o botão de poder faz, pra mostrar na tela. */
  dica: string;
  cor: number;
  opacidade: number;

  gravidade: number;
  pulo: number;
  /** Fração da velocidade de subida que sobra ao soltar o pulo cedo. */
  corteDoPulo: number;
  velocidade: number;
  aceleracaoChao: number;
  aceleracaoAr: number;
  freioChao: number;
  quedaMax: number;
  largura: number;
  altura: number;

  /** Quanto o vento empurra (0 = nada). */
  vento: number;
  /** Fração da velocidade de queda devolvida ao tocar o chão (0 = não quica). */
  quica: number;
  /** Queda máxima segurando pulo/poder no ar (0 = não plana). */
  plana: number;
  /** Alcance do braço até um gancho (0 = sem braço). */
  gancho: number;
  quebraParede: boolean;
  quebraFragil: boolean;
  atravessaGrade: boolean;
  puloDuplo: boolean;
  pisao: boolean;
  soluco: boolean;
  /** Chance relativa no sorteio. */
  peso: number;
};

export const BASE: Poder = {
  id: "base",
  nome: "Sem fruta",
  dica: "",
  cor: 0x2b2b2b,
  opacidade: 1,
  gravidade: 1900,
  pulo: 700,
  corteDoPulo: 0.42,
  velocidade: 270,
  aceleracaoChao: 2600,
  aceleracaoAr: 1700,
  freioChao: 3200,
  quedaMax: 900,
  largura: 26,
  altura: 38,
  vento: 0,
  quica: 0,
  plana: 0,
  gancho: 0,
  quebraParede: false,
  quebraFragil: false,
  atravessaGrade: false,
  puloDuplo: false,
  pisao: false,
  soluco: false,
  peso: 0,
};

export const PODERES: Record<PoderId, Poder> = {
  borracha: {
    ...BASE,
    id: "borracha",
    nome: "Fruta Borracha",
    dica: "Poder: estica o braço até o gancho mais perto",
    cor: 0xc8463c,
    pulo: 720,
    velocidade: 290,
    // Escorrega: demora pra embalar e mais ainda pra parar.
    aceleracaoChao: 1100,
    aceleracaoAr: 1300,
    freioChao: 650,
    quedaMax: 950,
    quica: 0.55,
    gancho: 260,
    peso: 1,
  },
  gigante: {
    ...BASE,
    id: "gigante",
    nome: "Fruta Gigante",
    dica: "Atravessa pedra rachada · Poder no ar: pisão",
    cor: 0x6b4a2b,
    gravidade: 2000,
    pulo: 660,
    corteDoPulo: 0.5,
    velocidade: 240,
    aceleracaoChao: 1800,
    aceleracaoAr: 1200,
    freioChao: 3000,
    quedaMax: 1100,
    largura: 40,
    altura: 58,
    quebraParede: true,
    quebraFragil: true,
    pisao: true,
    peso: 1,
  },
  fumaca: {
    ...BASE,
    id: "fumaca",
    nome: "Fruta Fumaça",
    dica: "Atravessa grade · Segure pulo ou poder no ar pra planar",
    cor: 0x9aa7ad,
    opacidade: 0.8,
    gravidade: 1500,
    pulo: 610,
    velocidade: 250,
    aceleracaoChao: 2200,
    aceleracaoAr: 1600,
    freioChao: 2600,
    quedaMax: 700,
    largura: 22,
    altura: 34,
    vento: 1,
    plana: 95,
    atravessaGrade: true,
    peso: 1,
  },
  nanica: {
    ...BASE,
    id: "nanica",
    nome: "Fruta Nanica",
    dica: "Passa por buraco pequeno · Poder no ar: pulo duplo",
    cor: 0x2e86de,
    gravidade: 1500,
    pulo: 650,
    velocidade: 300,
    aceleracaoAr: 1900,
    freioChao: 3000,
    quedaMax: 800,
    largura: 14,
    altura: 18,
    vento: 1.6,
    puloDuplo: true,
    peso: 1,
  },
  soluco: {
    ...BASE,
    id: "soluco",
    nome: "Fruta Soluço",
    dica: "Hic! Você pula sozinho de vez em quando",
    cor: 0x8e44ad,
    soluco: true,
    peso: 0.25,
  },
};

export const LISTA_PODERES = Object.values(PODERES);

/** Sorteia uma fruta respeitando o peso (Soluço é rara). `r` vai de 0 a 1. */
export function sortear(r: number): Poder {
  const total = LISTA_PODERES.reduce((s, p) => s + p.peso, 0);
  let alvo = r * total;
  for (const p of LISTA_PODERES) {
    alvo -= p.peso;
    if (alvo < 0) return p;
  }
  return LISTA_PODERES[LISTA_PODERES.length - 1];
}

/** Próximo soluço: entre 1,2 e 3,2 segundos. */
/** O "h..." aparece esse tanto (s) antes do soluço. */
export const AVISO_SOLUCO = 0.35;
/** Logo depois do soluço, apertar pulo ainda vira um pulo inteiro. */
export const JANELA_SOLUCO = 0.15;

export function proximoSoluco(r: number) {
  return 1.2 + r * 2;
}

/** Tempo de tolerância pra pular depois de sair da borda. */
export const COYOTE = 0.1;
/** Depois de quicar, a Borracha ainda pode pular por um tempinho (e vai mais alto). */
export const COYOTE_QUIQUE = 0.22;
/** Aperto de pulo um pouquinho antes de tocar o chão ainda vale. */
export const BUFFER_PULO = 0.12;
/** Velocidade do braço da Borracha puxando até o gancho. */
export const VELOCIDADE_GANCHO = 820;
/** Plataforma frágil aguenta isso (s) debaixo de quem quebra antes de cair. */
export const TEMPO_FRAGIL = 0.7;
/** Quedas mais lentas que isso não quicam (senão a Borracha nunca para). */
export const QUICA_MINIMO = 380;

export function alturaDoPulo(p: Poder) {
  return (p.pulo * p.pulo) / (2 * p.gravidade);
}

/** Distância horizontal de um pulo que pousa na mesma altura, correndo no máximo. */
export function alcanceDoPulo(p: Poder) {
  return ((2 * p.pulo) / p.gravidade) * p.velocidade;
}

/** Aproxima `atual` de `alvo` sem passar, andando no máximo `passo`. */
export function aproxima(atual: number, alvo: number, passo: number) {
  if (atual < alvo) return Math.min(atual + passo, alvo);
  return Math.max(atual - passo, alvo);
}

/** Velocidade horizontal do próximo quadro. `dir` é -1, 0 ou 1. */
export function velocidadeX(vx: number, dir: number, noChao: boolean, dt: number, p: Poder) {
  if (dir === 0) {
    const freio = noChao ? p.freioChao : p.aceleracaoAr * 0.5;
    return aproxima(vx, 0, freio * dt);
  }
  const alvo = dir * p.velocidade;
  // Virando: freia mais forte pra resposta ficar seca.
  const virando = Math.sign(vx) !== 0 && Math.sign(vx) !== dir;
  const acel = noChao ? (virando ? Math.max(p.freioChao, p.aceleracaoChao) : p.aceleracaoChao) : p.aceleracaoAr;
  return aproxima(vx, alvo, acel * dt);
}

/** Velocidade de subida depois de quicar, ou 0 se a queda foi fraca. */
export function quique(vyQueda: number, p: Poder) {
  if (p.quica <= 0 || vyQueda < QUICA_MINIMO) return 0;
  return vyQueda * p.quica;
}

export function afundou(pesY: number) {
  return pesY > AGUA_Y + 4;
}

// ---------- vento ----------

export type Vento = Ret & {
  /** Velocidade (px/s) que o vento soma, negativa empurra pra esquerda. */
  forca: number;
  ligado: number;
  desligado: number;
};

/** Rajadas: liga e desliga num ciclo, pra dar pra esperar a hora certa. */
export function ventoLigado(v: Vento, t: number) {
  return t % (v.ligado + v.desligado) < v.ligado;
}

// ---------- fase ----------

export type Moeda = Ponto & {
  /** Só quem tem esse poder pega (fica no atalho dele). */
  poder?: PoderId;
};

export type Fase = {
  id: string;
  nome: string;
  largura: number;
  /** Onde ficam os pés no começo. */
  inicio: Ponto;
  /** Chão firme: ilhas (vão até o fundo), pedras e plataformas finas. */
  solidos: Ret[];
  /** Pedra rachada: o Gigante atravessa quebrando. */
  quebraveis: Ret[];
  /** Grade: a Fumaça passa por dentro. */
  grades: Ret[];
  /** Plataformas finas que desabam debaixo do Gigante. */
  frageis: Ret[];
  /** Pontos onde o braço da Borracha agarra. */
  ganchos: Ponto[];
  ventos: Vento[];
  moedas: Moeda[];
  bau: Ponto;
  /** Tempo (s) pra ganhar a 2ª estrela. */
  tempoAlvo: number;
};

export function moedasDoPoder(fase: Fase, poder: Poder["id"]) {
  return fase.moedas.filter((m) => !m.poder || m.poder === poder);
}

export type Resultado = { tempo: number; moedas: number; totalMoedas: number };

/** 1 por chegar, 1 por bater o tempo, 1 por pegar todas as moedas que a sua fruta alcança. */
export function estrelas(r: Resultado, fase: Pick<Fase, "tempoAlvo">) {
  let n = 1;
  if (r.tempo <= fase.tempoAlvo) n++;
  if (r.totalMoedas > 0 && r.moedas >= r.totalMoedas) n++;
  return n;
}

export function formataTempo(s: number) {
  const seg = Math.max(0, s);
  const m = Math.floor(seg / 60);
  const resto = seg - m * 60;
  return `${m}:${resto.toFixed(2).padStart(5, "0")}`;
}

// ---------- fase de teste ----------

const ilha = (x: number, w: number, topo: number): Ret => ({ x, y: topo, w, h: H - topo + 40 });
const plat = (x: number, w: number, y: number): Ret => ({ x, y, w, h: 18 });
const bloco = (x: number, y: number, w: number, h: number): Ret => ({ x, y, w, h });

/**
 * Uma fase pra sentir o controle e os poderes.
 * Rota de baixo: qualquer fruta passa. Cada fruta tem um atalho com moedas só dela.
 */
export const FASE_TESTE: Fase = {
  id: "teste",
  nome: "Ilha do Teste",
  largura: 3800,
  inicio: { x: 80, y: 420 },
  // Corrida perfeita (robô) faz ~14s.
  tempoAlvo: 18,
  solidos: [
    ilha(0, 520, 420),
    ilha(660, 340, 400),
    plat(1080, 120, 330),
    ilha(1300, 200, 420),
    // pedrinhas no mar
    ilha(1640, 80, 410),
    ilha(1860, 80, 384),
    ilha(2080, 90, 410),
    // rota de cima sobre as pedrinhas
    plat(1720, 90, 290),
    plat(1950, 90, 250),
    // começa perto: quem pula cheio da rota de cima tem que cair aqui, não no mar
    ilha(2240, 480, 420),
    plat(2480, 80, 340), // degrau no meio da ilha
    plat(3040, 120, 300),
    plat(3260, 90, 210), // atalho alto
    ilha(3260, 540, 420),
    // pedra com um vão de 24px embaixo: só a Nanica passa por baixo
    bloco(3420, 330, 160, 66),
  ],
  quebraveis: [bloco(300, 340, 80, 80)],
  // logo no começo da ilha D, pra quem pula por cima ter chão do outro lado
  grades: [bloco(2300, 340, 80, 80)],
  frageis: [plat(2820, 120, 360)],
  ganchos: [
    { x: 1620, y: 200 },
    { x: 1840, y: 170 },
    { x: 2060, y: 190 },
  ],
  ventos: [{ x: 1560, y: -600, w: 680, h: 1100, forca: -110, ligado: 1.8, desligado: 1.6 }],
  moedas: [
    // rota padrão
    { x: 200, y: 380 },
    { x: 830, y: 360 },
    { x: 1140, y: 290 },
    { x: 1680, y: 370 },
    { x: 1900, y: 344 },
    { x: 2120, y: 370 },
    { x: 2520, y: 300 },
    { x: 3100, y: 260 },
    // rota de cima
    { x: 1765, y: 250 },
    { x: 1995, y: 210 },
    { x: 3305, y: 170 },
    // atalhos de cada fruta
    { x: 325, y: 385, poder: "gigante" },
    { x: 355, y: 385, poder: "gigante" },
    { x: 1730, y: 186, poder: "borracha" },
    { x: 1950, y: 181, poder: "borracha" },
    { x: 2040, y: 196, poder: "borracha" },
    { x: 2325, y: 400, poder: "fumaca" },
    { x: 2355, y: 400, poder: "fumaca" },
    { x: 3460, y: 408, poder: "nanica" },
    { x: 3540, y: 408, poder: "nanica" },
  ],
  bau: { x: 3700, y: 420 },
};
