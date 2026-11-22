// Jogador automático simples. Serve pros testes (gera partidas válidas inteiras) e pra conferir o equilíbrio. Não vai pro jogo.

import { CONTEUDO } from "./conteudo";
import { aplicar, intencaoDe, novaPartida, precisaAlvo, vivo } from "./motor";
import { proximosNos } from "./mapa";
import type { Acao, Conteudo, Estado } from "./tipos";

const PREFERENCIA = ["porto", "tesouro", "evento", "encontro", "chefe"];

/** Decide a próxima ação olhando só o estado. */
export function proximaAcao(e: Estado, C: Conteudo): Acao {
  switch (e.fase) {
    case "mapa": {
      const opc = proximosNos(e.mapa, e.trecho, e.pos).sort((a, b) => PREFERENCIA.indexOf(a.tipo) - PREFERENCIA.indexOf(b.tipo));
      return { t: "no", id: opc[0].id };
    }
    case "combate": {
      const c = e.combate!;
      const ataque = c.inimigos.filter(vivo).reduce((s, i) => {
        const it = intencaoDe(i, C);
        return s + (it.tipo === "atacar" ? it.valor * (it.vezes ?? 1) : 0);
      }, 0);
      const alvo = c.inimigos.findIndex(vivo);
      const jogaveis = c.mao.map((slug, idx) => ({ carta: C.cartas[slug], idx })).filter((x) => x.carta.custo <= c.energia);
      const precisaDefender = c.bloqueio < ataque * 0.6;
      const pontua = (x: { carta: (typeof C.cartas)[string] }) => {
        const t = x.carta.tipo;
        const base = t === "defesa" ? (precisaDefender ? 3 : 0) : t === "ataque" ? 2 : 1;
        return base * 10 + x.carta.custo;
      };
      const lista = jogaveis.filter((x) => x.carta.tipo !== "defesa" || precisaDefender).sort((a, b) => pontua(b) - pontua(a));
      const pick = lista[0];
      if (!pick) return { t: "fim" };
      return precisaAlvo(pick.carta) ? { t: "jogar", c: pick.idx, a: alvo } : { t: "jogar", c: pick.idx };
    }
    case "recompensa": {
      const opc = e.recompensa!.opcoes;
      const i = opc.findIndex((s) => C.cartas[s].tipo !== "manobra");
      return { t: "escolher", i: i >= 0 ? i : 0 };
    }
    case "evento": {
      const ev = C.eventos.find((x) => x.slug === e.evento)!;
      const i = ev.escolhas.findIndex((x) => !x.exige || e.ouro >= x.exige.ouro);
      return { t: "evento", i: Math.max(0, i) };
    }
    case "porto": {
      if (!e.porto!.curou && e.folego < e.folegoMax) return { t: "curar" };
      const i = e.porto!.loja.findIndex((x) => !x.vendido && x.preco <= e.ouro);
      return i >= 0 ? { t: "comprar", i } : { t: "sair" };
    }
    case "tesouro":
      return { t: "abrir" };
    default:
      return { t: "sair" };
  }
}

/** Joga uma travessia inteira sozinho. Devolve a lista de ações e o estado final. */
export function jogarSozinho(seed: string, oficio: string, colecao: string[] = [], C: Conteudo = CONTEUDO, limite = 2000): { acoes: Acao[]; estado: Estado } {
  let estado = novaPartida(seed, oficio, colecao, C)!;
  const acoes: Acao[] = [];
  for (let i = 0; i < limite && estado.resultado === "andamento"; i++) {
    const a = proximaAcao(estado, C);
    const r = aplicar(estado, a, C);
    if (!r.ok) throw new Error(`bot: ação ${JSON.stringify(a)} recusada (${r.erro}) na fase ${estado.fase}`);
    estado = r.estado;
    acoes.push(a);
  }
  return { acoes, estado };
}
