// Narração do que mudou entre dois estados, em texto. Alimenta a região "aria-live" (leitor de tela) e o registro da tela:
// o resultado de uma carta nunca fica só no desenho.

import { STATUS } from "./config";
import { CONTEUDO, inimigoDe } from "./conteudo";
import type { Conteudo, Estado, Status } from "./tipos";

const nomeStatus = (k: string) => STATUS[k as keyof typeof STATUS]?.nome ?? k;

function statusNovos(antes: Status, depois: Status): string[] {
  return (Object.keys(depois) as (keyof Status)[]).filter((k) => (depois[k] ?? 0) > (antes[k] ?? 0)).map((k) => `${nomeStatus(k)} ${depois[k]}`);
}

export function narrar(antes: Estado, depois: Estado, C: Conteudo = CONTEUDO): string[] {
  const out: string[] = [];
  const a = antes.combate;
  if (a && depois.combate) {
    const c = depois.combate;
    c.inimigos.forEach((i, k) => {
      const ant = a.inimigos[k];
      if (!ant) return;
      const nome = inimigoDe(C, i.slug).nome;
      if (ant.folego > 0 && i.folego === 0) out.push(`${nome} foi derrotado.`);
      else if (i.folego < ant.folego) out.push(`${nome} perdeu ${ant.folego - i.folego} de Fôlego.`);
      if (i.bloqueio > ant.bloqueio) out.push(`${nome} ganhou ${i.bloqueio - ant.bloqueio} de bloqueio.`);
      const novos = statusNovos(ant.status, i.status);
      if (novos.length) out.push(`${nome} ficou ${novos.join(", ")}.`);
    });
    if (c.bloqueio > a.bloqueio) out.push(`Você ganhou ${c.bloqueio - a.bloqueio} de bloqueio.`);
    const novos = statusNovos(a.status, c.status);
    if (novos.length) out.push(`Você ganhou ${novos.join(", ")}.`);
    if (c.turno > a.turno) out.push(`Começou o turno ${c.turno}. Você tem ${c.energia} de energia e ${c.mao.length} cartas na mão.`);
  } else if (a && !depois.combate) {
    // Combate acabou: os inimigos que caíram na última carta.
    a.inimigos.forEach((i) => i.folego > 0 && out.push(`${inimigoDe(C, i.slug).nome} foi derrotado.`));
  }
  if (depois.folego < antes.folego) out.push(`Você perdeu ${antes.folego - depois.folego} de Fôlego. Restam ${depois.folego}.`);
  else if (depois.folego > antes.folego) out.push(`Você recuperou ${depois.folego - antes.folego} de Fôlego.`);
  if (depois.resultado === "vitoria" && antes.resultado !== "vitoria") out.push("Travessia vencida.");
  if (depois.resultado === "derrota" && antes.resultado !== "derrota") out.push("Seu Fôlego acabou. Travessia encerrada.");
  return out;
}
