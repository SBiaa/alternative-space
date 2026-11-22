// Motor de cenas: dado uma aventura e um estado, aplica uma escolha. Puro, sem banco, sem tela, sem Math.random.
import { FAIXAS, REGRAS, TALENTOS } from "./config";
import type { Aventura, Cena, Efeito, Opcao } from "./conteudo";
import type { Personagem } from "./personagem";
import { resolverTeste } from "./regras";
import type { Estado, RolagemEstado } from "./save";
import { VERSAO_ESTADO } from "./save";

export function iniciar(a: Aventura, personagem: Personagem, seed: string): Estado {
  const folegoMax = a.folegoInicial ?? REGRAS.folegoInicial;
  return {
    versao: VERSAO_ESTADO,
    aventura: a.slug,
    seed,
    cena: a.inicio,
    folego: folegoMax,
    folegoMax,
    itens: [],
    marcas: [],
    flags: [],
    rolagens: 0,
    porFaixa: { sucesso: 0, custo: 0, falha: 0 },
    passos: 0,
    trilha: [a.inicio],
    personagem,
  };
}

export function cenaDe(a: Aventura, id: string): Cena {
  const c = a.cenas.find((x) => x.id === id);
  if (!c) throw new Error(`Cena não existe: ${id}`);
  return c;
}

export const cenaAtual = (a: Aventura, e: Estado): Cena => cenaDe(a, e.cena);

export type OpcaoView = { opcao: Opcao; bloqueada: boolean; motivo?: string };

function faltaRequisito(a: Aventura, e: Estado, o: Opcao): string | null {
  const r = o.requisito;
  if (!r) return null;
  if (r.item && !e.itens.includes(r.item)) return `Precisa do item: ${a.itens.find((i) => i.id === r.item)?.nome ?? r.item}`;
  if (r.marca && !e.marcas.includes(r.marca)) return `Precisa da marca: ${a.marcas.find((m) => m.id === r.marca)?.nome ?? r.marca}`;
  if (r.flag && !e.flags.includes(r.flag)) return "Ainda não dá pra fazer isso";
  return null;
}

export function opcoesDaCena(a: Aventura, e: Estado): OpcaoView[] {
  if (e.final) return [];
  return cenaAtual(a, e).opcoes.map((opcao) => {
    const motivo = faltaRequisito(a, e, opcao);
    return { opcao, bloqueada: motivo !== null, motivo: motivo ?? undefined };
  });
}

const somar = (lista: string[], novos?: string[]) => [...lista, ...(novos ?? []).filter((x) => !lista.includes(x))];

function aplicar(e: Estado, f?: Efeito): Estado {
  if (!f) return e;
  return {
    ...e,
    folego: Math.min(e.folegoMax, Math.max(0, e.folego + (f.folego ?? 0))),
    itens: somar(e.itens, f.itens),
    marcas: somar(e.marcas, f.marcas),
    flags: somar(e.flags, f.flags),
  };
}

export type ResultadoEscolha = { ok: true; estado: Estado; rolagem?: RolagemEstado; terminou: boolean } | { ok: false; erro: string };

/** Aplica a opção `opcaoId` da cena atual. O teste, se houver, é rolado aqui com a seed e o contador da partida. */
export function escolher(a: Aventura, e: Estado, opcaoId: string): ResultadoEscolha {
  if (e.final) return { ok: false, erro: "Essa aventura já terminou." };
  const cena = cenaAtual(a, e);
  const opcao = cena.opcoes.find((o) => o.id === opcaoId);
  if (!opcao) return { ok: false, erro: "Essa opção não existe nesta cena." };
  const falta = faltaRequisito(a, e, opcao);
  if (falta) return { ok: false, erro: falta };

  let prox: Estado = e;
  let rolagem: RolagemEstado | undefined;
  let destino = opcao.proxima;
  let efeito: Efeito | undefined = opcao.efeitos?.sucesso;

  if (opcao.teste) {
    const t = opcao.teste;
    const meu = t.talentos?.find((id) => e.personagem.talentos.includes(id));
    const n = e.rolagens + 1;
    rolagem = resolverTeste(e.seed, n, {
      atributo: t.atributo,
      valorAtributo: e.personagem.attrs[t.atributo],
      talento: meu !== undefined,
      talentoNome: meu ? TALENTOS.find((x) => x.id === meu)?.nome : undefined,
      dificuldade: t.dificuldade,
    });
    efeito = opcao.efeitos?.[rolagem.faixa];
    if (rolagem.faixa !== "sucesso") destino = opcao.desvios?.[rolagem.faixa] ?? opcao.proxima;
    prox = { ...prox, rolagens: n, porFaixa: { ...e.porFaixa, [rolagem.faixa]: e.porFaixa[rolagem.faixa] + 1 } };
  }

  prox = aplicar(prox, efeito);

  // Fôlego zerado leva ao final alternativo, a menos que a cena seguinte já seja um final.
  if (prox.folego <= 0 && !cenaDe(a, destino).final) destino = a.finalFolego;

  const nova = cenaDe(a, destino);
  prox = {
    ...prox,
    cena: destino,
    passos: e.passos + 1,
    trilha: [...e.trilha, destino].slice(-REGRAS.trilhaMax),
    ultima: { opcao: opcao.texto.slice(0, 200), rolagem },
    final: nova.final ? { id: nova.final.id, tipo: nova.final.tipo } : undefined,
  };
  return { ok: true, estado: prox, rolagem, terminou: !!nova.final };
}

export type Recompensas = { itens: { id: string; nome: string; descricao: string }[]; marcas: { id: string; nome: string; descricao: string }[] };

export function recompensasDe(a: Aventura, e: Estado): Recompensas {
  const pega = (lista: Aventura["itens"], ids: string[]) => ids.flatMap((id) => lista.find((x) => x.id === id) ?? []);
  return { itens: pega(a.itens, e.itens), marcas: pega(a.marcas, e.marcas) };
}

/** Texto do fim da aventura e do diário. Montado no servidor a partir do estado e do conteúdo. */
export function resumoDaPartida(a: Aventura, e: Estado): { titulo: string; tipo: string; texto: string } | null {
  if (!e.final) return null;
  const f = cenaDe(a, e.cena).final!;
  const f2 = e.porFaixa;
  const rol = e.rolagens
    ? ` ${e.rolagens} ${e.rolagens === 1 ? "teste" : "testes"}: ${f2.sucesso} ${FAIXAS.sucesso.curto}, ${f2.custo} ${FAIXAS.custo.curto}, ${f2.falha} ${f2.falha === 1 ? "falha" : "falhas"} que avançaram a história.`
    : "";
  return {
    titulo: f.titulo,
    tipo: f.tipo,
    texto: `${f.resumo}${rol} Terminou com ${e.folego} de ${e.folegoMax} de Fôlego.`,
  };
}
