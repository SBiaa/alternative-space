"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as KE } from "react";
import { GRUPOS_PECA, MOTIVO_PISTA, PECAS, PISTA, TEXTOS, TIPOS_PECA, type TipoPeca } from "@/lib/role/config";
import { colocarPeca, espelharPeca, mudarLargura, mudarTempo, pecaEm, pistaVazia, removerPeca, validarPista, type Pista } from "@/lib/role/pista";
import { hashDaPista } from "@/lib/role/pontuacao";
import { AjustesControles } from "./AjustesControles";
import { BotoesManobra } from "./BotoesManobra";
import { HudJogo } from "./HudJogo";
import type { Motor } from "./motor";
import type { CursorEditor } from "./motor/editor";
import type { FimDeCorrida, Hud } from "./motor/jogo";
import { ResultadoCorrida } from "./ResultadoCorrida";
import { useAjustesRole } from "./useAjustesRole";

const CHAVE_RASCUNHO = "role-noturno:rascunho";
const HISTORICO_MAX = 100;

type Ferramenta = TipoPeca | "borracha";

export function lerRascunhoLocal(): Pista | null {
  try {
    const v = validarPista(JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) ?? "null"));
    if (v.ok) return v.pista;
    const bruto = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) ?? "null");
    // Rascunho incompleto (sem largada, por exemplo) ainda é rascunho: aceita se o formato bate.
    return bruto && Array.isArray(bruto.pieces) ? (bruto as Pista) : null;
  } catch {
    return null;
  }
}

export function limparRascunhoLocal() {
  try {
    localStorage.removeItem(CHAVE_RASCUNHO);
  } catch {}
}

export function pistaInicial(): Pista {
  const p = pistaVazia();
  const pieces = [{ type: "start" as const, x: 0, y: 0, flip: false }, ...Array.from({ length: p.width - 4 }, (_, i) => ({ type: "ground" as const, x: 2 + i, y: 0, flip: false })), { type: "finish" as const, x: p.width - 2, y: 0, flip: false }];
  return { ...p, pieces };
}

export type AoVerificar = (pista: Pista, fim: FimDeCorrida, hash: string) => void;

export function RoleEditor({ inicial, salvarLocal = true, autosaveMs = 600, aoMudar, aoVerificar, rodape }: { inicial?: Pista; salvarLocal?: boolean; autosaveMs?: number; aoMudar?: (p: Pista) => void; aoVerificar?: AoVerificar; rodape?: (s: { pista: Pista; verificada: boolean }) => React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const motor = useRef<Motor | null>(null);
  const [pronto, setPronto] = useState(false);
  // Montado só no navegador (ver EditorCliente), então dá pra ler o rascunho local direto.
  const [pista, setPista] = useState<Pista>(() => inicial ?? (salvarLocal ? lerRascunhoLocal() : null) ?? pistaInicial());
  const [passado, setPassado] = useState<Pista[]>([]);
  const [futuro, setFuturo] = useState<Pista[]>([]);
  const [ferramenta, setFerramenta] = useState<Ferramenta>("ground");
  const [flip, setFlip] = useState(false);
  const [cursor, setCursor] = useState({ x: 2, y: 1, visivel: false });
  const [modo, setModo] = useState<"editar" | "testar">("editar");
  const [hud, setHud] = useState<Hud | null>(null);
  const [fim, setFim] = useState<FimDeCorrida | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verificada, setVerificada] = useState<string | null>(null);
  const [paletaAberta, setPaletaAberta] = useState(false);
  const scrollX = useRef(0);
  const ultimaCelula = useRef("");
  const { ajustes, reduzido, mudar: mudarAjustes } = useAjustesRole();

  // Estado atual pra quem é chamado pelo Phaser.
  const ref = useRef({ pista, ferramenta, flip });
  useEffect(() => {
    ref.current = { pista, ferramenta, flip };
  }, [pista, ferramenta, flip]);

  // Salva com debounce.
  useEffect(() => {
    const t = setTimeout(() => {
      if (salvarLocal) {
        try {
          localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(pista));
        } catch {}
      }
      aoMudar?.(pista);
    }, autosaveMs);
    return () => clearTimeout(t);
  }, [pista, salvarLocal, aoMudar, autosaveMs]);

  const commit = useCallback((nova: Pista) => {
    setPassado((h) => [...h.slice(-HISTORICO_MAX + 1), ref.current.pista]);
    setFuturo([]);
    setPista(nova);
  }, []);

  const aplicar = useCallback(
    (x: number, y: number) => {
      const { pista: p, ferramenta: f, flip: fl } = ref.current;
      if (f === "borracha") {
        const alvo = pecaEm(p, x, y);
        if (alvo) commit(removerPeca(p, alvo));
        return;
      }
      const r = colocarPeca(p, { type: f, x, y, flip: fl });
      if (r.ok) {
        commit(r.pista);
        setAviso(null);
      } else setAviso(MOTIVO_PISTA[r.motivo]);
    },
    [commit],
  );

  const aoPonteiro = useCallback(
    (fase: "down" | "move" | "up", x: number, y: number) => {
      setCursor({ x, y, visivel: true });
      const k = `${x}:${y}`;
      if (fase === "down" || (fase === "move" && k !== ultimaCelula.current)) {
        ultimaCelula.current = k;
        aplicar(x, y);
      }
      if (fase === "up") ultimaCelula.current = "";
    },
    [aplicar],
  );

  const editar = useCallback(() => {
    motor.current?.editar({
      pista: ref.current.pista,
      cursor: { x: 0, y: 0, tipo: null, flip: false, valido: true, visivel: false },
      scrollX: scrollX.current,
      reduzido,
      aoPonteiro: (f, x, y) => aoPonteiro(f, x, y),
      aoRolar: (s) => (scrollX.current = s),
    });
  }, [aoPonteiro, reduzido]);

  // Monta o Phaser (só no navegador).
  useEffect(() => {
    let vivo = true;
    let m: Motor | null = null;
    import("./motor").then(async ({ criarMotor }) => {
      if (!vivo || !caixa.current) return;
      m = await criarMotor(caixa.current);
      if (!vivo) return m.destruir();
      motor.current = m;
      setPronto(true);
    });
    return () => {
      vivo = false;
      m?.destruir();
      motor.current = null;
    };
  }, []);

  useEffect(() => {
    if (pronto && modo === "editar") editar();
    // Só na troca de modo; atualizações da pista vão pelo efeito abaixo.
  }, [pronto, modo]); // eslint-disable-line react-hooks/exhaustive-deps

  const tipo = ferramenta === "borracha" ? null : ferramenta;
  const valido = tipo ? colocarPeca(pista, { type: tipo, x: cursor.x, y: cursor.y, flip }).ok : true;
  useEffect(() => {
    if (!pronto || modo !== "editar") return;
    const c: CursorEditor = { x: cursor.x, y: cursor.y, tipo, flip, valido, visivel: cursor.visivel };
    motor.current?.atualizarEditor(pista, c);
  }, [pronto, modo, pista, cursor, tipo, flip, valido]);

  const desfazer = () => {
    if (!passado.length) return;
    setFuturo((f) => [pista, ...f]);
    setPista(passado[passado.length - 1]);
    setPassado((h) => h.slice(0, -1));
  };
  const refazer = () => {
    if (!futuro.length) return;
    setPassado((h) => [...h, pista]);
    setPista(futuro[0]);
    setFuturo((f) => f.slice(1));
  };
  const espelhar = () => {
    const alvo = cursor.visivel ? pecaEm(pista, cursor.x, cursor.y) : null;
    if (alvo) commit(espelharPeca(pista, alvo));
    else setFlip((f) => !f);
  };
  const limpar = () => {
    if (window.confirm(TEXTOS.editor.confirmarLimpar)) commit({ ...pista, pieces: [] });
  };

  const testar = () => {
    const v = validarPista(pista);
    if (!v.ok) return setAviso(v.texto);
    setAviso(null);
    setFim(null);
    setHud(null);
    setModo("testar");
    const hash = hashDaPista(v.pista);
    motor.current?.jogar({
      pista: v.pista,
      teclas: ajustes.teclas,
      reduzido,
      aoHud: setHud,
      aoFim: (f) => {
        setFim(f);
        if (f.corrida.finished) {
          setVerificada(hash);
          aoVerificar?.(v.pista, f, hash);
        }
      },
    });
  };
  const voltar = () => {
    setFim(null);
    setHud(null);
    setModo("editar");
  };

  // Teclado no editor: cursor, colocar, apagar, espelhar, trocar peça, desfazer.
  const teclado = (e: KE<HTMLDivElement>) => {
    if (modo !== "editar") return;
    const mover = (dx: number, dy: number) => {
      e.preventDefault();
      const x = Math.max(0, Math.min(pista.width - 1, cursor.x + dx));
      const y = Math.max(0, Math.min(PISTA.altura - 1, cursor.y + dy));
      setCursor({ x, y, visivel: true });
      motor.current?.mostrarCelula(x);
    };
    const idx = ferramenta === "borracha" ? -1 : TIPOS_PECA.indexOf(ferramenta);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") return e.preventDefault(), e.shiftKey ? refazer() : desfazer();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") return e.preventDefault(), refazer();
    switch (e.key) {
      case "ArrowLeft":
        return mover(-1, 0);
      case "ArrowRight":
        return mover(1, 0);
      case "ArrowUp":
        return mover(0, 1);
      case "ArrowDown":
        return mover(0, -1);
      case "Enter":
      case " ":
        e.preventDefault();
        setCursor((c) => ({ ...c, visivel: true }));
        return aplicar(cursor.x, cursor.y);
      case "Delete":
      case "Backspace": {
        e.preventDefault();
        const alvo = pecaEm(pista, cursor.x, cursor.y);
        if (alvo) commit(removerPeca(pista, alvo));
        return;
      }
      case "f":
      case "F":
        return espelhar();
      case "[":
        return setFerramenta(TIPOS_PECA[(idx - 1 + TIPOS_PECA.length) % TIPOS_PECA.length]);
      case "]":
        return setFerramenta(TIPOS_PECA[(idx + 1) % TIPOS_PECA.length]);
    }
  };

  const soltar = (e: React.DragEvent) => {
    e.preventDefault();
    const t = e.dataTransfer.getData("text/role-peca");
    if (!TIPOS_PECA.includes(t as TipoPeca)) return;
    setFerramenta(t as TipoPeca);
    const c = motor.current?.celulaDaTela(e.clientX, e.clientY);
    if (c) {
      ref.current.ferramenta = t as TipoPeca;
      setCursor({ ...c, visivel: true });
      aplicar(c.x, c.y);
    }
  };

  const ok = validarPista(pista);
  const estaVerificada = verificada === hashDaPista(pista);

  const paleta = (
    <div className="flex flex-col gap-3">
      {GRUPOS_PECA.map((g) => (
        <fieldset key={g.id} className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="etiqueta mb-1 text-[11px] text-laranja-claro">{g.nome}</legend>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_PECA.filter((t) => PECAS[t].grupo === g.id).map((t) => (
              <button
                key={t}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/role-peca", t)}
                onClick={() => setFerramenta(t)}
                aria-pressed={ferramenta === t}
                className={`min-h-11 rounded-md border px-2.5 text-sm ${ferramenta === t ? "border-laranja-claro bg-laranja-claro/15 text-creme" : "border-line-strong text-areia"}`}
              >
                {PECAS[t].nome}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <button type="button" onClick={() => setFerramenta("borracha")} aria-pressed={ferramenta === "borracha"} className={`min-h-11 rounded-md border px-2.5 text-sm ${ferramenta === "borracha" ? "border-laranja-claro text-creme" : "border-line-strong text-areia"}`}>
        {TEXTOS.editor.borracha}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {modo === "editar" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="botao-laranja min-h-11 px-4" onClick={testar} disabled={!pronto}>
            {TEXTOS.editor.testar}
          </button>
          <button type="button" className="botao-vidro min-h-11 px-3" onClick={desfazer} disabled={!passado.length}>
            {TEXTOS.editor.desfazer}
          </button>
          <button type="button" className="botao-vidro min-h-11 px-3" onClick={refazer} disabled={!futuro.length}>
            {TEXTOS.editor.refazer}
          </button>
          <button type="button" className="botao-vidro min-h-11 px-3" onClick={espelhar} aria-pressed={flip}>
            {TEXTOS.editor.espelhar}
          </button>
          <button type="button" className="botao-vidro min-h-11 px-3" onClick={limpar}>
            {TEXTOS.editor.limpar}
          </button>
          <button type="button" className="botao-vidro min-h-11 px-3 lg:hidden" onClick={() => setPaletaAberta((a) => !a)} aria-expanded={paletaAberta}>
            {paletaAberta ? TEXTOS.editor.fecharPaleta : TEXTOS.editor.abrirPaleta}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row">
        {modo === "editar" && <aside className="surface-vidro hidden w-[260px] shrink-0 p-3 lg:block" aria-label={TEXTOS.editor.paleta}>{paleta}</aside>}
        <div className="relative min-w-0 flex-1">
          <div
            ref={caixa}
            tabIndex={0}
            role="application"
            aria-label={modo === "editar" ? TEXTOS.editor.ajudaTeclado : TEXTOS.jogo.ajudaTeclado}
            onKeyDown={teclado}
            onDragOver={(e) => e.preventDefault()}
            onDrop={soltar}
            onPointerLeave={() => setCursor((c) => ({ ...c, visivel: c.visivel && document.activeElement === caixa.current }))}
            className="h-[min(62vh,520px)] w-full touch-none overflow-hidden rounded-lg border border-line-strong bg-ceu landscape:max-lg:h-[calc(100dvh-96px)]"
          />
          {modo === "testar" && (
            <>
              <HudJogo hud={hud} />
              {ajustes.botoesNaTela && !fim && <BotoesManobra aoDirecao={(d, on) => motor.current?.direcao(d, on)} />}
              {fim && (
                <div className="absolute inset-0 flex items-center justify-center bg-noite/60 p-3">
                  <ResultadoCorrida fim={fim} timeLimit={pista.timeLimit}>
                    {fim.corrida.finished && <p className="m-0 text-sm">{TEXTOS.editor.terminou}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="botao-laranja min-h-11 px-4" onClick={testar}>
                        {TEXTOS.resultado.deNovo}
                      </button>
                      <button type="button" className="botao-vidro min-h-11 px-4 !text-tinta" onClick={voltar}>
                        {TEXTOS.editor.voltar}
                      </button>
                    </div>
                  </ResultadoCorrida>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modo === "testar" && !fim && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="botao-vidro min-h-11 px-4" onClick={voltar}>
            {TEXTOS.editor.voltar}
          </button>
          <p className="m-0 text-sm text-areia">{ajustes.botoesNaTela ? TEXTOS.jogo.ajudaToque : TEXTOS.jogo.ajudaTeclado}</p>
        </div>
      )}

      {modo === "editar" && (
        <>
          {paletaAberta && (
            <div className="surface-vidro fixed inset-x-0 bottom-0 z-40 max-h-[50vh] overflow-y-auto rounded-t-lg p-4 lg:hidden" aria-label={TEXTOS.editor.paleta}>
              {paleta}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-areia">{TEXTOS.editor.largura}</span>
              <input type="number" className="min-h-11 w-28 rounded-md border border-line-strong bg-transparent px-2 font-ficha" min={PISTA.larguraMin} max={PISTA.larguraMax} value={pista.width} onChange={(e) => commit(mudarLargura(pista, Number(e.target.value) || pista.width))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-areia">{TEXTOS.editor.tempo}</span>
              <input type="number" className="min-h-11 w-28 rounded-md border border-line-strong bg-transparent px-2 font-ficha" min={PISTA.tempoMin} max={PISTA.tempoMax} value={pista.timeLimit} onChange={(e) => commit(mudarTempo(pista, Number(e.target.value) || pista.timeLimit))} />
            </label>
            <p className="m-0 font-ficha text-xs text-areia" aria-live="polite">
              {aviso ?? (ok.ok ? (estaVerificada ? TEXTOS.editor.terminou : TEXTOS.editor.pistaOk) : ok.texto)}
            </p>
          </div>
          <p className="m-0 text-xs text-areia">{TEXTOS.editor.ajudaTeclado}</p>
          <AjustesControles ajustes={ajustes} mudar={mudarAjustes} />
          {rodape?.({ pista, verificada: estaVerificada })}
        </>
      )}
    </div>
  );
}
