import type Phaser from "phaser";
import { LAN } from "@/lib/lan/config";
import { NOME_PC, PROBLEMAS, ROTULOS_SALAO as R } from "@/lib/lan/conteudo";
import { horaTexto, semEnergia, semInternet, type Ctx, type DiaEstado } from "@/lib/lan/motor";

// O salão visto de cima, em canvas e em ilustração flat simples. Só desenha: quem manda é a simulação (lib/lan/motor).
// Cada quadro lê o estado por `ler()` e redesenha tudo. O tema "Bege 2005" vem dos tokens do globals.css.
// Todo problema aparece com ícone e texto (nunca só cor).

export type Leitura = { e: DiaEstado; ctx: Ctx; selecionado: number | null; foco: string | null; reduzido: boolean };
export type Toques = { maquina: (id: string) => void; grupo: (id: number) => void };
export type Salao = { destruir: () => void };

const cor = (nome: string, padrao: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || padrao;
  return parseInt(v.replace("#", ""), 16);
};

type Alvo = { x: number; y: number; w: number; h: number; tipo: "maquina" | "grupo"; id: string | number };

export async function criarSalao(pai: HTMLElement, ler: () => Leitura | null, toques: Toques): Promise<Salao> {
  const P = (await import("phaser")).default;
  const C = {
    fundo: cor("--color-bege-fundo", "#1d2a24"),
    gab: cor("--color-bege-gabinete", "#d9cfb8"),
    gabS: cor("--color-bege-gabinete-sombra", "#b3a688"),
    piso: cor("--color-bege-piso", "#e8e2d4"),
    rejunte: cor("--color-bege-rejunte", "#c9c0ab"),
    tubo: cor("--color-bege-tubo", "#1f3a2e"),
    fosforo: cor("--color-bege-fosforo", "#7fe0a8"),
    barra: cor("--color-bege-barra", "#2f5d9e"),
    cartaz: cor("--color-bege-cartaz", "#fff6c9"),
    tinta: cor("--color-bege-tinta", "#c0392b"),
    texto: cor("--color-bege-texto", "#2a2620"),
    laranja: cor("--color-laranja", "#dd5d05"),
    creme: cor("--color-creme", "#ece3be"),
  };

  class Cena extends P.Scene {
    gfx!: Phaser.GameObjects.Graphics;
    textos = new Map<string, Phaser.GameObjects.Text>();
    usados = new Set<string>();
    alvos: Alvo[] = [];
    giro = 0;

    create() {
      this.gfx = this.add.graphics();
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        const a = [...this.alvos].reverse().find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
        if (!a) return;
        if (a.tipo === "maquina") toques.maquina(String(a.id));
        else toques.grupo(Number(a.id));
      });
    }

    txt(chave: string, x: number, y: number, s: string, tam = 12, fundo: string | null = null, corTxt = "#2a2620") {
      let t = this.textos.get(chave);
      if (!t) {
        t = this.add.text(0, 0, "", { fontFamily: "ui-monospace, monospace", fontSize: "12px", color: corTxt }).setOrigin(0.5);
        this.textos.set(chave, t);
      }
      t.setStyle({ fontSize: `${tam}px`, color: corTxt, backgroundColor: fundo ?? undefined, padding: fundo ? { x: 3, y: 1 } : undefined });
      t.setText(s).setPosition(x, y).setVisible(true).setDepth(10);
      this.usados.add(chave);
    }

    update(_t: number, dt: number) {
      const l = ler();
      const g = this.gfx;
      g.clear();
      this.usados.clear();
      this.alvos = [];
      if (!l) return;
      const { e, ctx } = l;
      const W = this.scale.width;
      const H = this.scale.height;
      const colunas = ctx.attr.grade.colunas;
      const linhas = ctx.attr.grade.linhas;
      const ladoDir = Math.max(110, W * 0.26);
      const cel = Math.min((W - ladoDir - 24) / colunas, (H - 36) / linhas);
      const ox = 12;
      const oy = (H - cel * linhas) / 2 + 6;
      const apagou = semEnergia(e);

      // piso de cerâmica
      g.fillStyle(C.piso).fillRect(0, 0, W, H);
      g.lineStyle(1, C.rejunte, 1);
      const lado = Math.max(18, cel / 3);
      for (let x = 0; x < W; x += lado) g.lineBetween(x, 0, x, H);
      for (let y = 0; y < H; y += lado) g.lineBetween(0, y, W, y);

      // divisória entre setores
      if (ctx.attr.divisoria !== null) {
        const dx = ox + ctx.attr.divisoria * cel;
        g.fillStyle(C.gabS).fillRect(dx - 3, oy - 6, 6, cel * linhas + 12);
        this.txt("div", dx, oy - 12, R.divisoria, 10, "#fff6c9");
      }

      // máquinas
      for (const m of e.maquinas) {
        const x = ox + m.x * cel;
        const y = oy + m.y * cel;
        const pad = cel * 0.1;
        const foco = l.foco === m.id;
        this.alvos.push({ x, y, w: cel, h: cel, tipo: "maquina", id: m.id });
        // mesa
        g.fillStyle(0xa48a64).fillRoundedRect(x + pad * 0.5, y + cel * 0.3, cel - pad, cel * 0.5, 4);
        // gabinete bege
        g.fillStyle(C.gab).fillRect(x + cel * 0.72, y + cel * 0.22, cel * 0.18, cel * 0.42);
        g.fillStyle(C.gabS).fillRect(x + cel * 0.74, y + cel * 0.28, cel * 0.14, cel * 0.03);
        // monitor: tubo (fundo) ou tela fina
        const fino = ctx.attr.telaFina;
        const mw = cel * 0.5;
        const mh = cel * (fino ? 0.32 : 0.36);
        const mx = x + cel * 0.14;
        const my = y + cel * 0.12;
        g.fillStyle(C.gab).fillRoundedRect(mx - 3, my - 3, mw + 6, mh + (fino ? 6 : 10), fino ? 2 : 6);
        const ligada = !apagou && e.t >= m.paradaAte;
        const usando = m.grupo !== null;
        g.fillStyle(ligada ? (m.problema ? 0x203a6e : C.tubo) : 0x111111).fillRect(mx, my, mw, mh);
        if (ligada && usando && !m.problema) {
          g.fillStyle(C.fosforo, 0.35).fillRect(mx + 3, my + 3, mw - 6, mh - 6);
        }
        if (ligada && !l.reduzido) {
          g.lineStyle(1, 0x000000, 0.25);
          for (let sy = my + 1; sy < my + mh; sy += 3) g.lineBetween(mx, sy, mx + mw, sy);
        }
        // cadeira
        g.fillStyle(0x5a6b7a).fillCircle(x + cel * 0.38, y + cel * 0.88, cel * 0.09);
        // fio embolado
        g.lineStyle(1.5, 0x333333, 0.7).beginPath();
        g.moveTo(x + cel * 0.8, y + cel * 0.64);
        g.lineTo(x + cel * 0.86, y + cel * 0.72);
        g.lineTo(x + cel * 0.78, y + cel * 0.76);
        g.lineTo(x + cel * 0.9, y + cel * 0.8);
        g.strokePath();
        // cliente sentado
        if (usando) {
          const gr = e.grupos.find((q) => q.id === m.grupo);
          const arq = gr ? ctx.arquetipos.find((a) => a.slug === gr.arq) : null;
          g.fillStyle(0x6b4a3a).fillCircle(x + cel * 0.38, y + cel * 0.8, cel * 0.1);
          if (arq) this.txt(`i${m.id}`, x + cel * 0.38, y + cel * 0.8, arq.icone, Math.max(10, cel * 0.16));
          if (gr?.chamado) this.txt(`h${m.id}`, x + cel * 0.6, y + cel * 0.62, gr.chamado === "lanche" ? R.chamadoLanche : R.chamadoAjuda, 10, "#fff6c9");
        }
        // rótulo da máquina
        this.txt(`n${m.id}`, x + cel * 0.5, y + cel * 0.06, `${m.id.replace("pc", "")} · ${NOME_PC[m.tipo]}`, Math.max(9, Math.min(11, cel * 0.12)));
        // problema: ícone + texto
        let prob: string | null = null;
        if (m.problema) prob = `${PROBLEMAS[m.problema].icone} ${PROBLEMAS[m.problema].curto}`;
        else if (m.formatando) prob = R.formatando;
        else if (e.t < m.paradaAte) prob = R.reiniciando;
        else if (usando && semInternet(e)) prob = `${PROBLEMAS.internet.icone} ${PROBLEMAS.internet.curto}`;
        if (prob) this.txt(`p${m.id}`, x + cel * 0.5, y + cel * 0.3, prob, Math.max(9, Math.min(12, cel * 0.13)), m.problema ? "#c0392b" : "#2a2620", "#fff6c9");
        if (foco || (l.selecionado !== null && m.grupo === null && !m.problema)) {
          g.lineStyle(foco ? 3 : 1.5, foco ? C.laranja : C.barra, foco ? 1 : 0.6).strokeRect(x + 2, y + 2, cel - 4, cel - 4);
        }
      }

      // balcão com cartaz escrito à mão
      const bx = W - ladoDir + 8;
      g.fillStyle(0x8a6a44).fillRoundedRect(bx, 10, ladoDir - 18, 42, 4);
      g.fillStyle(C.cartaz).fillRect(bx + 6, 14, ladoDir - 30, 22);
      this.txt("cartaz", bx + (ladoDir - 18) / 2, 25, R.cartaz.replace("{p}", String(LAN.maquinas.precoHora.basica)), 10, null, "#c0392b");
      this.txt("hora", bx + (ladoDir - 18) / 2, 44, `🕒 ${horaTexto(e.t)}`, 11, null, "#ece3be");

      // ventilador de teto (gira devagar; parado com movimento reduzido)
      if (!l.reduzido && !apagou) this.giro += dt * 0.004;
      const fx = ox + (cel * colunas) / 2;
      const fy = oy + (cel * linhas) / 2;
      g.fillStyle(0x6d6d6d, 0.35);
      for (let k = 0; k < 3; k++) {
        const a = this.giro + (k * Math.PI * 2) / 3;
        g.fillTriangle(fx, fy, fx + Math.cos(a) * cel * 0.6, fy + Math.sin(a) * cel * 0.6, fx + Math.cos(a + 0.3) * cel * 0.55, fy + Math.sin(a + 0.3) * cel * 0.55);
      }
      g.fillStyle(0x444444).fillCircle(fx, fy, 5);

      // fila perto da porta
      const fila = e.grupos.filter((q) => q.fase === "fila" || q.fase === "cobrar");
      const fx0 = bx;
      let fy0 = 64;
      const altura = 30;
      fila.slice(0, Math.floor((H - 100) / (altura + 4))).forEach((q) => {
        const arq = ctx.arquetipos.find((a) => a.slug === q.arq)!;
        const sel = l.selecionado === q.id || l.foco === `g${q.id}`;
        g.fillStyle(q.fase === "cobrar" ? 0xfff6c9 : 0xf3efe2).fillRoundedRect(fx0, fy0, ladoDir - 18, altura, 4);
        if (sel) g.lineStyle(3, C.laranja).strokeRoundedRect(fx0, fy0, ladoDir - 18, altura, 4);
        const pac = Math.max(0, q.pac / q.pacMax);
        g.fillStyle(pac > 0.5 ? 0x3c8d5a : pac > 0.25 ? 0xc79a2a : 0xc0392b).fillRect(fx0 + 4, fy0 + altura - 5, (ladoDir - 26) * pac, 3);
        this.txt(`f${q.id}`, fx0 + (ladoDir - 18) / 2, fy0 + 12, `${arq.icone}×${q.n} ${q.fase === "cobrar" ? R.cobrar : ""}`, 11);
        this.alvos.push({ x: fx0, y: fy0, w: ladoDir - 18, h: altura, tipo: "grupo", id: q.id });
        fy0 += altura + 4;
      });

      // porta
      g.fillStyle(0x6b4a2a).fillRect(W - 44, H - 14, 36, 10);
      this.txt("porta", W - 26, H - 22, R.porta, 10, null, "#ece3be");

      // queda de energia: tudo escuro
      if (apagou) {
        g.fillStyle(0x000000, 0.55).fillRect(0, 0, W, H);
        this.txt("luz", W / 2, H / 2, `${PROBLEMAS.energia.icone} ${PROBLEMAS.energia.rotulo.toUpperCase()}`, 18, "#000000", "#fff6c9");
      }

      for (const [k, t] of this.textos) if (!this.usados.has(k)) t.setVisible(false);
    }
  }

  const game = new P.Game({
    type: P.AUTO,
    parent: pai,
    backgroundColor: "#1d2a24",
    scale: { mode: P.Scale.RESIZE, width: pai.clientWidth || 640, height: pai.clientHeight || 360 },
    render: { antialias: true },
    banner: false,
    audio: { noAudio: true },
    scene: Cena,
  });
  return { destruir: () => game.destroy(true) };
}
