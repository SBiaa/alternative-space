// Confere os capítulos de content/fanzine/: schema, coerência (pistas, ligações, resposta alcançável),
// e se as imagens e os textos MDX que o capítulo cita existem. Rode depois de criar ou editar um capítulo.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerCapitulo } from "@/lib/fanzine/conteudo";

const raiz = path.join(process.cwd(), "content", "fanzine");
const pastas = fs.existsSync(raiz) ? fs.readdirSync(raiz, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];

describe("content/fanzine", () => {
  it("tem pelo menos um capítulo", () => {
    expect(pastas.length).toBeGreaterThan(0);
  });

  for (const pasta of pastas) {
    describe(pasta, () => {
      const cap = lerCapitulo(JSON.parse(fs.readFileSync(path.join(raiz, pasta, "capitulo.json"), "utf8")));

      it("o slug bate com a pasta", () => expect(cap.slug).toBe(pasta));

      it("toda página tem imagem e texto MDX no disco", () => {
        for (const p of cap.paginas) {
          expect(fs.existsSync(path.join(process.cwd(), "public", p.imagem)), p.imagem).toBe(true);
          expect(fs.existsSync(path.join(raiz, pasta, "paginas", p.mdx)), p.mdx).toBe(true);
        }
      });

      it("toda página tem pelo menos uma pista (senão a lupa fica sem nada)", () => {
        for (const p of cap.paginas) expect(cap.pistas.some((x) => x.pagina === p.id), p.id).toBe(true);
      });

      it("a pergunta pode ser resolvida: com todas as deduções e a resposta certa", async () => {
        const { conferir } = await import("@/lib/fanzine/motor");
        const prog = { v: 1, clues: cap.pistas.map((p) => p.id), deductions: cap.ligacoes.map((l) => l.id), hints: 0, solved: false };
        const certas = Object.fromEntries(cap.pergunta.partes.map((p) => [p.id, p.certa]));
        expect(conferir(cap, prog, certas).resolvida).toBe(true);
      });

      it("nenhum texto cita nome de banda, zine ou marca de verdade (revisão manual continua valendo)", () => {
        const tudo = JSON.stringify(cap).toLowerCase();
        for (const proibido of ["facebook", "orkut", "nirvana", "ramones", "sepultura"]) expect(tudo).not.toContain(proibido);
      });
    });
  }
});
