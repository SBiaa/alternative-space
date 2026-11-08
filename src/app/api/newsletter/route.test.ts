import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { dentroDoLimite } from "@/lib/limite";

vi.mock("@/lib/limite", async (orig) => ({ ...(await orig<typeof import("@/lib/limite")>()), dentroDoLimite: vi.fn() }));

const req = (body: unknown) =>
  new Request("http://localhost/api/newsletter", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

async function call(body: unknown) {
  const res = await POST(req(body));
  return { status: res.status, message: ((await res.json()) as { message: string }).message };
}

describe("POST /api/newsletter", () => {
  let fetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("MAILERLITE_API_KEY", "chave-teste");
    vi.stubEnv("MAILERLITE_GROUP_ID", "");
    fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.mocked(dentroDoLimite).mockResolvedValue(true);
  });

  it("recusa corpo que não é JSON", async () => {
    expect((await call("não é json")).status).toBe(400);
  });

  it("recusa bots que preenchem o honeypot", async () => {
    expect(await call({ email: "a@b.co", website: "spam.com" })).toEqual({ status: 400, message: "Pedido inválido." });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("recusa e-mail inválido", async () => {
    expect(await call({ email: "nada" })).toEqual({ status: 400, message: "Confere o e-mail e tenta de novo." });
  });

  it("avisa quando a chave não está configurada", async () => {
    vi.stubEnv("MAILERLITE_API_KEY", "");
    expect((await call({ email: "a@b.co" })).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cadastra no MailerLite", async () => {
    expect(await call({ email: "a@b.co" })).toEqual({ status: 200, message: "Pronto! Confere seu e-mail." });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://connect.mailerlite.com/api/subscribers");
    expect(init.headers.Authorization).toBe("Bearer chave-teste");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.co" });
  });

  it("inclui o grupo quando configurado", async () => {
    vi.stubEnv("MAILERLITE_GROUP_ID", "123");
    await call({ email: "a@b.co" });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: "a@b.co", groups: ["123"] });
  });

  it("devolve 502 quando o MailerLite falha", async () => {
    fetch.mockResolvedValue(new Response("{}", { status: 500 }));
    expect((await call({ email: "a@b.co" })).status).toBe(502);
  });
});

describe("POST /api/newsletter com limite", () => {
  it("devolve 429 e não chama o MailerLite depois de muitos envios", async () => {
    vi.stubEnv("MAILERLITE_API_KEY", "chave-teste");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.mocked(dentroDoLimite).mockResolvedValue(false);
    expect(await call({ email: "a@b.co" })).toEqual({ status: 429, message: "Muitos envios seguidos. Tenta de novo daqui a pouco." });
    expect(fetch).not.toHaveBeenCalled();
  });
});
