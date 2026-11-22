import { beforeEach, describe, expect, it, vi } from "vitest";
import { aventuraPorSlug } from "@/lib/bolso/aventuras";
import { opcoesDaCena } from "@/lib/bolso/motor";
import { personagemTeste } from "@/lib/bolso/fixtures";
import { resolverTeste, rolarDados } from "@/lib/bolso/regras";
import type { Estado } from "@/lib/bolso/save";

// Banco e cookie de mentira, em memória: o que importa aqui é o que a action decide e o que ela manda gravar.
const mem = vi.hoisted(() => ({
  runs: [] as { id: string; userId: string; characterId: string; estado: unknown; finished: boolean }[],
  journal: [] as { userId: string; characterId: string; resumo: string; final: string; recompensas: unknown }[],
  pjs: [] as { id: string; userId: string; p: unknown }[],
  cookieRuns: new Map<string, unknown>(),
  cookiePj: null as unknown,
  perdeCorrida: false,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/server", () => ({ getUser: vi.fn(async () => ({ id: "dono" })) }));
vi.mock("@/lib/limite", () => ({ dentroDoLimite: vi.fn(async () => true) }));
vi.mock("@/lib/bolso/dados", () => ({
  criarPersonagem: vi.fn(async (userId: string, p: unknown) => {
    const id = `pj-${mem.pjs.length + 1}`;
    mem.pjs.push({ id, userId, p });
    return id;
  }),
  listarPersonagens: vi.fn(async () => []),
  personagemDoDono: vi.fn(async (userId: string, id: string) => {
    const x = mem.pjs.find((p) => p.id === id && p.userId === userId);
    return x ? { id, ...(x.p as object) } : null;
  }),
  runAtiva: vi.fn(async (userId: string, slug: string) => {
    const r = mem.runs.find((x) => x.userId === userId && !x.finished && (x.estado as Estado).aventura === slug);
    return r ? { id: r.id, characterId: r.characterId, estado: r.estado } : null;
  }),
  criarRun: vi.fn(async (userId: string, characterId: string, estado: unknown) => {
    if (mem.runs.some((x) => x.userId === userId && !x.finished && (x.estado as Estado).aventura === (estado as Estado).aventura)) return null;
    const id = `run-${mem.runs.length + 1}`;
    mem.runs.push({ id, userId, characterId, estado, finished: false });
    return id;
  }),
  gravarPasso: vi.fn(async (userId: string, runId: string, passosAntes: number, estado: unknown) => {
    if (mem.perdeCorrida) return false;
    const r = mem.runs.find((x) => x.id === runId && x.userId === userId && !x.finished);
    if (!r || (r.estado as Estado).passos !== passosAntes) return false;
    r.estado = estado;
    return true;
  }),
  fecharRun: vi.fn(async (userId: string, runId: string, passosAntes: number, estado: unknown, f: { finalId: string; resumo: string; recompensas: unknown }) => {
    const r = mem.runs.find((x) => x.id === runId && x.userId === userId && !x.finished);
    if (!r || (r.estado as Estado).passos !== passosAntes) return false;
    r.estado = estado;
    r.finished = true;
    mem.journal.push({ userId, characterId: r.characterId, resumo: f.resumo, final: f.finalId, recompensas: f.recompensas });
    return true;
  }),
  abandonarRun: vi.fn(async () => {}),
  importarLocal: vi.fn(async (userId: string, p: unknown, partidas: { estado: unknown; fechamento?: { finalId: string; resumo: string; recompensas: unknown } }[]) => {
    const id = `pj-${mem.pjs.length + 1}`;
    mem.pjs.push({ id, userId, p });
    for (const x of partidas) {
      const finished = !!(x.estado as Estado).final;
      mem.runs.push({ id: `run-${mem.runs.length + 1}`, userId, characterId: id, estado: x.estado, finished });
      if (finished && x.fechamento) mem.journal.push({ userId, characterId: id, resumo: x.fechamento.resumo, final: x.fechamento.finalId, recompensas: x.fechamento.recompensas });
    }
    return { personagemId: id, importadas: partidas.length };
  }),
}));
vi.mock("@/lib/bolso/local", () => ({
  lerPersonagemLocal: vi.fn(async () => mem.cookiePj),
  gravarPersonagemLocal: vi.fn(async (p: unknown) => {
    mem.cookiePj = p;
  }),
  apagarPersonagemLocal: vi.fn(async () => {
    mem.cookiePj = null;
  }),
  lerRunLocal: vi.fn(async (slug: string) => mem.cookieRuns.get(slug) ?? null),
  gravarRunLocal: vi.fn(async (e: Estado) => {
    mem.cookieRuns.set(e.aventura, e);
  }),
  apagarRunLocal: vi.fn(async (slug: string) => {
    mem.cookieRuns.delete(slug);
  }),
  lerRunsLocais: vi.fn(async () => [...mem.cookieRuns.values()]),
}));

const { getUser } = await import("@/lib/auth/server");
const { dentroDoLimite } = await import("@/lib/limite");
const dados = await import("@/lib/bolso/dados");
const acoes = await import("./bolso");

const SLUG = "ultima-linha-da-madrugada";
const a = aventuraPorSlug(SLUG)!;
const pj = personagemTeste();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUser).mockResolvedValue({ id: "dono" } as never);
  vi.mocked(dentroDoLimite).mockResolvedValue(true);
  mem.runs.length = 0;
  mem.journal.length = 0;
  mem.pjs.length = 0;
  mem.cookieRuns.clear();
  mem.cookiePj = null;
  mem.perdeCorrida = false;
});

async function comecarLogado() {
  const c = await acoes.criarPersonagemAcao(pj);
  if (!c.ok || !c.id) throw new Error("não criou");
  const r = await acoes.iniciarPartida(SLUG, c.id);
  expect(r.ok).toBe(true);
  return c.id;
}

const estadoLogado = () => mem.runs[0].estado as Estado;

/** Joga sempre a primeira opção liberada até acabar. Devolve as respostas das actions. */
async function jogarAteOFim(lerEstado: () => Estado) {
  const respostas = [];
  for (let i = 0; i < 60; i++) {
    const e = lerEstado();
    if (e.final) break;
    const livres = opcoesDaCena(a, e).filter((o) => !o.bloqueada);
    const r = await acoes.escolherOpcao(SLUG, livres[0].opcao.id);
    respostas.push(r);
    if (!r.ok || r.terminou) break;
  }
  return respostas;
}

describe("escolherOpcao (servidor rola e grava)", () => {
  it("a rolagem devolvida é a que a seed da partida produz: o cliente só mandou o id da opção", async () => {
    await comecarLogado();
    const antes = estadoLogado();
    const op = a.cenas.find((c) => c.id === antes.cena)!.opcoes.find((o) => o.teste)!;
    const r = await acoes.escolherOpcao(SLUG, op.id);
    if (!r.ok) throw new Error(r.erro);
    const esperada = resolverTeste(antes.seed, 1, {
      atributo: op.teste!.atributo,
      valorAtributo: antes.personagem.attrs[op.teste!.atributo],
      talento: !!op.teste!.talentos?.some((t) => antes.personagem.talentos.includes(t)),
      talentoNome: r.rolagem?.talentoNome,
      dificuldade: op.teste!.dificuldade,
    });
    expect(r.rolagem).toEqual(esperada);
    expect(estadoLogado().rolagens).toBe(1);
    expect(dados.gravarPasso).toHaveBeenCalledTimes(1);
  });

  it("recusa opção inexistente, opção bloqueada e pedidos sem partida", async () => {
    expect((await acoes.escolherOpcao(SLUG, "x")).ok).toBe(false);
    await comecarLogado();
    expect(await acoes.escolherOpcao(SLUG, "inventada")).toMatchObject({ ok: false });
    expect(await acoes.escolherOpcao("nao-existe", "x")).toEqual({ ok: false, erro: "Aventura não encontrada." });
    expect(estadoLogado().rolagens).toBe(0);
  });

  it("limite de pedidos: não rola nem grava nada", async () => {
    await comecarLogado();
    vi.mocked(dentroDoLimite).mockResolvedValue(false);
    const r = await acoes.escolherOpcao(SLUG, "correr-viaduto");
    expect(r.ok).toBe(false);
    expect(dados.gravarPasso).not.toHaveBeenCalled();
    expect(estadoLogado().passos).toBe(0);
  });

  it("dois pedidos com o mesmo estado não gastam a mesma rolagem duas vezes", async () => {
    await comecarLogado();
    mem.perdeCorrida = true;
    const r = await acoes.escolherOpcao(SLUG, "correr-viaduto");
    expect(r.ok).toBe(false);
    expect(estadoLogado().passos).toBe(0);
  });
});

describe("fim da aventura e diário", () => {
  it("terminar grava a partida, uma entrada no diário e as recompensas, só no servidor", async () => {
    const pjId = await comecarLogado();
    const respostas = await jogarAteOFim(estadoLogado);
    expect(respostas.at(-1)).toMatchObject({ ok: true, terminou: true });

    expect(dados.fecharRun).toHaveBeenCalledTimes(1);
    expect(mem.runs[0].finished).toBe(true);
    expect(mem.journal).toHaveLength(1);

    const fim = estadoLogado();
    const entrada = mem.journal[0];
    expect(entrada.userId).toBe("dono");
    expect(entrada.characterId).toBe(pjId);
    expect(entrada.final).toBe(fim.final!.id);
    expect(entrada.resumo).toContain(a.cenas.find((c) => c.final?.id === fim.final!.id)!.final!.titulo);
    // As recompensas são os itens e marcas do estado final, com nome e descrição vindos do conteúdo.
    const r = entrada.recompensas as { itens: { id: string }[]; marcas: { id: string }[] };
    expect(r.itens.map((i) => i.id).sort()).toEqual([...fim.itens].sort());
    expect(r.marcas.map((m) => m.id).sort()).toEqual([...fim.marcas].sort());
  });

  it("depois de terminada, a partida não aceita mais escolhas e não duplica o diário", async () => {
    await comecarLogado();
    await jogarAteOFim(estadoLogado);
    const r = await acoes.escolherOpcao(SLUG, "qualquer");
    expect(r.ok).toBe(false);
    expect(mem.journal).toHaveLength(1);
  });

  it("fôlego zerado grava o final alternativo no diário", async () => {
    await comecarLogado();
    // Seed em que o primeiro teste (Corpo 2 + talento Corredor, dificuldade 6) dá o pior resultado possível: sucesso com custo, que tira 1 de fôlego.
    let seed = "";
    for (let i = 0; i < 20000 && !seed; i++) if (rolarDados(`semente-${i}`, 1).reduce((x, y) => x + y, 0) === 2) seed = `semente-${i}`;
    mem.runs[0].estado = { ...estadoLogado(), seed, folego: 1 };

    const r = await acoes.escolherOpcao(SLUG, "correr-viaduto");
    expect(r).toMatchObject({ ok: true, terminou: true });
    if (!r.ok) return;
    expect(r.rolagem?.faixa).toBe("custo");
    const fim = estadoLogado();
    expect(fim.folego).toBe(0);
    expect(fim.final?.tipo).toBe("alternativo");
    expect(mem.journal).toHaveLength(1);
    expect(mem.journal[0].final).toBe(a.cenas.find((c) => c.id === a.finalFolego)!.final!.id);
  });
});

describe("personagem e início", () => {
  it("só inicia partida com personagem do próprio usuário", async () => {
    await acoes.criarPersonagemAcao(pj);
    vi.mocked(getUser).mockResolvedValue({ id: "outra" } as never);
    expect(await acoes.iniciarPartida(SLUG, "pj-1")).toMatchObject({ ok: false });
    expect(mem.runs).toHaveLength(0);
  });

  it("não abre duas partidas da mesma aventura", async () => {
    const id = await comecarLogado();
    expect(await acoes.iniciarPartida(SLUG, id)).toMatchObject({ ok: false });
    expect(mem.runs).toHaveLength(1);
  });

  it("recusa personagem inválida (atributos fora do orçamento, talento repetido)", async () => {
    expect(await acoes.criarPersonagemAcao({ ...pj, attrs: { corpo: 4, mente: 4, labia: 4 } })).toMatchObject({ ok: false });
    expect(await acoes.criarPersonagemAcao({ ...pj, talentos: ["blefe", "blefe"] })).toMatchObject({ ok: false });
    expect(await acoes.criarPersonagemAcao({ ...pj, nome: "   " })).toMatchObject({ ok: false });
    expect(mem.pjs).toHaveLength(0);
  });
});

describe("sem conta", () => {
  beforeEach(() => {
    vi.mocked(getUser).mockResolvedValue(null as never);
  });

  it("joga e guarda tudo no cookie, sem tocar no banco", async () => {
    expect((await acoes.criarPersonagemAcao(pj)).ok).toBe(true);
    expect((await acoes.iniciarPartida(SLUG)).ok).toBe(true);
    const respostas = await jogarAteOFim(() => mem.cookieRuns.get(SLUG) as Estado);
    expect(respostas.at(-1)).toMatchObject({ ok: true, terminou: true });
    expect((mem.cookieRuns.get(SLUG) as Estado).final).toBeDefined();
    expect(dados.criarRun).not.toHaveBeenCalled();
    expect(dados.fecharRun).not.toHaveBeenCalled();
    expect(mem.journal).toHaveLength(0);
  });

  it("ao criar a conta, migra: personagem, partida e diário nascem no servidor", async () => {
    await acoes.criarPersonagemAcao(pj);
    await acoes.iniciarPartida(SLUG);
    await jogarAteOFim(() => mem.cookieRuns.get(SLUG) as Estado);

    vi.mocked(getUser).mockResolvedValue({ id: "recem-chegada" } as never);
    const r = await acoes.migrarLocal();
    expect(r).toEqual({ ok: true, importadas: 1 });
    expect(mem.journal).toHaveLength(1);
    expect(mem.journal[0].userId).toBe("recem-chegada");
    expect(mem.cookieRuns.size).toBe(0);
    expect(mem.cookiePj).toBeNull();
  });

  it("migrar sem conta pede login", async () => {
    expect(await acoes.migrarLocal()).toMatchObject({ ok: false, semConta: true });
  });
});
