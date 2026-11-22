// Regras da Laje Verde em TypeScript puro: recebem o save e o instante `agora` e devolvem o save novo.
// Nada aqui lê relógio nem sorteia sozinho. O servidor é quem decide `agora` e confere cada passo.

import { climaDoDia, pomboDoDia, propostaDoDia } from "./clima";
import { ENCAIXES, LAJE, decoracao, planta } from "./config";
import { DIA, HORA, MIN, diaDe, inicioDoDia } from "./tempo";
import type { Erro, Fase, Info, Resultado, Save, Vaso } from "./tipos";
import { sortear } from "../gestao/rng";

const ok = (save: Save): Resultado => ({ ok: true, save });
const falha = (erro: Erro): Resultado => ({ ok: false, erro });
const copia = (s: Save): Save => structuredClone(s);

export function vasoVazio(slot: number, agora: number): Vaso {
  return { slot, planta: null, plantadoEm: null, agua: 0, aguaEm: agora, nivel: 1, crescimentoMs: 0 };
}

export function novoSave(seed: string, agora: number): Save {
  return {
    v: LAJE.versaoSave,
    seed,
    moedas: LAJE.moedasIniciais,
    criadoEm: agora,
    inventario: {
      sementes: { ...LAJE.sementesIniciais },
      colheita: {},
      decoracoes: {},
      meta: { pomboDia: diaDe(agora) - 1, espantadoDia: null, ultimaTrocaDia: null, bicados: [] },
    },
    decoracoes: {},
    vasos: Array.from({ length: LAJE.vasos }, (_, i) => vasoVazio(i, agora)),
  };
}

export const temEspantalho = (s: Save) => Object.values(s.decoracoes).some((slug) => decoracao(slug)?.efeito === "espantalho");

/** Anda com um vaso do último registro até `ate`, trecho a trecho (virada de dia, começo e fim da chuva, água no limiar). */
export function assentar(v: Vaso, ate: number, seed: string): Vaso {
  if (!v.planta) return v;
  const p = planta(v.planta);
  if (!p) return v;
  let t = Math.max(v.aguaEm, ate - LAJE.limiteRecalculoDias * DIA);
  if (ate <= t) return v;
  const total = p.crescimentoMin * MIN;
  const limiar = LAJE.limiarMurcha;
  let agua = v.agua;
  let cresc = v.crescimentoMs;

  while (t < ate) {
    const dia = diaDe(t);
    const c = climaDoDia(seed, dia);
    let fim = Math.min(ate, inicioDoDia(dia + 1));
    let chovendo = false;
    if (c.chuvaIni !== null && c.chuvaFim !== null) {
      if (t < c.chuvaIni) fim = Math.min(fim, c.chuvaIni);
      else if (t < c.chuvaFim) {
        chovendo = true;
        fim = Math.min(fim, c.chuvaFim);
      }
    }
    const dt = fim - t;
    if (chovendo) {
      agua = LAJE.aguaMax;
      cresc += dt;
    } else {
      const r = (p.sedePorHora * LAJE.clima.sede[c.clima]) / HORA; // pontos de água por ms
      let resto = dt;
      if (agua > limiar && r > 0) {
        const d1 = Math.min(resto, (agua - limiar) / r);
        cresc += d1;
        agua -= r * d1;
        resto -= d1;
      } else if (r === 0) {
        cresc += resto;
        resto = 0;
      }
      if (resto > 0) {
        cresc += resto * LAJE.ritmoMurcha;
        agua = Math.max(0, agua - r * resto);
      }
    }
    t = fim;
  }
  return { ...v, agua, aguaEm: ate, crescimentoMs: Math.min(cresc, total) };
}

export function faseDe(frac: number): Fase {
  if (frac >= 1) return "pronta";
  if (frac >= LAJE.fases.crescendo) return "crescendo";
  if (frac >= LAJE.fases.broto) return "broto";
  return "semente";
}

/** O que a tela mostra de um vaso já assentado. */
export function infoDoVaso(v: Vaso): Info | null {
  const p = v.planta ? planta(v.planta) : null;
  if (!p) return null;
  const total = p.crescimentoMin * MIN;
  const frac = v.crescimentoMs / total;
  const fase = faseDe(frac);
  const murcha = v.agua <= LAJE.limiarMurcha;
  let proximaFaseEm: number | null = null;
  if (fase !== "pronta") {
    const alvo = (fase === "semente" ? LAJE.fases.broto : fase === "broto" ? LAJE.fases.crescendo : 1) * total;
    const ritmo = murcha ? LAJE.ritmoMurcha : 1;
    proximaFaseEm = Math.ceil(v.aguaEm + (alvo - v.crescimentoMs) / ritmo);
  }
  return { fase, murcha, agua: Math.round(v.agua), proximaFaseEm };
}

/** Põe o save em dia com `agora`: resolve os pombos que já se foram e assenta todos os vasos. */
export function atualizar(save: Save, agora: number): Save {
  const s = copia(save);
  const hoje = diaDe(agora);
  const meta = s.inventario.meta;

  for (let dia = Math.max(meta.pomboDia + 1, hoje - 7); dia <= hoje; dia++) {
    const pd = pomboDoDia(s.seed, dia, temEspantalho(s));
    if (pd.aparece && agora < pd.fim) break; // ainda dá tempo de espantar
    if (pd.aparece && meta.espantadoDia !== dia) {
      const prontos = s.vasos.map((v) => assentar(v, pd.inicio, s.seed)).filter((v) => v.planta && infoDoVaso(v)?.fase === "pronta" && !meta.bicados.includes(v.slot));
      if (prontos.length > 0) {
        const escolhido = prontos[Math.floor(sortear(s.seed, dia, "pombo-vaso") * prontos.length)];
        meta.bicados.push(escolhido.slot);
      }
    }
    meta.pomboDia = dia;
  }

  s.vasos = s.vasos.map((v) => assentar(v, agora, s.seed));
  return s;
}

export function plantar(save: Save, agora: number, slot: number, slug: string): Resultado {
  const p = planta(slug);
  if (!p || !Number.isInteger(slot)) return falha("invalido");
  const s = atualizar(save, agora);
  const v = s.vasos[slot];
  if (!v) return falha("invalido");
  if (v.planta) return falha("vaso-ocupado");
  if ((s.inventario.sementes[slug] ?? 0) < 1) return falha("sem-semente");
  s.inventario.sementes[slug] -= 1;
  s.vasos[slot] = { ...v, planta: slug, plantadoEm: agora, agua: LAJE.aguaAoPlantar, aguaEm: agora, crescimentoMs: 0 };
  return ok(s);
}

export function regar(save: Save, agora: number, slot: number): Resultado {
  if (!Number.isInteger(slot)) return falha("invalido");
  const s = atualizar(save, agora);
  const v = s.vasos[slot];
  if (!v) return falha("invalido");
  if (!v.planta) return falha("vaso-vazio");
  s.vasos[slot] = { ...v, agua: LAJE.aguaMax, aguaEm: agora };
  return ok(s);
}

export function rendimentoDe(v: Vaso, bicado: boolean): number {
  const p = v.planta ? planta(v.planta) : null;
  if (!p) return 0;
  const base = p.rendimento * LAJE.vaso.rendimento[v.nivel - 1];
  return Math.max(1, Math.round(base * (bicado ? 1 - LAJE.pombo.perda : 1)));
}

export function colher(save: Save, agora: number, slot: number): Resultado<Save & { colhido: { planta: string; qtd: number } }> {
  if (!Number.isInteger(slot)) return { ok: false, erro: "invalido" };
  const s = atualizar(save, agora);
  const v = s.vasos[slot];
  if (!v) return { ok: false, erro: "invalido" };
  if (!v.planta) return { ok: false, erro: "vaso-vazio" };
  if (infoDoVaso(v)?.fase !== "pronta") return { ok: false, erro: "nao-pronta" };
  const bicado = s.inventario.meta.bicados.includes(slot);
  const qtd = rendimentoDe(v, bicado);
  const planta = v.planta;
  s.inventario.colheita[planta] = (s.inventario.colheita[planta] ?? 0) + qtd;
  s.inventario.meta.bicados = s.inventario.meta.bicados.filter((x) => x !== slot);
  s.vasos[slot] = { ...vasoVazio(slot, agora), nivel: v.nivel };
  return { ok: true, save: Object.assign(s, { colhido: { planta, qtd } }) };
}

const qtdValida = (q: number) => Number.isInteger(q) && q >= 1 && q <= 999;

export function vender(save: Save, agora: number, slug: string, qtd: number): Resultado {
  const p = planta(slug);
  if (!p || !qtdValida(qtd)) return falha("invalido");
  const s = atualizar(save, agora);
  if ((s.inventario.colheita[slug] ?? 0) < qtd) return falha("estoque");
  s.inventario.colheita[slug] -= qtd;
  s.moedas += qtd * p.precoVenda;
  return ok(s);
}

export function comprarSemente(save: Save, agora: number, slug: string, qtd: number): Resultado {
  const p = planta(slug);
  if (!p || !qtdValida(qtd)) return falha("invalido");
  const s = atualizar(save, agora);
  const custo = qtd * p.precoSemente;
  if (s.moedas < custo) return falha("saldo");
  s.moedas -= custo;
  s.inventario.sementes[slug] = (s.inventario.sementes[slug] ?? 0) + qtd;
  return ok(s);
}

export const precoMelhoria = (v: Vaso) => (v.nivel >= LAJE.vaso.preco.length ? null : LAJE.vaso.preco[v.nivel]);

export function melhorarVaso(save: Save, agora: number, slot: number): Resultado {
  if (!Number.isInteger(slot)) return falha("invalido");
  const s = atualizar(save, agora);
  const v = s.vasos[slot];
  if (!v) return falha("invalido");
  const preco = precoMelhoria(v);
  if (preco === null) return falha("nivel-max");
  if (s.moedas < preco) return falha("saldo");
  s.moedas -= preco;
  s.vasos[slot] = { ...v, nivel: v.nivel + 1 };
  return ok(s);
}

const possuiDecoracao = (s: Save, slug: string) => (s.inventario.decoracoes[slug] ?? 0) > 0 || Object.values(s.decoracoes).includes(slug);

export function comprarDecoracao(save: Save, agora: number, slug: string): Resultado {
  const d = decoracao(slug);
  if (!d) return falha("invalido");
  const s = atualizar(save, agora);
  if (possuiDecoracao(s, slug)) return falha("ja-tem");
  if (s.moedas < d.preco) return falha("saldo");
  s.moedas -= d.preco;
  s.inventario.decoracoes[slug] = 1;
  return ok(s);
}

/** Põe uma decoração que o tripulante tem num encaixe (ou tira, com `slug` nulo). */
export function posicionar(save: Save, agora: number, encaixe: string, slug: string | null): Resultado {
  if (!ENCAIXES.some((e) => e.id === encaixe)) return falha("invalido");
  const s = atualizar(save, agora);
  const atual = s.decoracoes[encaixe];
  if (slug !== null) {
    const d = decoracao(slug);
    if (!d) return falha("invalido");
    if (!d.encaixes.includes(encaixe)) return falha("encaixe");
    if ((s.inventario.decoracoes[slug] ?? 0) < 1) return falha("nao-tem");
    s.inventario.decoracoes[slug] -= 1;
  }
  if (atual) s.inventario.decoracoes[atual] = (s.inventario.decoracoes[atual] ?? 0) + 1;
  if (slug === null) delete s.decoracoes[encaixe];
  else s.decoracoes[encaixe] = slug;
  return ok(s);
}

/** Proposta que o vizinho traz hoje, e se ainda dá pra aceitar. */
export function vizinhoDeHoje(save: Save, agora: number) {
  const dia = diaDe(agora);
  return { dia, proposta: propostaDoDia(save.seed, dia), jaTrocou: save.inventario.meta.ultimaTrocaDia === dia };
}

export function trocar(save: Save, agora: number): Resultado<Save & { troca: string }> {
  const s = atualizar(save, agora);
  const { dia, proposta, jaTrocou } = vizinhoDeHoje(s, agora);
  if (jaTrocou) return { ok: false, erro: "troca-feita" };
  if ((s.inventario.colheita[proposta.pede.colheita] ?? 0) < proposta.pede.qtd) return { ok: false, erro: "estoque" };
  s.inventario.colheita[proposta.pede.colheita] -= proposta.pede.qtd;
  if (proposta.da.tipo === "moedas") s.moedas += proposta.da.qtd;
  else s.inventario.sementes[proposta.da.slug] = (s.inventario.sementes[proposta.da.slug] ?? 0) + proposta.da.qtd;
  s.inventario.meta.ultimaTrocaDia = dia;
  return { ok: true, save: Object.assign(s, { troca: proposta.id }) };
}

/** O pombo que está na laje agora (se estiver), pra tela mostrar e o servidor conferir. */
export function pomboAgora(save: Save, agora: number) {
  const dia = diaDe(agora);
  const pd = pomboDoDia(save.seed, dia, temEspantalho(save));
  const meta = save.inventario.meta;
  const aqui = pd.aparece && agora >= pd.inicio && agora < pd.fim && meta.pomboDia < dia && meta.espantadoDia !== dia;
  return { aqui, ate: pd.fim };
}

export function espantar(save: Save, agora: number): Resultado {
  const s = atualizar(save, agora);
  if (!pomboAgora(s, agora).aqui) return falha("sem-pombo");
  s.inventario.meta.espantadoDia = diaDe(agora);
  s.inventario.meta.pomboDia = diaDe(agora);
  return ok(s);
}
