// Tipos e schemas (zod) do Mar Sem Fim. O conteúdo em content/mar-sem-fim/ é validado contra estes schemas
// quando o módulo carrega (ver conteudo.ts), então um JSON quebrado derruba o build em vez de chegar no jogo.

import { z } from "zod";

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id em minúsculas, números e hífens");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const texto = z.string().min(1);

export const schemaEfeitos = z
  .object({
    ouro: z.number().int().optional(),
    recompensa: z.number().int().optional(),
    casco: z.number().int().optional(),
    mantimentos: z.number().int().optional(),
    item: id.optional(),
    aliado: id.optional(),
    agulha: z.boolean().optional(),
  })
  .strict();
export type Efeitos = z.infer<typeof schemaEfeitos>;

// ---------- mundo ----------

const schemaMar = z.object({
  id,
  nome: texto,
  icone: texto,
  cor: hex,
  hemisferio: z.enum(["norte", "sul"]),
  lado: z.enum(["leste", "oeste"]),
  ilhaOrigem: id,
  bocaDoCanal: id,
  descricao: texto,
  bonus: z.object({
    texto,
    consumo: z.number().positive().optional(),
    ouroInicial: z.number().int().optional(),
    tempo: z.number().positive().optional(),
    dano: z.number().positive().optional(),
  }),
});
export type Mar = z.infer<typeof schemaMar>;

const schemaNo = z.object({ id, nome: texto, lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export type NoPassagem = z.infer<typeof schemaNo>;

const schemaAresta = z.object({ de: id, para: id, tipo: z.enum(["mar", "canal", "corrente"]), mar: id.optional() });
export type Aresta = z.infer<typeof schemaAresta>;

export const schemaMundo = z.object({
  nome: texto,
  planeta: z.object({
    corOceano: hex, corFundo: hex, corAtmosfera: hex, corIlha: hex, corIlhaPonto: hex,
    texturaLargura: z.number().int().min(64).max(4096),
    texturaAltura: z.number().int().min(32).max(2048),
  }),
  espinha: z.object({ nome: texto, descricao: texto, meridianos: z.array(z.number()).min(1), larguraGraus: z.number().positive(), cor: hex, corRelevo: hex }),
  corrente: z.object({ nome: texto, descricao: texto, latMax: z.number().positive(), cor: hex, corBrilho: hex }),
  parados: z.object({ nome: texto, descricao: texto, latMax: z.number().positive(), cor: hex }),
  mares: z.array(schemaMar).length(4),
  monte: id,
  nos: z.array(schemaNo),
  arestas: z.array(schemaAresta).min(1),
  agulha: z.object({ nome: texto, descricao: texto, ordem: z.array(id).min(2), cargaSegundos: z.number().int().min(0) }),
  emBreve: z.array(z.object({ id, nome: texto, lat: z.number(), lng: z.number(), resumo: texto, requisito: texto })),
  navegacao: z.object({
    leguasPorGrau: z.number().positive(),
    minutosPorLegua: z.number().positive(),
    ventoMin: z.number().positive(),
    ventoMax: z.number().positive(),
    consumoPorMinuto: z.number().min(0),
    fatorSemMantimentos: z.number().min(1),
    penalidadeFome: z.number().min(1),
    minutosPorEvento: z.number().positive(),
    eventosMax: z.number().int().min(0),
    raioIsentoMonteGraus: z.number().min(0),
    lentidaoCascoMax: z.number().min(0),
  }),
  barco: z.object({
    cascoBase: z.number().int().positive(),
    mantimentosBase: z.number().int().positive(),
    ouroInicial: z.number().int().min(0),
    cascoInicialFracao: z.number().min(0).max(1),
    mantimentosInicialFracao: z.number().min(0).max(1),
    custoReparoPorPonto: z.number().min(0),
    custoMantimentoPorPonto: z.number().min(0),
    velocidadeBase: z.number().positive(),
  }),
  limiteAcoes: z.object({ max: z.number().int().positive(), janelaSeg: z.number().int().positive() }),
  economia: z.object({ ouroMax: z.number().int(), recompensaMax: z.number().int(), eventoRecompensaMax: z.number().int() }),
});
export type Mundo = z.infer<typeof schemaMundo>;

// ---------- ilhas e histórias ----------

const schemaOpcao = z.object({
  id,
  rotulo: texto,
  resultado: z.string().optional(),
  efeitos: schemaEfeitos.optional(),
  proxima: id,
  oficio: id.optional(),
});

const schemaCena = z.object({
  titulo: texto,
  texto,
  fim: z.boolean().optional(),
  opcoes: z.array(schemaOpcao),
  efeitos: schemaEfeitos.optional(),
});
export type Cena = z.infer<typeof schemaCena>;
export type OpcaoCena = z.infer<typeof schemaOpcao>;

export const schemaIlha = z.object({
  slug: id,
  nome: texto,
  mar: z.enum(["boreal", "austral", "nascente", "poente", "corrente"]),
  lado: z.enum(["origem", "manso"]),
  tipo: z.enum(["historia", "evento"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  bioma: texto,
  clima: texto,
  regraEstranha: texto,
  resumo: texto,
  servicos: z.object({ mercado: z.boolean(), estaleiro: z.boolean() }),
  recompensaMax: z.object({ ouro: z.number().int().min(0), recompensa: z.number().int().min(0) }),
  historia: z.object({ inicio: id, cenas: z.record(id, schemaCena) }),
});
export type Ilha = z.infer<typeof schemaIlha>;

// ---------- eventos de viagem, ofícios, melhorias, catálogo, aparência ----------

export const TIPOS_EVENTO = ["tempestade", "mercante", "criatura", "naufrago"] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

const schemaOpcaoEvento = z.object({
  id,
  rotulo: texto,
  resultado: texto,
  exige: z.object({ ouro: z.number().int().min(0) }).optional(),
  efeitos: schemaEfeitos,
});
export type OpcaoEvento = z.infer<typeof schemaOpcaoEvento>;

export const schemaEventos = z.object({
  tipos: z.record(z.enum(TIPOS_EVENTO), z.object({ nome: texto, icone: texto })),
  eventos: z.array(
    z.object({
      id,
      tipo: z.enum(TIPOS_EVENTO),
      peso: z.number().positive(),
      rotas: z.array(z.enum(["mar", "canal", "corrente"])).min(1),
      titulo: texto,
      texto,
      opcoes: z.array(schemaOpcaoEvento).min(2),
    }),
  ),
});
export type EventoDef = z.infer<typeof schemaEventos>["eventos"][number];

export const schemaOficios = z.object({
  oficios: z.array(
    z.object({
      id,
      nome: texto,
      icone: texto,
      descricao: texto,
      vantagem: z.object({
        texto,
        tempo: z.number().positive().optional(),
        consumo: z.number().positive().optional(),
        reparo: z.number().positive().optional(),
        evento: z.object({ tipo: z.enum(TIPOS_EVENTO), efeitos: schemaEfeitos }).optional(),
      }),
    }),
  ).length(6),
});
export type Oficio = z.infer<typeof schemaOficios>["oficios"][number];

export const schemaMelhorias = z.object({
  melhorias: z.array(
    z.object({
      id,
      nome: texto,
      descricao: texto,
      custo: z.number().int().min(0),
      efeito: z.object({ cascoMax: z.number().int().optional(), mantimentosMax: z.number().int().optional(), tempo: z.number().positive().optional() }),
      emBreve: z.boolean(),
      requisito: z.string().optional(),
    }),
  ),
});
export type MelhoriaDef = z.infer<typeof schemaMelhorias>["melhorias"][number];

const cartaCatalogo = z.object({ nome: texto, descricao: texto });
export const schemaCatalogo = z.object({ itens: z.record(id, cartaCatalogo), aliados: z.record(id, cartaCatalogo) });

const opcaoNomeada = z.array(z.object({ id, nome: texto }));
const corNomeada = z.array(z.object({ id, nome: texto, valor: hex }));
export const schemaAparencia = z.object({
  silhuetas: opcaoNomeada,
  cores: corNomeada,
  chapeus: opcaoNomeada,
  cicatrizes: opcaoNomeada,
  bandeira: z.object({ fundos: opcaoNomeada, formas: opcaoNomeada, cores: corNomeada }),
  nome: z.object({ min: z.number().int(), max: z.number().int() }),
  barco: z.object({ min: z.number().int(), max: z.number().int() }),
});

// ---------- estado do pirata ----------

export type Aparencia = { silhueta: string; cor: string; chapeu: string; cicatriz: string };
export type Bandeira = { fundo: string; fundoCor: string; forma: string; formaCor: string };

export type DadosCartaz = { nome: string; barco: string; recompensa: number; aparencia: Aparencia; bandeira: Bandeira };

export type EventoViagem = {
  id: string; // id do evento em eventos.json
  quando: number; // 0..1, ponto da viagem em que acontece
  escolha: string | null; // id da opção escolhida (null = ainda não resolvido)
};

export type Viagem = {
  numero: number;
  de: string;
  para: string;
  partiuEm: number; // epoch ms
  chegaEm: number;
  rota: string[]; // ids dos nós, da origem ao destino
  vento: number;
  mantimentosGastos: number;
  faltouMantimento: boolean;
  chegou: boolean;
  eventos: EventoViagem[];
  resolvida: boolean;
};

export type StatusIlha = "travada" | "liberada" | "visitada" | "concluida";

export type ProgressoIlha = {
  status: StatusIlha;
  caminho: string[]; // ids das opções escolhidas na história, em ordem
  ganhoOuro: number;
  ganhoRecompensa: number;
  concluidaEm?: number;
};

export type Estado = {
  v: number; // versão do formato do save
  versao: number; // state_version: sobe a cada gravação
  seed: string;
  nome: string;
  aparencia: Aparencia;
  mar: string;
  oficio: string;
  recompensa: number;
  ouro: number;
  barco: { nome: string; bandeira: Bandeira; casco: number; mantimentos: number; melhorias: string[]; ilhaAtual: string };
  agulha: { ilha: string | null; carregada: boolean; desde: number };
  ilhas: Record<string, ProgressoIlha>;
  itens: string[];
  aliados: string[];
  viagens: number; // quantas já começaram (número da próxima = viagens + 1)
  viagem: Viagem | null;
  criadoEm: number;
};

export const VERSAO_SAVE = 1;

export type Acao =
  | { t: "zarpar"; destino: string }
  | { t: "chegar" }
  | { t: "evento"; id: string; opcao: string }
  | { t: "cena"; ilha: string; opcao: string | null }
  | { t: "melhoria"; id: string }
  | { t: "reparar" }
  | { t: "abastecer" }
  | { t: "carregar" };

export type ErroJogo =
  | "sem-ilha" | "travada" | "viagem-em-andamento" | "ja-la" | "sem-rota" | "nao-chegou" | "sem-viagem" | "evento-invalido"
  | "opcao-invalida" | "sem-ouro" | "sem-servico" | "ja-tem" | "em-breve" | "fora-da-ilha" | "sem-historia" | "nada-a-fazer" | "invalido";

export type Resultado = { ok: true; estado: Estado; aviso?: string } | { ok: false; erro: ErroJogo };
