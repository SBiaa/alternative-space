"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { textosShell as t } from "@/config/modo-jogo";

// Evento que o shell manda pros jogos pausarem (botão, troca de aba, perda de foco).
export const EVENTO_PAUSAR = "modo-jogo:pausar";
export const pedirPausa = () => window.dispatchEvent(new Event(EVENTO_PAUSAR));

// Jogos que rodam dentro do shell podem pôr chips no placar e conteúdo na gaveta via portal.
type Slots = { hud: HTMLElement | null; gaveta: HTMLElement | null; detalhes: HTMLElement | null };
const ShellCtx = createContext<Slots | null>(null);
export const useNoShell = () => useContext(ShellCtx) !== null;

function Portal({ slot, children }: { slot: keyof Slots; children: ReactNode }) {
  const s = useContext(ShellCtx);
  const el = s?.[slot];
  return el ? createPortal(children, el) : null;
}
export const NoHud = ({ children }: { children: ReactNode }) => <Portal slot="hud">{children}</Portal>;
export const NaGaveta = ({ children }: { children: ReactNode }) => <Portal slot="gaveta">{children}</Portal>;
export const NosDetalhes = ({ children }: { children: ReactNode }) => <Portal slot="detalhes">{children}</Portal>;

export function Chip({ children, rotulo }: { children: ReactNode; rotulo?: string }) {
  return (
    <span aria-label={rotulo} className="gs-chip">
      {children}
    </span>
  );
}

type Props = {
  title: string;
  hud?: ReactNode;
  drawer?: ReactNode;
  // Conteúdo extra que aparece quando a gaveta é puxada pra cima (modo, dificuldade...).
  drawerDetails?: ReactNode;
  dica?: string;
  onExit: () => void;
  onPause?: () => void;
  children: ReactNode;
};

export function GameShell({ title, hud, drawer, drawerDetails, dica, onExit, onPause, children }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<Slots>({ hud: null, gaveta: null, detalhes: null });
  const [aberta, setAberta] = useState(false);
  const [mostrarDica, setMostrarDica] = useState(Boolean(dica));
  const [podeTelaCheia, setPodeTelaCheia] = useState(false);
  const [temDetalhes, setTemDetalhes] = useState(Boolean(drawerDetails));

  const pausar = useCallback(() => {
    pedirPausa();
    onPause?.();
  }, [onPause]);

  // Esconde o site, trava rolagem e zoom, e faz o "voltar" do navegador sair do jogo.
  useEffect(() => {
    const b = document.body;
    b.classList.add("em-modo-jogo");
    if (!history.state?.modoJogo) history.pushState({ ...history.state, modoJogo: true }, "");
    const onPop = () => onExit();
    const onVis = () => document.hidden && pausar();
    window.addEventListener("popstate", onPop);
    window.addEventListener("blur", pausar);
    document.addEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só dá pra saber no navegador
    setPodeTelaCheia(Boolean(document.fullscreenEnabled));
    return () => {
      b.classList.remove("em-modo-jogo");
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("blur", pausar);
      document.removeEventListener("visibilitychange", onVis);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [onExit, pausar]);

  // Encaixa a tela do jogo no maior tamanho possível sem esticar (mantém a proporção dela).
  useLayoutEffect(() => {
    const p = palco.current;
    if (!p) return;
    const encaixar = () => {
      const alvo = p.querySelector<HTMLElement>('[style*="aspect-ratio"]');
      if (!alvo) return;
      const [a, b] = getComputedStyle(alvo).aspectRatio.split("/").map((n) => parseFloat(n));
      const ar = a && b ? a / b : a;
      if (!ar) return;
      const { width: w, height: h } = p.getBoundingClientRect();
      const larg = Math.min(w, h * ar);
      alvo.style.width = `${Math.floor(larg)}px`;
      alvo.style.height = `${Math.floor(larg / ar)}px`;
    };
    encaixar();
    const ro = new ResizeObserver(encaixar);
    ro.observe(p);
    const mo = new MutationObserver(encaixar);
    mo.observe(p, { childList: true, subtree: true, attributeFilter: ["style", "class"] });
    window.addEventListener("orientationchange", encaixar);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("orientationchange", encaixar);
    };
  }, []);

  // A gaveta só oferece "puxar" se algum jogo pôs coisa nos detalhes.
  useEffect(() => {
    const d = slots.detalhes;
    if (!d) return;
    const ver = () => setTemDetalhes(Boolean(drawerDetails) || d.childElementCount > 0);
    ver();
    const mo = new MutationObserver(ver);
    mo.observe(d, { childList: true });
    return () => mo.disconnect();
  }, [slots.detalhes, drawerDetails]);

  const telaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void raiz.current?.requestFullscreen().catch(() => {});
  };

  const slotRef = (k: keyof Slots) => (el: HTMLElement | null) => {
    setSlots((s) => (s[k] === el ? s : { ...s, [k]: el }));
  };

  // Puxar a alça pra cima abre, pra baixo fecha.
  const arrasto = useRef<number | null>(null);

  return (
    <ShellCtx.Provider value={slots}>
      <div ref={raiz} className="gs-raiz" role="dialog" aria-modal="true" aria-label={title}>
        <div
          ref={palco}
          className="gs-palco"
          onPointerDownCapture={() => setMostrarDica(false)}
          onKeyDownCapture={() => setMostrarDica(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {children}
        </div>

        <div className="gs-topo">
          <button type="button" className="gs-redondo" aria-label={t.sair} onClick={() => history.back()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="gs-chips">
            {hud}
            <span ref={slotRef("hud")} className="contents" />
          </div>
          {podeTelaCheia && (
            <button type="button" className="gs-redondo max-sm:hidden" aria-label={t.telaCheia} onClick={telaCheia}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </button>
          )}
          <button type="button" className="gs-redondo" aria-label={t.pausar} onClick={pausar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </div>

        {dica && mostrarDica && (
          <p className="gs-dica" role="status">
            {dica}
          </p>
        )}

        <div className="gs-gaveta" data-aberta={aberta || undefined}>
          {temDetalhes && (
            <button
              type="button"
              className="gs-alca"
              aria-label={aberta ? t.gavetaFechar : t.gavetaAbrir}
              aria-expanded={aberta}
              onClick={() => setAberta((v) => !v)}
              onPointerDown={(e) => (arrasto.current = e.clientY)}
              onPointerUp={(e) => {
                if (arrasto.current === null) return;
                const dy = e.clientY - arrasto.current;
                arrasto.current = null;
                if (dy < -20) setAberta(true);
                else if (dy > 20) setAberta(false);
              }}
            >
              <span aria-hidden="true" />
            </button>
          )}
          <div className="gs-gaveta-essencial">
            {drawer}
            <div ref={slotRef("gaveta")} className="contents" />
          </div>
          <div className="gs-gaveta-detalhes" hidden={!aberta}>
            {drawerDetails}
            <div ref={slotRef("detalhes")} className="contents" />
          </div>
        </div>
      </div>
    </ShellCtx.Provider>
  );
}
