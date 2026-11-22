// Estado da partida (o JSON de solo_runs.state) e a migração entre versões.
import { z } from "zod";
import { REGRAS } from "./config";
import { personagemSchema, type Personagem } from "./personagem";

export const VERSAO_ESTADO = 1;

const idCurto = z.string().min(1).max(64);
const lista = z.array(idCurto).max(64);

export const rolagemSchema = z.object({
  n: z.number().int().min(1),
  dados: z.array(z.number().int().min(1).max(REGRAS.faces)).length(REGRAS.dados),
  soma: z.number().int(),
  atributo: z.enum(["corpo", "mente", "labia"]),
  valorAtributo: z.number().int(),
  bonusTalento: z.number().int(),
  talentoNome: z.string().optional(),
  total: z.number().int(),
  dificuldade: z.number().int(),
  faixa: z.enum(["sucesso", "custo", "falha"]),
  texto: z.string(),
});

export const estadoSchema = z.object({
  versao: z.literal(VERSAO_ESTADO),
  aventura: idCurto,
  seed: z.string().min(4).max(32),
  cena: idCurto,
  folego: z.number().int().min(0).max(24),
  folegoMax: z.number().int().min(1).max(24),
  itens: lista,
  marcas: lista,
  flags: lista,
  rolagens: z.number().int().min(0).max(5000),
  porFaixa: z.object({ sucesso: z.number().int().min(0), custo: z.number().int().min(0), falha: z.number().int().min(0) }),
  passos: z.number().int().min(0).max(5000),
  trilha: z.array(idCurto).max(REGRAS.trilhaMax),
  personagem: personagemSchema,
  /** Última escolha feita e o teste dela, pra tela mostrar o que aconteceu mesmo depois de recarregar. */
  ultima: z.object({ opcao: z.string().max(400), rolagem: rolagemSchema.optional() }).optional(),
  final: z.object({ id: idCurto, tipo: z.enum(["bom", "custo", "alternativo"]) }).optional(),
});

export type Estado = z.infer<typeof estadoSchema>;
export type RolagemEstado = z.infer<typeof rolagemSchema>;

/**
 * Lê um estado vindo do banco ou de um cookie. Versão antiga sobe de nível aqui; formato inválido vira null.
 * (Hoje só existe a versão 1; quando surgir a 2, o ramo antigo entra no switch.)
 */
export function migrar(bruto: unknown): Estado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const r = estadoSchema.safeParse(bruto);
  return r.success ? r.data : null;
}

export type { Personagem };
