import type Phaser from "phaser";
import type { Humor } from "@/lib/taverna/atributos";
import type { Cliente, Ctx, Grupo, NoiteEstado } from "@/lib/taverna/motor";

// O salão visto de cima, em canvas. Só desenha: quem manda é a simulação (lib/taverna/motor). Cada quadro lê o estado
// por `ler()` e redesenha tudo, então não há estado duplicado aqui. O tema "Lareira" vem dos tokens do globals.css.

export type Leitura = { e: NoiteEstado; ctx: Ctx; selecionado: number | null; foco: string | null; reduzido: boolean; humor: Humor };
export type Toques = { mesa: (id: string) => void; grupo: (id: number) => void };
export type Salao = { destruir: () => void };

const cor = (nome: string, padrao: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || padrao;
  return parseInt(v.replace("#", ""), 16);
};

type Area = { x: number; y: number; w: number; h: number };
type Alvo = Area & { tipo: "mesa" | "grupo"; id: string | number };

const nomeCurto = (s: string) => (s.length > 16 ? `${s.slice(0, 15)}…` : s);

export async function criarSalao(pai: HTMLElement, ler: () => Leitura | null, toques: Toques): Promise<Salao> {
  const P = (await import("phaser")).default;
  const C = {
    madeira: cor("--color-lareira-madeira", "#2b1a12"),
    madeira2: cor("--color-lareira-madeira-2", "#3d2619"),
    pedra: cor("--color-lareira-pedra", "#4a4640"),
    brasa: cor("--color-lareira-brasa", "#f2a66e"),
    vela: cor("--color-lareira-vela", "#f2c14e"),
    couro: cor("--color-lareira-couro", "#6b3a24"),
    musgo: cor("--color-lareira-musgo", "#8fd6a4"),
    creme: cor("--color-creme", "#ece3be"),
    noite: cor("--color-noite", "#01121e"),
  };

  class Cena extends P.Scene {
    gfx!: Phaser.GameObjects.Graphics;
    textos = new Map<string, Phaser.GameObjects.Text>();
    usados = new Set<string>();
    alvos: Alvo[] = [];

    create() {
      this.gfx = this.add.graphics();
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        const a = [...this.alvos].reverse().find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
        if (!a) return;
        if (a.tipo === "mesa") toques.mesa(String(a.id));
        else toques.grupo(Number(a.id));
      });
    }

    txt(chave: string, x: number, y: number, s: string, tam = 12, fundo = false, cor = "#ece3be") {
      let t = this.textos.get(chave);
      if (!t) {
        t = this.add.text(0, 0, "", { fontFamily: "ui-monospace, monospace", fontSize: "12px", color: cor }).setOrigin(0.5);
        this.textos.set(chave, t);
      }
      t.setStyle({ fontSize: `${tam}px`, color: cor, backgroundColor: fundo ? "#01121ecc" : undefined, padding: fundo ? { x: 4, y: 2 } : undefined });
      t.setText(s).setPosition(x, y).setVisible(true).setDepth(10);
      this.usados.add(chave);
    }

    corpo(c: Cliente, x: number, y: number, r: number) {
      const g = this.gfx;
      g.fillStyle(C.creme, 1).lineStyle(2, C.noite, 1);
      switch (c.arq) {
        case "guerreiro": g.fillRect(x - r, y - r, r * 2, r * 2); break;
        case "barbaro": g.fillCircle(x, y, r * 1.25); break;
        case "mago": g.fillTriangle(x, y - r * 1.3, x - r, y + r, x + r, y + r); break;
        case "ladino": g.fillTriangle(x - r, y - r, x + r, y - r, x, y + r * 1.2); break;
        case "bardo": g.fillPoints([{ x, y: y - r * 1.2 }, { x: x + r, y }, { x, y: y + r * 1.2 }, { x: x - r, y }] as Phaser.Types.Math.Vector2Like[], true); break;
        case "ana-ferreira": g.fillRoundedRect(x - r * 1.3, y - r * 0.8, r * 2.6, r * 1.6, 4); break;
        case "elfa-cacadora": g.fillPoints([{ x, y: y - r * 1.4 }, { x: x + r * 0.8, y }, { x, y: y + r * 1.4 }, { x: x - r * 0.8, y }] as Phaser.Types.Math.Vector2Like[], true); break;
        default: g.fillCircle(x, y, r); g.strokeCircle(x, y, r + 3);
      }
    }

    cliente(l: Leitura, c: Cliente, x: number, y: number, r: number, chave: string) {
      const arq = l.ctx.arquetipos.find((a) => a.slug === c.arq);
      this.corpo(c, x, y, r);
      this.txt(`i${chave}`, x, y, arq?.icone ?? "?", Math.round(r * 1.3));
      const w = r * 2.4;
      const f = Math.max(0, Math.min(1, c.pac / c.pacMax));
      this.gfx.fillStyle(C.noite, 1).fillRect(x - w / 2, y + r * 1.4, w, 5);
      this.gfx.fillStyle(f > 0.5 ? C.musgo : f > 0.25 ? C.vela : C.brasa, 1).fillRect(x - w / 2, y + r * 1.4, w * f, 5);
      this.txt(`p${chave}`, x, y + r * 1.4 + 11, `${Math.ceil(c.pac)}s`, 10);
    }

    update(tempo: number) {
      const l = ler();
      const g = this.gfx;
      this.usados.clear();
      this.alvos = [];
      g.clear();
      const W = this.scale.width;
      const H = this.scale.height;
      if (!l) return;
      const { e, ctx } = l;
      const pisca = l.reduzido ? 0 : Math.sin(tempo / 180);

      // chão de tábuas e parede de pedra
      g.fillStyle(C.madeira, 1).fillRect(0, 0, W, H);
      g.lineStyle(1, C.madeira2, 1);
      for (let y = H * 0.22; y < H; y += 26) g.lineBetween(0, y, W, y);
      g.fillStyle(C.pedra, 1).fillRect(0, 0, W, H * 0.2);
      g.lineStyle(1, C.noite, 0.4);
      for (let x = 0; x < W; x += 48) g.lineBetween(x, 0, x, H * 0.2);

      // lareira e luz quente
      const lx = W * 0.1;
      const ly = H * 0.2;
      g.fillStyle(C.brasa, 0.1 + 0.02 * pisca).fillCircle(lx, ly, H * 0.55);
      g.fillStyle(C.noite, 1).fillRect(lx - 34, ly - 52, 68, 52);
      g.fillStyle(C.brasa, 1).fillTriangle(lx - 20, ly, lx, ly - 36 - 4 * pisca, lx + 20, ly);
      g.fillStyle(C.vela, 1).fillTriangle(lx - 9, ly, lx, ly - 20 - 3 * pisca, lx + 9, ly);
      this.txt("lareira", lx, ly + 10, "Lareira", 10);

      // dragão velho dormindo no tapete, ao lado da lareira (decoração e termômetro da reputação)
      const dx = W * 0.27;
      const dy = H * 0.12;
      g.fillStyle(C.couro, 1).fillEllipse(dx, dy + 6, 150, 46);
      g.fillStyle(0x5b7a62, 1).fillEllipse(dx, dy, 110, 38).fillEllipse(dx + 52, dy + 4, 34, 24).fillTriangle(dx - 55, dy, dx - 86, dy - 6, dx - 56, dy + 14);
      g.lineStyle(2, C.noite, 1);
      if (l.humor === "umOlho") g.fillStyle(C.vela, 1).fillCircle(dx + 58, dy, 4);
      else g.lineBetween(dx + 54, dy, dx + 64, dy);
      const zs = l.humor === "ronca" ? "z z z" : l.humor === "dorme" ? "z" : "";
      if (zs) this.txt("zzz", dx + 70, dy - 26 - (l.reduzido ? 0 : 3 * (pisca + 1)), zs, 12);
      this.txt("dragao", dx, dy + 34, l.humor === "ronca" ? "Dragão ronca" : l.humor === "dorme" ? "Dragão dorme" : "Dragão abre um olho", 10);

      // grade das mesas
      const cols = ctx.attr.grade.colunas;
      const rows = ctx.attr.grade.linhas;
      const reg = { x: W * 0.17, y: H * 0.27, w: W * 0.79, h: H * 0.5 };
      const cel = Math.max(40, Math.min(reg.w / cols, reg.h / rows));
      const ox = reg.x + (reg.w - cel * cols) / 2;
      const oy = reg.y;
      g.lineStyle(1, C.madeira2, 0.6);
      for (let i = 0; i <= cols; i++) g.lineBetween(ox + i * cel, oy, ox + i * cel, oy + rows * cel);
      for (let j = 0; j <= rows; j++) g.lineBetween(ox, oy + j * cel, ox + cols * cel, oy + j * cel);

      for (const m of ctx.attr.mesas) {
        const est = e.mesas.find((x) => x.id === m.id);
        const gr = e.grupos.find((x) => x.id === est?.grupoId);
        const cx = ox + (m.x + 0.5) * cel;
        const cy = oy + (m.y + 0.5) * cel;
        const r = cel * (m.lugares >= 6 ? 0.34 : m.lugares >= 4 ? 0.3 : 0.24);
        g.fillStyle(C.couro, 1);
        for (let s = 0; s < m.lugares; s++) {
          const a = (s / m.lugares) * Math.PI * 2 + Math.PI / 4;
          g.fillRect(cx + Math.cos(a) * (r + 7) - 4, cy + Math.sin(a) * (r + 7) - 4, 8, 8);
        }
        g.fillStyle(C.madeira2, 1).lineStyle(l.foco === m.id ? 4 : 2, l.foco === m.id ? C.vela : C.noite, 1);
        if (m.lugares >= 6) g.fillCircle(cx, cy, r).strokeCircle(cx, cy, r);
        else g.fillRoundedRect(cx - r, cy - r * 0.8, r * 2, r * 1.6, 6).strokeRoundedRect(cx - r, cy - r * 0.8, r * 2, r * 1.6, 6);
        this.alvos.push({ tipo: "mesa", id: m.id, x: cx - cel / 2, y: cy - cel / 2, w: cel, h: cel });

        if (est?.suja) this.txt(`s${m.id}`, cx, cy, "✕ suja", 11, true, "#f2a66e");
        if (gr) this.grupoNaMesa(l, gr, cx, cy, cel);
      }

      // porta e fila
      const py = H * 0.9;
      g.fillStyle(C.couro, 1).fillRect(8, py - 28, 38, 56);
      this.txt("porta", 27, py + 36, "Porta", 10);
      const fila = e.grupos.filter((x) => x.fase === "fila");
      fila.slice(0, 7).forEach((gr, i) => {
        const x = 78 + i * Math.min(70, (W - 100) / 7);
        const ativos = gr.clientes.filter((c) => c.saiu === null);
        if (gr.id === l.selecionado) g.lineStyle(3, C.vela, 1).strokeRoundedRect(x - 26, py - 30, 52, 62, 6);
        ativos.slice(0, 4).forEach((c, k) => this.cliente(l, c, x - 14 + (k % 2) * 28, py - 14 + Math.floor(k / 2) * 22, 8, `f${gr.id}.${c.id}`));
        this.alvos.push({ tipo: "grupo", id: gr.id, x: x - 26, y: py - 30, w: 52, h: 62 });
      });
      if (fila.length > 7) this.txt("maisfila", W - 24, py, `+${fila.length - 7}`, 12);

      // avisos curtos (pago, foi embora...)
      for (const a of e.avisos) {
        if (e.t - a.t > 1.6) continue;
        const gr = e.grupos.find((x) => x.id === a.grupoId);
        const mesa = ctx.attr.mesas.find((x) => x.id === gr?.mesaId);
        const x = mesa ? ox + (mesa.x + 0.5) * cel : 60;
        const y = (mesa ? oy + (mesa.y + 0.5) * cel : py) - cel * 0.5 - (e.t - a.t) * 14;
        const s = a.tipo === "pago" ? `+${a.valor} ouro` : a.tipo === "quebrou" ? "cadeira quebrada!" : a.tipo === "fugiu" ? "fugiu sem pagar" : a.tipo === "recusou" ? "recusou o pedido" : "foi embora";
        this.txt(`a${a.n}`, x, y, s, 11, true, a.tipo === "pago" ? "#8fd6a4" : "#f2a66e");
      }

      for (const [k, t] of this.textos) if (!this.usados.has(k)) t.setVisible(false);
    }

    grupoNaMesa(l: Leitura, gr: Grupo, cx: number, cy: number, cel: number) {
      const ativos = gr.clientes.filter((c) => c.saiu === null);
      ativos.forEach((c, k) => {
        const a = (k / Math.max(ativos.length, 1)) * Math.PI * 2 - Math.PI / 2;
        this.cliente(l, c, cx + Math.cos(a) * cel * 0.34, cy + Math.sin(a) * cel * 0.34, Math.max(7, cel * 0.12), `m${gr.id}.${c.id}`);
      });
      const e = l.e;
      const receitas = l.ctx.attr.receitas;
      let s = "";
      if (gr.fase === "sentado") s = "❓ quer pedir";
      else if (gr.fase === "pediu") {
        const nome = nomeCurto(receitas[ativos[0]?.pedido]?.nome ?? "pedido");
        s = e.t >= gr.prontoEm ? `✔ ${nome}${ativos.length > 1 ? ` +${ativos.length - 1}` : ""}` : `⏳ ${nome} ${Math.ceil(gr.prontoEm - e.t)}s`;
      } else if (gr.fase === "comendo") s = "🍴 comendo";
      else if (gr.fase === "cobrar") s = "💰 cobrar";
      if (s) this.txt(`b${gr.id}`, cx, cy - cel * 0.5, s, 11, true);
    }
  }

  const game = new P.Game({
    type: P.AUTO,
    parent: pai,
    backgroundColor: "#2b1a12",
    scale: { mode: P.Scale.RESIZE, width: pai.clientWidth || 640, height: pai.clientHeight || 360 },
    render: { antialias: true },
    banner: false,
    audio: { noAudio: true },
    scene: Cena,
  });
  return { destruir: () => game.destroy(true) };
}
