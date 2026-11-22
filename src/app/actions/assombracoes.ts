"use server";

import { headers } from "next/headers";
import { getUser } from "@/lib/auth/server";
import { acharCaso, casoDaCriatura, totalCriaturas } from "@/lib/assombracoes/casos";
import { LUGAR_IDS, TEXTOS, VILA, type LugarId } from "@/lib/assombracoes/config";
import * as dados from "@/lib/assombracoes/dados";
import { conferir, estadoVazio, olharLugar, perguntar, podeDecidir, respostaValida, sanear, type EstadoCaso, type Resposta } from "@/lib/assombracoes/investigacao";
import { juntarEstados, migrar, type Resolucao } from "@/lib/assombracoes/save";
import type { Caso, Gabarito } from "@/lib/assombracoes/schema";
import { dentroDoLimite } from "@/lib/limite";

// Ações do Assombrações da Vila. O gabarito só é lido aqui, e só sai quando a resposta está certa.

export type Falha = { ok: false; erro: string; semConta?: boolean };
const falha = (erro: string, semConta?: boolean): Falha => ({ ok: false, erro, ...(semConta && { semConta }) });

const limite = async (nome: string, l: { max: number; janelaS: number }) =>
  dentroDoLimite(nome, { headers: await headers() } as Request, l.max, l.janelaS);

export type Desfecho = {
  desfecho: string[];
  origem: Gabarito["origem"];
  criatura: { slug: string; nome: string };
  resumoBestiario: string;
};

const desfechoDe = (c: Caso, slug: string, resumo: string, desfecho: string[], origem: Gabarito["origem"]): Desfecho => ({
  desfecho,
  origem,
  criatura: { slug, nome: c.publico.criaturas.find((x) => x.slug === slug)?.nome ?? slug },
  resumoBestiario: resumo,
});

// Coleta de sinais com conta: olhar um lugar ou perguntar a um morador. O servidor reaplica a regra sobre o que tem no banco.
export async function agirNoCaso(
  slug: string,
  acao: { tipo: "olhar"; lugar: string } | { tipo: "perguntar"; morador: string; fala: string },
): Promise<{ ok: true; estado: EstadoCaso; novos: string[] } | Falha> {
  const user = await getUser();
  if (!user) return falha(TEXTOS.erros.generico, true);
  if (!(await limite("vila-acao", VILA.limiteAcao))) return falha(TEXTOS.erros.muitos);
  const c = acharCaso(slug);
  if (!c) return falha(TEXTOS.erros.naoEncontrado);
  try {
    const atual = await dados.lerCaso(user.id, slug);
    const e = sanear(c.publico, atual?.estado ?? estadoVazio());
    let r;
    if (acao?.tipo === "olhar" && (LUGAR_IDS as readonly string[]).includes(acao.lugar)) r = olharLugar(c.publico, e, acao.lugar as LugarId);
    else if (acao?.tipo === "perguntar") r = perguntar(c.publico, e, String(acao.morador), String(acao.fala));
    else return falha(TEXTOS.erros.invalido);
    if (!r.ok) return falha(TEXTOS.erros.invalido);
    await dados.gravarEstado(user.id, slug, r.estado);
    return { ok: true, estado: r.estado, novos: r.novos };
  } catch (err) {
    console.error("Assombrações: não deu pra gravar a ação:", err);
    return falha(TEXTOS.erros.generico);
  }
}

export type ResultadoVerificar =
  | { ok: true; acertou: true; novaPagina: boolean; resultado: Desfecho }
  | { ok: true; acertou: false; dica: string; tentativas: number }
  | Falha;

/**
 * Confere criatura + motivo + escolha. Com conta, usa o que o banco sabe (sinais e tentativas).
 * Sem conta, usa o estado que o navegador mandou, depois de saneado: o servidor só decide se a resposta está certa.
 */
export async function verificarResposta(slug: string, resposta: unknown, estadoLocal?: unknown): Promise<ResultadoVerificar> {
  if (!(await limite("vila-resposta", VILA.limiteResposta))) return falha(TEXTOS.erros.muitos);
  const c = acharCaso(slug);
  if (!c) return falha(TEXTOS.erros.naoEncontrado);
  if (!respostaValida(c.publico, resposta)) return falha(TEXTOS.erros.invalido);
  const r: Resposta = resposta;
  try {
    const user = await getUser();
    let e: EstadoCaso;
    if (user) e = sanear(c.publico, (await dados.lerCaso(user.id, slug))?.estado ?? estadoVazio());
    else {
      const o = (estadoLocal ?? {}) as Partial<EstadoCaso>;
      e = sanear(c.publico, { sinais: o.sinais ?? [], depoimentos: o.depoimentos ?? [], tentativas: Number(o.tentativas) || 0 });
    }
    if (!podeDecidir(c.publico, e)) return falha(TEXTOS.erros.semSinais);

    const conf = conferir(c, r, e.tentativas);
    if (!conf.ok) {
      const tentativas = user ? await dados.somarTentativa(user.id, slug) : e.tentativas + 1;
      return { ok: true, acertou: false, dica: conf.dica, tentativas };
    }
    const novaPagina = user ? await dados.marcarResolvido(user.id, slug, conf.criatura, e.tentativas + 1) : false;
    return { ok: true, acertou: true, novaPagina, resultado: desfechoDe(c, conf.criatura, conf.resumoBestiario, conf.desfecho, conf.origem) };
  } catch (err) {
    console.error("Assombrações: não deu pra conferir:", err);
    return falha(TEXTOS.erros.generico);
  }
}

/** Reabre o desfecho de um caso já resolvido: com conta, vale o banco; sem conta, a resposta guardada é conferida de novo. */
export async function reabrirResolvido(slug: string, resposta?: unknown): Promise<{ ok: true; resultado: Desfecho } | Falha> {
  if (!(await limite("vila-resposta", VILA.limiteResposta))) return falha(TEXTOS.erros.muitos);
  const c = acharCaso(slug);
  if (!c) return falha(TEXTOS.erros.naoEncontrado);
  try {
    const user = await getUser();
    let r: Resposta | null = null;
    if (user && (await dados.lerCaso(user.id, slug))?.resolvido) {
      r = { criatura: c.gabarito.criatura, motivo: c.gabarito.motivo, escolha: c.gabarito.escolha };
    } else if (respostaValida(c.publico, resposta)) r = resposta;
    const conf = r ? conferir(c, r, 0) : null;
    if (!conf?.ok) return falha(TEXTOS.erros.invalido);
    return { ok: true, resultado: desfechoDe(c, conf.criatura, conf.resumoBestiario, conf.desfecho, conf.origem) };
  } catch (err) {
    console.error("Assombrações: não deu pra reabrir o caso:", err);
    return falha(TEXTOS.erros.generico);
  }
}

export type Carregado = {
  logado: boolean;
  casos: Record<string, { estado: EstadoCaso; resolvido: boolean }>;
};

export async function carregarProgresso(): Promise<Carregado> {
  const user = await getUser();
  if (!user) return { logado: false, casos: {} };
  try {
    const linhas = await dados.lerProgresso(user.id);
    return { logado: true, casos: Object.fromEntries(linhas.map((l) => [l.caso, { estado: l.estado, resolvido: l.resolvido }])) };
  } catch {
    return { logado: true, casos: {} };
  }
}

// Logo depois de criar a conta: leva o progresso do navegador pra conta. Sinais e falas se somam;
// "resolvido" só vale se o servidor aceitar de novo a resposta guardada.
export async function migrarProgressoLocal(bruto: unknown): Promise<{ ok: boolean; resolvidos: string[] }> {
  const user = await getUser();
  if (!user) return { ok: false, resolvidos: [] };
  if (!(await limite("vila-resposta", VILA.limiteResposta))) return { ok: false, resolvidos: [] };
  const local = bruto ? migrar(bruto) : null;
  if (!local) return { ok: true, resolvidos: [] };
  try {
    const noBanco = new Map((await dados.lerProgresso(user.id)).map((l) => [l.caso, l.estado]));
    const resolvidos: string[] = [];
    for (const [slug, cl] of Object.entries(local.casos)) {
      const c = acharCaso(slug);
      if (!c) continue;
      const mix = sanear(c.publico, juntarEstados(sanear(c.publico, cl), noBanco.get(slug) ?? estadoVazio()));
      await dados.gravarEstado(user.id, slug, mix);
      if (cl.resolvida && respostaValida(c.publico, cl.resolvida)) {
        const conf = conferir(c, cl.resolvida, 0);
        if (conf.ok) {
          await dados.marcarResolvido(user.id, slug, conf.criatura, mix.tentativas + 1);
          resolvidos.push(slug);
        }
      }
    }
    return { ok: true, resolvidos };
  } catch (err) {
    console.error("Assombrações: não deu pra migrar o progresso:", err);
    return { ok: false, resolvidos: [] };
  }
}

export type EntradaBestiario = { criatura: string; nome: string; resumo: string; caso: string };

/** Bestiário: com conta, vem do banco; sem conta, vem das respostas guardadas no navegador, conferidas de novo aqui. */
export async function lerBestiario(locais?: Resolucao[]): Promise<{ logado: boolean; entradas: EntradaBestiario[]; total: number }> {
  const user = await getUser();
  const conhecidas = new Set<string>();
  try {
    if (user) for (const s of await dados.criaturasConhecidas(user.id)) conhecidas.add(s);
    else
      for (const rl of (Array.isArray(locais) ? locais : []).slice(0, 20)) {
        const c = acharCaso(String(rl?.caso));
        if (c && respostaValida(c.publico, rl.resposta) && conferir(c, rl.resposta, 0).ok) conhecidas.add(c.gabarito.criatura);
      }
  } catch (err) {
    console.error("Assombrações: bestiário indisponível:", err);
  }
  const entradas = [...conhecidas].flatMap((s): EntradaBestiario[] => {
    const c = casoDaCriatura(s);
    return c ? [{ criatura: s, nome: c.publico.criaturas.find((x) => x.slug === s)?.nome ?? s, resumo: c.gabarito.bestiario.resumo, caso: c.publico.slug }] : [];
  });
  return { logado: Boolean(user), entradas, total: totalCriaturas() };
}
