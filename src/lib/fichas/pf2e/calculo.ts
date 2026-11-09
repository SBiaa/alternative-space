// Cálculos que dependem dos dados (talentos, equipamento, magias). O núcleo fica em src/lib/pathfinder.ts.
import { atributos, bonus, profClasse, profPericias, PROFS, type Ficha } from "@/lib/pathfinder";
import { ARMADURAS, ARMAS, ESCUDOS, ITENS } from "./dados/equipamento";
import { MAGIAS } from "./dados/magias";
import { TALENTOS } from "./dados/talentos";
import { CONJURADORES, espacosDeMagia, niveisTalento, TRUQUES, type TipoEspaco } from "./progressao";
import type { Arma, Magia, Talento, Tradicao } from "./tipos";

export const TIPOS_ESPACO: { id: TipoEspaco; nome: string }[] = [
  { id: "ancestralidade", nome: "Ancestralidade" },
  { id: "classe", nome: "Classe" },
  { id: "pericia", nome: "Perícia" },
  { id: "geral", nome: "Geral" },
];

export type Espaco = { chave: string; tipo: TipoEspaco; nivel: number };

const porId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
const TALENTO = porId(TALENTOS);
const ARMA = porId(ARMAS);
const ARMADURA = porId(ARMADURAS);
const ESCUDO = porId(ESCUDOS);
const ITEM = porId(ITENS);
const MAGIA = porId(MAGIAS);
export const acharTalento = (id: string) => TALENTO.get(id);
export const acharArma = (id: string) => ARMA.get(id);
export const acharArmadura = (id: string) => ARMADURA.get(id);
export const acharEscudo = (id: string) => ESCUDO.get(id);
export const acharItem = (id: string) => ITEM.get(id);
export const acharMagia = (id: string) => MAGIA.get(id);

// Espaços de talento até o nível da ficha, em ordem de nível.
export function espacos(f: Ficha): Espaco[] {
  const out: Espaco[] = [];
  for (const { id } of TIPOS_ESPACO)
    for (const n of niveisTalento(id, f.classe)) if (n <= f.nivel) out.push({ chave: `${id}-${n}`, tipo: id, nivel: n });
  return out.sort((a, b) => a.nivel - b.nivel || TIPOS_ESPACO.findIndex((t) => t.id === a.tipo) - TIPOS_ESPACO.findIndex((t) => t.id === b.tipo));
}

// Por que um talento não pode ir num espaço (ou null se pode).
export function bloqueioTalento(f: Ficha, t: Talento, e: Espaco): string | null {
  // Talento geral aceita talento de perícia também; os outros espaços só o próprio tipo.
  if (t.tipo !== e.tipo && !(e.tipo === "geral" && t.tipo === "pericia")) return "Tipo de talento diferente.";
  if (t.nivel > e.nivel) return `Exige nível ${t.nivel}.`;
  if (t.tipo === "ancestralidade" && t.ancestralidade !== f.ancestralidade) return "De outra ancestralidade.";
  if (t.tipo === "classe" && !t.classes?.includes(f.classe as never)) return "De outra classe.";
  if (t.pericia) {
    const p = profPericias({ ...f, nivel: e.nivel })[t.pericia.id];
    if (PROFS.indexOf(p) < PROFS.indexOf(t.pericia.prof)) return "Proficiência de perícia insuficiente.";
  }
  const antes = new Set(Object.entries(f.talentos).filter(([k]) => nivelDoEspaco(k) < e.nivel || k === e.chave).map(([, v]) => v));
  for (const r of t.requer ?? []) if (!antes.has(r) && r !== t.id) return `Exige ${acharTalento(r)?.nome ?? r}.`;
  const repetido = Object.entries(f.talentos).some(([k, v]) => v === t.id && k !== e.chave);
  if (repetido) return "Já escolhido.";
  return null;
}

const nivelDoEspaco = (chave: string) => Number(chave.split("-")[1]);

export function talentosPara(f: Ficha, e: Espaco): Talento[] {
  return TALENTOS.filter((t) => {
    if (t.tipo !== e.tipo && !(e.tipo === "geral" && t.tipo === "pericia")) return false;
    if (t.nivel > e.nivel) return false;
    if (t.tipo === "ancestralidade" && t.ancestralidade !== f.ancestralidade) return false;
    if (t.tipo === "classe" && !t.classes?.includes(f.classe as never)) return false;
    return true;
  }).sort((a, b) => b.nivel - a.nivel || a.nome.localeCompare(b.nome, "pt-BR"));
}

// Remove talentos que deixaram de valer (outra classe, nível menor, pré-requisito perdido).
export function limparTalentos(f: Ficha): Ficha {
  const validos = new Map(espacos(f).map((e) => [e.chave, e]));
  const talentos: Record<string, string> = {};
  const g = { ...f, talentos };
  for (const e of espacos(f)) {
    const id = f.talentos[e.chave];
    const t = id ? acharTalento(id) : undefined;
    if (t && validos.has(e.chave) && !bloqueioTalento(g, t, e)) talentos[e.chave] = id;
  }
  return g;
}

// ---- Equipamento

const desDaArmadura = (des: number, teto: number | null) => (teto === null ? des : Math.min(des, teto));

export function calcularEquipamento(f: Ficha) {
  const attr = atributos(f);
  const nv = f.nivel;
  const armadura = acharArmadura(f.equipamento.armadura) ?? ARMADURA.get("sem-armadura")!;
  const categoria = armadura.categoria === "sem" ? "semArmadura" : armadura.categoria;
  const profArmadura = profClasse(f, categoria);
  const escudo = acharEscudo(f.equipamento.escudo);
  const ca = 10 + desDaArmadura(attr.des, armadura.tetoDes) + armadura.bonusCA + bonus(profArmadura, 0, nv);
  // Força suficiente tira a penalidade de verificação e reduz a de deslocamento em 5.
  const forte = armadura.forca !== null && attr.for >= armadura.forca;
  const penDeslocamento = forte ? Math.min(0, armadura.penDeslocamento + 5) : armadura.penDeslocamento;
  return {
    armadura,
    profArmadura,
    escudo,
    ca,
    caComEscudo: escudo ? ca + escudo.bonusCA : null,
    penalidade: forte ? 0 : armadura.penalidade,
    penDeslocamento,
    ataques: [ARMA.get("desarmado")!, ...f.equipamento.armas.map(acharArma).filter((a): a is Arma => !!a)].map((a) => ataque(f, a)),
  };
}

export function ataque(f: Ficha, a: Arma) {
  const attr = atributos(f);
  const prof = profClasse(f, a.categoria === "desarmado" ? "desarmado" : a.categoria);
  const acuidade = a.tracos.some((t) => t.startsWith("acuidade"));
  const distancia = a.tipo === "distancia";
  const modAtaque = distancia ? attr.des : acuidade ? Math.max(attr.for, attr.des) : attr.for;
  const arremesso = a.tracos.some((t) => t.startsWith("arremesso"));
  const propulsao = a.tracos.some((t) => t.startsWith("propulsão"));
  // Dano soma Força no corpo a corpo e em arma de arremesso; propulsão soma metade (se positiva).
  const modDano = !distancia || arremesso ? attr.for : propulsao ? Math.max(0, Math.floor(attr.for / 2)) : 0;
  const agil = a.tracos.includes("ágil");
  const b = bonus(prof, modAtaque, f.nivel);
  return {
    arma: a,
    prof,
    ataque: b,
    // Ataques múltiplos: -5/-10, ou -4/-8 com arma ágil.
    mapa: [b, b - (agil ? 4 : 5), b - (agil ? 8 : 10)],
    dano: `${a.dano}${modDano ? (modDano > 0 ? `+${modDano}` : modDano) : ""} ${a.tipoDano}`,
  };
}

// ---- Magias

export function tradicaoDe(f: Ficha): Tradicao | null {
  const c = CONJURADORES[f.classe as keyof typeof CONJURADORES];
  if (!c) return null;
  return c.tradicao ?? (f.tradicao || null);
}

export function infoMagia(f: Ficha) {
  const c = CONJURADORES[f.classe as keyof typeof CONJURADORES];
  if (!c) return null;
  const tradicao = tradicaoDe(f);
  const espacosPorPosto = espacosDeMagia(f.nivel, c.tipo);
  const escolhidas = f.magias.map(acharMagia).filter((m): m is Magia => !!m);
  const usados = espacosPorPosto.map((_, i) => escolhidas.filter((m) => m.nivel === i + 1).length);
  return {
    tipo: c.tipo,
    tradicao,
    truques: TRUQUES,
    truquesUsados: escolhidas.filter((m) => m.nivel === 0).length,
    espacosPorPosto,
    usados,
    maiorPosto: espacosPorPosto.findLastIndex((n) => n > 0) + 1,
  };
}

export function magiasDisponiveis(f: Ficha, posto: number): Magia[] {
  const t = tradicaoDe(f);
  if (!t) return [];
  return MAGIAS.filter((m) => m.nivel === posto && m.tradicoes.includes(t)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

// Tira magias de outra tradição, acima do maior posto ou além dos espaços.
export function limparMagias(f: Ficha): Ficha {
  const info = infoMagia(f);
  if (!info || !info.tradicao) return { ...f, magias: [] };
  const conta = new Map<number, number>();
  const magias = f.magias.filter((id) => {
    const m = acharMagia(id);
    if (!m || !m.tradicoes.includes(info.tradicao!)) return false;
    const limite = m.nivel === 0 ? info.truques : (info.espacosPorPosto[m.nivel - 1] ?? 0);
    const n = (conta.get(m.nivel) ?? 0) + 1;
    conta.set(m.nivel, n);
    return n <= limite;
  });
  return { ...f, magias: [...new Set(magias)] };
}

export function limparEquipamento(f: Ficha): Ficha {
  const e = f.equipamento;
  return {
    ...f,
    equipamento: {
      armas: e.armas.filter((id) => ARMA.has(id) && id !== "desarmado"),
      armadura: ARMADURA.has(e.armadura) ? e.armadura : "",
      escudo: ESCUDO.has(e.escudo) ? e.escudo : "",
      itens: e.itens.filter((id) => ITEM.has(id)),
    },
  };
}

// Tudo junto: núcleo + talentos + magias + equipamento.
export const limparTudo = (f: Ficha) => limparEquipamento(limparMagias(limparTalentos(f)));

export function pendenciasExtras(f: Ficha): string[] {
  const out: string[] = [];
  const vazios = espacos(f).filter((e) => !f.talentos[e.chave]);
  if (vazios.length) out.push(`Escolha ${vazios.length} talento${vazios.length > 1 ? "s" : ""} (${vazios.map((e) => `${TIPOS_ESPACO.find((t) => t.id === e.tipo)!.nome.toLowerCase()} ${e.nivel}`).join(", ")}).`);
  if (f.classe === "feiticeiro" && !f.tradicao) out.push("Escolha a tradição da linhagem do feiticeiro.");
  const info = infoMagia(f);
  if (info?.tradicao) {
    const faltam = info.truques - info.truquesUsados + info.espacosPorPosto.reduce((s, n, i) => s + n - info.usados[i], 0);
    if (faltam > 0) out.push(`Escolha mais ${faltam} magia${faltam > 1 ? "s" : ""}.`);
  }
  return out;
}

export { ARMAS, ARMADURAS, ESCUDOS, ITENS, MAGIAS, TALENTOS };
