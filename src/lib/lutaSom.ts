// Que som toca em cada coisa que acontece na luta. Fica separado do componente pra dar pra testar.
import { CHAO, type EstadoLutador, type Fase, type Luta, type Lutador, type Projetil } from "./luta";
import { tocar, type Som } from "./som";

export type Antes = { fase: Fase; estado: EstadoLutador[]; noChao: boolean[]; caindo: boolean[]; lancou: boolean[] };

export const antesDoPasso = (l: Luta): Antes => ({
  fase: l.fase,
  estado: [l.a.estado, l.b.estado],
  noChao: [l.a.y >= CHAO, l.b.y >= CHAO],
  caindo: [l.a.estado === "caido" && l.a.y < CHAO, l.b.estado === "caido" && l.b.y < CHAO],
  lancou: [lancouAgora(l.a), lancouAgora(l.b)],
});

// Já soltou o projétil do golpe atual? (O projétil pode acertar e sumir no mesmo quadro em que nasce.)
const lancouAgora = (f: Lutador) => f.estado === "golpe" && f.lancou;

const SOM_PROJETIL: Record<Projetil["tipo"], Som> = { corte: "corte", raio: "raio", fogo: "fogo", shuriken: "shuriken", tremor: "tremor" };

// Toca o que aconteceu neste quadro. Chamar depois do passo() e antes de limpar os eventos.
export function sonsDoQuadro(l: Luta, antes: Antes) {
  if (antes.fase === "intro" && l.fase === "luta") tocar("luta");
  [l.a, l.b].forEach((f, i) => {
    if (antes.estado[i] !== "golpe" && f.estado === "golpe" && f.golpe !== "especial") tocar("golpe");
    if (antes.noChao[i] && f.vy < 0 && f.estado === "livre") tocar("pulo");
    if (antes.caindo[i] && f.y >= CHAO) tocar("queda");
    const proj = f.golpe && f.p.golpes[f.golpe].projetil;
    if (proj && !antes.lancou[i] && lancouAgora(f)) tocar(SOM_PROJETIL[proj.tipo]);
  });
  for (const ev of l.eventos) {
    if (ev.tipo === "hit") tocar(ev.forte ? "acertoForte" : "acerto");
    else if (ev.tipo === "bloqueio") tocar("bloqueio");
    else if (ev.tipo === "ko") tocar("ko");
    else if (ev.tipo === "especial") {
      tocar("carga");
      const f = ev.quem === 0 ? l.a : l.b;
      const pose = f.p.golpes.especial.pose;
      if (pose === "esfera" && f.p.visual.esfera) tocar(f.p.visual.esfera);
      else if (pose === "chuteFogo") tocar("fogo");
    }
  }
}
