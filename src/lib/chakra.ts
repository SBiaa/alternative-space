// Lógica pura da "Corrida de Chakra": nada de DOM aqui, só estado e regras.
// O componente CorridaDeChakra chama step() a cada frame e desenha o resultado.

export const W = 800;
export const H = 450;

export type FaseId = "arvore" | "agua" | "rasengan";

export type Fase = {
  id: FaseId;
  nome: string;
  dica: string;
  passos: number; // acertos pra passar de fase
  vel: number; // quanto a barra enche por segundo, no começo
  acel: number; // quanto ela acelera conforme enche (0 = constante)
  largura: number; // tamanho da faixa certa (0..1 da barra)
  onda: number; // quanto a faixa sobe e desce
  ondaVel: number;
  falhas: { pouco: string; demais: string };
};

export const FASES: Fase[] = [
  {
    id: "arvore",
    nome: "Andar na árvore",
    dica: "Chakra nos pés pra subir o tronco. Pouco e você escorrega; demais e a casca racha.",
    passos: 5,
    vel: 0.5,
    acel: 0,
    largura: 0.2,
    onda: 0,
    ondaVel: 0,
    falhas: { pouco: "Escorregou!", demais: "Rachou a casca!" },
  },
  {
    id: "agua",
    nome: "Andar na água",
    dica: "A água não para quieta: a faixa certa sobe e desce. Solta quando a carga cruzar com ela.",
    passos: 5,
    vel: 0.62,
    acel: 0,
    largura: 0.17,
    onda: 0.12,
    ondaVel: 1.8,
    falhas: { pouco: "Afundou!", demais: "Espirrou longe!" },
  },
  {
    id: "rasengan",
    nome: "Rasengan",
    dica: "O chakra gira cada vez mais rápido: a barra acelera no fim. Segura firme e solta no ponto.",
    passos: 4,
    vel: 0.5,
    acel: 1.4,
    largura: 0.14,
    onda: 0.06,
    ondaVel: 3,
    falhas: { pouco: "Desfez na mão!", demais: "Estourou!" },
  },
];

export const VIDAS = 3;
export const BONUS_VIDA = 150; // por vida que sobrou no fim
const ESPERA_RESULTADO = 0.9; // segundos mostrando "Perfeito!" antes da próxima

export type Nota = "perfeito" | "bom" | "pouco" | "demais";

export type Status =
  | "intro" // cartão da fase, esperando começar
  | "pronto" // esperando segurar
  | "carregando" // segurando
  | "resultado" // mostrando a nota do último passo
  | "fim" // acabaram as vidas
  | "vitoria"; // passou das três fases

export type Estado = {
  fase: number;
  passo: number; // acertos na fase atual
  vidas: number;
  pontos: number;
  combo: number;
  carga: number; // 0..1
  status: Status;
  t: number; // relógio da partida, faz a faixa ondular
  zonaBase: number; // centro sorteado da faixa
  ondaFase: number;
  ultima: { nota: Nota; pontos: number; em: number } | null;
  espera: number;
  acertos: number; // total de passos certos (pra tela final)
  perfeitos: number;
};

export type Rand = () => number;

function sortearZona(e: Estado, rand: Rand) {
  const f = FASES[e.fase];
  // Faixa sempre entre 40% e 88% da barra, sem encostar no topo nem com a onda.
  const meia = f.largura / 2;
  const min = 0.4 + meia + f.onda;
  const max = 0.92 - meia - f.onda;
  e.zonaBase = min + rand() * Math.max(0, max - min);
  e.ondaFase = rand() * Math.PI * 2;
}

export function novoEstado(rand: Rand = Math.random): Estado {
  const e: Estado = {
    fase: 0,
    passo: 0,
    vidas: VIDAS,
    pontos: 0,
    combo: 0,
    carga: 0,
    status: "intro",
    t: 0,
    zonaBase: 0.6,
    ondaFase: 0,
    ultima: null,
    espera: 0,
    acertos: 0,
    perfeitos: 0,
  };
  sortearZona(e, rand);
  return e;
}

// A faixa encolhe um pouco a cada acerto dentro da fase.
export function larguraAtual(e: Estado): number {
  return FASES[e.fase].largura * (1 - 0.05 * e.passo);
}

export function zona(e: Estado): { centro: number; largura: number } {
  const f = FASES[e.fase];
  return { centro: e.zonaBase + f.onda * Math.sin(e.t * f.ondaVel + e.ondaFase), largura: larguraAtual(e) };
}

export function julgar(carga: number, centro: number, largura: number): Nota {
  if (carga >= 1) return "demais";
  const d = Math.abs(carga - centro);
  const meia = largura / 2;
  if (d <= meia * 0.35) return "perfeito";
  if (d <= meia) return "bom";
  return carga < centro ? "pouco" : "demais";
}

export const multiplicador = (combo: number) => 1 + 0.2 * Math.min(combo, 5);

// Segurar: começa a fase ou começa a juntar chakra.
export function apertar(e: Estado) {
  if (e.status === "intro") e.status = "pronto";
  else if (e.status === "pronto") {
    e.status = "carregando";
    e.carga = 0;
  }
}

function registrar(e: Estado, nota: Nota) {
  let ganho = 0;
  if (nota === "perfeito" || nota === "bom") {
    ganho = Math.round((nota === "perfeito" ? 100 : 60) * multiplicador(e.combo));
    e.combo++;
    e.passo++;
    e.acertos++;
    if (nota === "perfeito") e.perfeitos++;
  } else {
    e.combo = 0;
    e.vidas--;
  }
  e.pontos += ganho;
  e.ultima = { nota, pontos: ganho, em: e.t };
  e.status = "resultado";
  e.espera = ESPERA_RESULTADO;
}

// Soltar: julga a carga contra a faixa.
export function soltar(e: Estado) {
  if (e.status !== "carregando") return;
  const z = zona(e);
  registrar(e, julgar(e.carga, z.centro, z.largura));
}

// Aba escondida ou janela sem foco: descarta a carga em vez de julgar.
export function cancelar(e: Estado) {
  if (e.status === "carregando") {
    e.status = "pronto";
    e.carga = 0;
  }
}

export function step(e: Estado, dt: number, rand: Rand = Math.random) {
  if (e.status === "fim" || e.status === "vitoria") return;
  e.t += dt;
  const f = FASES[e.fase];

  if (e.status === "carregando") {
    e.carga += f.vel * (1 + f.acel * e.carga) * dt;
    if (e.carga >= 1) {
      e.carga = 1;
      registrar(e, "demais");
    }
    return;
  }

  if (e.status === "resultado") {
    e.espera -= dt;
    if (e.espera > 0) return;
    e.carga = 0;
    if (e.vidas <= 0) {
      e.status = "fim";
    } else if (e.passo >= f.passos) {
      if (e.fase === FASES.length - 1) {
        e.pontos += e.vidas * BONUS_VIDA;
        e.status = "vitoria";
      } else {
        e.fase++;
        e.passo = 0;
        e.status = "intro";
        sortearZona(e, rand);
      }
    } else {
      e.status = "pronto";
      sortearZona(e, rand);
    }
  }
}


export function rank(pontos: number, venceu: boolean): { titulo: string; texto: string } {
  if (!venceu && pontos < 300) return { titulo: "Ainda na academia", texto: "O chakra foi pra todo lado. Respira e tenta de novo." };
  if (!venceu) return { titulo: "Quase lá", texto: "Já sobe em árvore, mas o resto ainda escapa. Mais uma?" };
  if (pontos < 1500) return { titulo: "Ninja de verdade", texto: "Passou pelas três. Agora é caçar os perfeitos." };
  if (pontos < 2100) return { titulo: "Controle afiado", texto: "Chakra na medida quase sempre. Pouca gente chega aqui." };
  return { titulo: "Lenda da vila", texto: "Controle de chakra impecável. Só falta ensinar os outros." };
}
