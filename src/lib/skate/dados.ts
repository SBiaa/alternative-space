import "server-only";
import { sql } from "@/lib/db";
import type { Caixa } from "./overpass";
import type { NovoSpot } from "./regras";
import type { Pino, Spot, StatusSpot, TipoSpot } from "./tipos";

// Consultas da tabela skate_spots (db/skate-universe.sql).

type Linha = Record<string, unknown>;

const paraSpot = (r: Linha): Spot => ({
  id: String(r.id),
  tipo: r.tipo as TipoSpot,
  nome: String(r.nome),
  descricao: String(r.descricao ?? ""),
  lat: Number(r.lat),
  lng: Number(r.lng),
  cidade: String(r.cidade),
  obstaculos: (r.obstaculos as string[] | null) ?? [],
  descobertoPor: String(r.descoberto_por),
  nomeDescobridor: String(r.nome_descobridor ?? "alguém da comunidade"),
  status: r.status as StatusSpot,
  createdAt: new Date(r.created_at as string).toISOString(),
});

export async function spotsNaCaixa(c: Caixa): Promise<Pino[]> {
  const rows = await sql`
    select s.id, s.tipo, s.nome, s.descricao, s.lat, s.lng, s.obstaculos, coalesce(u.name, '') as nome_descobridor
    from skate_spots s
    left join neon_auth."user" u on u.id::text = s.descoberto_por
    where s.status = 'aprovado'
      and s.lat between ${c.sul} and ${c.norte}
      and s.lng between ${c.oeste} and ${c.leste}
    limit 500`;
  return rows.map((r) => ({
    id: String(r.id),
    origem: "comunidade" as const,
    tipo: r.tipo as TipoSpot,
    nome: String(r.nome),
    lat: Number(r.lat),
    lng: Number(r.lng),
    descricao: String(r.descricao ?? ""),
    obstaculos: (r.obstaculos as string[] | null) ?? [],
    descobertoPor: String(r.nome_descobridor || "alguém da comunidade"),
  }));
}

export async function acharSpot(id: string): Promise<Spot | null> {
  const [r] = await sql`
    select s.*, u.name as nome_descobridor
    from skate_spots s
    left join neon_auth."user" u on u.id::text = s.descoberto_por
    where s.id = ${id}`;
  return r ? paraSpot(r) : null;
}

export async function contarPendentes(userId: string): Promise<number> {
  const [r] = await sql`select count(*)::int as n from skate_spots where descoberto_por = ${userId} and status = 'pendente'`;
  return Number(r?.n ?? 0);
}

export async function criarSpot(userId: string, s: NovoSpot): Promise<string> {
  const [r] = await sql`
    insert into skate_spots (tipo, nome, descricao, lat, lng, cidade, obstaculos, descoberto_por)
    values (${s.tipo}, ${s.nome}, ${s.descricao}, ${s.lat}, ${s.lng}, ${s.cidade}, ${s.obstaculos}::text[], ${userId})
    returning id`;
  return String(r.id);
}

export async function spotsDoUsuario(userId: string): Promise<Spot[]> {
  const rows = await sql`
    select s.*, u.name as nome_descobridor
    from skate_spots s
    left join neon_auth."user" u on u.id::text = s.descoberto_por
    where s.descoberto_por = ${userId}
    order by s.created_at desc
    limit 50`;
  return rows.map(paraSpot);
}

export async function spotsPendentes(): Promise<Spot[]> {
  const rows = await sql`
    select s.*, u.name as nome_descobridor
    from skate_spots s
    left join neon_auth."user" u on u.id::text = s.descoberto_por
    where s.status = 'pendente'
    order by s.created_at
    limit 100`;
  return rows.map(paraSpot);
}

export async function moderarSpot(id: string, status: "aprovado" | "recusado"): Promise<void> {
  await sql`update skate_spots set status = ${status}, reviewed_at = now() where id = ${id}`;
}
