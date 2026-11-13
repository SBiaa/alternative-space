"use client";

// O muro: Canvas 2D (leve no celular). Desenha o reboco, o andaime, a área do mural, as camadas pintadas, a chuva e a lona.
// Entrada por pointer events (toque e mouse) ou teclado (setas movem, Enter aplica). Quem decide o que o traço vale é geometria.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CAMADAS, MURO, TAMANHOS } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { chuvaEm, climaDoDia, type Attr } from "@/lib/muro/efeitos";
import { alcanceDoNivel, avaliarTraco, centroDe, celulaEm, gradeDe, linhaAlcancavel, mascara, ordemDeCelulas, totalCelulas, segsDe } from "@/lib/muro/geometria";
import { coberturaDaLona } from "@/lib/muro/pintura";
import { alturaUn } from "@/lib/muro/templates";
import { minutoAbsoluto } from "@/lib/muro/config";
import type { Camada, CorId, Job, Ponto, Progresso, Tag, Template } from "@/lib/muro/tipos";
import { corCss } from "./visual";

export type ResultadoPintar = { ok: boolean };
type Props = {
  job: Job;
  template: Template;
  prog: Progresso;
  attr: Attr;
  tag: Tag;
  camada: Camada;
  cor: CorId;
  habilitado: boolean;
  motivo: string | null;
  onPintar: (celulas: number, precisao: number) => ResultadoPintar;
};

const TOKENS = ["reboco", "reboco-sombra", "concreto", "asfalto", "madeira-andaime", "azul", "noite", "tijolo", "papel-claro", "laranja", "creme"] as const;
const FERRAMENTA = (c: Camada) => (c === "fundo" || c === "preenchimento" ? "rolinho" : "spray");

export function MuroCanvas({ job, template: t, prog, attr, tag, camada, cor, habilitado, motivo, onPintar }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const pintadas = useRef<Record<Camada, number[]>>({ fundo: [], contorno: [], preenchimento: [], detalhe: [] });
  const stroke = useRef<Ponto[]>([]);
  const ativo = useRef(false);
  const cursor = useRef<Ponto>({ x: 50, y: 10 });
  const seguir = useRef(false);
  const [cont, setCont] = useState(640);
  const [, forca] = useState(0);
  const g = useMemo(() => gradeDe(t.size), [t.size]);
  const H = alturaUn(t.size);
  const cfg = TAMANHOS[t.size];
  const reduzido = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const chuvaRef = useRef({ particulas: [] as { x: number; y: number; v: number }[], limite: reduzido ? 30 : 120, fps: 60, ult: 0 });

  // sincroniza as células pintadas com o progresso (a crew pinta sozinha; a chuva apaga)
  const sincronizar = useCallback(() => {
    for (const c of CAMADAS) {
      const m = mascara(t, c, job.briefing.tagDestaque);
      const alvo = Math.round((job.camadas[c].progresso / 100) * totalCelulas(m));
      const arr = pintadas.current[c];
      if (arr.length > alvo) arr.length = alvo;
      else if (arr.length < alvo) {
        const tem = new Set(arr);
        for (const i of ordemDeCelulas(t, c, job.briefing.tagDestaque)) {
          if (arr.length >= alvo) break;
          if (!tem.has(i)) arr.push(i);
        }
      }
    }
  }, [t, job]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCont(Math.max(280, Math.floor(el.clientWidth))));
    ro.observe(el);
    setCont(Math.max(280, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  const pad = 20;
  const s = Math.min((cont - pad * 2) / 100, 560 / (H + 14.5)); // o muro alto (porta) não vira uma torre: limita a altura
  const largura = Math.round(100 * s + pad * 2);
  const chao = Math.round(s * 14);
  const altura = Math.round(H * s + chao + 26);

  const desenhar = useCallback(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    cv.width = largura * dpr;
    cv.height = altura * dpr;
    const c = cv.getContext("2d");
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const P = Object.fromEntries(TOKENS.map((k) => [k, getComputedStyle(cv).getPropertyValue(`--color-${k}`).trim() || "#888"])) as Record<(typeof TOKENS)[number], string>;
    const aX = (x: number) => pad + x * s;
    const aY = (y: number) => 22 + y * s;
    const agora = minutoAbsoluto(prog.dia, prog.minuto);
    sincronizar();

    // reboco do prédio e do céu
    c.fillStyle = P["papel-claro"];
    c.fillRect(0, 0, largura, altura);
    c.fillStyle = P.reboco;
    c.fillRect(pad - 6, 22 - 8, 100 * s + 12, H * s + 8);
    c.fillStyle = P["reboco-sombra"];
    for (let i = 0; i < 40; i++) {
      const x = pad + ((i * 53) % 100) * s;
      const y = 22 + ((i * 37) % Math.max(1, Math.floor(H))) * s;
      c.fillRect(x, y, 14 + (i % 5) * 6, 2);
    }
    // calçada e asfalto
    c.fillStyle = P.concreto;
    c.fillRect(0, 22 + H * s, largura, chao * 0.55);
    c.fillStyle = P.asfalto;
    c.fillRect(0, 22 + H * s + chao * 0.55, largura, chao * 0.45 + 4);

    // andaime de cano nas laterais, até onde a crew alcança
    const alcance = alcanceDoNivel(attr.alcanceNivel);
    const alturaAlc = Math.min(1, alcance / cfg.alturaM) * H;
    c.strokeStyle = P["madeira-andaime"];
    c.lineWidth = 3;
    for (const x of [pad - 10, pad + 100 * s + 10]) {
      c.beginPath();
      c.moveTo(x, aY(H));
      c.lineTo(x, aY(H - alturaAlc));
      c.stroke();
    }
    c.lineWidth = 2;
    for (let m = 1; m <= Math.ceil(alcance); m++) {
      const y = aY(H - Math.min(H, (m / cfg.alturaM) * H));
      c.beginPath();
      c.moveTo(pad - 12, y);
      c.lineTo(pad + 100 * s + 12, y);
      c.globalAlpha = 0.35;
      c.stroke();
      c.globalAlpha = 1;
    }

    // camadas pintadas
    const cw = g.cw * s;
    const ch = g.ch * s;
    let fresca: Ponto | null = null;
    for (const cam of CAMADAS) {
      const cor0 = job.briefing.cores[MURO.coresDaCamada[cam]];
      c.fillStyle = corCss(cor0, cv);
      const q = job.camadas[cam].qualidade;
      c.globalAlpha = 0.72 + 0.28 * (q / 100);
      for (const i of pintadas.current[cam]) {
        const p = centroDe(g, i);
        c.fillRect(aX(p.x) - cw / 2, aY(p.y) - ch / 2, cw + 0.6, ch + 0.6);
      }
      c.globalAlpha = 1;
      if (job.camadas[cam].secaAte > agora && job.camadas[cam].progresso > 0 && pintadas.current[cam].length) {
        const p = centroDe(g, pintadas.current[cam][pintadas.current[cam].length - 1]);
        fresca = { x: aX(p.x), y: aY(p.y) };
        c.fillStyle = "rgba(255,255,255,0.22)";
        for (const i of pintadas.current[cam].slice(-60)) {
          const q2 = centroDe(g, i);
          c.fillRect(aX(q2.x) - cw / 2, aY(q2.y) - ch / 2, cw, ch * 0.4);
        }
      }
    }

    // tag como assinatura (ou destaque)
    const slot = job.briefing.tagDestaque ? t.slots.tagGrande : t.slots.tag;
    const det = job.camadas.detalhe.progresso;
    c.save();
    c.translate(aX(slot.x), aY(slot.y));
    const k = Math.min((slot.w * s) / tag.viewBox[0], (slot.h * s) / tag.viewBox[1]);
    c.scale(k, k);
    c.lineWidth = 3.2;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = det > 20 ? corCss(job.briefing.cores[2], cv) : P.tijolo;
    if (det <= 20) c.setLineDash([4, 4]);
    c.globalAlpha = det > 20 ? Math.min(1, det / 60 + 0.4) : 0.55;
    for (const d of tag.paths) c.stroke(new Path2D(d));
    c.restore();

    // guia da camada atual
    c.save();
    c.setLineDash([5, 4]);
    c.strokeStyle = P.tijolo;
    c.lineWidth = 1.5;
    if (camada === "contorno") {
      for (const l of t.layers.contorno) {
        c.beginPath();
        l.p.forEach(([x, y], i) => (i ? c.lineTo(aX(x), aY(y)) : c.moveTo(aX(x), aY(y))));
        if (l.fechada) c.closePath();
        c.stroke();
      }
    } else if (camada !== "fundo") {
      const m = mascara(t, camada, job.briefing.tagDestaque);
      const feito = new Set(pintadas.current[camada]);
      c.fillStyle = "rgba(171,57,47,0.18)";
      m.forEach((v, i) => {
        if (!v || feito.has(i)) return;
        const p = centroDe(g, i);
        c.fillRect(aX(p.x) - cw / 2, aY(p.y) - ch / 2, cw, ch);
      });
    }
    c.restore();

    // faixa de cima travada (andaime baixo)
    c.save();
    c.beginPath();
    for (let r = 0; r < g.rows; r++) {
      if (linhaAlcancavel(t.size, r, alcance)) continue;
      c.rect(pad, aY(r * g.ch), 100 * s, ch);
    }
    c.clip();
    c.fillStyle = "rgba(1,18,30,0.22)";
    c.fillRect(pad, 22, 100 * s, H * s);
    c.strokeStyle = "rgba(1,18,30,0.4)";
    c.lineWidth = 1;
    for (let x = -altura; x < largura + altura; x += 10) {
      c.beginPath();
      c.moveTo(x, 22);
      c.lineTo(x + 40, 22 + H * s);
      c.stroke();
    }
    c.restore();
    if (!linhaAlcancavel(t.size, 0, alcance)) {
      c.fillStyle = P["papel-claro"];
      c.fillRect(pad + 6, 28, 190, 22);
      c.fillStyle = P.noite;
      c.font = "700 11px var(--font-space-grotesk), sans-serif";
      c.fillText(`FAIXA TRAVADA · ${TEXTOS.muro.estado.andaime.replace("travada: ", "")}`, pad + 12, 43);
    }

    // área do mural + etiqueta
    c.save();
    c.setLineDash([7, 5]);
    c.strokeStyle = P.azul;
    c.lineWidth = 2;
    c.strokeRect(aX(0), aY(0), 100 * s, H * s);
    c.restore();
    c.fillStyle = P.azul;
    c.font = "700 11px var(--font-space-mono), monospace";
    c.fillText(TEXTOS.muro.area(cfg.larguraM, cfg.alturaM), pad, 15);
    if (fresca) {
      c.fillStyle = P.azul;
      c.fillRect(fresca.x - 40, fresca.y - 24, 84, 18);
      c.fillStyle = P["papel-claro"];
      c.font = "700 10px var(--font-space-mono), monospace";
      c.fillText(TEXTOS.muro.tintaFresca, fresca.x - 36, fresca.y - 11);
    }

    // lona
    if (job.coberto) {
      const cob = coberturaDaLona(job.tamanho, attr);
      c.fillStyle = "rgba(9,63,122,0.55)";
      c.fillRect(aX(0), aY(0), 100 * s * cob, H * s);
      c.fillStyle = P["papel-claro"];
      c.font = "700 12px var(--font-space-grotesk), sans-serif";
      c.fillText("LONA", aX(2), aY(6));
    }

    // chuva
    const chuva = chuvaEm(climaDoDia(prog.seed, prog.dia + 1, prog.tranquilo), prog.minuto);
    if (chuva) {
      const R = chuvaRef.current;
      const n = Math.round(R.limite * chuva.intensidade);
      while (R.particulas.length < n) R.particulas.push({ x: Math.random() * largura, y: Math.random() * altura, v: 6 + Math.random() * 6 });
      R.particulas.length = n;
      c.strokeStyle = "rgba(9,63,122,0.55)";
      c.lineWidth = 1.2;
      for (const p of R.particulas) {
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - 3, p.y + 10);
        c.stroke();
      }
    }

    // traço atual e cursor
    if (stroke.current.length) {
      c.strokeStyle = corCss(cor, cv);
      c.globalAlpha = 0.6;
      c.lineWidth = (FERRAMENTA(camada) === "rolinho" ? MURO.traco.raioRolinho : MURO.traco.raioSpray) * Math.max(cw, ch) * 2;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      stroke.current.forEach((p, i) => (i ? c.lineTo(aX(p.x), aY(p.y)) : c.moveTo(aX(p.x), aY(p.y))));
      c.stroke();
      c.globalAlpha = 1;
    }
    c.strokeStyle = P.noite;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(aX(cursor.current.x), aY(cursor.current.y), (FERRAMENTA(camada) === "rolinho" ? MURO.traco.raioRolinho : MURO.traco.raioSpray) * Math.max(cw, ch), 0, Math.PI * 2);
    c.stroke();
    void segsDe;
  }, [largura, altura, pad, s, chao, g, H, t, job, prog, attr, tag, camada, cor, sincronizar, cfg]);

  useEffect(() => { desenhar(); }, [desenhar]);

  // chuva animada (parada com "reduzir movimento")
  const chovendo = !!chuvaEm(climaDoDia(prog.seed, prog.dia + 1, prog.tranquilo), prog.minuto);
  useEffect(() => {
    if (!chovendo || reduzido) return;
    let raf = 0;
    let n = 0;
    const R = chuvaRef.current;
    const laco = (ts: number) => {
      const dt = ts - R.ult;
      R.ult = ts;
      if (dt > 0) R.fps = R.fps * 0.9 + (1000 / dt) * 0.1;
      if (n++ % 20 === 0) R.limite = R.fps < 40 ? Math.max(30, R.limite - 15) : Math.min(120, R.limite + 5); // cai a qualidade se o FPS ficar baixo
      for (const p of R.particulas) {
        p.y += p.v;
        p.x -= 1;
        if (p.y > altura) {
          p.y = -10;
          p.x = Math.random() * largura;
        }
      }
      desenhar();
      raf = requestAnimationFrame(laco);
    };
    raf = requestAnimationFrame(laco);
    return () => cancelAnimationFrame(raf);
  }, [chovendo, reduzido, desenhar, altura, largura]);

  // ---- entrada ----
  const paraMuro = (e: { clientX: number; clientY: number }): Ponto => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * (largura / r.width) - pad) / s, y: ((e.clientY - r.top) * (altura / r.height) - 22) / s };
  };
  const jaPintadas = () => new Set(pintadas.current[camada]);
  const aplicar = (pts: Ponto[]) => {
    if (!habilitado || pts.length === 0) return false;
    const r = avaliarTraco({ t, camada, tagDestaque: job.briefing.tagDestaque, ferramenta: FERRAMENTA(camada), pontos: pts, jaPintadas: jaPintadas(), alcanceM: alcanceDoNivel(attr.alcanceNivel), tolerancia: prog.tranquilo ? 1.4 : 1 / (1 + attr.precisaoGuia) });
    if (r.novas.length === 0) return false;
    const antes = job.camadas[camada].progresso;
    const ok = onPintar(r.novas.length, Math.min(1, r.precisao + (camada === "contorno" ? attr.precisaoGuia : 0)));
    if (ok.ok) pintadas.current[camada].push(...r.novas);
    void antes;
    return ok.ok;
  };
  const finalizar = () => {
    if (!ativo.current) return;
    ativo.current = false;
    const pts = stroke.current;
    stroke.current = [];
    aplicar(pts);
    forca((n) => n + 1);
  };
  const aoMover = (e: React.PointerEvent) => {
    const p = paraMuro(e);
    cursor.current = p;
    if (ativo.current) {
      const ult = stroke.current[stroke.current.length - 1];
      if (!ult || Math.hypot(p.x - ult.x, p.y - ult.y) > 0.5) stroke.current.push(p);
      // trechos longos: aplica aos poucos pra o tempo e o material andarem junto com o traço
      const prev = avaliarTraco({ t, camada, tagDestaque: job.briefing.tagDestaque, ferramenta: FERRAMENTA(camada), pontos: stroke.current, jaPintadas: jaPintadas(), alcanceM: alcanceDoNivel(attr.alcanceNivel) });
      if (prev.novas.length >= 30) {
        const pts = stroke.current;
        stroke.current = [pts[pts.length - 1]];
        aplicar(pts);
      }
    }
    desenhar();
  };
  const aoTeclar = (e: React.KeyboardEvent) => {
    const passo = Math.max(g.cw, g.ch);
    const m: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    if (m[e.key]) {
      e.preventDefault();
      const [dx, dy] = m[e.key];
      cursor.current = { x: Math.min(100, Math.max(0, cursor.current.x + dx)), y: Math.min(H, Math.max(0, cursor.current.y + dy)) };
      if (seguir.current) aplicar([cursor.current, { x: cursor.current.x + dx / 2, y: cursor.current.y + dy / 2 }]);
      desenhar();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c0 = cursor.current;
      aplicar([{ x: c0.x - g.cw, y: c0.y }, c0, { x: c0.x + g.cw, y: c0.y }]);
      desenhar();
    } else if (e.key === " ") {
      e.preventDefault();
      seguir.current = !seguir.current;
    }
  };
  void celulaEm;

  return (
    <div ref={caixa} className="w-full">
      <canvas
        ref={ref}
        tabIndex={0}
        role="application"
        aria-label={`Muro de ${job.nomeCliente}. ${TEXTOS.muro.modoTeclado} Espaço liga e desliga o pincel que segue as setas.`}
        aria-describedby="muro-dica"
        className="mx-auto block touch-none rounded-[4px] border-2 border-noite bg-papel-claro"
        style={{ width: largura, maxWidth: "100%", height: altura, cursor: habilitado ? "crosshair" : "not-allowed" }}
        onPointerDown={(e) => {
          if (!habilitado) return;
          (e.target as Element).setPointerCapture(e.pointerId);
          ativo.current = true;
          stroke.current = [paraMuro(e)];
          desenhar();
        }}
        onKeyDown={aoTeclar}
        onPointerMove={aoMover}
        onPointerUp={finalizar}
        onPointerCancel={finalizar}
      />
      <p id="muro-dica" className="muro-nota m-0 mt-1">{habilitado ? TEXTOS.muro.mostrarDica : (motivo ?? "")}</p>
    </div>
  );
}
