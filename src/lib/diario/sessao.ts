import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";

/** Id de quem está logado; sem login, manda pra entrada e volta pra mesma página depois. */
export async function exigeUsuario(voltarPara: string) {
  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(voltarPara)}`);
  return user.id;
}
