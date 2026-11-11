"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { auth, getUser } from "@/lib/auth/server";
import { PENDENTE, SENHA, lerPendente, safeNext, saveResult, type Pendente } from "@/lib/tripulante";

export type AuthState = { error?: string; name?: string; email?: string } | null;
export type VerifyState = { error?: string; ok?: string } | null;

type AuthError = { message?: string; code?: string; status?: number } | null | undefined;

// O SDK tem auth.emailOtp em tempo de execução (rotas /email-otp/* do Neon Auth), mas a tipagem dele sai como unknown.
const otpApi = auth.emailOtp as {
  sendVerificationOtp(body: { email: string; type: "email-verification" | "forget-password" }): Promise<{ error?: AuthError }>;
  resetPassword(body: { email: string; otp: string; password: string }): Promise<{ data?: { success?: boolean } | null; error?: AuthError }>;
  verifyEmail(body: { email: string; otp: string }): Promise<{
    data?: { token: string | null; user: { id: string } } | null;
    error?: AuthError;
  }>;
};

// "salvar" chega como "quiz/resultado" quando a pessoa se cadastra a partir de uma página de resultado.
async function saveFrom(userId: string, salvar: unknown) {
  const [quiz, result] = String(salvar ?? "").split("/");
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

const naoVerificado = (e: AuthError) =>
  e?.code === "EMAIL_NOT_VERIFIED" || (e?.message ?? "").toLowerCase().includes("not verified");

// Guarda quem está esperando o código num cookie que o navegador não lê, pra o e-mail não ir pro endereço da página.
async function aguardarCodigo(p: Pendente): Promise<never> {
  (await cookies()).set(PENDENTE, JSON.stringify(p), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
  redirect("/cadastro/verificar");
}

export async function cadastrar(_: AuthState, f: FormData): Promise<AuthState> {
  const name = String(f.get("name") ?? "").trim();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const password = String(f.get("password") ?? "");
  const keep = { name, email };
  if (!name) return { ...keep, error: "Como a gente te chama?" };
  if (password.length < 8) return { ...keep, error: "A senha precisa de pelo menos 8 caracteres." };

  const { data, error } = await auth.signUp.email({ name, email, password });
  if (error || !data?.user) {
    console.error("[cadastro] Neon Auth recusou:", error ?? "sem usuário na resposta");
    return { ...keep, error: traduz(error?.message) };
  }

  const next = safeNext(f.get("next"));
  const salvar = String(f.get("salvar") ?? "");
  // Sem sessão = o Neon pediu confirmação do e-mail (e já mandou o código).
  // O resultado do quiz só é salvo depois de confirmar: com e-mail já cadastrado o Neon devolve um usuário de mentira.
  if (!data.token) await aguardarCodigo({ email, next, salvar });
  await saveFrom(data.user.id, salvar);
  redirect(next);
}

export async function entrar(_: AuthState, f: FormData): Promise<AuthState> {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const { data, error } = await auth.signIn.email({ email, password: String(f.get("password") ?? "") });
  if (naoVerificado(error)) {
    // Só chega aqui quem acertou a senha, então dá pra mandar o código de novo.
    await otpApi.sendVerificationOtp({ email, type: "email-verification" });
    await aguardarCodigo({ email, next: safeNext(f.get("next")), salvar: String(f.get("salvar") ?? "") });
  }
  if (error || !data?.user) return { email, error: traduz(error?.message) };
  await saveFrom(data.user.id, f.get("salvar"));
  redirect(safeNext(f.get("next")));
}

const traduzCodigo = (e: AuthError) => {
  const m = `${e?.code ?? ""} ${e?.message ?? ""}`.toLowerCase();
  if (m.includes("expired")) return "Esse código expirou. Pede um novo aqui embaixo.";
  if (m.includes("too many") || m.includes("too_many")) return "Muitas tentativas. Pede um código novo aqui embaixo.";
  if (m.includes("invalid") || m.includes("otp")) return "Código errado. Confere no seu e-mail.";
  return "Não deu certo agora. Tenta de novo em instantes.";
};

export async function verificar(_: VerifyState, f: FormData): Promise<VerifyState> {
  const store = await cookies();
  const p = lerPendente(store.get(PENDENTE)?.value);
  if (!p) return { error: "Esse pedido expirou. Faz o cadastro ou entra de novo." };

  const otp = String(f.get("codigo") ?? "").replace(/\D/g, "");
  if (otp.length !== 6) return { error: "O código tem 6 números." };

  const { data, error } = await otpApi.verifyEmail({ email: p.email, otp });
  if (error || !data?.user) return { error: traduzCodigo(error) };

  store.delete(PENDENTE);
  // Com "entrar depois de confirmar" ligado no Neon, a sessão já vem junto.
  if (!data.token) redirect(`/entrar?next=${encodeURIComponent(p.next)}`);
  await saveFrom(data.user.id, p.salvar);
  redirect(p.next);
}

export async function reenviarCodigo(): Promise<VerifyState> {
  const p = lerPendente((await cookies()).get(PENDENTE)?.value);
  if (!p) return { error: "Esse pedido expirou. Faz o cadastro ou entra de novo." };
  const { error } = await otpApi.sendVerificationOtp({ email: p.email, type: "email-verification" });
  if (error) return { error: "Espera um minutinho antes de pedir outro código." };
  return { ok: "Código novo enviado. Confere o e-mail (e o spam)." };
}

// ---- Esqueci a senha: código por e-mail + senha nova ----
export type SenhaState = { error?: string; ok?: string; email?: string } | null;

async function lerEmailSenha() {
  const v = (await cookies()).get(SENHA)?.value ?? "";
  return v.includes("@") ? v : null;
}

export async function pedirCodigoSenha(_: SenhaState, f: FormData): Promise<SenhaState> {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { email, error: "Confere o e-mail." };
  const { error } = await otpApi.sendVerificationOtp({ email, type: "forget-password" });
  // Não conta se o e-mail tem conta ou não; só avisa se for limite de envio.
  if (error && (error.status === 429 || `${error.code} ${error.message}`.toLowerCase().includes("too many")))
    return { email, error: "Espera um minutinho antes de pedir outro código." };
  if (error) console.error("[senha] Neon Auth recusou o envio:", error);
  (await cookies()).set(SENHA, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
  redirect("/entrar/nova-senha");
}

export async function redefinirSenha(_: SenhaState, f: FormData): Promise<SenhaState> {
  const email = await lerEmailSenha();
  if (!email) return { error: "Esse pedido expirou. Pede um código novo." };
  const otp = String(f.get("codigo") ?? "").replace(/\D/g, "");
  const password = String(f.get("password") ?? "");
  if (otp.length !== 6) return { error: "O código tem 6 números." };
  if (password.length < 8) return { error: "A senha precisa de pelo menos 8 caracteres." };

  const { error } = await otpApi.resetPassword({ email, otp, password });
  if (error) return { error: traduzCodigo(error) };
  (await cookies()).delete(SENHA);
  // Entra direto com a senha nova.
  const { error: e2 } = await auth.signIn.email({ email, password });
  redirect(e2 ? "/entrar" : "/conta");
}

export async function reenviarCodigoSenha(): Promise<SenhaState> {
  const email = await lerEmailSenha();
  if (!email) return { error: "Esse pedido expirou. Pede um código novo." };
  const { error } = await otpApi.sendVerificationOtp({ email, type: "forget-password" });
  if (error) return { error: "Espera um minutinho antes de pedir outro código." };
  return { ok: "Código novo enviado. Confere o e-mail (e o spam)." };
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
