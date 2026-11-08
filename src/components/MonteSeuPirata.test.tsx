// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const usarPirata = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/perfil", () => ({ usarPirata }));

import { MonteSeuPirata } from "./MonteSeuPirata";

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  usarPirata.mockReset();
});

const cartaz = () => screen.getByRole("img").querySelector("title")!.textContent;

describe("<MonteSeuPirata>", () => {
  it("troca a peça, renomeia o cartaz e guarda no navegador", async () => {
    const user = userEvent.setup();
    render(<MonteSeuPirata logado={false} inicial={null} />);
    expect(cartaz()).toBe("Imediato Caolho do Papagaio");

    await user.click(screen.getByRole("tab", { name: "Chapéu" }));
    await user.click(within(screen.getByRole("tabpanel")).getByRole("button", { name: "Coroa" }));

    expect(cartaz()).toBe("Rei Pirata Caolho do Papagaio");
    expect(localStorage.getItem("monte-seu-pirata:atual")).toBe("pirata:1-5-3-1-0-1-1");
  });

  it("sem conta, manda entrar e volta pro jogo", () => {
    render(<MonteSeuPirata logado={false} inicial={null} />);
    expect(screen.getByRole("link", { name: "Entrar pra usar como avatar" }).getAttribute("href")).toBe("/entrar?next=/jogos/monte-seu-pirata");
  });

  it("retoma o pirata guardado depois do login", () => {
    localStorage.setItem("monte-seu-pirata:atual", "pirata:0-2-0-0-0-3-0");
    render(<MonteSeuPirata logado inicial={null} />);
    expect(cartaz()).toBe("Capitão Mão-de-Gancho");
  });

  it("começa pelo pirata que já é avatar e salva o novo", async () => {
    usarPirata.mockResolvedValue({ ok: "Pronto! Seu pirata já é o avatar do perfil." });
    const user = userEvent.setup();
    render(<MonteSeuPirata logado inicial="pirata:0-2-0-0-0-3-0" />);
    expect(screen.getByRole("button", { name: "✓ É seu avatar" })).toHaveProperty("disabled", true);

    await user.click(screen.getByRole("tab", { name: "Bichinho" }));
    await user.click(within(screen.getByRole("tabpanel")).getByRole("button", { name: "Polvo" }));
    await user.click(screen.getByRole("button", { name: "Usar como avatar" }));

    expect(usarPirata).toHaveBeenCalledWith("pirata:0-2-0-0-0-3-4");
    expect(await screen.findByText(/já é o avatar do perfil/)).toBeTruthy();
    expect(await screen.findByRole("button", { name: "✓ É seu avatar" })).toBeTruthy();
  });
});
