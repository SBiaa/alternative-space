import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ sql: vi.fn() }));

import { anteriores, avatarPermitido, avataresDe, corValida, normalizaApelido } from "./perfil";
import { avatarSeguro } from "@/components/Avatar";

const r = (quiz: string, result: string, created_at = "2026-01-01") => ({ quiz, result, created_at });

describe("normalizaApelido", () => {
  it("tira o @ e passa pra minúsculas", () => expect(normalizaApelido("@Bia.Lua")).toBe("bia.lua"));
  it("vazio vira sem apelido", () => expect(normalizaApelido("  ")).toBe(""));
  it("recusa curto, longo e caracteres estranhos", () => {
    expect(normalizaApelido("ab")).toBeNull();
    expect(normalizaApelido("a".repeat(21))).toBeNull();
    expect(normalizaApelido("bia lua")).toBeNull();
    expect(normalizaApelido("bia<script>")).toBeNull();
  });
});

describe("corValida", () => {
  it("aceita só as cores dos resultados", () => {
    expect(corValida("laranja")).toBe(true);
    expect(corValida("rosa")).toBe(false);
    expect(corValida(null)).toBe(false);
  });
});

describe("avatares", () => {
  it("desbloqueia a arte do resultado com imagem", () => {
    const a = avataresDe([r("era-da-internet", "orkut")]);
    expect(a.map((x) => x.src)).toContain("/quiz/era-da-internet/orkut.webp");
  });

  it("resultado sem arte não desbloqueia nada", () => {
    expect(avataresDe([r("tripulacao", "palha"), r("quiz-que-nao-existe", "x")])).toEqual([]);
  });

  it("só permite avatar desbloqueado", () => {
    const saved = [r("era-da-internet", "orkut")];
    expect(avatarPermitido("/quiz/era-da-internet/orkut.webp", saved)).toBe(true);
    expect(avatarPermitido("/quiz/era-da-internet/msn.webp", saved)).toBe(false);
  });

  it("só mostra caminhos de arte do site", () => {
    expect(avatarSeguro("/quiz/party-rpg/dona-pena.webp")).toBe("/quiz/party-rpg/dona-pena.webp");
    expect(avatarSeguro("https://exemplo.com/a.webp")).toBeNull();
    expect(avatarSeguro("/quiz/../segredo.webp")).toBeNull();
    expect(avatarSeguro(undefined)).toBeNull();
  });
});

describe("anteriores", () => {
  it("lista resultados antigos sem o atual e sem repetir seguidos", () => {
    const hist = [r("q", "c"), r("q", "b"), r("q", "b"), r("q", "a"), r("outro", "x")];
    const m = anteriores(hist);
    expect(m.get("q")).toEqual(["b", "a"]);
    expect(m.get("outro")).toEqual([]);
  });
});
