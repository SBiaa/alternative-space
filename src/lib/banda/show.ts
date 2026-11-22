// O show do fim de semana e a liberação dos palcos. TypeScript puro e determinístico:
// a mesma seed + semana + repertório dão sempre o mesmo resultado.

import { sortear } from "../gestao/rng";
import { BANDA, HUMOR, MANIAS, MOMENTOS, MOMENTOS_POR_SHOW, PALCOS, PARTES_EQUIP, SHOW, type PalcoCfg } from "./config";
import { equipamentoMedio, humorMedio, limitar, media, noiteDe, substituto } from "./motor";
import type { Integrante, Progresso, RegistroShow, ResultadoShow } from "./tipos";

export const palcoPorSlug = (slug: unknown): PalcoCfg | undefined => PALCOS.find((p) => p.slug === slug);

export const palcoLiberado = (p: Progresso, palco: PalcoCfg) => p.fama >= palco.famaMin && (!palco.exigeDemo || p.demo);
export const palcosLiberados = (p: Progresso) => PALCOS.filter((x) => palcoLiberado(p, x));
/** O que falta pra abrir o palco: fama e/ou demo. */
export function oQueFalta(p: Progresso, palco: PalcoCfg): { fama: number; demo: boolean } {
  return { fama: Math.max(0, palco.famaMin - p.fama), demo: palco.exigeDemo && !p.demo };
}
/** O maior palco já tocado (pela ordem da lista de palcos), ou null. */
export function maiorPalco(shows: Pick<RegistroShow, "palco">[]): string | null {
  const idx = shows.map((s) => PALCOS.findIndex((x) => x.slug === s.palco)).filter((i) => i >= 0);
  return idx.length ? PALCOS[Math.max(...idx)].slug : null;
}

/** Fator em torno de 1: vale 1 com o valor em 50 e oscila com o peso. Nunca fica abaixo de 0.2. */
export const fator = (valor: number, peso: number) => Math.max(0.2, 1 + peso * ((valor - 50) / 50));

export type PrevisaoShow = { notaMusicas: number; entrosamento: number; presenca: number; equipamento: number; divulgacao: number };

/** Os valores de entrada do show, pra tela mostrar "o que pesa". */
export function previsao(p: Progresso, repertorio: number[], faltas = 0): PrevisaoShow {
  const musicas = p.musicas.filter((m) => repertorio.includes(m.slot));
  const penal = faltas * SHOW.faltaPenalidade * 100;
  return {
    notaMusicas: media(musicas.map((m) => m.nota)),
    entrosamento: limitar(p.entrosamento - penal),
    presenca: limitar(media(p.membros.map((m) => m.presenca)) - penal),
    equipamento: equipamentoMedio(p.equipamento),
    divulgacao: p.divulgacao,
  };
}

export const repertorioValido = (p: Progresso, palco: PalcoCfg, rep: unknown): rep is number[] =>
  Array.isArray(rep) &&
  rep.length >= SHOW.repertorioMin &&
  rep.length <= palco.musicas &&
  new Set(rep).size === rep.length &&
  rep.every((s) => Number.isInteger(s) && p.musicas.some((m) => m.slot === s));

/** Troca no fim da semana: o cansaço do fim de semana cai, a semana vira e a divulgação zera. */
function virarSemana(p: Progresso, membros: Integrante[]): Progresso {
  return {
    ...p,
    semana: p.semana + 1,
    dia: 0,
    agenda: [],
    divulgacao: 0,
    membros: membros.map((m) => ({ ...m, cansaco: limitar(m.cansaco - SHOW.recuperaCansaco) })),
  };
}

/** Quem quer só música própria perde humor se a banda passou duas semanas sem compor. */
function humorDeQuemQuerComposicao(p: Progresso, m: Integrante): number {
  const q = MANIAS.find((x) => x.id === m.mania)?.querMusicaPropria;
  if (!q) return 0;
  return p.musicas.some((s) => s.semana >= p.semana - 1) ? 0 : q;
}

export function tocarShow(p: Progresso, palcoSlug: unknown, repertorio: unknown): ResultadoShow {
  if (p.dia < BANDA.diasDeSemana) return { ok: false, erro: "diaErrado" };
  if (p.musicas.length === 0) return { ok: false, erro: "semMusica" };
  const palco = palcoPorSlug(palcoSlug);
  if (!palco) return { ok: false, erro: "invalido" };
  if (!palcoLiberado(p, palco)) return { ok: false, erro: "palcoFechado" };
  if (!repertorioValido(p, palco, repertorio)) return { ok: false, erro: "repertorio" };
  const n = noiteDe(p);

  // Quem falta (humor no chão) e quem atrasa (mania).
  const faltou = p.membros.filter((m) => m.humor <= HUMOR.faltar && sortear(p.seed, n, `falta:${m.id}`) < HUMOR.chanceFaltar);
  const presentes = p.membros.filter((m) => !faltou.includes(m));
  const atrasou = presentes.filter((m) => {
    const a = MANIAS.find((x) => x.id === m.mania)?.atrasa;
    return a !== undefined && sortear(p.seed, n, `atraso:${m.id}`) < a;
  });

  const v = previsao(p, repertorio, faltou.length);
  const presencaVal = limitar(media(presentes.map((m) => m.presenca)) - faltou.length * SHOW.faltaPenalidade * 100);
  const ruido = (2 * sortear(p.seed, n, "show") - 1) * SHOW.ruido;
  const bruta =
    v.notaMusicas *
    fator(v.entrosamento, SHOW.peso.entrosamento) *
    fator(presencaVal, SHOW.peso.presenca) *
    fator(v.equipamento, SHOW.peso.equipamento) *
    fator(v.divulgacao, SHOW.peso.divulgacao) *
    (1 + ruido);
  const nota0 = limitar(Math.round(bruta - atrasou.length * SHOW.atrasoPenalidade * 100));

  // Público: demanda (fama e divulgação) × qualidade do show, limitado pela lotação.
  const demanda = limitar(SHOW.demanda.piso + SHOW.demanda.pesoFama * (p.fama / 100) + SHOW.demanda.pesoDivulgacao * (p.divulgacao / 100), 0, 1);
  const ocupacao0 = limitar(demanda * (SHOW.ocupacao.pivo + (nota0 / 100) * SHOW.ocupacao.escala), 0, 1);

  // Momentos: entram os que passam nas condições e na sorte, os mais "sortudos" primeiro.
  const empolgou = presentes.some((m) => MANIAS.find((x) => x.id === m.mania)?.empolga);
  const elegiveis = MOMENTOS.filter((mo) => {
    if (mo.nota?.min !== undefined && nota0 < mo.nota.min) return false;
    if (mo.nota?.max !== undefined && nota0 > mo.nota.max) return false;
    if (mo.cabosMax !== undefined && p.equipamento.cabos > mo.cabosMax) return false;
    if (mo.equipMax !== undefined && v.equipamento > mo.equipMax) return false;
    if (mo.ocupacaoMin !== undefined && ocupacao0 < mo.ocupacaoMin) return false;
    if (mo.ocupacaoMax !== undefined && ocupacao0 > mo.ocupacaoMax) return false;
    if (mo.precisaMania === "empolga" && !empolgou) return false;
    if (mo.precisaMania === "atrasa" && atrasou.length === 0) return false;
    return true;
  })
    .map((mo) => ({ mo, r: sortear(p.seed, n, `momento:${mo.id}`) }))
    .filter((x) => x.r < x.mo.chance)
    .sort((a, b) => a.r - b.r)
    .slice(0, MOMENTOS_POR_SHOW)
    .map((x) => x.mo);
  const momentos = elegiveis.length ? elegiveis : [MOMENTOS.find((m) => m.id === "show-calmo")!];

  const bonusEmpolga = presentes.reduce((s, m) => s + (MANIAS.find((x) => x.id === m.mania)?.empolga ?? 0), 0);
  const nota = limitar(nota0 + momentos.reduce((s, m) => s + (m.efeitoNota ?? 0), 0));
  const ocupacao = limitar(ocupacao0 + bonusEmpolga + momentos.reduce((s, m) => s + (m.efeitoPublico ?? 0), 0), 0, 1);
  const publico = Math.round(palco.capacidade * ocupacao);
  const cache = Math.round(palco.cacheBase * (SHOW.cacheMin + (1 - SHOW.cacheMin) * ocupacao) * (0.7 + (nota / 100) * 0.6));
  const famaDelta = Math.max(SHOW.famaMinDelta, Math.min(palco.famaGanho, Math.round(((nota - 50) / 50) * palco.famaGanho) || 0));
  const energia = limitar(Math.round(0.5 * nota + 0.3 * humorMedio(p) + 20 * ocupacao));

  const registro: RegistroShow = {
    semana: p.semana,
    palco: palco.slug,
    repertorio: [...(repertorio as number[])],
    publico,
    cache,
    famaDelta,
    nota,
    energia,
    momentos: momentos.map((m) => m.id),
  };

  // Depois do show: o humor sobe ou desce com a nota, o equipamento desgasta e quem estava no limite pode sair.
  const deltaHumor = nota >= SHOW.notaBoa ? SHOW.humorShowBom : nota <= SHOW.notaRuim ? SHOW.humorShowRuim : 0;
  const equipamento = { ...p.equipamento };
  for (const k of PARTES_EQUIP) {
    const [a, b] = SHOW.desgasteShow;
    equipamento[k] = limitar(equipamento[k] - Math.round(a + sortear(p.seed, n, `desgaste:${k}`) * (b - a)));
  }
  let membros = p.membros.map((m) => ({
    ...m,
    humor: limitar(m.humor + (faltou.includes(m) ? 0 : deltaHumor) - humorDeQuemQuerComposicao(p, m)),
  }));
  const saidas: { nome: string; entrou: string }[] = [];
  let entrosamento = limitar(p.entrosamento);
  membros = membros.map((m) => {
    // Só sai quem já tinha sido avisado numa semana anterior: o jogador sempre tem uma semana pra reagir.
    const pode = m.humor <= HUMOR.saida && m.avisoSemana !== null && m.avisoSemana < p.semana;
    if (!pode || sortear(p.seed, n, `sai:${m.id}`) >= HUMOR.chanceSair) return m;
    const novo = substituto({ ...p, membros }, m);
    saidas.push({ nome: m.nome, entrou: novo.nome });
    entrosamento = limitar(entrosamento - 10);
    return novo;
  });

  const depois: Progresso = {
    ...p,
    dinheiro: p.dinheiro + cache,
    fama: limitar(p.fama + famaDelta),
    entrosamento,
    equipamento,
    shows: [...p.shows, registro].slice(-BANDA.historicoShowsLocal),
  };
  return { ok: true, prog: virarSemana(depois, membros), registro, faltou: faltou.map((m) => m.nome), saidas };
}

/** Passa o fim de semana sem tocar: a banda perde um pouco de fama e de humor. */
export function pularShow(p: Progresso): { ok: true; prog: Progresso } | { ok: false; erro: "diaErrado" } {
  if (p.dia < BANDA.diasDeSemana) return { ok: false, erro: "diaErrado" };
  const membros = p.membros.map((m) => ({ ...m, humor: limitar(m.humor + SHOW.pularHumor) }));
  return { ok: true, prog: virarSemana({ ...p, fama: limitar(p.fama + SHOW.pularFama) }, membros) };
}
