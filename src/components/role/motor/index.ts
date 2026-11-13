import { FISICA } from "@/lib/role/config";
import type { Direcao, Gesto } from "@/lib/role/config";
import type { DadosEditor, CursorEditor } from "./editor";
import type { DadosJogo } from "./jogo";
import type { Pista } from "@/lib/role/pista";

// Um jogo Phaser só, com duas cenas (editor e jogo) que leem a mesma pista e desenham as mesmas peças.
// O Phaser entra por import dinâmico: nada disso roda no servidor.

export type Motor = {
  editar: (d: DadosEditor) => void;
  jogar: (d: DadosJogo) => void;
  atualizarEditor: (p: Pista, c: CursorEditor) => void;
  mostrarCelula: (x: number) => void;
  rolar: (scrollX: number) => void;
  celulaDaTela: (clientX: number, clientY: number) => { x: number; y: number } | null;
  direcao: (d: Direcao, on: boolean) => void;
  gesto: (g: Gesto) => void;
  destruir: () => void;
};

export async function criarMotor(pai: HTMLElement): Promise<Motor> {
  const P = (await import("phaser")).default;
  const { criarCenaEditor } = await import("./editor");
  const { criarCenaJogo } = await import("./jogo");
  const Editor = criarCenaEditor(P);
  const Jogo = criarCenaJogo(P);

  const game = new P.Game({
    type: P.AUTO,
    parent: pai,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--color-ceu").trim() || undefined,
    // Tamanho mínimo: com a aba escondida o contêiner pode medir 0 e o WebGL não aceita framebuffer vazio.
    scale: { mode: P.Scale.RESIZE, width: pai.clientWidth || 800, height: pai.clientHeight || 400, min: { width: 160, height: 120 } },
    physics: { default: "matter", matter: { autoUpdate: false, gravity: { x: 0, y: FISICA.gravidade }, enableSleeping: false } },
    render: { antialias: true },
    input: { keyboard: { target: window }, touch: true },
    banner: false,
    audio: { noAudio: true },
    scene: [],
  });
  // Só em desenvolvimento: deixa o jogo acessível no console pra depurar a física.
  if (process.env.NODE_ENV !== "production") (window as unknown as { __roleNoturno?: unknown }).__roleNoturno = game;
  game.scene.add("editor", Editor, false);
  game.scene.add("jogo", Jogo, false);
  await new Promise<void>((ok) => (game.isBooted ? ok() : game.events.once("ready", () => ok())));

  const editor = () => game.scene.getScene("editor") as InstanceType<typeof Editor> | null;
  const jogo = () => game.scene.getScene("jogo") as InstanceType<typeof Jogo> | null;
  const parar = () => {
    for (const k of ["editor", "jogo"]) if (game.scene.isActive(k) || game.scene.isPaused(k)) game.scene.stop(k);
  };

  return {
    editar(d) {
      parar();
      game.scene.start("editor", d);
    },
    jogar(d) {
      parar();
      game.scene.start("jogo", d);
    },
    atualizarEditor(p, c) {
      const e = editor();
      if (e && game.scene.isActive("editor")) e.definir(p, c);
    },
    mostrarCelula(x) {
      const e = editor();
      if (e && game.scene.isActive("editor")) e.mostrarCelula(x);
    },
    celulaDaTela(cx, cy) {
      const e = editor();
      return e && game.scene.isActive("editor") ? e.celulaDaTela(cx, cy) : null;
    },
    rolar(x) {
      const e = editor();
      if (e && game.scene.isActive("editor")) e.rolarPara(x);
    },
    direcao(d, on) {
      const j = jogo();
      if (j && game.scene.isActive("jogo")) j.direcao(d, on);
    },
    gesto(g) {
      const j = jogo();
      if (j && game.scene.isActive("jogo")) j.gesto(g);
    },
    destruir() {
      // Libera o contexto WebGL na hora: o navegador só deixa alguns abertos ao mesmo tempo,
      // e quem troca de pico várias vezes acabaria com o canvas em branco.
      const r = game.renderer as { gl?: WebGLRenderingContext } | null;
      r?.gl?.getExtension("WEBGL_lose_context")?.loseContext();
      game.destroy(true);
    },
  };
}
