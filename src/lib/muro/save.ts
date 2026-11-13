// Save do Muro Livre: schema (zod), migração de versão e conferência de integridade.
// O jogo é solo e sem ranking: a conferência não é anti-trapaça, é pra não gravar um save quebrado ou que anda pra trás.

import { z } from "zod";
import { escolherMaisAvancado } from "../gestao/save";
import { CAMADAS, MIN_DIA, MURO } from "./config";
import { atributos, habilidadeMax } from "./efeitos";
import { aceitar, podeIniciar, responder } from "./negociacao";
import { capProgresso, tetoQualidade } from "./pintura";
import { entregar, gastosZero, somaGastos } from "./economia";
import { inscrever } from "./encontro";
import { capacidadeLonas, capacidadeReserva, capacidadeSpray, capacidadeTinta } from "./material";
import { clonar, type Erro } from "./trabalho";
import type { Catalogo, Job, Progresso } from "./tipos";

const cor = z.enum(["laranja", "azul", "creme", "tijolo", "preto"]);
const camada = z.object({ progresso: z.number().min(0).max(100), qualidade: z.number().min(0).max(100), fidelidade: z.number().min(0).max(100), secaAte: z.number().min(0) });
const tamanho = z.enum(["porta", "fachada", "quadra", "longo", "empena"]);
const porCor = (max: number) => z.object({ laranja: z.number().min(0).max(max), azul: z.number().min(0).max(max), creme: z.number().min(0).max(max), tijolo: z.number().min(0).max(max), preto: z.number().min(0).max(max) });

const job = z.object({
  id: z.string().min(1).max(24), modelo: z.string().max(40), cliente: z.string().max(40), nomeCliente: z.string().max(80), tamanho,
  briefing: z.object({ tema: z.string().max(80), palavra: z.string().max(40), cores: z.tuple([cor, cor, cor]), tagDestaque: z.boolean(), obs: z.string().max(200) }),
  pagamento: z.number().int().min(0).max(100000), prazo: z.number().int().min(0).max(100000), prazoDias: z.number().int().min(0).max(30),
  auth: z.enum(["autorizado", "falta", "recusado"]), revisao: z.boolean(), aceita: z.boolean(),
  status: z.enum(["aberta", "em_andamento", "entregue", "perdida"]), comunitario: z.boolean(), encontro: z.boolean(),
  exige: z.object({ clientes: z.number().min(0).max(5), quebrada: z.number().min(0).max(5) }), croqui: z.number().min(0).max(1),
  camadas: z.object({ fundo: camada, contorno: camada, preenchimento: camada, detalhe: camada }),
  coberto: z.boolean(), ruinas: z.number().int().min(0).max(1000), ruinasHoje: z.number().int().min(0).max(1), montado: z.boolean(), tintaMax: z.number().min(0).max(2),
  negociacao: z.object({ respostas: z.array(z.number().int().min(0).max(5)).max(6), resultado: z.enum(["autorizado", "mudanca", "recusado"]).nullable() }),
  criadoDia: z.number().int().min(0), entregueDia: z.number().int().min(0).nullable(), qualFinal: z.number().min(0).max(100).nullable(), pago: z.number().int().min(0).nullable(),
});
const gastos = z.object({ tinta: z.number().min(0), spray: z.number().min(0), salarios: z.number().min(0), lona: z.number().min(0), outros: z.number().min(0) });

export const schemaProgresso = z.object({
  v: z.number().int().min(1), bairro: z.string().min(1).max(80), nivel: z.number().int().min(1).max(MURO.nivelMax), dinheiro: z.number().int().min(0).max(100_000_000),
  repQuebrada: z.number().min(0).max(5), repClientes: z.number().min(0).max(5), dia: z.number().int().min(0).max(100_000), minuto: z.number().min(0).max(MIN_DIA),
  seed: z.string().min(1).max(40), entregues: z.number().int().min(0).max(100_000), maiorMuro: tamanho.nullable(),
  estoque: z.object({ tinta: porCor(1000), spray: porCor(100), rolinho: z.object({ saude: z.number().min(0).max(100), reserva: z.number().int().min(0).max(100) }), bico: z.object({ saude: z.number().min(0).max(100), reserva: z.number().int().min(0).max(100) }), lonas: z.number().int().min(0).max(100) }),
  melhorias: z.record(z.string().max(40), z.number().int().min(1).max(20)),
  equipe: z.array(z.object({ id: z.string().max(40), arquetipo: z.string().max(40), nivel: z.number().int().min(1).max(10), hab: z.object({ tecnica: z.number().min(0).max(20), velocidade: z.number().min(0).max(20), estilo: z.number().min(0).max(20), resistencia: z.number().min(0).max(20) }), cansaco: z.number().min(0).max(100), contratadoDia: z.number().int().min(0), escala: z.object({ jobId: z.string().max(24), camada: z.enum(["fundo", "contorno", "preenchimento", "detalhe", "auto"]) }).nullable(), folga: z.boolean(), minTrabalhados: z.number().min(0).max(2000) })).max(12),
  jobs: z.array(job).max(60), gastosDia: gastos, ganhosDia: z.number().min(0), dinheiroIniDia: z.number().min(0), tagPropria: z.boolean(),
  entreguesDia: z.array(z.string().max(24)).max(60),
  encontro: z.object({ semana: z.number().int().min(1), inscrito: z.boolean(), jobId: z.string().max(24).nullable(), fimMinuto: z.number().min(0).max(MIN_DIA) }),
  tranquilo: z.boolean(),
});

/**
 * Leva um save de qualquer versão antiga até a atual. Devolve null se não for um save válido.
 * Quando o formato mudar: some um `if (v < N)` aqui, sem apagar os anteriores, e suba MURO.versaoSave.
 */
export function migrar(bruto: unknown): Progresso | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  const v = typeof dado.v === "number" ? dado.v : 1;
  if (v > MURO.versaoSave) return null;
  // Exemplo de migração futura: if (v < 2) { dado.novoCampo = valorPadrao; }
  dado.v = MURO.versaoSave;
  const r = schemaProgresso.safeParse(dado);
  return r.success ? (r.data as Progresso) : null;
}

/** Entre o save do aparelho e o da conta, o mais avançado vence (dia, depois minuto). Empate: a conta. */
export const passoDe = (p: Progresso) => p.dia * 1000 + p.entregues * 10 + p.minuto / 100;
export const escolherSave = (local: Progresso | null, remoto: Progresso | null) => escolherMaisAvancado(local, remoto, passoDe);

const ORDEM = { aberta: 0, em_andamento: 1, entregue: 2, perdida: 2 } as const;
type Falha = { ok: false; erro: Erro };
const invalido: Falha = { ok: false, erro: "invalido" };

/** Confere que o save não é incoerente por si só (usado ao migrar o save local pra conta). */
export function saveCoerente(p: Progresso, cat: Catalogo): boolean {
  const attr = atributos(p, cat);
  const hab = habilidadeMax(p, attr);
  if (p.dinheiro > p.dinheiroIniDia + p.ganhosDia - somaGastos(p.gastosDia) + 0.5 || p.dinheiro < p.dinheiroIniDia + p.ganhosDia - somaGastos(p.gastosDia) - 0.5) return false;
  for (const j of p.jobs) {
    if (j.qualFinal !== null && !j.encontro && j.qualFinal > tetoQualidade(j.tamanho, attr, hab) + MURO.qualidade.tolerancia) return false;
    for (const c of CAMADAS) if (j.camadas[c].qualidade > tetoQualidade(j.tamanho, attr, hab) + MURO.qualidade.tolerancia) return false;
    if (j.auth !== "autorizado" && (j.status === "em_andamento" || j.status === "entregue") && !j.encontro) return false;
  }
  return p.equipe.length <= attr.vagasExtra + MURO.vagasPorNivel[p.nivel - 1] && p.estoque.lonas <= capacidadeLonas(attr) && p.estoque.tinta.laranja <= capacidadeTinta(attr) + 0.01 &&
    Object.values(p.estoque.spray).every((n) => n <= capacidadeSpray(attr)) && p.estoque.rolinho.reserva <= capacidadeReserva(attr);
}

/**
 * Junta o que o aparelho mandou (pintura do dia) com o que o servidor sabe. O cliente não manda dinheiro, preço, nível, melhorias nem equipe:
 * entrega e aceite são refeitos aqui com as regras do servidor; estoque só pode diminuir; qualidade nunca passa do teto; camada nunca passa do andaime.
 */
export function reconciliar(srv: Progresso, cli: Progresso, cat: Catalogo, tagPropria: boolean): { ok: true; prog: Progresso } | Falha {
  if (cli.dia !== srv.dia) return invalido; // o dia só avança fechando o dia, no servidor
  if (cli.minuto < srv.minuto) return invalido;
  let base = clonar(srv);
  base.tagPropria = tagPropria;
  const attr = atributos(base, cat);

  // inscrição no encontro: o servidor cobra e cria o muro cedido
  if (cli.encontro.inscrito && !srv.encontro.inscrito) {
    const r = inscrever({ ...base, minuto: Math.min(base.minuto, cli.minuto) }, cat);
    if (!r.ok) return invalido;
    base = r.prog;
    base.minuto = Math.max(base.minuto, srv.minuto);
  }

  // jobs
  for (const cj of cli.jobs) {
    let sj = base.jobs.find((j) => j.id === cj.id);
    if (!sj) return invalido;
    if (ORDEM[cj.status] < ORDEM[sj.status] || sj.status === "perdida") continue; // o que o servidor já fechou não volta atrás
    if (cj.aceita && !sj.aceita) {
      const r = aceitar(base, cat, cj.id);
      if (!r.ok) return invalido;
      base = r.prog;
    }
    // negociação: refaz as respostas novas com a seed do servidor
    for (let i = base.jobs.find((j) => j.id === cj.id)!.negociacao.respostas.length; i < cj.negociacao.respostas.length; i++) {
      const r = responder(base, cat, cj.id, cj.negociacao.respostas[i]);
      if (!r.ok) return invalido;
      base = r.prog;
    }
    sj = base.jobs.find((j) => j.id === cj.id)!;
    if (sj.revisao && !cj.revisao) sj.revisao = false;
    sj.coberto = cj.coberto;
    sj.montado = sj.montado || cj.montado;
    sj.ruinas = Math.max(sj.ruinas, cj.ruinas);
    sj.ruinasHoje = Math.max(sj.ruinasHoje, cj.ruinasHoje);
    if (cj.status !== "aberta" && sj.status === "aberta") {
      const pode = podeIniciar(base, sj);
      if (!pode.ok && !sj.encontro) return invalido;
      sj.status = "em_andamento";
    }
    if (sj.status !== "em_andamento") continue;
    const teto = tetoQualidade(sj.tamanho, attr, habilidadeMax(base, attr)) + MURO.qualidade.tolerancia;
    for (const c of CAMADAS) {
      const l = cj.camadas[c];
      if (l.qualidade > teto || l.progresso > capProgresso(sj, c, cat, attr) + 0.5) return invalido;
    }
    const i = CAMADAS.findIndex((c) => cj.camadas[c].progresso > 0 && cj.camadas[CAMADAS[Math.max(0, CAMADAS.indexOf(c) - 1)]].progresso < MURO.minimoAnterior && CAMADAS.indexOf(c) > 0);
    if (i >= 0 && cj.ruinas === 0) return invalido; // camada só avança se a anterior chegou ao mínimo (exceto se a chuva derrubou a de baixo)
    sj.camadas = cj.camadas;
    sj.tintaMax = Math.max(sj.tintaMax, cj.tintaMax);
    if (cj.status === "entregue" && !sj.encontro) {
      const r = entregar(base, cat, sj.id);
      if (!r.ok) return invalido;
      base = r.prog;
    }
  }

  // estoque só diminui
  const e = base.estoque;
  const c = cli.estoque;
  for (const k of Object.keys(e.tinta) as (keyof typeof e.tinta)[]) e.tinta[k] = Math.min(e.tinta[k], c.tinta[k]);
  for (const k of Object.keys(e.spray) as (keyof typeof e.spray)[]) e.spray[k] = Math.min(e.spray[k], c.spray[k]);
  e.rolinho = { saude: Math.min(100, c.rolinho.saude), reserva: Math.min(e.rolinho.reserva, c.rolinho.reserva) };
  e.bico = { saude: Math.min(100, c.bico.saude), reserva: Math.min(e.bico.reserva, c.bico.reserva) };
  e.lonas = Math.min(e.lonas, c.lonas);

  // equipe: só cansaço e escala vêm do aparelho
  for (const a of base.equipe) {
    const ca = cli.equipe.find((x) => x.id === a.id);
    if (!ca) continue;
    a.cansaco = Math.min(100, Math.max(0, ca.cansaco));
    a.folga = ca.folga;
    a.minTrabalhados = ca.minTrabalhados;
    a.escala = ca.escala && base.jobs.some((j) => j.id === ca.escala!.jobId) ? ca.escala : null;
  }
  base.minuto = Math.min(MIN_DIA, Math.max(base.minuto, cli.minuto));
  base.tranquilo = cli.tranquilo;
  const esperado = base.dinheiroIniDia + base.ganhosDia - somaGastos(base.gastosDia);
  if (Math.abs(base.dinheiro - esperado) > 0.5) return invalido;
  return { ok: true, prog: base };
}

export const jobsDoQuadro = (p: Progresso): Job[] => p.jobs.filter((j) => !j.aceita && j.status === "aberta");
export { gastosZero };
