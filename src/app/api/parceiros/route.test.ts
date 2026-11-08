import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { dentroDoLimite } from "@/lib/limite";

vi.mock("@/lib/limite", async (orig) => ({ ...(await orig<typeof import("@/lib/limite")>()), dentroDoLimite: vi.fn() }));

async function call(body: unknown) {
  const res = await POST(new Request("http://localhost/api/parceiros", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, message: ((await res.json()) as { message: string }).message };
}

const lead = { nome: "Fulana", email: "fulana@b.co", tipo: "Artista", canal: "@fulana", mensagem: "Oi!" };

describe("POST /api/parceiros", () => {
  let fetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("PARTNERS_WEBHOOK_URL", "https://hooks.example.test/parceiros");
    fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.mocked(dentroDoLimite).mockResolvedValue(true);
  });

  it("recusa bots que preenchem o honeypot", async () => {
    expect((await call({ ...lead, website: "x" })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["nome", "email", "tipo"])("exige %s", async (campo) => {
    expect(await call({ ...lead, [campo]: "" })).toEqual({ status: 400, message: "Preenche nome, e-mail e tipo de parceria." });
  });

  it("não aceita nome só com espaços", async () => {
    expect((await call({ ...lead, nome: "   " })).status).toBe(400);
  });

  it("avisa quando o webhook não está configurado", async () => {
    vi.stubEnv("PARTNERS_WEBHOOK_URL", "");
    expect((await call(lead)).status).toBe(503);
  });

  it("envia o lead limpo pro webhook", async () => {
    expect(await call({ ...lead, nome: "  Fulana  ", mensagem: "x".repeat(3000), extra: "ignorado" })).toEqual({
      status: 200,
      message: "Recebemos! A gente te responde em breve.",
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://hooks.example.test/parceiros");
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ nome: "Fulana", email: "fulana@b.co", tipo: "Artista", canal: "@fulana" });
    expect(sent.mensagem).toHaveLength(2000);
    expect(sent).not.toHaveProperty("extra");
    expect(Number.isNaN(Date.parse(sent.enviadoEm))).toBe(false);
  });

  it("devolve 502 quando o webhook falha", async () => {
    fetch.mockResolvedValue(new Response("", { status: 500 }));
    expect((await call(lead)).status).toBe(502);
  });
});

describe("POST /api/parceiros com limite", () => {
  it("devolve 429 e não chama o webhook depois de muitos envios", async () => {
    vi.stubEnv("PARTNERS_WEBHOOK_URL", "https://hooks.example.test/parceiros");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.mocked(dentroDoLimite).mockResolvedValue(false);
    expect((await call(lead)).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });
});
