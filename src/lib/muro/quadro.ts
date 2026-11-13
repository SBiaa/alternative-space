// O quadro de encomendas da semana: gerado pela seed + semana + nível, então é reproduzível.

import { escolherPeso, sortear } from "../gestao/rng";
import { CLIENTES, type Cliente } from "./catalogo";
import { CORES, MURO, TAMANHOS } from "./config";
import { camadasVazias } from "./pintura";
import { templatesDe } from "./templates";
import type { Catalogo, CorId, Job, Tamanho } from "./tipos";

const pick = <T,>(lista: T[], r: number): T => lista[Math.min(lista.length - 1, Math.floor(r * lista.length))];
const lerp = (a: number, b: number, r: number) => Math.round(a + (b - a) * r);

export function gerarQuadro(seed: string, semana: number, nivel: number, cat: Pick<Catalogo, "templates">, dia: number): Job[] {
  const jobs: Job[] = [];
  const Q = MURO.quadro;
  for (let i = 0; i < Q.tamanho; i++) {
    const tipo: Cliente["tipo"] = i < Q.comerciais ? "comercial" : "comunitario";
    const lista = CLIENTES.filter((c) => c.tipo === tipo);
    const cliente = pick(lista, sortear(seed, semana, `cl${i}`));
    const tamanhos = cliente.tamanhos.filter((t) => TAMANHOS[t].jogavel && TAMANHOS[t].nivelMin <= nivel && cat.templates.some((x) => x.size === t));
    const tamanho: Tamanho = tamanhos.length ? pick(tamanhos, sortear(seed, semana, `tm${i}`)) : "porta";
    const tpl = pick(templatesDe(tamanho, cat.templates), sortear(seed, semana, `tp${i}`));
    const cfg = TAMANHOS[tamanho];
    const [pMin, pMax] = tipo === "comercial" ? cfg.pagamento : cfg.pagamentoComunitario;
    const cores = escolherCores(seed, semana, i);
    jobs.push({
      id: `s${semana}-${i + 1}`,
      modelo: tpl.slug,
      cliente: cliente.slug,
      nomeCliente: pick(cliente.nomes, sortear(seed, semana, `nm${i}`)),
      tamanho,
      briefing: {
        tema: pick(cliente.temas, sortear(seed, semana, `te${i}`)),
        palavra: pick(cliente.palavras, sortear(seed, semana, `pa${i}`)),
        cores,
        tagDestaque: sortear(seed, semana, `tg${i}`) < (tipo === "comunitario" ? 0.4 : 0.3),
        obs: pick(cliente.obs, sortear(seed, semana, `ob${i}`)),
      },
      pagamento: lerp(pMin, pMax, sortear(seed, semana, `pg${i}`)),
      prazo: 0,
      prazoDias: lerp(cfg.prazo[0], cfg.prazo[1], sortear(seed, semana, `pz${i}`)),
      auth: "falta",
      revisao: false,
      aceita: false,
      status: "aberta",
      comunitario: tipo === "comunitario",
      encontro: false,
      exige: cliente.exige,
      croqui: 0,
      camadas: camadasVazias(),
      coberto: false,
      ruinas: 0,
      ruinasHoje: 0,
      montado: false,
      tintaMax: 0,
      negociacao: { respostas: [], resultado: null },
      criadoDia: dia,
      entregueDia: null,
      qualFinal: null,
      pago: null,
    });
  }
  return jobs;
}

function escolherCores(seed: string, semana: number, i: number): [CorId, CorId, CorId] {
  const sobra = [...CORES];
  const out: CorId[] = [];
  for (let k = 0; k < 3; k++) {
    const c = escolherPeso(sobra, sobra.map(() => 1), sortear(seed, semana, `cor${i}-${k}`));
    out.push(c);
    sobra.splice(sobra.indexOf(c), 1);
  }
  return out as [CorId, CorId, CorId];
}
