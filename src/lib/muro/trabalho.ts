// O tempo do dia: a crew pintando, o cansaço, a chuva chegando, e as ações de pintura do tripulante.

import { CAMADAS, MIN_DIA, MURO, TAMANHOS, limitar, minutoAbsoluto } from "./config";
import { atributos, chuvaEm, climaDoDia, habilidadeMax, type Attr } from "./efeitos";
import { mascara, totalCelulas } from "./geometria";
import { consumir } from "./material";
import { aplicarChuva, aplicarPintura, motivoTravada, qualidadeAssistida, qualidadeManual, tetoQualidade, templateDe } from "./pintura";
import type { Artista, Camada, Catalogo, CorId, Job, Progresso } from "./tipos";

export type Aviso =
  | { tipo: "chuva-comecou"; intensidade: number }
  | { tipo: "chuva-passou" }
  | { tipo: "estragou"; jobId: string }
  | { tipo: "sem-material"; jobId: string; material: "tinta" | "spray" }
  | { tipo: "camada-pronta"; jobId: string; camada: Camada }
  | { tipo: "travada-andaime"; jobId: string; camada: Camada }
  | { tipo: "cansada"; artistaId: string }
  | { tipo: "pronto-pra-entregar"; jobId: string }
  | { tipo: "fim-do-dia" };

export type Erro = "saldo" | "nivel" | "maximo" | "vaga" | "generico" | "autorizacao" | "camada" | "material" | "andaime" | "limite" | "invalido" | "semConta" | "dia" | "sabado" | "coberto" | "revisao" | "exigencia" | "estoque" | "inscrito" | "artistas" | "aceita" | "empena" | "lona" | "fim";
export type Resultado<T = object> = ({ ok: true; prog: Progresso; avisos: Aviso[] } & T) | { ok: false; erro: Erro };

export const clonar = <T,>(v: T): T => structuredClone(v);
export const jobPorId = (p: Progresso, id: string) => p.jobs.find((j) => j.id === id);
export const agoraAbs = (p: Pick<Progresso, "dia" | "minuto">) => minutoAbsoluto(p.dia, p.minuto);

/** Penalidade (0 a maxPenalidade) de cansaço acima do limiar. */
export function penalCansaco(c: number): number {
  const a = MURO.artista;
  return c <= a.cansacoLimiar ? 0 : (limitar(c, 0, 100) - a.cansacoLimiar) / (100 - a.cansacoLimiar) * a.cansacoMaxPenalidade;
}

/** Células por minuto de um artista numa camada. */
export function taxaArtista(a: Artista, camada: Camada, attr: Attr, esp: string | null): number {
  const A = MURO.artista;
  const vel = 1 + (a.hab.velocidade - 3) * A.porVelocidade;
  const noEsp = esp !== null && esp === (camada === "fundo" ? "fundo" : camada === "contorno" ? "contorno" : camada === "detalhe" ? "detalhe" : null);
  return Math.max(0.2, A.taxaCelulasPorMin * vel * (noEsp ? A.especialidadeVel : 1) * (camada === "fundo" ? attr.velFundo : 1) * (1 - penalCansaco(a.cansaco)));
}

/** Qualidade que o artista dá ao que pinta, antes do desgaste do material. */
export function qualidadeArtista(a: Artista, camada: Camada, attr: Attr, teto: number, esp: string | null, tranquilo: boolean): number {
  const Q = MURO.qualidade;
  const noEsp = esp !== null && esp === (camada === "preenchimento" ? "fundo" : camada);
  const bruta = Q.base + (a.hab.tecnica + attr.treino) * Q.porHabilidade + (a.hab.estilo - 3) * 1.5 + attr.qTinta + (camada === "contorno" ? attr.qContorno : 0)
    + (esp === null ? 0 : noEsp ? Q.naEspecialidade : Q.foraDaEspecialidade) - penalCansaco(a.cansaco) * 40 + (tranquilo ? Q.bonusTranquilo : 0);
  return limitar(bruta, 0, teto);
}

/** Que camada o artista pega agora (a escalada, ou a primeira livre se ela estiver pronta/travada). */
export function camadaDoArtista(job: Job, a: Artista, cat: Pick<Catalogo, "templates">, attr: Attr, esp: string | null): Camada | null {
  const pref = a.escala?.camada;
  if (pref && pref !== "auto" && motivoTravada(job, pref, cat, attr) === null) return pref;
  const ordem: Camada[] = esp === "contorno" ? ["contorno", "fundo", "preenchimento", "detalhe"] : esp === "detalhe" ? ["detalhe", "preenchimento", "contorno", "fundo"] : esp === "fundo" ? ["fundo", "preenchimento", "contorno", "detalhe"] : CAMADAS;
  return ordem.find((c) => motivoTravada(job, c, cat, attr) === null) ?? null;
}

export const corDaCamada = (job: Job, camada: Camada): CorId => job.briefing.cores[MURO.coresDaCamada[camada]];

function passo(p: Progresso, cat: Catalogo, attr: Attr, avisos: Aviso[], jaAvisou: Set<string>, chovia: boolean) {
  const agora = agoraAbs(p);
  const clima = climaDoDia(p.seed, p.dia + 1, p.tranquilo);
  const chuva = chuvaEm(clima, p.minuto);
  if (chuva && !chovia) avisos.push({ tipo: "chuva-comecou", intensidade: chuva.intensidade });
  if (!chuva && chovia) avisos.push({ tipo: "chuva-passou" });
  const hab = habilidadeMax(p, attr);
  for (const job of p.jobs) {
    if (job.status !== "em_andamento") continue;
    if (chuva) {
      const antes = job.ruinasHoje;
      aplicarChuva(job, agora, chuva.intensidade, 1, attr, p.tranquilo);
      if (job.ruinasHoje > antes) avisos.push({ tipo: "estragou", jobId: job.id });
    }
  }
  for (const a of p.equipe) {
    if (a.folga || !a.escala) continue;
    const job = jobPorId(p, a.escala.jobId);
    if (!job || job.status !== "em_andamento") continue;
    if (job.encontro && p.minuto >= p.encontro.fimMinuto) continue;
    const esp = cat.arquetipos.find((x) => x.slug === a.arquetipo)?.especialidade ?? null;
    const camada = camadaDoArtista(job, a, cat, attr, esp);
    if (!camada) {
      const trava = CAMADAS.find((c) => motivoTravada(job, c, cat, attr) === "andaime");
      if (trava && !jaAvisou.has(`and${job.id}${trava}`)) {
        jaAvisou.add(`and${job.id}${trava}`);
        avisos.push({ tipo: "travada-andaime", jobId: job.id, camada: trava });
      }
      continue;
    }
    const t = templateDe(cat, job);
    const total = totalCelulas(mascara(t, camada, job.briefing.tagDestaque));
    const delta = (taxaArtista(a, camada, attr, esp) / total) * 100;
    const cor = corDaCamada(job, camada);
    const antesCons = clonar(p.estoque);
    const cons = consumir(p.estoque, attr, job.tamanho, camada, delta, cor);
    if (!cons.ok) {
      Object.assign(p.estoque, antesCons);
      if (!jaAvisou.has(`mat${job.id}${cor}${cons.motivo}`)) {
        jaAvisou.add(`mat${job.id}${cor}${cons.motivo}`);
        avisos.push({ tipo: "sem-material", jobId: job.id, material: cons.motivo });
      }
      continue;
    }
    const teto = tetoQualidade(job.tamanho, attr, hab);
    const q = qualidadeArtista(a, camada, attr, teto, esp, p.tranquilo) - cons.penal;
    const aplicado = aplicarPintura(job, camada, delta, Math.max(0, q), true, agora, cat, attr);
    if (aplicado > 0) {
      job.tintaMax = Math.max(job.tintaMax, attr.tintaNivel);
      a.minTrabalhados += 1;
      const resist = Math.max(0.3, 1 - (a.hab.resistencia - 3) * MURO.artista.resistenciaAlivio);
      const antes = a.cansaco;
      a.cansaco = limitar(a.cansaco + MURO.artista.cansacoPorMin * resist, 0, 100);
      if (antes < MURO.artista.cansacoLimiar && a.cansaco >= MURO.artista.cansacoLimiar) avisos.push({ tipo: "cansada", artistaId: a.id });
      if (job.camadas[camada].progresso >= 99.5) avisos.push({ tipo: "camada-pronta", jobId: job.id, camada });
    }
  }
}

/** Avança `minutos` do dia (inteiros). Para no fim do dia. */
export function avancar(p0: Progresso, cat: Catalogo, minutos: number): { prog: Progresso; avisos: Aviso[]; fimDoDia: boolean } {
  const p = clonar(p0);
  const avisos: Aviso[] = [];
  const attr = atributos(p, cat);
  const jaAvisou = new Set<string>();
  const antesPronto = new Set(p.jobs.filter((j) => CAMADAS.every((c) => j.camadas[c].progresso >= 99.5)).map((j) => j.id));
  for (let i = 0; i < Math.max(0, Math.floor(minutos)) && p.minuto < MIN_DIA; i++) {
    const chovia = !!chuvaEm(climaDoDia(p.seed, p.dia + 1, p.tranquilo), p.minuto - 1);
    passo(p, cat, attr, avisos, jaAvisou, p.minuto > 0 && chovia);
    p.minuto += 1;
  }
  for (const j of p.jobs) if (!antesPronto.has(j.id) && j.status === "em_andamento" && CAMADAS.every((c) => j.camadas[c].progresso >= 99.5)) avisos.push({ tipo: "pronto-pra-entregar", jobId: j.id });
  const fimDoDia = p.minuto >= MIN_DIA;
  if (fimDoDia) avisos.push({ tipo: "fim-do-dia" });
  return { prog: p, avisos, fimDoDia };
}

export type Pintura = { jobId: string; camada: Camada; celulas: number; precisao: number; cor: CorId };

type Pronta = { erro: Erro } | { erro?: undefined; p: Progresso; job: Job; attr: Attr };
function pronta(p0: Progresso, cat: Catalogo, jobId: string, camada: Camada): Pronta {
  const p = clonar(p0);
  const job = jobPorId(p, jobId);
  if (!job || job.status !== "em_andamento") return { erro: "invalido" as Erro };
  if (job.encontro && p.minuto >= p.encontro.fimMinuto) return { erro: "fim" as Erro };
  const attr = atributos(p, cat);
  const motivo = motivoTravada(job, camada, cat, attr);
  if (motivo === "coberta") return { erro: "coberto" as Erro };
  if (motivo === "anterior") return { erro: "camada" as Erro };
  if (motivo === "andaime") return { erro: "andaime" as Erro };
  if (motivo === "pronta") return { erro: "invalido" as Erro };
  return { p, job, attr };
}

/** Pintura à mão: o canvas avalia o traço (células novas e precisão) e a simulação aplica, gasta material e passa o tempo. */
export function pintarManual(p0: Progresso, cat: Catalogo, a: Pintura): Resultado<{ aplicado: number }> {
  const r = pronta(p0, cat, a.jobId, a.camada);
  if (r.erro) return { ok: false, erro: r.erro };
  const { p, job, attr } = r;
  const celulas = limitar(Math.floor(a.celulas), 0, MURO.traco.maxCelulasPorTraco);
  if (celulas <= 0) return { ok: true, prog: p, avisos: [], aplicado: 0 };
  const total = totalCelulas(mascara(templateDe(cat, job), a.camada, job.briefing.tagDestaque));
  const delta = (celulas / total) * 100;
  const cons = consumir(p.estoque, attr, job.tamanho, a.camada, delta, a.cor);
  if (!cons.ok) return { ok: false, erro: "material" };
  const teto = tetoQualidade(job.tamanho, attr, habilidadeMax(p, attr));
  const q = qualidadeManual(a.precisao, teto, cons.penal, p.tranquilo);
  const aplicado = aplicarPintura(job, a.camada, delta, q, a.cor === corDaCamada(job, a.camada), agoraAbs(p), cat, attr);
  job.tintaMax = Math.max(job.tintaMax, attr.tintaNivel);
  const min = Math.max(1, Math.round(celulas * MURO.jogador.minPorCelula / (a.camada === "fundo" ? attr.velFundo : 1)));
  const t = avancar(p, cat, min);
  return { ok: true, prog: t.prog, avisos: t.avisos, aplicado };
}

/** Pintura assistida: o tripulante aprova um trecho por botão. A qualidade vem de outra regra e nunca passa a da manual. */
export function aprovarTrecho(p0: Progresso, cat: Catalogo, a: { jobId: string; camada: Camada; cor: CorId }): Resultado<{ aplicado: number }> {
  const r = pronta(p0, cat, a.jobId, a.camada);
  if (r.erro) return { ok: false, erro: r.erro };
  const { p, job, attr } = r;
  const total = totalCelulas(mascara(templateDe(cat, job), a.camada, job.briefing.tagDestaque));
  const delta = 100 / MURO.assistida.trechos;
  const cons = consumir(p.estoque, attr, job.tamanho, a.camada, delta, a.cor);
  if (!cons.ok) return { ok: false, erro: "material" };
  const teto = tetoQualidade(job.tamanho, attr, habilidadeMax(p, attr));
  const q = qualidadeAssistida(teto, attr, cons.penal);
  const aplicado = aplicarPintura(job, a.camada, delta, q, a.cor === corDaCamada(job, a.camada), agoraAbs(p), cat, attr);
  job.tintaMax = Math.max(job.tintaMax, attr.tintaNivel);
  const t = avancar(p, cat, Math.max(1, Math.round((total / MURO.assistida.trechos) * MURO.assistida.minPorCelula)));
  return { ok: true, prog: t.prog, avisos: t.avisos, aplicado };
}

export function cobrir(p0: Progresso, cat: Catalogo, jobId: string): Resultado {
  const p = clonar(p0);
  const job = jobPorId(p, jobId);
  if (!job || job.status !== "em_andamento" || job.coberto) return { ok: false, erro: "invalido" };
  if (p.estoque.lonas < 1) return { ok: false, erro: "lona" };
  p.estoque.lonas -= 1;
  job.coberto = true;
  const t = avancar(p, cat, MURO.chuva.lonaMin);
  return { ok: true, prog: t.prog, avisos: t.avisos };
}
export function descobrir(p0: Progresso, cat: Catalogo, jobId: string): Resultado {
  const p = clonar(p0);
  const job = jobPorId(p, jobId);
  if (!job || !job.coberto) return { ok: false, erro: "invalido" };
  job.coberto = false;
  const t = avancar(p, cat, MURO.chuva.descobrirMin);
  return { ok: true, prog: t.prog, avisos: t.avisos };
}

export function escalar(p0: Progresso, artistaId: string, jobId: string | null, camada: Camada | "auto" = "auto"): Resultado {
  const p = clonar(p0);
  const a = p.equipe.find((x) => x.id === artistaId);
  if (!a) return { ok: false, erro: "invalido" };
  if (jobId !== null) {
    const job = jobPorId(p, jobId);
    if (!job || job.status !== "em_andamento") return { ok: false, erro: "invalido" };
  }
  a.escala = jobId === null ? null : { jobId, camada };
  if (jobId !== null) a.folga = false;
  return { ok: true, prog: p, avisos: [] };
}
export function definirFolga(p0: Progresso, artistaId: string, folga: boolean): Resultado {
  const p = clonar(p0);
  const a = p.equipe.find((x) => x.id === artistaId);
  if (!a) return { ok: false, erro: "invalido" };
  a.folga = folga;
  return { ok: true, prog: p, avisos: [] };
}
export const tamanhoCfg = (j: Pick<Job, "tamanho">) => TAMANHOS[j.tamanho];
