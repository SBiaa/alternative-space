"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/admin";
import { getUser } from "@/lib/auth/server";
import { CAMINHOS, LIMITES, TEMAS_LISTA, TEXTOS, type Tema } from "@/lib/constelacao/config";
import { agendar, desagendar } from "@/lib/constelacao/dados";
import { diaDe, diaValido } from "@/lib/constelacao/dia";
import { normalizar, palavraValida } from "@/lib/constelacao/jogo";
import { dentroDoLimiteUsuario } from "@/lib/constelacao/limite";
import { migrarSave, type SaveLocal } from "@/lib/constelacao/save";
import { jogarPalpite, migrarParaConta, montarEstado, type EstadoDoDia } from "@/lib/constelacao/servico";
import { dentroDoLimite } from "@/lib/limite";

// Ações da Constelação do Dia. A palavra nunca sai daqui: o navegador manda o palpite e recebe só o retorno por letra.

type Erro = { ok: false; erro: string };
const erro = (e: string): Erro => ({ ok: false, erro: e });

const limiteIp = async (nome: string, l: { max: number; janelaS: number }) =>
  dentroDoLimite(nome, { headers: await headers() } as Request, l.max, l.janelaS);

// O save vem do navegador: só passa se tiver o formato certo. Lixo vira "sem save".
const saveDe = (bruto: unknown): SaveLocal | null => migrarSave(bruto);

/** Estado de hoje. Quem não tem conta manda o save do navegador, que o servidor reconfere. */
export async function estadoDoDia(save?: unknown): Promise<{ ok: true; estado: EstadoDoDia } | Erro> {
  const user = await getUser();
  if (!(await limiteIp("constelacao-leitura", LIMITES.leituraIp))) return erro(TEXTOS.erros.muitos);
  try {
    return { ok: true, estado: await montarEstado(user?.id ?? null, user ? null : saveDe(save)) };
  } catch (e) {
    console.error("Constelação: não deu pra ler o dia:", e);
    return erro(TEXTOS.erros.generico);
  }
}

export async function palpitar(palpite: unknown, save?: unknown): Promise<{ ok: true; estado: EstadoDoDia } | Erro> {
  if (typeof palpite !== "string" || palpite.length > 40) return erro(TEXTOS.erros.generico);
  const user = await getUser();
  if (!(await limiteIp("constelacao-palpite", LIMITES.palpitesIp))) return erro(TEXTOS.erros.muitos);
  if (user && !(await dentroDoLimiteUsuario("palpite", user.id, LIMITES.palpitesUsuario.max, LIMITES.palpitesUsuario.janelaS))) {
    return erro(TEXTOS.erros.muitos);
  }
  try {
    const r = await jogarPalpite(user?.id ?? null, palpite, user ? null : saveDe(save));
    if (r.ok) return r;
    if (r.erro === "sem-desafio") return erro(TEXTOS.erros.semDesafio);
    if (r.erro === "finalizada") return erro(TEXTOS.erros.finalizada);
    if (r.erro === "invalida") return erro(TEXTOS.erros.invalida);
    // O tamanho certo só o servidor sabe; a mensagem não revela a palavra, só a quantidade de letras do dia.
    const estado = await montarEstado(user?.id ?? null, user ? null : saveDe(save));
    return erro(TEXTOS.erros.tamanho(estado.puzzle?.length ?? 0));
  } catch (e) {
    console.error("Constelação: não deu pra conferir o palpite:", e);
    return erro(TEXTOS.erros.generico);
  }
}

/** Depois do cadastro: leva o save do navegador pra conta, conferindo cada dia de novo. */
export async function migrarSaveLocal(save: unknown): Promise<{ ok: true; dias: number; estado: EstadoDoDia } | Erro> {
  const user = await getUser();
  if (!user) return erro(TEXTOS.erros.generico);
  if (!(await dentroDoLimiteUsuario("migracao", user.id, LIMITES.migracao.max, LIMITES.migracao.janelaS))) return erro(TEXTOS.erros.muitos);
  const s = saveDe(save);
  if (!s) return erro(TEXTOS.erros.generico);
  try {
    const dias = await migrarParaConta(user.id, s);
    return { ok: true, dias, estado: await montarEstado(user.id, null) };
  } catch (e) {
    console.error("Constelação: não deu pra migrar o save:", e);
    return erro(TEXTOS.erros.generico);
  }
}

// ---- Admin ----
// Formulário escondido não protege nada: toda ação confere o papel de admin de novo.

const volta = (qs: string): never => redirect(`${CAMINHOS.admin}?${qs}`);

export async function agendarPalavra(form: FormData): Promise<void> {
  await assertAdmin();
  const date = String(form.get("date") ?? "");
  const answer = normalizar(String(form.get("answer") ?? ""));
  const theme = String(form.get("theme") ?? "") as Tema;
  const hint = String(form.get("hint") ?? "").trim().slice(0, 120);
  if (!diaValido(date)) volta("erro=data");
  if (!palavraValida(answer)) volta("erro=palavra");
  if (!TEMAS_LISTA.includes(theme)) volta("erro=tema");
  // Hoje e o passado já têm partidas: mexer na palavra mudaria o que as pessoas jogaram.
  if (date <= diaDe(new Date())) volta("erro=passado");
  try {
    await agendar({ date, answer, theme, hint });
  } catch (e) {
    console.error("Constelação: não deu pra agendar:", e);
    volta("erro=generico");
  }
  volta("ok=salvo");
}

export async function removerPalavra(form: FormData): Promise<void> {
  await assertAdmin();
  const date = String(form.get("date") ?? "");
  if (!diaValido(date)) volta("erro=data");
  if (date <= diaDe(new Date())) volta("erro=passado");
  try {
    await desagendar(date);
  } catch (e) {
    console.error("Constelação: não deu pra remover:", e);
    volta("erro=generico");
  }
  volta("ok=removido");
}
