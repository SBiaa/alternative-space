// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewsletterForm } from "./NewsletterForm";

afterEach(cleanup);

describe("<NewsletterForm>", () => {
  it("envia o e-mail e mostra a resposta", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Pronto! Confere seu e-mail." })));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    render(<NewsletterForm />);

    await user.type(screen.getByLabelText("SEU E-MAIL"), "a@b.co");
    await user.click(screen.getByRole("button", { name: "Quero receber" }));

    expect(await screen.findByText("Pronto! Confere seu e-mail.")).toBeTruthy();
    expect(fetch.mock.calls[0][0]).toBe("/api/newsletter");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: "a@b.co", website: "" });
  });

  it("mostra o erro do servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Confere o e-mail e tenta de novo." }), { status: 400 })));
    const user = userEvent.setup();
    render(<NewsletterForm />);

    await user.type(screen.getByLabelText("SEU E-MAIL"), "a@b.co");
    await user.click(screen.getByRole("button", { name: "Quero receber" }));

    expect(await screen.findByText("Confere o e-mail e tenta de novo.")).toBeTruthy();
  });
});
