"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { auth, getUser } from "@/lib/auth/server";
import { apagarDados, avatarPermitido, corValida, normalizaApelido, salvarPerfil } from "@/lib/perfil";
import { pirataValido } from "@/lib/pirata";
import { latestResults } from "@/lib/tripulante";

export type FormState = { error?: string; ok?: string } | null;

type AuthError = { message?: string; code?: string } | null | undefined;
type Resposta = Promise<{ error?: AuthError }>;

// Rotas do próprio usuário no Neon Auth (/update-user, /change-password, /delete-user).
const userApi = auth as unknown as {
  updateUser(body: { name?: string; image?: string | null }): Resposta;
  changePassword(body: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }): Resposta;
  deleteUser(body: { password: string }): Resposta;
};

const senhaErrada = (e: AuthError) => {
  const m = `${e?.code ?? ""} ${e?.message ?? ""}`.toLowerCase();
  return m.includes("invalid") && m.includes("password");
};

export async function atualizarPerfil(_: FormState, f: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/entrar?next=/conta/editar");

  const name = String(f.get("name") ?? "").trim();
  if (!name) return { error: "Como a gente te chama?" };
  if (name.length > 60) return { error: "Nome comprido demais (até 60 letras)." };

  const apelido = normalizaApelido(f.get("apelido"));
  if (apelido === null) return { error: "O apelido usa de 3 a 20 letras, números, ponto ou _." };

  const cor = f.get("cor");
  if (!corValida(cor)) return { error: "Escolhe uma das cores." };

  const avatar = String(f.get("avatar") ?? "");
  if (avatar && !pirataValido(avatar) && !avatarPermitido(avatar, await latestResults(user.id))) {
    return { error: "Esse avatar ainda não foi desbloqueado." };
  }

  if (!(await salvarPerfil(user.id, { apelido: apelido || null, cor }))) {
    return { error: `@${apelido} já é de outro tripulante.` };
  }
  const { error } = await userApi.updateUser({ name, image: avatar || null });
  if (error) return { error: "Não deu pra salvar agora. Tenta de novo em instantes." };

  refresh();
  return { ok: "Perfil salvo." };
}

// Monte seu Pirata: o código do pirata vira a imagem da conta.
export async function usarPirata(codigo: string): Promise<FormState> {
  if (!(await getUser())) return { error: "Entra na sua conta pra usar o pirata como avatar." };
  if (!pirataValido(codigo)) return { error: "Esse pirata veio com peça faltando. Tenta montar de novo." };
  const { error } = await userApi.updateUser({ image: codigo });
  if (error) return { error: "Não deu pra salvar agora. Tenta de novo em instantes." };
  refresh();
  return { ok: "Pronto! Seu pirata já é o avatar do perfil." };
}

export async function trocarSenha(_: FormState, f: FormData): Promise<FormState> {
  if (!(await getUser())) redirect("/entrar?next=/conta/editar");
  const currentPassword = String(f.get("atual") ?? "");
  const newPassword = String(f.get("nova") ?? "");
  if (newPassword.length < 8) return { error: "A senha nova precisa de pelo menos 8 caracteres." };
  if (newPassword === currentPassword) return { error: "A senha nova é igual à atual." };

  const { error } = await userApi.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
  if (senhaErrada(error)) return { error: "A senha atual não bate." };
  if (error) return { error: "Não deu pra trocar agora. Tenta de novo em instantes." };
  return { ok: "Senha trocada. Os outros aparelhos foram desconectados." };
}

export async function apagarConta(_: FormState, f: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/entrar?next=/conta/editar");
  if (String(f.get("confirma") ?? "").trim().toUpperCase() !== "APAGAR") {
    return { error: "Digita APAGAR pra confirmar." };
  }

  // Primeiro a conta: se o Neon recusar (senha errada), os resultados continuam lá.
  const { error } = await userApi.deleteUser({ password: String(f.get("senha") ?? "") });
  if (senhaErrada(error)) return { error: "A senha não bate." };
  if (error) return { error: "Não deu pra apagar agora. Fala com a gente pelo contato do site." };

  await apagarDados(user.id);
  redirect("/?conta=apagada");
}
