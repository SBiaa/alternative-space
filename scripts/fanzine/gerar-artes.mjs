// Gera as páginas da fanzine (SVG próprio, estilo xerox) do capítulo 1 e imprime as áreas das pistas em coordenadas relativas.
//   node scripts/fanzine/gerar-artes.mjs
// Tudo aqui é inventado: turma, bandas, zine, cidade e pessoas.

import fs from "node:fs";
import path from "node:path";

const W = 600;
const H = 800;
const saida = path.join("public", "jogos", "fanzine", "cruz-mansa");
fs.mkdirSync(saida, { recursive: true });

const MONO = "'Courier New', Courier, monospace";
const MAO = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
const TITULO = "Impact, 'Arial Black', sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const areas = {};
const marca = (pagina, id, x, y, w, h) => (areas[id] = { pagina, x: +(x / W).toFixed(3), y: +(y / H).toFixed(3), w: +(w / W).toFixed(3), h: +(h / H).toFixed(3) });

const base = (titulo, corpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(titulo)}">
<defs>
<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.15"/></filter>
<linearGradient id="sombra" x1="0" x2="1"><stop offset="0" stop-color="#8d8b84" stop-opacity=".55"/><stop offset="1" stop-color="#8d8b84" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#ebe9e2"/>
${corpo}
<rect width="${W}" height="${H}" filter="url(#gr)" opacity=".22"/>
<rect width="26" height="${H}" fill="url(#sombra)"/>
<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="none" stroke="#2a2a28" stroke-opacity=".35" stroke-width="3"/>
</svg>
`;

const fita = (x, y, w, h, rot) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e8dc9a" fill-opacity=".6" stroke="#b8ac6a" stroke-opacity=".5" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"/>`;
const grampo = (x, y) => `<g stroke="#5c5c58" stroke-width="3" stroke-linecap="round"><line x1="${x}" y1="${y}" x2="${x + 34}" y2="${y}"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y + 6}"/><line x1="${x + 34}" y1="${y}" x2="${x + 34}" y2="${y + 6}"/></g>`;
const marcaTexto = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#dd5d05" fill-opacity=".5" rx="3"/>`;
const texto = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="${o.f ?? MONO}" font-size="${o.s ?? 15}" fill="${o.c ?? "#1c1c1a"}"${o.b ? ' font-weight="700"' : ""}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ""}>${esc(s)}</text>`;
const linhas = (x, y, ls, o = {}) => ls.map((s, i) => texto(x, y + i * (o.l ?? 21), s, o)).join("\n");
// Letras recortadas: cada letra num retalho de papel diferente.
function recorte(x, y, s, tam) {
  const fundos = ["#141414", "#f4f2ec", "#8b8a84", "#141414", "#dad8d0"];
  const cores = ["#f4f2ec", "#141414", "#141414", "#dad8d0", "#141414"];
  let cx = x;
  let out = "";
  [...s].forEach((ch, i) => {
    if (ch === " ") return void (cx += tam * 0.45);
    const w = tam * 0.66;
    const dy = ((i * 7) % 5) - 2;
    out += `<rect x="${cx}" y="${y - tam + dy}" width="${w}" height="${tam * 1.12}" fill="${fundos[i % 5]}" stroke="#1c1c1a" stroke-width="1"/>${texto(cx + w * 0.12, y - tam * 0.12 + dy, ch, { f: TITULO, s: tam * 0.86, c: cores[i % 5] })}`;
    cx += w + 3;
  });
  return out;
}
const carimbo = (cx, cy, r) => `<g fill="none" stroke="#2a2a28" stroke-opacity=".8" stroke-width="3">
<circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${r - 10}" stroke-width="1.5"/>
<path id="arco" d="M ${cx - r + 17} ${cy} a ${r - 17} ${r - 17} 0 1 1 ${2 * (r - 17)} 0 a ${r - 17} ${r - 17} 0 1 1 ${-2 * (r - 17)} 0" stroke="none"/>
<text font-family="${MONO}" font-size="11.5" font-weight="700" fill="#2a2a28" stroke="none"><textPath href="#arco" textLength="${(2 * Math.PI * (r - 17) * 0.97).toFixed(0)}">COPIADO NA PAPELARIA SOL NASCENTE · CRUZ MANSA · </textPath></text>
<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="${TITULO}" font-size="20" fill="#2a2a28" stroke="none">1998</text></g>`;
const fosforo = (x, y) => `<g><rect x="${x}" y="${y}" width="12" height="150" fill="#d8c79a" stroke="#1c1c1a" stroke-width="2"/><ellipse cx="${x + 6}" cy="${y}" rx="13" ry="22" fill="#141414"/><path d="M ${x + 6} ${y - 24} q -22 -26 0 -62 q 22 36 0 62" fill="#dd5d05" fill-opacity=".85" stroke="#1c1c1a" stroke-width="2"/></g>`;

const paginas = {};

// 1 — Capa
paginas["pagina-1"] = base(
  "Capa da fanzine Cabeça de Fósforo, número 7",
  `${recorte(54, 150, "CABEÇA", 78)}
${recorte(54, 262, "DE FÓSFORO", 78)}
${texto(60, 318, "fanzine da turma do fundão · feita com cola, tesoura e xerox", { s: 14 })}
${fosforo(280, 400)}
${fita(214, 392, 120, 30, -6)}
${texto(60, 480, "NESTE NÚMERO:", { s: 15, b: true })}
${linhas(60, 504, ["• show na garagem", "• resenha de fita K7", "• cartas e classificados"], { s: 15 })}
${carimbo(470, 640, 76)}
${marcaTexto(52, 698, 224, 38)}
${texto(60, 725, "mar/1998 · nº 7", { f: TITULO, s: 26 })}
${texto(448, 782, "L.M.", { f: MAO, s: 26, rot: -4 })}
${grampo(560, 40)}`,
);
marca("pagina-1", "carimbo", 392, 560, 156, 156);
marca("pagina-1", "data", 50, 696, 230, 44);
marca("pagina-1", "assinatura-lm", 436, 752, 80, 42);

// 2 — Editorial
paginas["pagina-2"] = base(
  "Página 2: editorial escrito à mão, com estrelinhas no lugar dos pingos",
  `${recorte(54, 120, "OI, GENTE", 56)}
${texto(60, 190, "Oı, gente!  Mais um número saiu do forno ★", { f: MAO, s: 24, c: "#1c1c1a" })}
${texto(60, 226, "Este aqui ficou grandão: sete folhas, três bandas", { f: MAO, s: 20 })}
${texto(60, 258, "e uma resenha que quase virou capítulo de livro ★", { f: MAO, s: 20 })}
${texto(60, 290, "Vı a turma toda colando letrınha até tarde ★", { f: MAO, s: 20 })}
<g fill="#dd5d05" fill-opacity=".9" font-family="${MAO}" font-size="16"><text x="86" y="170">★</text><text x="216" y="170">★</text></g>
${fita(30, 110, 90, 26, -10)}
${texto(60, 370, "POR QUE FAZER FANZINE?", { s: 16, b: true })}
${linhas(60, 400, ["Porque rádio não toca a gente e jornal", "não sabe que a gente existe. Então a", "gente imprime a gente mesmo, dobra,", "grampeia e entrega na saída da escola.", "", "Quem ler e gostar: passa pra frente.", "Quem ler e não gostar: faz a sua!"])}
${marcaTexto(58, 566, 332, 22)}
${texto(60, 584, "Quem ler e gostar: passa pra frente.", {})}
${texto(60, 700, "— até o próximo número,", { f: MAO, s: 20 })}
${grampo(30, 780)}`,
);
marca("pagina-2", "letra-estrela", 52, 158, 500, 148);

// 3 — Resenhas
paginas["pagina-3"] = base(
  "Página 3: resenha do show na Garagem do Seu Aurélio, assinada Beto F.",
  `${recorte(54, 110, "AO VIVO", 56)}
${texto(60, 168, "Os Pinguins de Neon + Dona Coruja e as Lâmpadas", { s: 15, b: true })}
<rect x="52" y="190" width="496" height="64" fill="#f4f2ec" stroke="#1c1c1a" stroke-width="2" stroke-dasharray="6 4"/>
${texto(66, 216, "SÁBADO, 14 DE FEVEREIRO · GARAGEM DO SEU AURÉLIO", { s: 14, b: true })}
${texto(66, 240, "entrada: 1 pacote de bolacha (vai pra festa da turma)", { s: 13 })}
${linhas(60, 292, ["A garagem do Seu Aurélio, nosso QG de sempre,", "ficou pequena. Teve gente no portão, gente", "no muro, gente no telhado da Kombi velha.", "", "Os Pinguins de Neon abriram com a música", "do guarda-chuva (a melhor da noite) e a", "Dona Coruja fechou apagando a luz e", "tocando só com lanterna. Ninguém piscou.", "", "Saí de lá com o ouvido apitando e o", "coração fazendo xerox de tudo."])}
${marcaTexto(52, 276, 494, 24)}
${fita(480, 170, 90, 24, 8)}
${texto(380, 760, "— Beto F.", { f: MAO, s: 26, rot: -3 })}
${grampo(30, 40)}`,
);
marca("pagina-3", "show-garagem", 52, 190, 496, 112);
marca("pagina-3", "assinatura-bf", 372, 730, 150, 44);

// 4 — Cartas e classificados
paginas["pagina-4"] = base(
  "Página 4: cartas, classificados e o endereço de correspondência",
  `${recorte(54, 110, "CARTAS", 56)}
${linhas(60, 170, ["\"Li o nº 6 três vezes no ônibus. Mandem mais!\"", "   — uma leitora do 2º ano", "", "\"Cadê a tirinha do Tuca? Sinto falta.\"", "   — um leitor de Vila Nova"], { s: 14 })}
<rect x="52" y="300" width="496" height="110" fill="#f4f2ec" stroke="#1c1c1a" stroke-width="3"/>
${texto(68, 332, "ESCREVA PRA GENTE", { f: TITULO, s: 22 })}
${texto(68, 362, "Caixa Postal 112 — Cruz Mansa", { s: 18, b: true })}
${texto(68, 388, "(pode mandar carta, desenho e fita demo)", { s: 13 })}
${recorte(54, 470, "CLASSIFICADOS", 36)}
${linhas(60, 510, ["• TROCO fita K7 de rock por fita de samba.", "• PROCURA-SE baterista, mesmo sem bateria.", "• VENDO capa de caderno decorada, 3 por 1."], { s: 14 })}
<g transform="translate(420 600)" fill="none" stroke="#1c1c1a" stroke-width="3" stroke-linecap="round"><circle cx="40" cy="40" r="26"/><circle cx="30" cy="34" r="3" fill="#1c1c1a"/><circle cx="50" cy="34" r="3" fill="#1c1c1a"/><path d="M 28 50 q 12 12 24 0"/><path d="M 20 18 l -8 -16 M 60 18 l 8 -16"/></g>
${texto(430, 690, "T.", { f: MAO, s: 30, rot: -6 })}
${grampo(560, 760)}`,
);
marca("pagina-4", "caixa-postal", 52, 300, 496, 110);
marca("pagina-4", "assinatura-t", 410, 596, 100, 110);

// 5 — Último aviso
paginas["pagina-5"] = base(
  "Página 5: bilhete colado avisando que a papelaria vai fechar",
  `${recorte(54, 110, "AVISO", 56)}
${linhas(60, 170, ["Gente, esta é a última página do nº 7", "e a gente precisa contar uma coisa."], { s: 16 })}
<g transform="rotate(-2 300 360)"><rect x="62" y="230" width="476" height="190" fill="#f4f2ec" stroke="#1c1c1a" stroke-width="2"/>
${linhas(80, 268, ["A Papelaria Sol Nascente vai fechar", "em abril. Era lá que a gente xerocava", "tudo, a preço de amigo. Sem a máquina,", "sem a zine. O jeito é guardar bem", "estas folhas."], { f: MAO, s: 20, l: 30 })}
</g>
${marcaTexto(80, 300, 330, 26)}
${fita(240, 214, 110, 28, 4)}
${linhas(60, 500, ["Obrigada a quem leu, copiou, passou adiante.", "Se um dia a gente se achar de novo, a", "primeira rodada de xerox é por nossa conta."], { s: 15 })}
${texto(60, 640, "★ ★ ★", { f: MAO, s: 28, c: "#1c1c1a" })}
${grampo(30, 760)}`,
);
marca("pagina-5", "aviso-papelaria", 60, 228, 480, 196);

for (const [nome, svg] of Object.entries(paginas)) fs.writeFileSync(path.join(saida, `${nome}.svg`), svg);
console.log(JSON.stringify(areas, null, 1));
