import { beforeEach, describe, expect, it, vi } from "vitest";
import { gerarCandidatos, novaBanda } from "@/lib/banda/candidatos";
import { PAPEIS } from "@/lib/banda/config";
import { ERROS } from "@/lib/banda/conteudo";
import type { Montagem, Papel, Progresso } from "@/lib/banda/tipos";

const user = { id: "u1" };
const getUser = vi.fn(async (): Promise<{ id: string } | null> => user);
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/server", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/limite", () => ({ dentroDoLimite: vi.fn(async () => true) }));
vi.mock("@/lib/banda/dados", () => ({
  lerBanda: vi.fn(),
  gravarBandaInteira: vi.fn(async () => undefined),
  apagarBanda: vi.fn(async () => undefined),
  gravarPasso: vi.fn(async () => true),
}));

const dados = await import("@/lib/banda/dados");
const { dentroDoLimite } = await import("@/lib/limite");
const { fazerDiaConta, migrarSaveLocal, novaBandaConta, tocarShowConta } = await import("./banda");

const montagem = (seed: string): Montagem => ({
  nome: "Os Pavios",
  estilo: "punk",
  logo: { forma: "raio", corFundo: "#1f3a2e", corForma: "#dd5d05" },
  escolhidos: Object.fromEntries(PAPEIS.map((p) => [p, gerarCandidatos(seed, p)[0].id])) as Record<Papel, string>,
});
const banda = (extra: Partial<Progresso> = {}): Progresso => ({ ...novaBanda("s", montagem("s"))!, ...extra });
const salva = (prog: Progresso) => ({ id: "b1", versao: 3, prog });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue(user);
  vi.mocked(dados.gravarPasso).mockResolvedValue(true);
});

describe("migrarSaveLocal", () => {
  const maisAvancada = banda({ dia: 2, agenda: ["descansar", "descansar"] });

  it("leva o save do aparelho pra conta quando ele está mais avançado", async () => {
    vi.mocked(dados.lerBanda).mockResolvedValue(salva(banda()));
    const r = await migrarSaveLocal(JSON.parse(JSON.stringify(maisAvancada)));
    expect(r).toEqual({ ok: true, prog: maisAvancada });
    expect(dados.gravarBandaInteira).toHaveBeenCalledWith("u1", maisAvancada);
  });

  it("leva o save quando a conta ainda não tem banda", async () => {
    vi.mocked(dados.lerBanda).mockResolvedValue(null);
    const r = await migrarSaveLocal(maisAvancada);
    expect(r.ok).toBe(true);
    expect(dados.gravarBandaInteira).toHaveBeenCalledTimes(1);
  });

  it("mantém a conta quando ela está mais avançada (ou empatou)", async () => {
    const remoto = banda({ semana: 3 });
    vi.mocked(dados.lerBanda).mockResolvedValue(salva(remoto));
    expect(await migrarSaveLocal(maisAvancada)).toEqual({ ok: true, prog: remoto });
    expect(dados.gravarBandaInteira).not.toHaveBeenCalled();
    expect(await migrarSaveLocal(banda({ semana: 3 }))).toEqual({ ok: true, prog: remoto });
    expect(dados.gravarBandaInteira).not.toHaveBeenCalled();
  });

  it("recusa save local quebrado ou adulterado, sem gravar", async () => {
    vi.mocked(dados.lerBanda).mockResolvedValue(null);
    expect((await migrarSaveLocal({ lixo: true })).prog).toBeNull();
    expect((await migrarSaveLocal(banda({ dia: 2, agenda: ["ensaiar", "ensaiar"], dinheiro: 90_000_000 }))).ok).toBe(false);
    expect((await migrarSaveLocal(banda({ dia: 3, agenda: [] }))).ok).toBe(false);
    expect(dados.gravarBandaInteira).not.toHaveBeenCalled();
  });

  it("sem login não faz nada", async () => {
    getUser.mockResolvedValue(null);
    expect(await migrarSaveLocal(maisAvancada)).toEqual({ ok: false, prog: null });
    expect(dados.lerBanda).not.toHaveBeenCalled();
  });

  it("se o banco falha, avisa e não derruba a tela", async () => {
    vi.mocked(dados.lerBanda).mockRejectedValue(new Error("fora do ar"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await migrarSaveLocal(maisAvancada)).toEqual({ ok: false, prog: null });
  });
});

describe("novaBandaConta", () => {
  it("o servidor refaz os candidatos pela seed e grava a banda nova", async () => {
    const r = await novaBandaConta("sem-1", montagem("sem-1"));
    expect(r.ok).toBe(true);
    expect(dados.apagarBanda).toHaveBeenCalledWith("u1");
    expect(dados.gravarBandaInteira).toHaveBeenCalledTimes(1);
  });

  it("recusa candidato que não existe e não apaga a banda atual", async () => {
    const m = montagem("sem-1");
    const r = await novaBandaConta("sem-1", { ...m, escolhidos: { ...m.escolhidos, voz: "voz-9-9" } });
    expect(r).toEqual({ ok: false, erro: ERROS.invalido });
    expect(dados.apagarBanda).not.toHaveBeenCalled();
  });

  it("sem login pede a conta", async () => {
    getUser.mockResolvedValue(null);
    expect(await novaBandaConta("sem-1", montagem("sem-1"))).toEqual({ ok: false, erro: ERROS.semConta, semConta: true });
  });
});

describe("ações da semana na conta", () => {
  it("o servidor refaz a conta e grava o passo com a versão que leu", async () => {
    vi.mocked(dados.lerBanda).mockResolvedValue(salva(banda()));
    const r = await fazerDiaConta("ensaiar");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.prog.dia).toBe(1);
    expect(dados.gravarPasso).toHaveBeenCalledWith("u1", "b1", 3, r.prog, undefined);
  });

  it("recusa ação inventada sem gravar", async () => {
    vi.mocked(dados.lerBanda).mockResolvedValue(salva(banda()));
    expect(await fazerDiaConta("hackear")).toEqual({ ok: false, erro: ERROS.invalido });
    expect(dados.gravarPasso).not.toHaveBeenCalled();
  });

  it("se alguém gravou antes (versão mudou), não sobrescreve e pede pra recarregar", async () => {
    vi.mocked(dados.lerBanda).mockResolvedValue(salva(banda()));
    vi.mocked(dados.gravarPasso).mockResolvedValue(false);
    expect(await fazerDiaConta("descansar")).toEqual({ ok: false, erro: ERROS.invalido });
  });

  it("respeita o limite de gravações", async () => {
    vi.mocked(dados.lerBanda).mockResolvedValue(salva(banda()));
    vi.mocked(dentroDoLimite).mockResolvedValueOnce(false);
    expect(await fazerDiaConta("ensaiar")).toEqual({ ok: false, erro: ERROS.limite });
    expect(dados.gravarPasso).not.toHaveBeenCalled();
  });

  it("sem login pede a conta", async () => {
    getUser.mockResolvedValue(null);
    expect(await fazerDiaConta("ensaiar")).toEqual({ ok: false, erro: ERROS.semConta, semConta: true });
  });

  it("o show grava o registro e o evento game_played com o mesmo resultado da regra pura", async () => {
    const musicas = [{ slot: 1, titulo: "A", estrutura: { id: "direta", secoes: [{ nome: "verso", compassos: 8 }] }, clima: "energico", bpm: 140, tema: "bairro", nota: 70, semana: 1 }];
    vi.mocked(dados.lerBanda).mockResolvedValue(salva(banda({ dia: 6, agenda: Array(6).fill("descansar") as Progresso["agenda"], musicas })));
    const r = await tocarShowConta("garagem-do-tuco", [1]);
    expect(r.ok).toBe(true);
    const extras = vi.mocked(dados.gravarPasso).mock.calls[0][4];
    expect(extras?.registro).toMatchObject({ palco: "garagem-do-tuco", repertorio: [1], semana: 1 });
    expect(extras?.evento?.kind).toBe("game_played");
    // O mesmo save e a mesma seed dão o mesmo show: rodar de novo não muda o resultado.
    const de_novo = await tocarShowConta("garagem-do-tuco", [1]);
    expect(de_novo.ok && r.ok && de_novo.registro).toEqual(r.ok && r.registro);
  });
});
