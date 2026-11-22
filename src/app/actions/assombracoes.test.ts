import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/server", () => ({ getUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("@/lib/limite", () => ({ dentroDoLimite: vi.fn(async () => true) }));
vi.mock("@/lib/assombracoes/dados", () => ({
  lerProgresso: vi.fn(async () => []),
  lerCaso: vi.fn(async () => null),
  gravarEstado: vi.fn(async () => {}),
  somarTentativa: vi.fn(async () => 1),
  marcarResolvido: vi.fn(async () => true),
  criaturasConhecidas: vi.fn(async () => []),
}));

// Os casos de verdade estão em rascunho; fora de produção (NODE_ENV=test) eles aparecem.
const dados = await import("@/lib/assombracoes/dados");
const { getUser } = await import("@/lib/auth/server");
const { dentroDoLimite } = await import("@/lib/limite");
const acoes = await import("./assombracoes");

const SLUG = "sumico-na-venda";
const certa = { criatura: "saci", motivo: "agrado", escolha: "presente" };
const suficiente = { sinais: ["peneira-sumida", "redemoinho-estrada", "assobio-bambuzal", "pegada-um-pe"], depoimentos: [], tentativas: 0 };

beforeEach(() => {
  vi.mocked(getUser).mockResolvedValue({ id: "u1" } as never);
  vi.mocked(dentroDoLimite).mockResolvedValue(true);
  vi.mocked(dados.lerCaso).mockResolvedValue(null);
});

describe("agirNoCaso (coleta de sinais com conta)", () => {
  it("olhar o lugar grava os sinais liberados", async () => {
    const r = await acoes.agirNoCaso(SLUG, { tipo: "olhar", lugar: "sitio" });
    expect(r).toMatchObject({ ok: true, novos: ["redemoinho-estrada", "assobio-bambuzal"] });
    expect(dados.gravarEstado).toHaveBeenCalledWith("u1", SLUG, expect.objectContaining({ sinais: ["redemoinho-estrada", "assobio-bambuzal"] }));
  });

  it("pergunta travada é recusada e não grava", async () => {
    const r = await acoes.agirNoCaso(SLUG, { tipo: "perguntar", morador: "seu-tonico", fala: "tonico-avo" });
    expect(r.ok).toBe(false);
    expect(dados.gravarEstado).not.toHaveBeenCalled();
  });

  it("sem conta pede cadastro; lugar inventado e caso inexistente são recusados", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect(await acoes.agirNoCaso(SLUG, { tipo: "olhar", lugar: "sitio" })).toMatchObject({ ok: false, semConta: true });
    vi.mocked(getUser).mockResolvedValue({ id: "u1" } as never);
    expect((await acoes.agirNoCaso(SLUG, { tipo: "olhar", lugar: "lua" })).ok).toBe(false);
    expect((await acoes.agirNoCaso("nao-existe", { tipo: "olhar", lugar: "sitio" })).ok).toBe(false);
  });

  it("o rate limit corta a ação", async () => {
    vi.mocked(dentroDoLimite).mockResolvedValue(false);
    expect((await acoes.agirNoCaso(SLUG, { tipo: "olhar", lugar: "sitio" })).ok).toBe(false);
    expect(dados.gravarEstado).not.toHaveBeenCalled();
  });
});

describe("verificarResposta (conferência no servidor)", () => {
  it("com sinais de menos, nem confere", async () => {
    vi.mocked(dados.lerCaso).mockResolvedValue({ caso: SLUG, estado: { sinais: ["peneira-sumida"], depoimentos: [], tentativas: 0 }, resolvido: false });
    const r = await acoes.verificarResposta(SLUG, certa);
    expect(r.ok).toBe(false);
    expect(dados.marcarResolvido).not.toHaveBeenCalled();
  });

  it("erro devolve só a dica, soma tentativa e não vaza o gabarito", async () => {
    vi.mocked(dados.lerCaso).mockResolvedValue({ caso: SLUG, estado: suficiente, resolvido: false });
    const r = await acoes.verificarResposta(SLUG, { ...certa, criatura: "curupira" });
    expect(r).toMatchObject({ ok: true, acertou: false, tentativas: 1 });
    const texto = JSON.stringify(r);
    expect(texto).not.toContain("desfecho");
    expect(texto).not.toContain("origem");
    expect(texto).not.toContain("resultado");
    expect(dados.somarTentativa).toHaveBeenCalledWith("u1", SLUG);
    expect(dados.marcarResolvido).not.toHaveBeenCalled();
  });

  it("a nova tentativa usa a dica seguinte", async () => {
    vi.mocked(dados.lerCaso).mockResolvedValue({ caso: SLUG, estado: { ...suficiente, tentativas: 1 }, resolvido: false });
    const a = await acoes.verificarResposta(SLUG, { ...certa, criatura: "curupira" });
    vi.mocked(dados.lerCaso).mockResolvedValue({ caso: SLUG, estado: { ...suficiente, tentativas: 0 }, resolvido: false });
    const b = await acoes.verificarResposta(SLUG, { ...certa, criatura: "curupira" });
    expect(a).toMatchObject({ acertou: false });
    expect(b).toMatchObject({ acertou: false });
    expect((a as { dica: string }).dica).not.toBe((b as { dica: string }).dica);
  });

  it("acerto entrega desfecho e origem, e grava a resolução (Bestiário e evento ficam no banco)", async () => {
    vi.mocked(dados.lerCaso).mockResolvedValue({ caso: SLUG, estado: suficiente, resolvido: false });
    const r = await acoes.verificarResposta(SLUG, certa);
    expect(r).toMatchObject({ ok: true, acertou: true, novaPagina: true });
    if (r.ok && r.acertou) {
      expect(r.resultado.origem.fontes.length).toBeGreaterThanOrEqual(2);
      expect(r.resultado.criatura).toEqual({ slug: "saci", nome: "Saci" });
    }
    expect(dados.marcarResolvido).toHaveBeenCalledWith("u1", SLUG, "saci", 1);
  });

  it("sem conta confere com o estado local e não grava nada", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const r = await acoes.verificarResposta(SLUG, certa, suficiente);
    expect(r).toMatchObject({ ok: true, acertou: true, novaPagina: false });
    expect(dados.marcarResolvido).not.toHaveBeenCalled();
    const e = await acoes.verificarResposta(SLUG, { ...certa, motivo: "espantar" }, suficiente);
    expect(e).toMatchObject({ acertou: false, tentativas: 1 });
  });

  it("recusa resposta fora das opções e estado local com sinais inventados", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await acoes.verificarResposta(SLUG, { ...certa, criatura: "mula" }, suficiente)).ok).toBe(false);
    expect((await acoes.verificarResposta(SLUG, certa, { sinais: ["a", "b", "c", "d", "e"], depoimentos: [], tentativas: 0 })).ok).toBe(false);
  });

  it("o rate limit corta a conferência", async () => {
    vi.mocked(dentroDoLimite).mockResolvedValue(false);
    expect((await acoes.verificarResposta(SLUG, certa, suficiente)).ok).toBe(false);
  });
});

describe("reabrirResolvido", () => {
  it("com conta, só reabre o que o banco diz que está resolvido", async () => {
    expect((await acoes.reabrirResolvido(SLUG)).ok).toBe(false);
    vi.mocked(dados.lerCaso).mockResolvedValue({ caso: SLUG, estado: suficiente, resolvido: true });
    expect((await acoes.reabrirResolvido(SLUG)).ok).toBe(true);
  });

  it("sem conta, confere de novo a resposta guardada", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await acoes.reabrirResolvido(SLUG, { ...certa, escolha: "trancar" })).ok).toBe(false);
    expect((await acoes.reabrirResolvido(SLUG, certa)).ok).toBe(true);
  });
});

describe("migrarProgressoLocal", () => {
  const local = (resolvida: unknown) => ({ versao: 1, casos: { [SLUG]: { ...suficiente, tentativas: 2, resolvida } } });

  it("soma o progresso local ao da conta e confere a resolução de novo", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue([{ caso: SLUG, estado: { sinais: ["galhos-mata"], depoimentos: [], tentativas: 0 }, resolvido: false }]);
    const r = await acoes.migrarProgressoLocal(local(certa));
    expect(r).toEqual({ ok: true, resolvidos: [SLUG] });
    expect(dados.gravarEstado).toHaveBeenCalledWith("u1", SLUG, expect.objectContaining({ sinais: expect.arrayContaining(["galhos-mata", "peneira-sumida"]), tentativas: 2 }));
    expect(dados.marcarResolvido).toHaveBeenCalledWith("u1", SLUG, "saci", 3);
  });

  it("não aceita um 'resolvido' forjado no navegador", async () => {
    const r = await acoes.migrarProgressoLocal(local({ criatura: "curupira", motivo: "agrado", escolha: "presente" }));
    expect(r.resolvidos).toEqual([]);
    expect(dados.marcarResolvido).not.toHaveBeenCalled();
    expect(dados.gravarEstado).toHaveBeenCalled();
  });

  it("ignora lixo, caso desconhecido e pedido sem conta", async () => {
    expect(await acoes.migrarProgressoLocal({ versao: 1, casos: { fantasma: { ...suficiente, resolvida: null } } })).toEqual({ ok: true, resolvidos: [] });
    expect(dados.gravarEstado).not.toHaveBeenCalled();
    expect(await acoes.migrarProgressoLocal("lixo")).toEqual({ ok: true, resolvidos: [] });
    vi.mocked(getUser).mockResolvedValue(null);
    expect(await acoes.migrarProgressoLocal(local(certa))).toEqual({ ok: false, resolvidos: [] });
  });
});

describe("lerBestiario", () => {
  it("com conta, lista as criaturas do banco com o resumo", async () => {
    vi.mocked(dados.criaturasConhecidas).mockResolvedValue(["curupira"]);
    const r = await acoes.lerBestiario();
    expect(r.logado).toBe(true);
    expect(r.entradas).toEqual([expect.objectContaining({ criatura: "curupira", nome: "Curupira", caso: "a-trilha-que-volta" })]);
    expect(r.total).toBe(3);
  });

  it("sem conta, só abre a criatura de uma resposta que o servidor confirma", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const r = await acoes.lerBestiario([
      { caso: SLUG, resposta: certa },
      { caso: "a-trilha-que-volta", resposta: { criatura: "saci", motivo: "protege-mata", escolha: "respeitar" } },
    ]);
    expect(r.entradas.map((e) => e.criatura)).toEqual(["saci"]);
  });
});
