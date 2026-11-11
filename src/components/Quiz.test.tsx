// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ push: vi.fn(), salvar: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("@/app/actions/tripulante", () => ({ salvarResultado: m.salvar }));

import { Quiz } from "./Quiz";

const questions = [
  { q: "Qual seu lanche?", options: [{ text: "Pizza", result: "palha" }, { text: "Sake", result: "ruivo" }] },
  { q: "Qual seu sonho?", options: [{ text: "Ser rei", result: "palha" }, { text: "Festa", result: "ruivo" }] },
  { q: "Qual seu barco?", options: [{ text: "Sunny", result: "palha" }, { text: "Red Force", result: "ruivo" }] },
];

const res = (name: string) => ({ name, tagline: `Frase ${name}`, text: "", traits: [], color: "azul" });
const base = { intro: { eyebrow: "", title: "", text: "" }, resultPrefix: "" };
const quiz = { ...base, results: { palha: res("Palha"), ruivo: res("Ruivo") }, questions };

beforeEach(() => {
  m.push.mockReset();
  m.salvar.mockReset().mockResolvedValue(true);
});
afterEach(cleanup);

describe("<Quiz>", () => {
  it("mostra a primeira pergunta e o progresso", () => {
    render(<Quiz slug="tripulacao" quiz={quiz} />);
    expect(screen.getByText("Qual seu lanche?")).toBeTruthy();
    expect(screen.getByText("PERGUNTA 01 / 03")).toBeTruthy();
    expect(screen.queryByText("← VOLTAR")).toBeNull();
  });

  it("ao terminar, salva o resultado mais votado e abre a página dele", async () => {
    const user = userEvent.setup();
    render(<Quiz slug="tripulacao" quiz={quiz} />);

    await user.click(screen.getByText("Pizza"));
    await user.click(screen.getByText("Festa"));
    await user.click(screen.getByText("Sunny"));

    expect(screen.getByRole("status").textContent).toContain("Calculando");
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/quiz/tripulacao/palha"));
    expect(m.salvar).toHaveBeenCalledWith("tripulacao", "palha", {});
  });

  it("o botão voltar desfaz a última resposta", async () => {
    const user = userEvent.setup();
    render(<Quiz slug="tripulacao" quiz={quiz} />);

    await user.click(screen.getByText("Pizza"));
    expect(screen.getByText("Qual seu sonho?")).toBeTruthy();
    await user.click(screen.getByText("← VOLTAR"));
    expect(screen.getByText("Qual seu lanche?")).toBeTruthy();

    await user.click(screen.getByText("Sake"));
    await user.click(screen.getByText("Festa"));
    await user.click(screen.getByText("Red Force"));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/quiz/tripulacao/ruivo"));
  });

  it("segue pro resultado mesmo se salvar falhar", async () => {
    m.salvar.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<Quiz slug="tripulacao" quiz={quiz} />);

    for (const t of ["Pizza", "Ser rei", "Sunny"]) await user.click(screen.getByText(t));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/quiz/tripulacao/palha"));
  });

  it("com mistura, empate vira escolha e vai pra URL", async () => {
    const two = questions.slice(0, 2);
    const mixQuiz = { ...quiz, questions: two, mix: true, tieTitle: "O Chapéu ficou na dúvida" };
    const user = userEvent.setup();
    render(<Quiz slug="casa" quiz={mixQuiz} />);

    await user.click(screen.getByText("Pizza"));
    await user.click(screen.getByText("Festa"));
    expect(screen.getByText("O Chapéu ficou na dúvida")).toBeTruthy();
    await user.click(screen.getByText("Ruivo"));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/quiz/casa/ruivo?m=1.1&e=1"));
    expect(m.salvar).toHaveBeenCalledWith("casa", "ruivo", { scores: [1, 1], tie: true });
  });
});
