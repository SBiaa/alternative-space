import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "@/lib/db";
import { dentroDoLimite, ipDe } from "./limite";

vi.mock("@/lib/db", () => ({ sql: vi.fn() }));
const mockSql = vi.mocked(sql);

const req = (headers: Record<string, string> = {}) => new Request("http://localhost/api/x", { method: "POST", headers });

describe("ipDe", () => {
  it("prefere x-real-ip", () => {
    expect(ipDe(req({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
  });
  it("usa o primeiro do x-forwarded-for", () => {
    expect(ipDe(req({ "x-forwarded-for": "3.3.3.3, 10.0.0.1" }))).toBe("3.3.3.3");
  });
  it("sem cabeçalho cai num valor fixo", () => {
    expect(ipDe(req())).toBe("sem-ip");
  });
});

describe("dentroDoLimite", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // sem faxina
  });

  it("deixa passar até o máximo", async () => {
    mockSql.mockResolvedValueOnce([{ total: 3 }] as never);
    expect(await dentroDoLimite("newsletter", req({ "x-real-ip": "1.1.1.1" }), 3, 600)).toBe(true);
  });

  it("barra depois do máximo", async () => {
    mockSql.mockResolvedValueOnce([{ total: 4 }] as never);
    expect(await dentroDoLimite("newsletter", req({ "x-real-ip": "1.1.1.1" }), 3, 600)).toBe(false);
  });

  it("não grava o IP em texto", async () => {
    mockSql.mockResolvedValueOnce([{ total: 1 }] as never);
    await dentroDoLimite("newsletter", req({ "x-real-ip": "9.8.7.6" }), 3, 600);
    expect(JSON.stringify(mockSql.mock.calls[0])).not.toContain("9.8.7.6");
  });

  it("deixa passar se o banco falhar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSql.mockRejectedValueOnce(new Error("relation limites does not exist"));
    expect(await dentroDoLimite("newsletter", req(), 3, 600)).toBe(true);
  });
});
