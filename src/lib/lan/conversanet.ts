// O ConversaNet do dono: monta a lista de contatos e de recados do dia a partir da lan, do dia e da seed.
// Lógica pura: os textos vêm de conteudo.ts e o sorteio sai da seed (o mesmo dia mostra os mesmos recados).

import { sortear } from "../gestao/rng";
import { LAN } from "./config";
import { CONVERSANET, type Status } from "./conteudo";
import { ehSabado, type DiaEstado } from "./motor";
import type { Arquetipo, Progresso, RegistroSemana } from "./tipos";

export type Contato = { id: string; apelido: string; status: Status; icone: string; sistema: boolean };
export type Recado = { id: string; de: string; texto: string; chamarAtencao: boolean; quando: "manha" | "dia" | "fim" };

const escolher = <T,>(lista: readonly T[], r: number): T => lista[Math.min(lista.length - 1, Math.floor(r * lista.length))];

/** Contatos: os avisos da lan e os clientes frequentes (por arquétipo, sem nome próprio). */
export function contatos(p: Progresso, arqs: Arquetipo[]): Contato[] {
  const out: Contato[] = Object.entries(CONVERSANET.sistema).map(([id, c]) => ({ id, apelido: c.apelido, status: c.status, icone: "🏠", sistema: true }));
  for (const a of arqs) {
    if (!(p.frequentes[a.slug] > 0)) continue;
    const lista = CONVERSANET.contatos[a.slug] ?? [];
    const n = Math.min(lista.length, p.frequentes[a.slug]);
    for (let i = 0; i < n; i++) out.push({ id: `${a.slug}-${i}`, apelido: lista[i].apelido, status: lista[i].status, icone: a.icone, sistema: false });
  }
  return out;
}

/** Recados da manhã: campeonato no sábado, conta vencendo, luz instável, frequentes e um pedido especial. */
export function recadosDaManha(p: Progresso, arqs: Arquetipo[], energiaInstavel: boolean): Recado[] {
  const dia = p.dia + 1;
  const r = (rot: string) => sortear(p.seed, dia, `cn|${rot}`);
  const out: Recado[] = [];
  const A = CONVERSANET.avisos;
  if (ehSabado(dia)) out.push({ id: "camp", de: "campeonato", texto: escolher(A.sabado, r("camp")), chamarAtencao: true, quando: "manha" });
  if (dia % LAN.contas.dias === 0) out.push({ id: "contas", de: "contas", texto: escolher(A.contaChegando, r("conta")), chamarAtencao: true, quando: "manha" });
  if (energiaInstavel) out.push({ id: "luz", de: "energia", texto: escolher(A.energiaCaiu, r("luz")), chamarAtencao: false, quando: "manha" });

  const freqs = contatos(p, arqs).filter((c) => !c.sistema);
  freqs.forEach((c, i) => {
    if (r(`f${i}`) > 0.45) return;
    const slug = c.id.replace(/-\d+$/, "");
    const lista = CONVERSANET.recados[slug] ?? [];
    if (lista.length) out.push({ id: `f-${c.id}`, de: c.id, texto: escolher(lista, r(`ft${i}`)), chamarAtencao: r(`fa${i}`) < 0.2, quando: "manha" });
  });
  if (freqs.length && r("pedido") < 0.3) {
    const c = escolher(freqs, r("pedido-de"));
    out.push({ id: "pedido", de: c.id, texto: escolher(CONVERSANET.pedidos, r("pedido-t")), chamarAtencao: false, quando: "manha" });
  }
  return out;
}

/** Recados que aparecem durante o dia, pelos incidentes da simulação (só a primeira queda de internet manda recado). */
export function recadosDoDia(e: Pick<DiaEstado, "incidentes" | "dia">, seed: string): Recado[] {
  if (!(e.incidentes.internet ?? 0)) return [];
  return [{ id: "net", de: "provedor", texto: escolher(CONVERSANET.avisos.internetCaiu, sortear(seed, e.dia, "cn|net")), chamarAtencao: false, quando: "dia" }];
}

/** Recado do fim do dia sobre as contas da semana. */
export function recadoDasContas(semana: RegistroSemana | null, seed: string, dia: number): Recado[] {
  if (!semana) return [];
  const lista = semana.paga ? CONVERSANET.avisos.contaPaga : CONVERSANET.avisos.contaAtrasada;
  return [{ id: "contas-fim", de: "contas", texto: escolher(lista, sortear(seed, dia, "cn|contas-fim")), chamarAtencao: !semana.paga, quando: "fim" }];
}
