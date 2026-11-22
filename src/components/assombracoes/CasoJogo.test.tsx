// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lerCasosDe } from "@/lib/assombracoes/conteudo";

vi.mock("@/app/actions/assombracoes", () => ({
  carregarProgresso: vi.fn(async () => ({ logado: false, casos: {} })),
  migrarProgressoLocal: vi.fn(async () => ({ ok: true, resolvidos: [] })),
  agirNoCaso: vi.fn(),
  reabrirResolvido: vi.fn(),
  verificarResposta: vi.fn(),
}));

const acoes = await import("@/app/actions/assombracoes");
const { CasoJogo } = await import("./CasoJogo");

const caso = lerCasosDe().find((c) => c.publico.slug === "sumico-na-venda")!;
const publico = caso.publico;

const resultado = {
  desfecho: ["Fim da história."],
  origem: { titulo: "Saci", texto: ["Texto."], fontes: [{ titulo: "Fonte A" }, { titulo: "Fonte B" }], revisao: null },
  criatura: { slug: "saci", nome: "Saci" },
  resumoBestiario: "Resumo.",
};

async function juntarQuatroSinais(u: ReturnType<typeof userEvent.setup>) {
  await u.click(await screen.findByRole("button", { name: /Sítio/ }));
  await u.click(screen.getByRole("button", { name: "Olhar em volta" }));
  expect(await screen.findByText(/Sinal novo no caderno: Redemoinho que anda sozinho, Assobio no bambuzal/)).toBeTruthy();
  await u.click(screen.getByRole("button", { name: "Olhar em volta" }));
  await screen.findByText(/Sinal novo no caderno: Pegadas de um pé só, Isqueiro no alto do bambu/);
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(acoes.carregarProgresso).mockResolvedValue({ logado: false, casos: {} });
});

describe("CasoJogo", () => {
  it("coleta sinais, mostra no caderno e só libera o encontro depois do mínimo", async () => {
    const u = userEvent.setup();
    render(<CasoJogo publico={publico} />);
    await juntarQuatroSinais(u);

    await u.click(screen.getByRole("button", { name: /Caderno de causos \(4\)/ }));
    expect(screen.getByText("Redemoinho que anda sozinho")).toBeTruthy();
    expect(screen.getByText("Pegadas de um pé só")).toBeTruthy();
    expect(screen.queryByText(/Colete mais/)).toBeNull();

    // O progresso sem conta fica no navegador.
    expect(JSON.parse(localStorage.getItem("assombracoes:progresso")!).casos["sumico-na-venda"].sinais).toHaveLength(4);
  });

  it("com sinais de menos, o encontro fica travado e o caderno diz quantos faltam", async () => {
    const u = userEvent.setup();
    render(<CasoJogo publico={publico} />);
    await u.click(await screen.findByRole("button", { name: /Caderno de causos/ }));
    expect(screen.getByText("Colete mais 4 sinais antes do encontro.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Encontro" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Ir para o encontro" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("pergunta a um morador e a resposta vira depoimento no caderno", async () => {
    const u = userEvent.setup();
    render(<CasoJogo publico={publico} />);
    await u.click(await screen.findByRole("button", { name: /Sítio/ }));
    await u.click(screen.getByRole("button", { name: /Perguntar: Viu algo estranho por aqui\?/ }));
    expect(await screen.findByText(/Um redemoinho pequenininho sobe a estrada/)).toBeTruthy();
    // A pergunta seguinte só aparece depois da primeira.
    expect(screen.getByRole("button", { name: /Perguntar: E o cavalo, tá bem\?/ })).toBeTruthy();
    await u.click(screen.getByRole("button", { name: /Caderno de causos/ }));
    expect(screen.getByText(/Dona Cidinha: um redemoinho pequeno/)).toBeTruthy();
  });

  it("resposta errada mostra a dica e volta pro caderno; a certa mostra desfecho e cartão de origem", async () => {
    const u = userEvent.setup();
    render(<CasoJogo publico={publico} />);
    await juntarQuatroSinais(u);
    await u.click(screen.getByRole("button", { name: /Caderno de causos/ }));
    await u.click(screen.getByRole("radio", { name: "Saci" }));
    await u.click(screen.getByRole("radio", { name: /Sente falta de um agrado/ }));
    await u.click(screen.getByRole("button", { name: "Ir para o encontro" }));
    await u.click(screen.getByRole("radio", { name: /Trancar tudo/ }));

    vi.mocked(acoes.verificarResposta).mockResolvedValueOnce({ ok: true, acertou: false, dica: "Pense no vizinho esquecido.", tentativas: 1 });
    await u.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Pense no vizinho esquecido.")).toBeTruthy();
    expect(acoes.verificarResposta).toHaveBeenCalledWith("sumico-na-venda", { criatura: "saci", motivo: "agrado", escolha: "trancar" }, expect.objectContaining({ sinais: expect.any(Array) }));
    await u.click(screen.getByRole("button", { name: "Voltar a investigar" }));
    expect(screen.getByRole("heading", { name: "Sinais" })).toBeTruthy();

    // Tenta de novo, agora certo.
    await u.click(screen.getByRole("button", { name: "Ir para o encontro" }));
    await u.click(screen.getByRole("radio", { name: /Deixar uma tigela de canjica/ }));
    vi.mocked(acoes.verificarResposta).mockResolvedValueOnce({ ok: true, acertou: true, novaPagina: false, resultado });
    await u.click(screen.getByRole("button", { name: "Confirmar" }));
    const fim = await screen.findByText("Fim da história.");
    expect(fim).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Saci" })).toBeTruthy();
    expect(screen.getByText("Fonte A")).toBeTruthy();
    // Sem conta: aparece o convite pra criar conta e a resposta aceita fica guardada pro servidor conferir ao migrar.
    expect(screen.getByText("Crie sua conta pra guardar seu Bestiário")).toBeTruthy();
    await waitFor(() => expect(JSON.parse(localStorage.getItem("assombracoes:progresso")!).casos["sumico-na-venda"].resolvida).toEqual({ criatura: "saci", motivo: "agrado", escolha: "presente" }));
  });

  it("o HTML do caso no navegador não traz nenhuma dica nem trecho do gabarito", async () => {
    const { container } = render(<CasoJogo publico={publico} />);
    await screen.findByRole("button", { name: /Sítio/ });
    for (const d of [...caso.gabarito.dicas.criatura, ...caso.gabarito.dicas.motivo, ...caso.gabarito.dicas.escolha]) expect(container.textContent).not.toContain(d);
    expect(within(container).queryByText(/Da onde vem essa história/)).toBeNull();
  });

  it("migra o progresso local pra conta logo que há login e limpa o navegador", async () => {
    localStorage.setItem("assombracoes:progresso", JSON.stringify({ versao: 1, casos: { "sumico-na-venda": { sinais: ["peneira-sumida"], depoimentos: [], tentativas: 0, resolvida: null } } }));
    vi.mocked(acoes.carregarProgresso).mockResolvedValue({ logado: true, casos: {} });
    render(<CasoJogo publico={publico} />);
    await waitFor(() => expect(acoes.migrarProgressoLocal).toHaveBeenCalledWith(expect.objectContaining({ versao: 1 })));
    await waitFor(() => expect(localStorage.getItem("assombracoes:progresso")).toBeNull());
  });
});
