// A pintura em camadas: dependência entre camadas, qualidade, secagem, chuva sobre tinta fresca e teto de qualidade.
// Tudo puro: o canvas só mostra o que estas funções calculam.

import { CAMADAS, MURO, TAMANHOS, limitar } from "./config";
import type { Attr } from "./efeitos";
import { alcanceDoNivel, fracaoAlcancavel } from "./geometria";
import { templatePorSlug } from "./templates";
import type { Camada, Catalogo, EstadoCamada, Job, Tamanho, Template } from "./tipos";

export const camadaVazia = (): EstadoCamada => ({ progresso: 0, qualidade: 0, fidelidade: 0, secaAte: 0 });
export const camadasVazias = (): Job["camadas"] => ({ fundo: camadaVazia(), contorno: camadaVazia(), preenchimento: camadaVazia(), detalhe: camadaVazia() });

export const templateDe = (cat: Pick<Catalogo, "templates">, job: Pick<Job, "modelo">): Template => {
  const t = templatePorSlug(job.modelo, cat.templates);
  if (!t) throw new Error(`Template desconhecido: ${job.modelo}`);
  return t;
};

/** Só a camada de baixo é livre; as outras esperam a anterior passar do mínimo. */
export function camadaLiberada(job: Pick<Job, "camadas">, camada: Camada): boolean {
  const i = CAMADAS.indexOf(camada);
  return i === 0 || job.camadas[CAMADAS[i - 1]].progresso >= MURO.minimoAnterior;
}

/** Até onde (0 a 100) essa camada pode ir com o andaime que a crew tem. */
export function capProgresso(job: Job, camada: Camada, cat: Pick<Catalogo, "templates">, attr: Attr): number {
  const t = templateDe(cat, job);
  return 100 * fracaoAlcancavel(t, camada, job.briefing.tagDestaque, alcanceDoNivel(attr.alcanceNivel));
}

export type MotivoTrava = "anterior" | "andaime" | "coberta" | "pronta" | null;
export function motivoTravada(job: Job, camada: Camada, cat: Pick<Catalogo, "templates">, attr: Attr): MotivoTrava {
  const c = job.camadas[camada];
  if (!camadaLiberada(job, camada)) return "anterior";
  if (job.coberto) return "coberta";
  if (c.progresso >= 99.5) return "pronta";
  if (c.progresso >= capProgresso(job, camada, cat, attr) - 0.01) return "andaime";
  return null;
}

/** Teto de qualidade possível para o mural (tamanho × material × habilidade). O servidor confere esse número. */
export function tetoQualidade(size: Tamanho, attr: Attr, habilidade: number): number {
  const q = MURO.qualidade;
  return Math.min(q.tetoPorTamanho[size], q.base + habilidade * q.porHabilidade + attr.qTinta + attr.qContorno * 0.5);
}

export const secagemMin = (attr: Attr) => MURO.secagem.base * attr.secagem * attr.secagemTenda;

/** Qualidade de um traço feito à mão: precisão (0 a 1) sobre o teto, menos o desgaste do material. */
export function qualidadeManual(precisao: number, teto: number, penal = 0, tranquilo = false): number {
  const bruta = teto * (0.5 + 0.5 * limitar(precisao, 0, 1)) - penal + (tranquilo ? MURO.qualidade.bonusTranquilo : 0);
  return limitar(bruta, 0, teto);
}
/** Pintura assistida: sempre abaixo do que a pintura manual alcança. */
export function qualidadeAssistida(teto: number, attr: Attr, penal = 0): number {
  return limitar(Math.min(MURO.assistida.qualidade + attr.qTinta * 0.5, MURO.assistida.teto, teto * 0.95) - penal, 0, teto);
}

/** Soma `delta` (% da camada) com qualidade `qual`. Respeita o andaime e a ordem. Devolve quanto realmente entrou. */
export function aplicarPintura(job: Job, camada: Camada, delta: number, qual: number, fiel: boolean, agora: number, cat: Pick<Catalogo, "templates">, attr: Attr): number {
  if (motivoTravada(job, camada, cat, attr)) return 0;
  const c = job.camadas[camada];
  const folga = Math.min(100, capProgresso(job, camada, cat, attr)) - c.progresso;
  const d = Math.max(0, Math.min(delta, folga));
  if (d <= 0) return 0;
  const total = c.progresso + d;
  c.qualidade = (c.qualidade * c.progresso + qual * d) / total;
  c.fidelidade = (c.fidelidade * c.progresso + (fiel ? 100 : 0) * d) / total;
  c.progresso = Math.min(100, total);
  c.secaAte = Math.max(c.secaAte, agora + secagemMin(attr));
  if (job.status === "aberta") job.status = "em_andamento";
  return d;
}

export const areaM2 = (size: Tamanho) => TAMANHOS[size].larguraM * TAMANHOS[size].alturaM;
/** Fração do muro que a lona cobre (1 = tudo). */
export const coberturaDaLona = (size: Tamanho, attr: Attr) => limitar(attr.lonaM2 / areaM2(size), 0, 1);

/**
 * Chuva sobre tinta fresca: perde progresso e qualidade da camada. Lona protege a parte que cobre.
 * Tinta seca (secaAte já passou) não sofre. Devolve o progresso perdido (soma das camadas).
 */
export function aplicarChuva(job: Job, agora: number, intensidade: number, minutos: number, attr: Attr, tranquilo: boolean): number {
  const protecao = job.coberto ? coberturaDaLona(job.tamanho, attr) : 0;
  const dano = intensidade * minutos * (1 - protecao) * (tranquilo ? MURO.chuva.fatorTranquilo : 1);
  if (dano <= 0) return 0;
  let perdido = 0;
  for (const camada of CAMADAS) {
    const c = job.camadas[camada];
    if (c.progresso <= 0 || c.secaAte <= agora) continue;
    const perda = c.progresso * MURO.chuva.perdaProgressoPorMin * dano;
    c.progresso = Math.max(0, c.progresso - perda);
    c.qualidade = Math.max(0, c.qualidade - MURO.chuva.perdaQualidadePorMin * dano);
    perdido += perda;
  }
  if (perdido > 0.05 && job.ruinasHoje === 0) {
    job.ruinas += 1;
    job.ruinasHoje = 1;
  }
  return perdido;
}

export const concluida = (job: Pick<Job, "camadas">) => CAMADAS.every((c) => job.camadas[c].progresso >= 99.5);
export const progressoTotal = (job: Pick<Job, "camadas">) => CAMADAS.reduce((s, c) => s + job.camadas[c].progresso * MURO.pesos[c], 0);
/** Qualidade final: média ponderada das camadas. */
export const qualidadeFinal = (job: Pick<Job, "camadas">) => Math.round(CAMADAS.reduce((s, c) => s + job.camadas[c].qualidade * MURO.pesos[c], 0) * 10) / 10;
export const fidelidadeFinal = (job: Pick<Job, "camadas">) => CAMADAS.reduce((s, c) => s + job.camadas[c].fidelidade * MURO.pesos[c], 0);
