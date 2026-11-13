// Save do O Corre: schema, migração de versão e regras de integridade (não é anti-trapaça, é sanidade).

import { z } from "zod";
import { CORRE } from "./config";
import type { Estado } from "./motor";

const pct = z.number().min(0).max(100);
const inteiro = z.number().int();
const moto = z.object({ pneu: pct, freio: pct, oleo: pct });

const oferta = z.object({
  id: z.string(),
  restaurante: z.string(),
  destino: z.string(),
  km: z.number().min(0),
  valor: inteiro.min(0),
  bonusChuva: inteiro.min(0),
  bonusPico: inteiro.min(0),
  prazo: z.number().min(0),
  expira: z.number(),
  premium: z.boolean(),
});

const puzzle = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("coleta"), nota: z.array(z.string()).max(10), sacola: z.array(z.string().nullable()).max(10), erro: inteiro.min(-1).max(9) }),
  z.object({
    tipo: z.literal("entrega"),
    portas: z.array(z.object({ casa: z.string(), portao: z.string(), numero: inteiro.min(1).max(999) })).min(2).max(10),
    pista: z.object({ casa: z.string(), portao: z.string(), paridade: z.enum(["par", "ímpar"]) }),
    correta: inteiro.min(0).max(9),
    erradas: z.array(inteiro.min(0).max(9)).max(2),
  }),
]);

const resumoDia = z.object({
  dia: inteiro.min(1),
  ganhos: inteiro.min(0),
  gastos: inteiro.min(0),
  saldo: inteiro,
  entregas: inteiro.min(0),
  noPrazo: inteiro.min(0),
  atrasadas: inteiro.min(0),
  recusadas: inteiro.min(0),
  avaliacao: z.number().min(1).max(5),
  cansaco: pct,
  moto,
  combustivel: pct,
  motivo: z.enum(["casa", "cansaco", "meiaNoite"]),
  ritmoTranquilo: z.boolean(),
});

const resumoSemana = z.object({
  semana: inteiro.min(1),
  contas: z.array(z.object({ id: z.string(), nome: z.string(), valor: inteiro })),
  dividaAnterior: inteiro.min(0),
  totalCobrado: inteiro.min(0),
  pago: inteiro.min(0),
  divida: inteiro.min(0),
  contasPagas: z.boolean(),
  saldo: inteiro,
  guardadoSemana: inteiro.min(0),
  metaCumprida: z.boolean(),
  progressoObjetivo: z.number().min(0).max(100),
});

export const schemaEstado = z.object({
  versao: z.literal(CORRE.versaoSave),
  seed: z.string().min(1).max(64),
  dia: inteiro.min(1).max(10_000),
  semana: inteiro.min(1),
  minuto: z.number().min(0).max(CORRE.tempo.fimDia + 120),
  fase: z.enum(["casa", "rodando", "viagem", "evento", "minigame", "resumoDia", "resumoSemana"]),
  passo: inteiro.min(0),
  posicao: z.string(),
  dinheiro: inteiro,
  divida: inteiro.min(0),
  combustivel: pct,
  moto,
  modeloMoto: z.string().max(80),
  cansaco: pct,
  avaliacao: z.number().min(1).max(5),
  aceitacao: pct,
  objetivo: z.object({ id: z.string(), guardado: inteiro.min(0) }),
  clima: z.array(z.boolean()).length(24),
  oferta: oferta.nullable(),
  viagem: z
    .object({
      tipo: z.enum(["entrega", "servico", "casa"]),
      pontos: z.array(z.string()).min(1).max(4),
      km: z.number().min(0),
      duracao: z.number().min(0),
      decorrido: z.number().min(0),
      oferta: oferta.optional(),
      lugar: z.string().optional(),
      evento: z.object({ id: z.string(), em: z.number(), resolvido: z.boolean() }).optional(),
      cancelada: z.boolean().optional(),
      mini: z.object({ coletaEm: z.number(), coletaFeita: z.boolean(), entregaFeita: z.boolean() }).optional(),
      gorjetaExtra: inteiro.min(0).optional(),
      chanceGorjeta: z.number().min(0).max(1).optional(),
      incompleto: z.boolean().optional(),
    })
    .nullable(),
  evento: z.object({ id: z.string() }).nullable(),
  minigame: puzzle.nullable(),
  mensagens: z.array(z.object({ id: z.string(), minuto: z.number(), texto: z.string().max(300), tipo: z.enum(["info", "alerta"]) })).max(40),
  avisos: z.array(z.string()).max(20),
  diaAtual: z.object({
    dinheiroInicio: inteiro,
    ganhos: inteiro.min(0),
    gastos: inteiro.min(0),
    guardado: inteiro.min(0),
    entregas: inteiro.min(0),
    noPrazo: inteiro.min(0),
    atrasadas: inteiro.min(0),
    recusadas: inteiro.min(0),
    canceladas: inteiro.min(0),
    km: z.number().min(0),
  }),
  semanaAtual: z.object({ guardado: inteiro.min(0) }),
  ritmoTranquilo: z.boolean(),
  resumoDia: resumoDia.nullable(),
  resumoSemana: resumoSemana.nullable(),
  ultimoResultado: z.string().max(300).nullable(),
});

export type ResumoDiaValidado = z.infer<typeof resumoDia>;
export type ResumoSemanaValidado = z.infer<typeof resumoSemana>;

// Uma função por salto de versão. Quando o formato mudar: suba CORRE.versaoSave e acrescente aqui.
// Ex.: 1: (s) => ({ ...s, versao: 2, novoCampo: padrão })
const MIGRACOES: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 → v2: minigames na coleta e na entrega.
  1: (s) => ({ ...s, versao: 2, minigame: null }),
};

/** Leva qualquer save antigo até a versão atual. Devolve null se não der. */
export function migrar(bruto: unknown): Estado | null {
  if (!bruto || typeof bruto !== "object") return null;
  let s = bruto as Record<string, unknown>;
  let v = typeof s.versao === "number" ? s.versao : 0;
  while (v < CORRE.versaoSave) {
    const passo = MIGRACOES[v];
    if (!passo) return null;
    s = passo(s);
    v = typeof s.versao === "number" ? s.versao : v + 1;
  }
  const r = schemaEstado.safeParse(s);
  return r.success ? (r.data as Estado) : null;
}

/** Integridade ao gravar: o dia só anda pra frente e o saldo bate. Devolve o motivo do erro ou null. */
export function problemaAoGravar(novo: Estado, diaGuardado: number | null): string | null {
  if (diaGuardado !== null && novo.dia < diaGuardado) return "Esse save é de um dia que já passou.";
  if (novo.semana !== Math.ceil(novo.dia / CORRE.semana.diasTotal)) return "Semana não bate com o dia.";
  if (novo.objetivo.guardado > CORRE.objetivo.valor * 2) return "Valor guardado fora do esperado.";
  const d = novo.diaAtual;
  if (novo.fase === "resumoDia" && novo.dinheiro !== d.dinheiroInicio + d.ganhos - d.gastos - d.guardado) return "O saldo do dia não bate.";
  if (novo.resumoDia && novo.resumoDia.saldo !== novo.resumoDia.ganhos - novo.resumoDia.gastos) return "O resumo do dia não bate.";
  return null;
}

/** Ao entrar na conta: qual save fica, o local ou o que já estava na conta? O mais avançado vence. */
export function escolherSave(local: Estado | null, remoto: Estado | null): { save: Estado | null; origem: "local" | "remoto" | "nenhum" } {
  if (!local && !remoto) return { save: null, origem: "nenhum" };
  if (!remoto) return { save: local, origem: "local" };
  if (!local) return { save: remoto, origem: "remoto" };
  const frente = local.dia > remoto.dia || (local.dia === remoto.dia && local.minuto > remoto.minuto);
  return frente ? { save: local, origem: "local" } : { save: remoto, origem: "remoto" };
}

export const CHAVE_LOCAL = "o-corre:save";
