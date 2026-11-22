// Geração do mapa da travessia: 3 trechos, cada um com camadas de nós ramificados. Só depende da seed.

import { CONFIG } from "./config";
import { escolherPeso, inteiroEntre, sorteador } from "./rng";
import type { Mapa, No, TipoNo } from "./tipos";

const idDe = (t: number, c: number, i: number) => `${t}-${c}-${i}`;

function gerarTrecho(seed: string, t: number): No[][] {
  const r = sorteador(seed, `mapa:${t}`);
  const { camadas, nosPorCamada, pesosTipo } = CONFIG.mapa;
  const ultima = camadas - 1;
  const tipos = Object.keys(pesosTipo) as (keyof typeof pesosTipo)[];

  const trecho: No[][] = [];
  for (let c = 0; c < camadas; c++) {
    if (c === ultima) {
      trecho.push([{ id: idDe(t, c, 0), tipo: t === CONFIG.trechos ? "chefe" : "porto", trecho: t, camada: c, liga: [] }]);
      continue;
    }
    const n = inteiroEntre(r, nosPorCamada[0], nosPorCamada[1]);
    const nos: No[] = [];
    for (let i = 0; i < n; i++) {
      // A primeira camada é sempre briga ou evento: porto e tesouro ficam pro meio do caminho.
      const permitidos = c === 0 ? tipos.filter((k) => k === "encontro" || k === "evento") : tipos;
      const p = permitidos.map((k) => pesosTipo[k]);
      nos.push({ id: idDe(t, c, i), tipo: escolherPeso(permitidos, p, r()) as TipoNo, trecho: t, camada: c, liga: [] });
    }
    trecho.push(nos);
  }

  // Garante ao menos um tesouro e um porto antes do fim do trecho.
  const meio = [1, 2, 3].filter((c) => c < ultima);
  const garantir = (tipo: TipoNo, camada: number) => {
    if (meio.some((c) => trecho[c].some((n) => n.tipo === tipo))) return;
    // Troca um encontro ou evento, nunca um porto/tesouro que já estava garantido.
    const trocaveis = trecho[camada].filter((n) => n.tipo === "encontro" || n.tipo === "evento");
    const nos = trocaveis.length ? trocaveis : trecho[camada];
    nos[Math.floor(r() * nos.length)].tipo = tipo;
  };
  garantir("tesouro", 2);
  garantir("porto", 3);

  // Ligações: cada nó liga a 1 ou 2 da camada seguinte, e todo nó da seguinte é alcançável.
  for (let c = 0; c < ultima; c++) {
    const aqui = trecho[c];
    const prox = trecho[c + 1];
    const entra = new Set<number>();
    aqui.forEach((no, i) => {
      const alvos = new Set<number>();
      alvos.add(Math.min(prox.length - 1, Math.floor((i * prox.length) / aqui.length)));
      if (prox.length > 1 && r() < 0.5) alvos.add(Math.min(prox.length - 1, Math.max(0, [...alvos][0] + (r() < 0.5 ? -1 : 1))));
      for (const j of alvos) {
        no.liga.push(prox[j].id);
        entra.add(j);
      }
    });
    prox.forEach((_, j) => {
      if (!entra.has(j)) aqui[Math.floor(r() * aqui.length)].liga.push(prox[j].id);
    });
    aqui.forEach((no) => (no.liga = [...new Set(no.liga)]));
  }
  return trecho;
}

/** Mesma seed, mesmo mapa. */
export function gerarMapa(seed: string): Mapa {
  return Array.from({ length: CONFIG.trechos }, (_, k) => gerarTrecho(seed, k + 1));
}

export function acharNo(mapa: Mapa, id: string): No | null {
  const [t, c, i] = id.split("-").map(Number);
  return mapa[t - 1]?.[c]?.[i] ?? null;
}

/** Nós que o jogador pode escolher agora: a primeira camada do trecho, ou os ligados ao nó em que está. */
export function proximosNos(mapa: Mapa, trecho: number, pos: string | null): No[] {
  if (pos === null) return [...(mapa[trecho - 1]?.[0] ?? [])];
  const atual = acharNo(mapa, pos);
  return atual ? atual.liga.map((id) => acharNo(mapa, id)!).filter(Boolean) : [];
}
