import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lerCapitulo } from "@/lib/fanzine/conteudo";
import { progressoVazio } from "@/lib/fanzine/save";
import type { Capitulo, Progresso } from "@/lib/fanzine/tipos";

const cap: Capitulo = lerCapitulo(JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "fanzine", "cruz-mansa", "capitulo.json"), "utf8")));
const TODAS = cap.pistas.map((p) => p.id);
const DEDUCOES = cap.ligacoes.map((l) => l.id);
const certas = { quem: "lia", onde: "garagem", porque: "papelaria-fechou" };

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/server", () => ({ getUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("@/lib/limite", () => ({ dentroDoLimite: vi.fn(async () => true) }));
vi.mock("@/lib/fanzine/carregar", () => ({ capituloPublicado: vi.fn((s: string) => (s === "cruz-mansa" ? cap : null)) }));
vi.mock("@/lib/fanzine/dados", () => ({ lerProgresso: vi.fn(), gravarProgresso: vi.fn(async () => undefined), registrarEvento: vi.fn(async () => undefined) }));

const dados = await import("@/lib/fanzine/dados");
const { getUser } = await import("@/lib/auth/server");
const { dentroDoLimite } = await import("@/lib/limite");
const a = await import("./fanzine");

const prog = (extra: Partial<Progresso> = {}): Progresso => ({ ...progressoVazio(), ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUser).mockResolvedValue({ id: "u1" } as never);
  vi.mocked(dados.lerProgresso).mockResolvedValue(null);
});

describe("conferência da resposta no servidor", () => {
  it("resolve, grava e registra game_played uma única vez", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: TODAS, deductions: DEDUCOES }));
    const r = await a.responderAcao("cruz-mansa", certas);
    expect(r).toMatchObject({ ok: true, resolvida: true });
    expect(dados.gravarProgresso).toHaveBeenCalledWith("u1", "cruz-mansa", expect.objectContaining({ solved: true }));
    expect(dados.registrarEvento).toHaveBeenCalledWith("u1", "game_played", expect.objectContaining({ capitulo: "cruz-mansa" }));

    vi.mocked(dados.registrarEvento).mockClear();
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: TODAS, deductions: DEDUCOES, solved: true }));
    await a.responderAcao("cruz-mansa", certas);
    expect(dados.registrarEvento).not.toHaveBeenCalled();
  });

  it("resposta errada não grava e a resposta devolvida não contém a resposta certa", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: TODAS, deductions: DEDUCOES }));
    const r = await a.responderAcao("cruz-mansa", { ...certas, quem: "tuca" });
    expect(r).toMatchObject({ ok: true, resolvida: false });
    expect(dados.gravarProgresso).not.toHaveBeenCalled();
    const texto = JSON.stringify(r);
    for (const parte of cap.pergunta.partes) expect(texto).not.toContain(`"${parte.certa}"`);
    expect(texto).not.toContain('"certa"');
    expect(texto).not.toContain('"exige"');
  });

  it("chute certo sem as deduções não resolve e diz o que faltou", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: TODAS }));
    const r = await a.responderAcao("cruz-mansa", certas);
    expect(r).toMatchObject({ ok: true, resolvida: false });
    if (r.ok && !r.resolvida) expect(r.faltou.length).toBeGreaterThan(0);
    expect(dados.gravarProgresso).not.toHaveBeenCalled();
  });

  it("sem conta, confere com o progresso do aparelho e não grava nada", async () => {
    vi.mocked(getUser).mockResolvedValue(null as never);
    const r = await a.responderAcao("cruz-mansa", certas, prog({ clues: TODAS, deductions: DEDUCOES }));
    expect(r).toMatchObject({ ok: true, resolvida: true });
    expect(dados.gravarProgresso).not.toHaveBeenCalled();
    expect(dados.lerProgresso).not.toHaveBeenCalled();
  });

  it("lixo no lugar das respostas não quebra", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: TODAS, deductions: DEDUCOES }));
    expect(await a.responderAcao("cruz-mansa", null as never)).toMatchObject({ ok: true, resolvida: false });
    expect(await a.responderAcao("cruz-mansa", { quem: { x: 1 } } as never)).toMatchObject({ ok: true, resolvida: false });
  });
});

describe("ligações no servidor", () => {
  it("liga e grava a dedução; ligação inexistente só responde que não fecha", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: ["carimbo", "caixa-postal", "assinatura-bf"] }));
    const ok = await a.ligarAcao("cruz-mansa", "carimbo", "caixa-postal");
    expect(ok).toMatchObject({ ok: true, resultado: "certa" });
    expect(dados.gravarProgresso).toHaveBeenCalledWith("u1", "cruz-mansa", expect.objectContaining({ deductions: ["cruz-mansa"] }));

    vi.mocked(dados.gravarProgresso).mockClear();
    const nao = await a.ligarAcao("cruz-mansa", "carimbo", "assinatura-bf");
    expect(nao).toMatchObject({ ok: true, resultado: "nao_fecha" });
    expect(JSON.stringify(nao)).not.toContain("faltou");
    expect(dados.gravarProgresso).not.toHaveBeenCalled();
  });

  it("não deixa ligar pista que o jogador ainda não marcou", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: ["carimbo"] }));
    expect(await a.ligarAcao("cruz-mansa", "carimbo", "caixa-postal")).toMatchObject({ ok: false });
  });

  it("sem conta, dedução inventada no save do aparelho é descartada", async () => {
    vi.mocked(getUser).mockResolvedValue(null as never);
    const r = await a.carregarFanzine("cruz-mansa", prog({ clues: ["carimbo"], deductions: DEDUCOES }));
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.estado.deducoes).toEqual([]);
  });
});

describe("pistas e eventos", () => {
  it("marca a pista nova, grava e registra fanzine_clue_found só na primeira vez", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog());
    expect(await a.acharPistaAcao("cruz-mansa", "carimbo")).toMatchObject({ ok: true, nova: true });
    expect(dados.registrarEvento).toHaveBeenCalledWith("u1", "fanzine_clue_found", { capitulo: "cruz-mansa", pista: "carimbo" });

    vi.mocked(dados.registrarEvento).mockClear();
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: ["carimbo"] }));
    expect(await a.acharPistaAcao("cruz-mansa", "carimbo")).toMatchObject({ ok: true, nova: false });
    expect(dados.registrarEvento).not.toHaveBeenCalled();
  });
  it("recusa pista e capítulo que não existem", async () => {
    expect(await a.acharPistaAcao("cruz-mansa", "fantasma")).toMatchObject({ ok: false });
    expect(await a.acharPistaAcao("capitulo-9", "carimbo")).toMatchObject({ ok: false });
    expect(await a.acharPistaAcao("../../etc", "carimbo")).toMatchObject({ ok: false });
  });
});

describe("dicas no servidor", () => {
  it("entrega as dicas em ordem e as três só aparecem pra quem pediu", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog());
    const carregado = await a.carregarFanzine("cruz-mansa");
    expect(JSON.stringify(carregado)).not.toContain(cap.dicas[0]);

    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ hints: 1 }));
    const r = await a.pedirDicaAcao("cruz-mansa");
    expect(r).toMatchObject({ ok: true, nivel: 2 });
    if (r.ok) expect(r.estado.dicas).toEqual(cap.dicas.slice(0, 2));

    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ hints: 3 }));
    expect(await a.pedirDicaAcao("cruz-mansa")).toMatchObject({ ok: false });
  });
});

describe("rate limit", () => {
  it("recusa quando passa do limite e não mexe no banco", async () => {
    vi.mocked(dentroDoLimite).mockResolvedValueOnce(false);
    expect(await a.acharPistaAcao("cruz-mansa", "carimbo")).toMatchObject({ ok: false });
    expect(dados.lerProgresso).not.toHaveBeenCalled();
    expect(dados.gravarProgresso).not.toHaveBeenCalled();
  });
});

describe("migrarProgressoLocal", () => {
  it("leva as pistas do aparelho pra conta, sem o 'resolvido' e sem pista inventada", async () => {
    vi.mocked(dados.lerProgresso).mockResolvedValue(prog({ clues: ["data"] }));
    const local = prog({ clues: ["carimbo", "caixa-postal", "fantasma"], deductions: ["cruz-mansa", "falsa"], solved: true, hints: 1 });
    const r = await a.migrarProgressoLocal("cruz-mansa", local);
    expect(r).toMatchObject({ ok: true });
    const gravado = vi.mocked(dados.gravarProgresso).mock.calls[0][2];
    expect(new Set(gravado.clues)).toEqual(new Set(["data", "carimbo", "caixa-postal"]));
    expect(gravado.deductions).toEqual(["cruz-mansa"]);
    expect(gravado.solved).toBe(false);
    expect(dados.registrarEvento).toHaveBeenCalledTimes(2);
  });
  it("exige conta", async () => {
    vi.mocked(getUser).mockResolvedValue(null as never);
    expect(await a.migrarProgressoLocal("cruz-mansa", prog())).toMatchObject({ ok: false });
    expect(dados.gravarProgresso).not.toHaveBeenCalled();
  });
});
