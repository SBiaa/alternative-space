import type Phaser from "phaser";
import { PECAS, PISTA, type TipoPeca } from "@/lib/role/config";
import { alturaMundo, larguraMundo } from "@/lib/role/pecas";
import { celulasDe, type Pista } from "@/lib/role/pista";
import { desenharCenario, desenharPista, lerCores, type Cores } from "./desenho";

// Cena do editor: grade, peças (mesmo desenho do jogo) e o fantasma da peça escolhida.
// Quem decide o que acontece num clique é o React; a cena só avisa a célula.

export type CursorEditor = { x: number; y: number; tipo: TipoPeca | null; flip: boolean; valido: boolean; visivel: boolean };

export type DadosEditor = {
  pista: Pista;
  cursor: CursorEditor;
  scrollX: number;
  reduzido: boolean;
  aoPonteiro: (fase: "down" | "move" | "up", x: number, y: number) => void;
  aoRolar: (scrollX: number) => void;
};

export function criarCenaEditor(P: typeof Phaser) {
  return class EditorScene extends P.Scene {
    dados!: DadosEditor;
    cores!: Cores;
    gPista!: Phaser.GameObjects.Graphics;
    gGrade!: Phaser.GameObjects.Graphics;
    gCursor!: Phaser.GameObjects.Graphics;
    apertado = false;

    constructor() {
      super({ key: "editor" });
    }

    init(d: DadosEditor) {
      this.dados = d;
      this.apertado = false;
    }

    create() {
      this.cores = lerCores();
      desenharCenario(this, this.cores, PISTA.larguraMax * PISTA.celula, true);
      this.gGrade = this.add.graphics().setDepth(-1);
      this.gPista = this.add.graphics().setDepth(0);
      this.gCursor = this.add.graphics().setDepth(10);

      const cam = this.cameras.main;
      const ajustar = () => {
        cam.setZoom(Math.max(0.4, Math.min(2.5, cam.height / alturaMundo())));
        this.limitar();
      };
      this.scale.on("resize", ajustar);
      // O ScaleManager é do jogo inteiro: solta o ouvinte quando a cena para.
      this.events.once("shutdown", () => this.scale.off("resize", ajustar));
      ajustar();
      this.redesenhar();
      cam.scrollX = this.dados.scrollX;
      this.limitar();

      const celula = (p: Phaser.Input.Pointer) => {
        const w = cam.getWorldPoint(p.x, p.y);
        return { x: Math.floor(w.x / PISTA.celula), y: PISTA.altura - 1 - Math.floor(w.y / PISTA.celula) };
      };
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        this.apertado = true;
        const c = celula(p);
        this.dados.aoPonteiro("down", c.x, c.y);
      });
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        const c = celula(p);
        this.dados.aoPonteiro(this.apertado && p.isDown ? "move" : "up", c.x, c.y);
      });
      this.input.on("pointerup", () => {
        this.apertado = false;
      });
      this.input.on("wheel", (_p: unknown, _o: unknown, dx: number, dy: number) => {
        cam.scrollX += (Math.abs(dx) > Math.abs(dy) ? dx : dy) / cam.zoom;
        this.limitar();
      });
    }

    limitar() {
      const cam = this.cameras?.main;
      if (!cam || !this.dados?.pista) return;
      const W = larguraMundo(this.dados.pista);
      const vis = cam.width / cam.zoom;
      // Com zoom, o scroll é medido a partir do centro; ajusta pra borda esquerda bater em 0.
      const min = -(cam.width - vis) / 2;
      const max = Math.max(min, W - vis + min + PISTA.celula * 2);
      cam.scrollX = Math.max(min, Math.min(max, cam.scrollX));
      cam.scrollY = -(cam.height - cam.height / cam.zoom) / 2;
      this.dados.aoRolar(cam.scrollX);
    }

    rolarPara(x: number) {
      this.cameras.main.scrollX = x;
      this.limitar();
    }

    // Garante que a célula do cursor (teclado) fique na tela.
    mostrarCelula(cx: number) {
      const cam = this.cameras.main;
      const vis = cam.width / cam.zoom;
      const esq = cam.scrollX + (cam.width - vis) / 2;
      const px = cx * PISTA.celula;
      if (px < esq + PISTA.celula) this.rolarPara(cam.scrollX - (esq + PISTA.celula - px));
      else if (px > esq + vis - PISTA.celula * 3) this.rolarPara(cam.scrollX + (px - (esq + vis - PISTA.celula * 3)));
    }

    // Célula sob um ponto da página (pra soltar peça arrastada da paleta).
    celulaDaTela(clientX: number, clientY: number) {
      const r = this.game.canvas.getBoundingClientRect();
      const w = this.cameras.main.getWorldPoint(clientX - r.left, clientY - r.top);
      return { x: Math.floor(w.x / PISTA.celula), y: PISTA.altura - 1 - Math.floor(w.y / PISTA.celula) };
    }

    definir(pista: Pista, cursor: CursorEditor) {
      this.dados.pista = pista;
      this.dados.cursor = cursor;
      if (this.gPista) this.redesenhar();
    }

    redesenhar() {
      const { pista, cursor } = this.dados;
      const c = PISTA.celula;
      const H = alturaMundo();
      const W = larguraMundo(pista);
      const g = this.gGrade.clear();
      g.fillStyle(this.cores.noite, 0.35).fillRect(0, 0, W, H);
      g.lineStyle(1, this.cores.linha, 0.9);
      for (let x = 0; x <= pista.width; x++) g.lineBetween(x * c, 0, x * c, H);
      for (let y = 0; y <= PISTA.altura; y++) g.lineBetween(0, y * c, W, y * c);
      g.lineStyle(2, this.cores.linhaForte, 1).strokeRect(0, 0, W, H);

      desenharPista(this.gPista, pista, this.cores);

      const k = this.gCursor.clear();
      if (!cursor.visivel) return;
      if (cursor.tipo) {
        const fantasma = { type: cursor.tipo, x: cursor.x, y: cursor.y, flip: cursor.flip };
        const cor = cursor.valido ? this.cores.laranjaClaro : this.cores.laranja;
        for (const [cx, cy] of celulasDe(fantasma)) {
          k.fillStyle(cor, cursor.valido ? 0.22 : 0.12).fillRect(cx * c, H - (cy + 1) * c, c, c);
        }
        const { w, h } = PECAS[cursor.tipo];
        k.lineStyle(2, cor, 1).strokeRect(cursor.x * c, H - (cursor.y + h) * c, w * c, h * c);
      } else {
        k.lineStyle(2, this.cores.laranjaClaro, 1).strokeRect(cursor.x * c, H - (cursor.y + 1) * c, c, c);
      }
    }
  };
}
