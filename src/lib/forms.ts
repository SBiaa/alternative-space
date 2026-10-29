export const emailOk = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export type FormState = { status: "idle" | "sending" | "ok" | "error"; message?: string };

export async function postJson(url: string, body: unknown): Promise<FormState> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return res.ok
      ? { status: "ok", message: data.message }
      : { status: "error", message: data.message ?? "Não rolou. Tenta de novo daqui a pouco." };
  } catch {
    return { status: "error", message: "Sem conexão. Tenta de novo daqui a pouco." };
  }
}
