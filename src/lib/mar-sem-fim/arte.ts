// Arte do pirata e da bandeira como SVG em texto. Feita a partir de peças próprias (formas simples) e das cores de
// content/mar-sem-fim/aparencia.json. Sai como string pra servir tanto os componentes React quanto a imagem do cartaz.

import { APARENCIA } from "./conteudo";
import type { Aparencia, Bandeira } from "./tipos";

const corDe = (lista: { id: string; valor: string }[], id: string, padrao: string) => lista.find((c) => c.id === id)?.valor ?? padrao;

const TINTA = "#2a2a2a";
const ROUPA = "#093f7a";

/** Pirata de busto, em viewBox 0 0 120 150. */
export function svgPirata(a: Aparencia): string {
  const pele = corDe(APARENCIA.cores, a.cor, "#b9784f");
  // Silhueta: largura dos ombros e altura da cabeça.
  const ombro = a.silhueta === "robusto" ? 52 : a.silhueta === "baixinho" ? 40 : 34;
  const cabecaY = a.silhueta === "baixinho" ? 70 : 58;
  const cx = 60;
  const corpo = `<path d="M${cx - ombro} 150 Q${cx - ombro} ${cabecaY + 38} ${cx} ${cabecaY + 34} Q${cx + ombro} ${cabecaY + 38} ${cx + ombro} 150 Z" fill="${ROUPA}"/>
<path d="M${cx - 10} ${cabecaY + 34} L${cx} ${cabecaY + 56} L${cx + 10} ${cabecaY + 34} Z" fill="#ece3be"/>`;
  const cabeca = `<ellipse cx="${cx}" cy="${cabecaY}" rx="22" ry="25" fill="${pele}" stroke="${TINTA}" stroke-width="2"/>
<circle cx="${cx - 8}" cy="${cabecaY - 2}" r="2.6" fill="${TINTA}"/><circle cx="${cx + 8}" cy="${cabecaY - 2}" r="2.6" fill="${TINTA}"/>
<path d="M${cx - 6} ${cabecaY + 12} Q${cx} ${cabecaY + 16} ${cx + 6} ${cabecaY + 12}" fill="none" stroke="${TINTA}" stroke-width="2" stroke-linecap="round"/>`;
  const cicatriz =
    a.cicatriz === "olho" ? `<path d="M${cx + 4} ${cabecaY - 14} L${cx + 12} ${cabecaY + 8}" stroke="#ab392f" stroke-width="2.4" stroke-linecap="round"/>`
    : a.cicatriz === "bochecha" ? `<path d="M${cx - 18} ${cabecaY + 4} L${cx - 8} ${cabecaY + 10} M${cx - 16} ${cabecaY + 10} L${cx - 10} ${cabecaY + 4}" stroke="#ab392f" stroke-width="2.2" stroke-linecap="round"/>`
    : a.cicatriz === "tapa" ? `<ellipse cx="${cx + 8}" cy="${cabecaY - 2}" rx="6.5" ry="5.5" fill="${TINTA}"/><path d="M${cx - 22} ${cabecaY - 16} L${cx + 14} ${cabecaY + 2}" stroke="${TINTA}" stroke-width="1.8"/>`
    : "";
  const chapeu =
    a.chapeu === "tricornio" ? `<path d="M${cx - 34} ${cabecaY - 14} Q${cx - 12} ${cabecaY - 44} ${cx} ${cabecaY - 38} Q${cx + 12} ${cabecaY - 44} ${cx + 34} ${cabecaY - 14} Q${cx} ${cabecaY - 22} ${cx - 34} ${cabecaY - 14} Z" fill="${TINTA}"/><circle cx="${cx}" cy="${cabecaY - 30}" r="3.6" fill="#f2c14e"/>`
    : a.chapeu === "bandana" ? `<path d="M${cx - 23} ${cabecaY - 12} Q${cx} ${cabecaY - 36} ${cx + 23} ${cabecaY - 12} Q${cx} ${cabecaY - 18} ${cx - 23} ${cabecaY - 12} Z" fill="#ab392f"/><path d="M${cx + 20} ${cabecaY - 14} L${cx + 34} ${cabecaY - 6} L${cx + 22} ${cabecaY - 4} Z" fill="#ab392f"/>`
    : a.chapeu === "palha" ? `<ellipse cx="${cx}" cy="${cabecaY - 16}" rx="40" ry="8" fill="#e3c27a" stroke="${TINTA}" stroke-width="1.6"/><path d="M${cx - 20} ${cabecaY - 18} Q${cx} ${cabecaY - 46} ${cx + 20} ${cabecaY - 18} Z" fill="#e3c27a" stroke="${TINTA}" stroke-width="1.6"/><rect x="${cx - 20}" y="${cabecaY - 22}" width="40" height="5" fill="#dd5d05"/>`
    : a.chapeu === "gorro" ? `<path d="M${cx - 23} ${cabecaY - 10} Q${cx - 20} ${cabecaY - 42} ${cx} ${cabecaY - 42} Q${cx + 20} ${cabecaY - 42} ${cx + 23} ${cabecaY - 10} Z" fill="#8fb4c8" stroke="${TINTA}" stroke-width="1.6"/><rect x="${cx - 24}" y="${cabecaY - 16}" width="48" height="8" rx="3" fill="#ece3be" stroke="${TINTA}" stroke-width="1.4"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150">${corpo}${cabeca}${cicatriz}${chapeu}</svg>`;
}

const FORMAS: Record<string, (c: string) => string> = {
  ancora: (c) => `<g fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"><circle cx="45" cy="17" r="4"/><path d="M45 21 V44 M38 27 H52 M30 36 Q34 46 45 46 Q56 46 60 36"/></g>`,
  estrela: (c) => `<path d="M45 12 L50 25 L64 26 L53 35 L57 48 L45 40 L33 48 L37 35 L26 26 L40 25 Z" fill="${c}"/>`,
  onda: (c) => `<g fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"><path d="M22 24 Q30 14 38 24 T54 24 T70 24"/><path d="M22 36 Q30 26 38 36 T54 36 T70 36"/></g>`,
  lua: (c) => `<path d="M52 12 A19 19 0 1 0 52 48 A15 15 0 1 1 52 12 Z" fill="${c}"/>`,
  chave: (c) => `<g fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"><circle cx="34" cy="30" r="8"/><path d="M42 30 H66 M58 30 V38 M65 30 V36"/></g>`,
  vela: (c) => `<g fill="${c}"><path d="M44 10 V40 H26 Z"/><path d="M48 14 V40 H64 Z"/><rect x="24" y="43" width="42" height="4" rx="2"/></g>`,
};

/** Bandeira do barco, em viewBox 0 0 90 60. */
export function svgBandeira(b: Bandeira): string {
  const fundo = corDe(APARENCIA.bandeira.cores, b.fundoCor, "#093f7a");
  const forma = corDe(APARENCIA.bandeira.cores, b.formaCor, "#ece3be");
  const base =
    b.fundo === "listras" ? `<rect width="90" height="60" fill="${fundo}"/><rect y="12" width="90" height="12" fill="${forma}" opacity=".28"/><rect y="36" width="90" height="12" fill="${forma}" opacity=".28"/>`
    : b.fundo === "diagonal" ? `<rect width="90" height="60" fill="${fundo}"/><path d="M0 60 L90 0 V60 Z" fill="${forma}" opacity=".26"/>`
    : b.fundo === "metade" ? `<rect width="90" height="60" fill="${fundo}"/><rect x="45" width="45" height="60" fill="#000" opacity=".22"/>`
    : `<rect width="90" height="60" fill="${fundo}"/>`;
  const desenho = (FORMAS[b.forma] ?? FORMAS.estrela)(forma);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60">${base}${desenho}<rect x=".75" y=".75" width="88.5" height="58.5" fill="none" stroke="#01121e" stroke-opacity=".5" stroke-width="1.5"/></svg>`;
}

export const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
