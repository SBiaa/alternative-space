"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { auth, getUser } from "@/lib/auth/server";
import { safeNext, saveResult } from "@/lib/tripulante";

export type AuthState = { error?: string; name?: string; email?: string } | null;

// "salvar" chega como "quiz/resultado" quando a pessoa se cadastra a partir de uma página de resultado.
async function saveFromForm(userId: string, f: FormData) {
  const [quiz, result] = String(f.get("salvar") ?? "").split("/");
  if (quiz && result) await saveResult(userId, quiz, result);
}

const traduz = (msg?: string) => {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("already") || m.includes("exists")) return "Esse e-mail já tem cadastro. Tenta entrar.";
  if (m.includes("invalid email or password") || m.includes("credentials")) return "E-mail ou senha não batem.";
  if (m.includes("password") && m.includes("short")) return "A senha precisa de pelo menos 8 caracteres.";
  if (m.includes("email")) return "Confere o e-mail.";
  return "Não deu certo agora. Tenta de novo em instantes.";
};

export async function cadastrar(_: AuthState, f: FormData): Promise<AuthState> {
  const name = String(f.get("name") ?? "").trim();
  const email = String(f.get("email") ?? "").trim();
  const password = String(f.get("password") ?? "");
  const keep = { name, email };
  if (!name) return { ...keep, error: "Como a gente te chama?" };
  if (password.length < 8) return { ...keep, error: "A senha precisa de pelo menos 8 caracteres." };

  const { data, error } = await auth.signUp.email({ name, email, password });
  if (error || !data?.user) return { ...keep, error: traduz(error?.message) };
  await saveFromForm(data.user.id, f);
  redirect(safeNext(f.get("next")));
}

export async function entrar(_: AuthState, f: FormData): Promise<AuthState> {
  const { data, error } = await auth.signIn.email({
    email: String(f.get("email") ?? "").trim(),
    password: String(f.get("password") ?? ""),
  });
  if (error || !data?.user) return { email: String(f.get("email") ?? ""), error: traduz(error?.message) };
  await saveFromForm(data.user.id, f);
  redirect(safeNext(f.get("next")));
}

export async function sair() {
  await auth.signOut();
  redirect("/");
}

// Chamado pelo quiz ao terminar. Sem login, não faz nada.
export async function salvarResultado(quiz: string, result: string) {
  const user = await getUser();
  if (!user) return false;
  return saveResult(user.id, quiz, result);
}

// Botão "salvar" na página de resultado.
export async function salvarDaPagina(f: FormData) {
  const user = await getUser();
  const [quiz, result] = String(f.get("salvar") ?? "").split("/");
  if (!user) redirect(`/cadastro?salvar=${quiz}/${result}&next=/quiz/${quiz}/${result}`);
  await saveResult(user.id, quiz, result);
  refresh();
}
