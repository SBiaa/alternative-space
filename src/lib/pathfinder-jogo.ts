// Estado de jogo da ficha: PV atuais, condições, pontos de herói e recursos gastos.
// Condições de atributo (desajeitado etc.), amedrontado e adoentado são penalidades de estado:
// não somam entre si, vale só a maior que se aplica.
import { calcular, type Atributo, type Ficha } from "./pathfinder";
import type { Condicao, Jogo } from "./pathfinder-condicoes";

const DO_ATRIBUTO: Record<Atributo, Condicao> = { for: "enfraquecido", des: "desajeitado", con: "drenado", int: "estupidificado", sab: "estupidificado", car: "estupidificado" };

// Valores da ficha com as condições aplicadas, pro painel de jogo.
export function emJogo(f: Ficha) {
  const base = calcular(f);
  const c = f.jogo.condicoes;
  const v = (id: Condicao) => c[id] ?? 0;
  const pen = (a: Atributo, extra = 0) => Math.max(v("amedrontado"), v("adoentado"), v(DO_ATRIBUTO[a]), extra);
  const cansado = v("cansado") ? 1 : 0;
  const pvMax = Math.max(1, base.pv - v("drenado") * f.nivel);
  const pv = Math.max(0, Math.min(pvMax, f.jogo.pvAtual ?? pvMax));
  const chave = f.chave || "for";
  return {
    pvMax,
    pv,
    pvTemp: f.jogo.pvTemp,
    ca: base.ca - pen("des", cansado) - (v("desprevenido") ? 2 : 0),
    percepcao: base.percepcao - pen("sab"),
    fortitude: base.fortitude - pen("con", cansado),
    reflexos: base.reflexos - pen("des", cansado),
    vontade: base.vontade - pen("sab", cansado),
    cdClasse: base.cdClasse === null ? null : base.cdClasse - pen(chave),
    pericias: base.pericias.map((p) => ({ ...p, bonus: p.bonus - pen(p.attr) })),
    ataques: base.ataques.map((a) => {
      const p = pen(a.attr);
      return { ...a, bonus: a.bonus - p, map: a.map.map((x) => x - p) };
    }),
    magia: base.magia && { ...base.magia, ataque: base.magia.ataque - pen(chave), cd: base.magia.cd - pen(chave) },
    pontosFoco: base.pontosFoco,
    morreEm: 4 - v("condenado"),
  };
}

// Descanso de 8 horas: PV, espaços e foco de volta; tira cansado e ferido, drenado cai 1.
export function descansar(j: Jogo): Jogo {
  const condicoes = { ...j.condicoes };
  delete condicoes.cansado;
  delete condicoes.ferido;
  delete condicoes.moribundo;
  if (condicoes.drenado && condicoes.drenado > 1) condicoes.drenado -= 1;
  else delete condicoes.drenado;
  return { ...j, pvAtual: null, focoGasto: 0, espacosGastos: [], condicoes };
}
