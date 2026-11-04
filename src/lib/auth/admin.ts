import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export type Admin = { id: string; name: string; email: string };

// O Neon Auth guarda o papel como texto; com mais de um papel vem separado por vírgula ("user,admin").
export const isAdminRole = (role: unknown) =>
  typeof role === "string" && role.split(",").map((r) => r.trim()).includes("admin");

// Confere o papel direto no banco, e não só no cookie da sessão:
// quem perde o acesso de admin ou é banido sai na hora, sem esperar a sessão expirar.
export async function getAdmin(): Promise<Admin | null> {
  const user = await getUser();
  if (!user) return null;
  const rows = await sql`select id, name, email, role, banned from neon_auth."user" where id = ${user.id}`;
  const row = rows[0];
  if (!row || row.banned || !isAdminRole(row.role)) return null;
  return { id: String(row.id), name: String(row.name), email: String(row.email) };
}

// Páginas do painel. Sem login vai pro /entrar; logado sem ser admin vê 404, pra não revelar que o painel existe.
export async function requireAdmin(next = "/admin"): Promise<Admin> {
  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  const admin = await getAdmin();
  if (!admin) notFound();
  return admin;
}

// Ações do painel. Formulário escondido não protege nada: toda ação confere de novo.
export async function assertAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Acesso negado");
  return admin;
}
