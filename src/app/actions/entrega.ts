"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth/server";
import { ENTREGA, TEXTOS } from "@/lib/entrega/config";
import { comprar, definirEquipado, equipadosDe, gravarTurno, implantesDe, saldoDe } from "@/lib/entrega/dados";
import { aplicarImplantes, validarCompra, validarEquipar, validarTurno, type Resumo, type TurnoEnviado } from "@/lib/entrega/regras";
import { dentroDoLimite } from "@/lib/limite";

const E = TEXTOS.erros;

export type RespostaTurno = { ok: true; resumo: Resumo; recorde: boolean; saldo: number } | { ok: false; erro: string; semConta?: boolean };

/**
 * Fim de turno. O servidor refaz o resumo a partir da lista de pedidos e confere o teto
 * pelos implantes equipados agora. `basica`: turno jogado sem conta, creditado depois do cadastro com a moto básica.
 */
export async function salvarTurno(turno: TurnoEnviado, basica = false): Promise<RespostaTurno> {
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta, semConta: true };
  const req = { headers: await headers() } as Request;
  if (!(await dentroDoLimite(`entrega:${user.id}`, req, ENTREGA.limiteTurnos.max, ENTREGA.limiteTurnos.janelaSeg))) return { ok: false, erro: E.limite };
  try {
    const equipados = basica ? [] : await equipadosDe(user.id);
    const v = validarTurno(turno, aplicarImplantes(equipados));
    if (!v.ok) return { ok: false, erro: E.invalido };
    const recorde = await gravarTurno(user.id, v.resumo, equipados);
    revalidatePath("/jogos/entrega-na-chuva");
    return { ok: true, resumo: v.resumo, recorde, saldo: await saldoDe(user.id) };
  } catch (e) {
    console.error("Não deu pra salvar o turno:", e);
    return { ok: false, erro: E.generico };
  }
}

export type RespostaOficina = { ok: true; saldo: number } | { ok: false; erro: string };

export async function comprarImplante(slug: string): Promise<RespostaOficina> {
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta };
  if (typeof slug !== "string") return { ok: false, erro: E.generico };
  try {
    const [lista, saldo] = await Promise.all([implantesDe(user.id), saldoDe(user.id)]);
    const im = lista.find((i) => i.slug === slug);
    if (!im) return { ok: false, erro: E.generico };
    const v = validarCompra(im.level, im.maxLevel, im.prices, saldo);
    if (!v.ok) return { ok: false, erro: E[v.erro] };
    const novo = await comprar(user.id, im.id, im.slug, im.level, v.preco);
    if (novo === null) return { ok: false, erro: E.saldo };
    revalidatePath("/jogos/entrega-na-chuva/oficina");
    return { ok: true, saldo: novo };
  } catch (e) {
    console.error("Não deu pra comprar o implante:", e);
    return { ok: false, erro: E.generico };
  }
}

export async function equiparImplante(slug: string, equipar: boolean): Promise<{ ok: boolean; erro?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erro: E.semConta };
  try {
    const lista = await implantesDe(user.id);
    const im = lista.find((i) => i.slug === slug);
    if (!im) return { ok: false, erro: E.generico };
    if (equipar) {
      const erro = validarEquipar(im.level > 0, im.equipped, lista.filter((i) => i.equipped).length);
      if (erro) return { ok: false, erro: E[erro] };
    }
    if (!(await definirEquipado(user.id, im.id, Boolean(equipar), ENTREGA.equipadosMax))) return { ok: false, erro: equipar ? E.equipados : E.generico };
    revalidatePath("/jogos/entrega-na-chuva/oficina");
    return { ok: true };
  } catch (e) {
    console.error("Não deu pra equipar:", e);
    return { ok: false, erro: E.generico };
  }
}
