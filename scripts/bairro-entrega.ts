// Gera o bairro do Entrega na Chuva no formato do Tiled (JSON .tmj) e o tileset em PNG.
//   npm run mapa:entrega
// O traçado é desenhado à mão aqui (avenidas, becos, pontos, rotas). O arquivo gerado abre e edita no Tiled;
// depois de editar no Tiled, não rode este script de novo, ou ele sobrescreve as mudanças.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 44;
const H = 44;
const T = 32;
const DIR = "public/jogos/entrega-na-chuva";

const RUA = 1;
const PREDIO = 2;
const BECO = 3;

// ---- traçado ----
const avenidas = [2, 14, 26, 38]; // cada avenida tem 2 tiles: n e n+1
const ruas = Array.from({ length: W * H }, () => 0);
const set = (x: number, y: number, v: number) => (ruas[y * W + x] = v);
for (const a of avenidas)
  for (let i = 0; i < W; i++) {
    if (i < 2 || i > 39) continue;
    set(i, a, RUA);
    set(i, a + 1, RUA);
    set(a, i, RUA);
    set(a + 1, i, RUA);
  }

// Becos: atalhos de 2 tiles que fecham de tempos em tempos.
const becos = [
  { x: 8, y: 4, w: 2, h: 10, aberto: 8, fechado: 4 },
  { x: 16, y: 32, w: 10, h: 2, aberto: 9, fechado: 5 },
  { x: 32, y: 16, w: 2, h: 10, aberto: 7, fechado: 4 },
  { x: 28, y: 8, w: 10, h: 2, aberto: 10, fechado: 5 },
];
for (const b of becos) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) set(x, y, BECO);
const predios = ruas.map((v) => (v === 0 ? PREDIO : 0));

// ---- pontos (tile x, y) ----
const coletas: [string, number, number, boolean][] = [
  ["Pastelaria Garoa", 6, 2, false],
  ["Cozinha Fio de Cobre", 20, 3, false],
  ["Bolos da Marquise", 33, 2, true],
  ["Yakitori Antena 9", 2, 9, false],
  ["Padaria Turno da Noite", 15, 20, true],
  ["Tapioca Circuito", 27, 33, false],
  ["Mercadinho Pixel Azul", 39, 22, false],
  ["Farmácia Lâmpada Fria", 10, 38, false],
];
const enderecos: [string, number, number][] = [
  ["Torre Vapor, ap. 1203", 9, 14],
  ["Vila dos Cabos, casa 4", 21, 15],
  ["Edifício Maré Alta, 77", 31, 14],
  ["Rua do Transformador, 15", 39, 6],
  ["Conjunto Garoa Fina, bloco B", 3, 25],
  ["Oficina Parafuso Solto", 14, 31],
  ["Hostel Céu Baixo", 26, 9],
  ["Torre Neblina, ap. 88", 38, 33],
  ["Praça da Antena, banca 2", 19, 26],
  ["Residencial Holofote, 310", 33, 27],
  ["Galpão das Bicicletas", 6, 39],
  ["Estúdio Fita Cassete", 23, 38],
  ["Prédio Lua de Lata, 1501", 35, 39],
  ["Rua das Calhas, 92", 2, 19],
  ["Sobrado Vidro Fosco", 15, 5],
  ["Lavanderia Orbital", 27, 19],
  ["Clínica Sono Leve", 39, 15],
  ["Escola Noturna Faísca", 9, 27],
  ["Rua do Beco Torto, 8", 20, 32],
  ["Edifício Escada Rolante, 40", 14, 36],
];

const pocas = [
  [8, 14],
  [26, 6],
  [16, 26],
  [38, 28],
  [4, 38],
  [30, 2],
  [14, 10],
  [22, 14],
  [2, 32],
  [34, 38],
];

// Rotas dos carros: cantos em tiles, em laço.
const rotas: [number, number][][] = [
  [
    [3, 3],
    [27, 3],
    [27, 27],
    [3, 27],
  ],
  [
    [15, 15],
    [39, 15],
    [39, 39],
    [15, 39],
  ],
  [
    [14, 14],
    [14, 38],
    [38, 38],
    [38, 26],
    [14, 26],
  ],
  [
    [26, 2],
    [38, 2],
    [38, 26],
    [26, 26],
  ],
  [
    [3, 15],
    [3, 39],
    [27, 39],
    [27, 15],
  ],
];

const drones = [
  [12, 12, 6, 6],
  [24, 24, 6, 6],
  [36, 0, 6, 6],
  [0, 36, 6, 6],
];

const placas: [string, number, number, "rosa" | "ciano"][] = [
  ["SOPA 24H", 5, 1, "rosa"],
  ["KARAOKÊ GAROA", 18, 13, "ciano"],
  ["CONSERTO DE IMPLANTES", 30, 1, "ciano"],
  ["HOTEL CÁPSULA", 10, 25, "rosa"],
  ["BAR DA CALHA", 22, 28, "rosa"],
  ["FLIPERAMA 2 FICHAS", 34, 13, "ciano"],
  ["CHÁ & CABO", 5, 37, "ciano"],
  ["LOJA DE GUARDA-CHUVA", 29, 37, "rosa"],
];

// ---- Tiled ----
let id = 1;
const ponto = (name: string, x: number, y: number, props: Record<string, unknown> = {}) => ({
  id: id++,
  name,
  type: "",
  x: (x + 0.5) * T,
  y: (y + 0.5) * T,
  width: 0,
  height: 0,
  rotation: 0,
  visible: true,
  point: true,
  properties: Object.entries(props).map(([k, v]) => ({ name: k, type: typeof v === "boolean" ? "bool" : typeof v === "number" ? "float" : "string", value: v })),
});
const ret = (name: string, x: number, y: number, w: number, h: number, props: Record<string, unknown> = {}) => ({
  ...ponto(name, x, y, props),
  point: undefined,
  x: x * T,
  y: y * T,
  width: w * T,
  height: h * T,
});
const tileLayer = (name: string, data: number[]) => ({ id: id++, name, type: "tilelayer", width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
const objLayer = (name: string, objects: unknown[]) => ({ id: id++, name, type: "objectgroup", draworder: "topdown", x: 0, y: 0, opacity: 1, visible: true, objects });

const mapa = {
  type: "map",
  version: "1.10",
  tiledversion: "1.10.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  infinite: false,
  width: W,
  height: H,
  tilewidth: T,
  tileheight: T,
  layers: [
    tileLayer("ruas", ruas),
    tileLayer("predios", predios),
    objLayer("pocas", pocas.map(([x, y]) => ret("poça", x, y, 2, 2))),
    objLayer("coletas", coletas.map(([n, x, y, f]) => ponto(n, x, y, { fragil: f }))),
    objLayer("enderecos", enderecos.map(([n, x, y]) => ponto(n, x, y))),
    objLayer(
      "rotas",
      rotas.map((r, i) => ({
        id: id++,
        name: `carro ${i + 1}`,
        type: "",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        visible: true,
        polygon: r.map(([x, y]) => ({ x: (x + 0.5) * T, y: (y + 0.5) * T })),
      })),
    ),
    objLayer("drones", drones.map(([x, y, w, h], i) => ret(`drone ${i + 1}`, x, y, w, h))),
    objLayer("becos", becos.map((b, i) => ret(`beco ${i + 1}`, b.x, b.y, b.w, b.h, { abertoS: b.aberto, fechadoS: b.fechado }))),
    objLayer("placas", placas.map(([n, x, y, c]) => ponto(n, x, y, { cor: c }))),
  ],
  nextlayerid: 20,
  nextobjectid: id,
  tilesets: [
    {
      firstgid: 1,
      name: "bairro",
      image: "bairro-tiles.png",
      imagewidth: T * 3,
      imageheight: T,
      tilewidth: T,
      tileheight: T,
      tilecount: 3,
      columns: 3,
      margin: 0,
      spacing: 0,
      tiles: [{ id: PREDIO - 1, properties: [{ name: "colide", type: "bool", value: true }] }],
    },
  ],
};

mkdirSync(DIR, { recursive: true });
writeFileSync(`${DIR}/bairro.tmj`, JSON.stringify(mapa));

// ---- tileset PNG (rua, prédio, beco) nas cores do céu ----
const cores = {
  rua: [0x13, 0x30, 0x4f],
  faixa: [0x1d, 0x3a, 0x5a],
  predio: [0x07, 0x19, 0x2c],
  borda: [0x22, 0x36, 0x4d],
  janela: [0x2a, 0x3e, 0x52],
  listra: [0x3a, 0x34, 0x2a],
};
const img = Buffer.alloc(T * 3 * T * 4);
const px = (x: number, y: number, [r, g, b]: number[]) => {
  const i = (y * T * 3 + x) * 4;
  img[i] = r;
  img[i + 1] = g;
  img[i + 2] = b;
  img[i + 3] = 255;
};
for (let y = 0; y < T; y++)
  for (let x = 0; x < T; x++) {
    px(x, y, (x + y) % 9 === 0 ? cores.faixa : cores.rua);
    const borda = x === 0 || y === 0 || x === T - 1 || y === T - 1;
    const janela = x % 8 > 2 && x % 8 < 6 && y % 8 > 2 && y % 8 < 6;
    px(T + x, y, borda ? cores.borda : janela ? cores.janela : cores.predio);
    px(2 * T + x, y, (x + y) % 8 < 2 ? cores.listra : cores.rua);
  }
writeFileSync(`${DIR}/bairro-tiles.png`, png(T * 3, T, img));

function png(w: number, h: number, rgba: Buffer) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (tipo: string, dados: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dados.length);
    const td = Buffer.concat([Buffer.from(tipo), dados]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const linhas = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(linhas, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(linhas)), chunk("IEND", Buffer.alloc(0))]);
}

console.log(`Bairro: ${coletas.length} coletas, ${enderecos.length} endereços, ${rotas.length} rotas, ${becos.length} becos.`);
