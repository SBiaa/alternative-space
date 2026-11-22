import { z } from "zod";
import { OBSTACULOS, TIPOS_SPOT } from "./tipos";

// Regras do cadastro de pico. Vale no navegador (aviso rápido) e no servidor (a palavra final).

export const LIMITES = {
  nomeMax: 60,
  descricaoMax: 600,
  cidadeMax: 60,
  maxPendentesPorUsuario: 10,
  envios: { max: 10, janelaS: 3600 },
} as const;

const texto = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, `Use até ${max} caracteres.`));

export const NovoSpot = z.object({
  tipo: z.enum(TIPOS_SPOT, { message: "Escolha o tipo do lugar." }),
  nome: texto(LIMITES.nomeMax).pipe(z.string().min(3, "Dê um nome com pelo menos 3 letras.")),
  descricao: texto(LIMITES.descricaoMax).default(""),
  cidade: texto(LIMITES.cidadeMax).pipe(z.string().min(2, "Diga em que cidade fica.")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  obstaculos: z.array(z.enum(OBSTACULOS)).max(OBSTACULOS.length).default([]),
});
export type NovoSpot = z.infer<typeof NovoSpot>;

export type Validacao = { ok: true; spot: NovoSpot } | { ok: false; erro: string };

export function validarSpot(entrada: unknown): Validacao {
  const r = NovoSpot.safeParse(entrada);
  if (r.success) {
    if (r.data.lat === 0 && r.data.lng === 0) return { ok: false, erro: "Marque o lugar no mapa." };
    return { ok: true, spot: r.data };
  }
  const p = r.error.issues[0];
  if (p.path[0] === "lat" || p.path[0] === "lng") return { ok: false, erro: "Marque o lugar no mapa." };
  return { ok: false, erro: p.message };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
