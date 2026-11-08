// Lógica pura da "Fábrica de Ajudantes": nada de DOM aqui, só estado e regras.
// O componente FabricaDeAjudantes chama step() a cada frame e desenha o resultado.
//
// O ciclo: apertar a caixa cria ajudantes azuis, eles trabalham no pedido atual
// e somem quando o pedido fica pronto. Se o pedido demora mais que a paciência
// deles, entram em pane: param de trabalhar, correm pela fábrica e aprontam.

export const W = 800;
export const H = 380;
export const CAIXA = { x: 78, y: H - 92 }; // de onde os ajudantes saem
export const BANCADA = { x: W * 0.6, y: H * 0.56 }; // onde trabalham
export const MARGEM = 26; // ninguém sai da tela
export const RAIO_CLIQUE = 30;

export type Rand = () => number;

// ---------- melhorias ----------

export type MelhoriaId = "caixa" | "dedo" | "manual" | "galpao" | "musica" | "gorjeta";
export type Melhorias = Record<MelhoriaId, number>;

export const MELHORIAS: Record<MelhoriaId, { nome: string; texto: string; base: number; fator: number }> = {
  caixa: { nome: "Botão extra na caixa", texto: "+1 ajudante por aperto", base: 15, fator: 1.7 },
  dedo: { nome: "Dedo robótico", texto: "Aperta a caixa sozinho", base: 25, fator: 1.35 },
  manual: { nome: "Manual do ajudante", texto: "Trabalham 25% mais rápido", base: 40, fator: 2.3 },
  galpao: { nome: "Galpão maior", texto: "+3 vagas na fábrica", base: 30, fator: 1.9 },
  musica: { nome: "Música de elevador", texto: "+2s de paciência", base: 50, fator: 2 },
  gorjeta: { nome: "Cobrar gorjeta", texto: "+25% de favores por pedido", base: 90, fator: 2.1 },
};

export const IDS = Object.keys(MELHORIAS) as MelhoriaId[];

export function semMelhorias(): Melhorias {
  return { caixa: 0, dedo: 0, manual: 0, galpao: 0, musica: 0, gorjeta: 0 };
}

export function custo(id: MelhoriaId, nivel: number): number {
  const m = MELHORIAS[id];
  return Math.ceil(m.base * m.fator ** nivel);
}

export const porAperto = (m: Melhorias) => 1 + m.caixa;
export const apertosPorSeg = (m: Melhorias) => 0.6 * m.dedo;
export const ritmo = (m: Melhorias) => 1.25 ** m.manual; // trabalho por segundo, por ajudante
export const capacidade = (m: Melhorias) => 6 + 3 * m.galpao;
export const paciencia = (m: Melhorias) => 10 + 2 * m.musica; // segundos até a pane
export const multGorjeta = (m: Melhorias) => 1.25 ** m.gorjeta;

// ---------- pedidos ----------

export const PEDIDOS = [
  "Dobrar um lençol de elástico",
  "Achar a ponta do rolo de fita adesiva",
  "Tirar o gato de cima do teclado",
  "Abrir um pote de azeitona sem drama",
  "Explicar criptomoeda pra avó",
  "Lembrar a senha do Wi-Fi",
  "Montar um móvel sem sobrar parafuso",
  "Desembaraçar o fone de ouvido",
  "Fazer o Wi-Fi pegar no banheiro",
  "Tirar o adesivo da maçã inteiro",
  "Ganhar uma discussão na internet",
  "Achar o controle remoto",
  "Ensinar o cachorro a pagar boleto",
  "Responder o grupo da família sem treta",
  "Acordar às 6h por vontade própria",
  "Esquecer aquela vergonha de 2014",
  "Fechar todas as abas do navegador",
  "Fazer a planta parar de morrer",
  "Lembrar o nome de quem acenou",
  "Dividir a conta do bar certinho",
  "Sair bem na foto do documento",
  "Achar duas meias que combinam",
  "Fazer o miojo em 3 minutos de verdade",
  "Sair do grupo sem ninguém perceber",
  "Estacionar de ré na primeira tentativa",
  "Entender o manual da TV",
  "Fazer o bebê dormir antes da meia-noite",
  "Deixar o pão de queijo igual ao da padaria",
  "Ler os termos de uso inteiros",
  "Convencer o vizinho a parar a furadeira",
  "Achar o fim da internet",
  "Fazer o pombo devolver o pastel",
];

// A cada 5 pedidos vem um absurdo: 4x o trabalho, 3x o pagamento, pane quase garantida.
export const PEDIDOS_ABSURDOS = [
  "Fazer a segunda-feira virar sábado",
  "Desfazer um espirro",
  "Achar o sentido da vida antes do almoço",
  "Fazer a impressora funcionar de primeira",
  "Lamber o próprio cotovelo",
  "Convencer a sogra de que o arroz tá bom",
  "Provar que o gato não é espião",
  "Devolver o domingo que passou rápido demais",
];

export type Pedido = {
  n: number;
  texto: string;
  absurdo: boolean;
  trabalho: number;
  feito: number;
  recompensa: number;
  tempo: number;
};

export const ehAbsurdo = (n: number) => n % 5 === 4;

export function trabalhoDo(n: number): number {
  return Math.round((5 * 1.22 ** n + 4 * n) * (ehAbsurdo(n) ? 4 : 1));
}

export function recompensaDo(n: number, m: Melhorias): number {
  return Math.ceil(Math.round(5 * 1.22 ** n + 4 * n) * 0.6 * (ehAbsurdo(n) ? 3 : 1) * multGorjeta(m));
}

function novoPedido(n: number, m: Melhorias, rand: Rand, evitar?: string): Pedido {
  const lista = ehAbsurdo(n) ? PEDIDOS_ABSURDOS : PEDIDOS;
  let texto = lista[Math.floor(rand() * lista.length) % lista.length];
  if (texto === evitar) texto = lista[(lista.indexOf(texto) + 1) % lista.length];
  return { n, texto, absurdo: ehAbsurdo(n), trabalho: trabalhoDo(n), feito: 0, recompensa: recompensaDo(n, m), tempo: 0 };
}

// ---------- ajudantes ----------

export type Ajudante = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  idade: number;
  pane: boolean;
  proxAcao: number; // segundos até a próxima travessura (só em pane)
  fala: { texto: string; ate: number } | null;
};

export const FALAS_CALMO = [
  "Pode deixar comigo!",
  "Que pedido lindo!",
  "Já tô indo!",
  "Missão aceita!",
  "Facinho, facinho.",
  "Nasci pra isso!",
];

export const FALAS_PANE = [
  "POR QUE ISSO TÁ DEMORANDO?!",
  "EU SÓ QUERIA TERMINAR!",
  "Existir tá ficando pesado...",
  "QUEM PEDIU ISSO?!",
  "ME DEIXA SUMIR!",
  "Não era pra durar tanto!",
  "AAAAAAAAAA",
  "Eu tenho 14 segundos de idade e já tô cansado.",
];

export type Evento =
  | { tipo: "poof"; x: number; y: number }
  | { tipo: "nasceu"; x: number; y: number }
  | { tipo: "cumprido"; recompensa: number; texto: string }
  | { tipo: "pane"; x: number; y: number }
  | { tipo: "roubo"; valor: number; x: number; y: number }
  | { tipo: "contagio"; x: number; y: number }
  | { tipo: "apertou"; x: number; y: number }
  | { tipo: "sentou"; id: MelhoriaId }
  | { tipo: "ajuda"; valor: number };

export type Estado = {
  favores: number;
  totalFavores: number;
  cumpridos: number;
  melhorias: Melhorias;
  pedido: Pedido;
  ajudantes: Ajudante[];
  proximoId: number;
  tempo: number;
  acumApertos: number;
  bloqueados: MelhoriaId[]; // botões da loja com um ajudante em pane sentado em cima
  eventos: Evento[]; // o componente esvazia a cada frame
};

export function novoEstado(rand: Rand = Math.random): Estado {
  const melhorias = semMelhorias();
  return {
    favores: 0,
    totalFavores: 0,
    cumpridos: 0,
    melhorias,
    pedido: novoPedido(0, melhorias, rand),
    ajudantes: [],
    proximoId: 1,
    tempo: 0,
    acumApertos: 0,
    bloqueados: [],
    eventos: [],
  };
}

export const emPane = (e: Estado) => e.ajudantes.filter((a) => a.pane).length;

// 0 = fábrica tranquila, 1 = todo mundo surtando.
export function caos(e: Estado): number {
  return Math.min(1, emPane(e) / Math.max(4, capacidade(e.melhorias) * 0.6));
}

// Cada ajudante tem um lugar fixo em volta da bancada, decidido pelo id.
export function vaga(id: number): { x: number; y: number } {
  const ang = id * 2.399963; // ângulo áureo: espalha sem amontoar
  const r = 46 + (id % 5) * 12;
  return { x: BANCADA.x + Math.cos(ang) * r * 1.35, y: BANCADA.y + Math.sin(ang) * r * 0.75 };
}

function prender(a: Ajudante) {
  if (a.x < MARGEM) { a.x = MARGEM; a.vx = Math.abs(a.vx); }
  if (a.x > W - MARGEM) { a.x = W - MARGEM; a.vx = -Math.abs(a.vx); }
  if (a.y < MARGEM + 20) { a.y = MARGEM + 20; a.vy = Math.abs(a.vy); }
  if (a.y > H - MARGEM) { a.y = H - MARGEM; a.vy = -Math.abs(a.vy); }
}

function falar(e: Estado, a: Ajudante, lista: string[], rand: Rand) {
  a.fala = { texto: lista[Math.floor(rand() * lista.length) % lista.length], ate: e.tempo + 2.2 };
}

// Aperto na caixa (jogador ou dedo robótico). Se a fábrica está lotada,
// o aperto vira trabalho direto no pedido: nenhum clique é desperdiçado.
export function apertar(e: Estado, rand: Rand = Math.random) {
  const m = e.melhorias;
  let sobra = porAperto(m);
  while (sobra > 0 && e.ajudantes.length < capacidade(m)) {
    sobra--;
    const a: Ajudante = {
      id: e.proximoId++,
      x: CAIXA.x + (rand() - 0.5) * 20,
      y: CAIXA.y - 20,
      vx: 60 + rand() * 80,
      vy: -120 - rand() * 60,
      idade: 0,
      pane: false,
      proxAcao: 0,
      fala: null,
    };
    if (rand() < 0.25) falar(e, a, FALAS_CALMO, rand);
    e.ajudantes.push(a);
    e.eventos.push({ tipo: "nasceu", x: a.x, y: a.y });
  }
  if (sobra > 0) {
    const valor = sobra * ritmo(m) * 0.5;
    e.pedido.feito += valor;
    e.eventos.push({ tipo: "ajuda", valor });
  }
}

// Clique num ajudante em pane: ele some (puf). Ajudante calmo não é afetado.
export function acalmar(e: Estado, x: number, y: number): boolean {
  let melhor = -1;
  let dist = RAIO_CLIQUE ** 2;
  e.ajudantes.forEach((a, i) => {
    const d = (a.x - x) ** 2 + (a.y - 12 - y) ** 2; // mira no corpo, não no pé
    if (a.pane && d < dist) {
      dist = d;
      melhor = i;
    }
  });
  if (melhor < 0) return false;
  const [a] = e.ajudantes.splice(melhor, 1);
  e.eventos.push({ tipo: "poof", x: a.x, y: a.y });
  return true;
}

export type Compra = "comprou" | "espantou" | "sem-favores";

export function comprar(e: Estado, id: MelhoriaId): Compra {
  if (e.bloqueados.includes(id)) {
    e.bloqueados = e.bloqueados.filter((b) => b !== id);
    return "espantou";
  }
  const c = custo(id, e.melhorias[id]);
  if (e.favores < c) return "sem-favores";
  e.favores -= c;
  e.melhorias[id]++;
  // Gorjeta vale já pro pedido atual.
  if (id === "gorjeta") e.pedido.recompensa = recompensaDo(e.pedido.n, e.melhorias);
  return "comprou";
}

// Joga o pedido fora sem ganhar nada: todo mundo some. Pedido normal volta
// do mesmo tamanho; absurdo é opcional, então pula pro próximo.
export function desistir(e: Estado, rand: Rand = Math.random) {
  for (const a of e.ajudantes) e.eventos.push({ tipo: "poof", x: a.x, y: a.y });
  e.ajudantes = [];
  e.bloqueados = [];
  const n = e.pedido.absurdo ? e.pedido.n + 1 : e.pedido.n;
  e.pedido = novoPedido(n, e.melhorias, rand, e.pedido.texto);
}

function travessura(e: Estado, a: Ajudante, rand: Rand) {
  const r = rand();
  if (r < 0.3) {
    falar(e, a, FALAS_PANE, rand);
  } else if (r < 0.5) {
    // Derruba o cofrinho: perde 3% (mínimo 1), nunca fica negativo.
    const valor = Math.min(e.favores, Math.max(1, Math.floor(e.favores * 0.03)));
    if (valor > 0) {
      e.favores -= valor;
      e.eventos.push({ tipo: "roubo", valor, x: a.x, y: a.y });
    } else falar(e, a, FALAS_PANE, rand);
  } else if (r < 0.7) {
    // Contagia o calmo mais perto: ele envelhece 3s de estresse.
    let alvo: Ajudante | null = null;
    let d = Infinity;
    for (const b of e.ajudantes) {
      if (b.pane) continue;
      const db = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (db < d) { d = db; alvo = b; }
    }
    if (alvo) {
      alvo.idade += 3;
      e.eventos.push({ tipo: "contagio", x: alvo.x, y: alvo.y });
    }
  } else if (r < 0.85) {
    e.eventos.push({ tipo: "apertou", x: a.x, y: a.y });
    apertar(e, rand);
  } else {
    const livres = IDS.filter((id) => !e.bloqueados.includes(id));
    if (livres.length > 0 && e.bloqueados.length < 3) {
      const id = livres[Math.floor(rand() * livres.length) % livres.length];
      e.bloqueados.push(id);
      e.eventos.push({ tipo: "sentou", id });
    } else falar(e, a, FALAS_PANE, rand);
  }
}

export function step(e: Estado, dt: number, rand: Rand = Math.random): Estado {
  const m = e.melhorias;
  e.tempo += dt;
  e.pedido.tempo += dt;

  e.acumApertos += apertosPorSeg(m) * dt;
  while (e.acumApertos >= 1) {
    e.acumApertos--;
    apertar(e, rand);
  }

  const pac = paciencia(m);
  let trabalhando = 0;
  for (const a of e.ajudantes) {
    a.idade += dt;
    if (a.fala && a.fala.ate < e.tempo) a.fala = null;

    if (!a.pane && a.idade >= pac) {
      a.pane = true;
      a.proxAcao = 0.6 + rand() * 1.2;
      const ang = rand() * Math.PI * 2;
      a.vx = Math.cos(ang) * 220;
      a.vy = Math.sin(ang) * 220;
      falar(e, a, FALAS_PANE, rand);
      e.eventos.push({ tipo: "pane", x: a.x, y: a.y });
    }

    if (a.pane) {
      // Corre em zigue-zague, muda de rumo de vez em quando.
      if (rand() < dt * 2) {
        const ang = rand() * Math.PI * 2;
        const v = 180 + rand() * 120;
        a.vx = Math.cos(ang) * v;
        a.vy = Math.sin(ang) * v;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.proxAcao -= dt;
      if (a.proxAcao <= 0) {
        a.proxAcao = 1.5 + rand() * 2;
        travessura(e, a, rand);
      }
    } else {
      // Vai até a vaga na bancada; chegando, trabalha.
      const v = vaga(a.id);
      const dx = v.x - a.x;
      const dy = v.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        const vel = 170;
        a.vx += (dx / d) * vel * 6 * dt - a.vx * 4 * dt;
        a.vy += (dy / d) * vel * 6 * dt - a.vy * 4 * dt;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
      } else {
        a.vx = 0;
        a.vy = 0;
      }
      if (d < 40) trabalhando++;
    }
    prender(a);
  }

  e.pedido.feito += trabalhando * ritmo(m) * dt;

  if (e.pedido.feito >= e.pedido.trabalho) {
    const p = e.pedido;
    e.favores += p.recompensa;
    e.totalFavores += p.recompensa;
    e.cumpridos++;
    for (const a of e.ajudantes) e.eventos.push({ tipo: "poof", x: a.x, y: a.y });
    e.ajudantes = [];
    e.bloqueados = [];
    e.eventos.push({ tipo: "cumprido", recompensa: p.recompensa, texto: p.texto });
    e.pedido = novoPedido(p.n + 1, m, rand, p.texto);
  }
  return e;
}

// ---------- salvar ----------

export type Salvo = { v: 1; favores: number; totalFavores: number; cumpridos: number; melhorias: Melhorias };

export function paraSalvar(e: Estado): Salvo {
  return { v: 1, favores: e.favores, totalFavores: e.totalFavores, cumpridos: e.cumpridos, melhorias: { ...e.melhorias } };
}

const numOk = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : 0);

// Aceita qualquer coisa vinda do localStorage; o que não fizer sentido vira zero.
export function carregar(dados: unknown, rand: Rand = Math.random): Estado {
  const e = novoEstado(rand);
  if (!dados || typeof dados !== "object") return e;
  const d = dados as Partial<Salvo>;
  e.favores = numOk(d.favores);
  e.totalFavores = numOk(d.totalFavores);
  e.cumpridos = Math.floor(numOk(d.cumpridos));
  if (d.melhorias && typeof d.melhorias === "object") {
    for (const id of IDS) e.melhorias[id] = Math.min(200, Math.floor(numOk((d.melhorias as Melhorias)[id])));
  }
  e.pedido = novoPedido(e.cumpridos, e.melhorias, rand);
  return e;
}

// ---------- texto ----------

export function formatar(n: number): string {
  const v = Math.floor(n);
  if (v < 10_000) return v.toLocaleString("pt-BR");
  const escalas: [number, string][] = [
    [1e12, "tri"],
    [1e9, "bi"],
    [1e6, "mi"],
    [1e3, "mil"],
  ];
  for (const [lim, nome] of escalas) {
    if (v >= lim) return `${(v / lim).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${nome}`;
  }
  return String(v);
}

export function titulo(cumpridos: number): string {
  if (cumpridos < 5) return "Estagiário da caixa";
  if (cumpridos < 15) return "Gerente de ajudantes";
  if (cumpridos < 30) return "Supervisor de pânico";
  if (cumpridos < 50) return "Diretor de caos controlado";
  return "Dono da fábrica (e da bagunça)";
}
