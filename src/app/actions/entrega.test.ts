import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENTREGA, TEXTOS } from "@/lib/entrega/config";

const user = { id: "u1" };
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getUser: vi.fn(async () => user) }));
vi.mock("@/lib/limite", () => ({ dentroDoLimite: vi.fn(async () => true) }));
vi.mock("@/lib/entrega/dados", () => ({
  implantesDe: vi.fn(),
  saldoDe: vi.fn(),
  comprar: vi.fn(),
  definirEquipado: vi.fn(async () => true),
  equipadosDe: vi.fn(async () => []),
  gravarTurno: vi.fn(async () => true),
}));

const dados = await import("@/lib/entrega/dados");
const { getUser } = await import("@/lib/auth/server");
const { dentroDoLimite } = await import("@/lib/limite");
const { comprarImplante, equiparImplante, salvarTurno } = await import("./entrega");

const im = (slug: string, level: number, equipped = false) => ({ id: `id-${slug}`, slug, name: slug, description: "", maxLevel: 3, prices: [100, 250, 500], effects: [{}, {}, {}], level, equipped });

beforeEach(() => vi.clearAllMocks());

describe("comprarImplante", () => {
  it("recusa saldo insuficiente sem tocar no banco", async () => {
    vi.mocked(dados.implantesDe).mockResolvedValue([im("motor", 0)]);
    vi.mocked(dados.saldoDe).mockResolvedValue(50);
    expect(await comprarImplante("motor")).toEqual({ ok: false, erro: TEXTOS.erros.saldo });
    expect(dados.comprar).not.toHaveBeenCalled();
  });
  it("recusa nível máximo", async () => {
    vi.mocked(dados.implantesDe).mockResolvedValue([im("motor", 3)]);
    vi.mocked(dados.saldoDe).mockResolvedValue(9999);
    expect(await comprarImplante("motor")).toEqual({ ok: false, erro: TEXTOS.erros.nivelMax });
  });
  it("usa o preço do banco, não do cliente", async () => {
    vi.mocked(dados.implantesDe).mockResolvedValue([im("motor", 1)]);
    vi.mocked(dados.saldoDe).mockResolvedValue(300);
    vi.mocked(dados.comprar).mockResolvedValue(50);
    expect(await comprarImplante("motor")).toEqual({ ok: true, saldo: 50 });
    expect(dados.comprar).toHaveBeenCalledWith("u1", "id-motor", "motor", 1, 250);
  });
  it("corrida perdida no banco vira saldo insuficiente", async () => {
    vi.mocked(dados.implantesDe).mockResolvedValue([im("motor", 0)]);
    vi.mocked(dados.saldoDe).mockResolvedValue(100);
    vi.mocked(dados.comprar).mockResolvedValue(null);
    expect(await comprarImplante("motor")).toEqual({ ok: false, erro: TEXTOS.erros.saldo });
  });
});

describe("equiparImplante", () => {
  it("recusa acima do limite de equipados", async () => {
    const cheios = Array.from({ length: ENTREGA.equipadosMax }, (_, i) => im(`e${i}`, 1, true));
    vi.mocked(dados.implantesDe).mockResolvedValue([...cheios, im("novo", 1)]);
    expect(await equiparImplante("novo", true)).toEqual({ ok: false, erro: TEXTOS.erros.equipados });
  });
  it("não equipa o que não comprou", async () => {
    vi.mocked(dados.implantesDe).mockResolvedValue([im("novo", 0)]);
    expect(await equiparImplante("novo", true)).toEqual({ ok: false, erro: TEXTOS.erros.naoTem });
  });
});

describe("salvarTurno", () => {
  const turno = { duracaoMs: ENTREGA.turnoMs, relaxado: false, pedidos: [{ base: 20, fragil: false, status: "no_prazo" as const, estado: 100 }] };
  it("sem conta pede cadastro", async () => {
    vi.mocked(getUser).mockResolvedValueOnce(null);
    expect(await salvarTurno(turno)).toMatchObject({ ok: false, semConta: true });
  });
  it("respeita o limite de gravações", async () => {
    vi.mocked(dentroDoLimite).mockResolvedValueOnce(false);
    expect(await salvarTurno(turno)).toEqual({ ok: false, erro: TEXTOS.erros.limite });
  });
  it("grava o resumo refeito no servidor", async () => {
    vi.mocked(dados.saldoDe).mockResolvedValue(20);
    const r = await salvarTurno(turno);
    expect(r).toMatchObject({ ok: true, recorde: true, saldo: 20, resumo: { deliveries: 1, creditsEarned: 20 } });
  });
  it("recusa duração diferente da config", async () => {
    expect(await salvarTurno({ ...turno, duracaoMs: 1000 })).toEqual({ ok: false, erro: TEXTOS.erros.invalido });
    expect(dados.gravarTurno).not.toHaveBeenCalled();
  });
});
