// Ajudantes só dos testes: monta um pirata e leva ele por uma ilha inteira.
import { aplicarAcao } from "./acoes";
import { ILHA, eventoDe } from "./conteudo";
import { criarPirata } from "./estado";
import { cenaAtual } from "./historias";
import type { Estado } from "./tipos";

export const T0 = 1_700_000_000_000;
export const MIN = 60_000;

export function novoPirata(mar = "boreal", oficio = "navegador", seed = "abc123xyz"): Estado {
  const r = criarPirata(
    {
      nome: "Capitã Teste",
      aparencia: { silhueta: "esguio", cor: "cobre", chapeu: "tricornio", cicatriz: "nenhuma" },
      mar,
      oficio,
      barco: "Ventania",
      bandeira: { fundo: "liso", fundoCor: "azul", forma: "estrela", formaCor: "creme" },
      seed,
    },
    T0,
  );
  if (!r.ok) throw new Error(`pirata inválido: ${r.erro}`);
  return r.estado;
}

/** Viaja até o destino: zarpa, espera o tempo certo, chega e resolve os eventos escolhendo sempre a 1ª opção que dá. */
export function viajar(e: Estado, destino: string, agora: number): { estado: Estado; agora: number } {
  const z = aplicarAcao(e, { t: "zarpar", destino }, agora);
  if (!z.ok) throw new Error(`zarpar falhou: ${z.erro}`);
  let est = z.estado;
  agora = est.viagem!.chegaEm;
  const c = aplicarAcao(est, { t: "chegar" }, agora);
  if (!c.ok) throw new Error(`chegar falhou: ${c.erro}`);
  est = c.estado;
  while (est.viagem && !est.viagem.resolvida) {
    const ev = est.viagem.eventos.find((x) => x.escolha === null)!;
    const op = eventoDe(ev.id)!.opcoes.find((o) => !o.exige)!;
    const r = aplicarAcao(est, { t: "evento", id: ev.id, opcao: op.id }, agora);
    if (!r.ok) throw new Error(`evento falhou: ${r.erro}`);
    est = r.estado;
  }
  return { estado: est, agora };
}

/** Joga a história da ilha escolhendo, em cada cena, a opção na posição `pref` (ou a primeira disponível). */
export function jogarHistoria(e: Estado, slug: string, agora: number, pref: (cena: string, opcoes: string[]) => number = () => 0): Estado {
  const ilha = ILHA[slug];
  let est = e;
  for (let i = 0; i < 40; i++) {
    const pos = cenaAtual(ilha, est.ilhas[slug].caminho)!;
    if (pos.terminou) return est;
    const ids = pos.cena.opcoes.map((o) => o.id);
    const r = aplicarAcao(est, { t: "cena", ilha: slug, opcao: ids[Math.min(pref(pos.id, ids), ids.length - 1)] }, agora);
    if (!r.ok) throw new Error(`cena falhou: ${r.erro}`);
    est = r.estado;
  }
  throw new Error("história não terminou");
}
