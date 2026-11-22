"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { estadoDoDia, migrarSaveLocal, palpitar } from "@/app/actions/constelacao";
import { TEMAS, TEXTOS, PARTIDA } from "@/lib/constelacao/config";
import { estadoDasLetras } from "@/lib/constelacao/retorno";
import { saveVazio, type SaveLocal } from "@/lib/constelacao/save";
import type { EstadoDoDia } from "@/lib/constelacao/servico";
import { Grade } from "./Grade";
import { gravarSaveLocal, lerSaveLocal, limparSaveLocal } from "./localSave";
import { Resultado } from "./Resultado";
import { Teclado } from "./Teclado";

// Tela do jogo. A palavra nunca chega aqui antes do fim: o servidor devolve só o retorno de cada letra.

export function CartaCeleste({ inicial }: { inicial: EstadoDoDia }) {
  const [estado, setEstado] = useState(inicial);
  const [atual, setAtual] = useState("");
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const save = useRef<SaveLocal>(saveVazio());

  // Ao abrir: sem conta, o servidor reconfere o save do navegador; com conta, o save do navegador vai pra cabine.
  useEffect(() => {
    const s = lerSaveLocal();
    if (!s || Object.keys(s.dias).length === 0) return;
    if (inicial.logado) {
      migrarSaveLocal(s).then((r) => {
        if (!r.ok) return;
        limparSaveLocal();
        setEstado(r.estado);
        setMsg(TEXTOS.conta.migrado);
      });
    } else {
      save.current = s;
      estadoDoDia(s).then((r) => r.ok && setEstado(r.estado));
    }
  }, [inicial.logado]);

  const puzzle = estado.puzzle;
  const partida = estado.partida;
  const fim = Boolean(partida?.finalizada);
  const tamanho = puzzle?.length ?? 0;
  const parado = ocupado || fim || !puzzle;

  const enviar = useCallback(async () => {
    if (parado || !puzzle) return;
    if (atual.length !== puzzle.length) {
      setMsg(TEXTOS.erros.tamanho(puzzle.length));
      return;
    }
    setOcupado(true);
    const r = await palpitar(atual, estado.logado ? undefined : save.current);
    setOcupado(false);
    if (!r.ok) {
      setMsg(r.erro);
      return;
    }
    setEstado(r.estado);
    setAtual("");
    setMsg("");
    if (!r.estado.logado && r.estado.partida) {
      save.current = { ...save.current, dias: { ...save.current.dias, [r.estado.dia]: r.estado.partida.palpites } };
      gravarSaveLocal(save.current);
    }
  }, [atual, estado.logado, parado, puzzle]);

  const letra = useCallback(
    (l: string) => {
      if (parado) return;
      setMsg("");
      setAtual((a) => (a.length < tamanho ? a + l : a));
    },
    [parado, tamanho],
  );
  const apagar = useCallback(() => {
    if (parado) return;
    setMsg("");
    setAtual((a) => a.slice(0, -1));
  }, [parado]);

  // Teclado físico.
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.tagName === "SELECT" || alvo.tagName === "A")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        void enviar();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        apagar();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        letra(e.key.toUpperCase());
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [enviar, apagar, letra]);

  if (!puzzle) {
    return (
      <div className="surface-vidro flex flex-col gap-1 p-4">
        <p className="m-0 text-lg font-semibold">{TEXTOS.semDesafio}</p>
        <p className="m-0 text-areia">{TEXTOS.semDesafioDetalhe}</p>
      </div>
    );
  }

  const tentativaN = Math.min((partida?.tentativas ?? 0) + 1, PARTIDA.tentativas);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-areia">
          <span className="rotulo rounded-md border border-laranja-claro/50 px-2 py-0.5 text-laranja-claro">{TEXTOS.tema(TEMAS[puzzle.theme])}</span>
          <span className="font-ficha text-sm">{TEXTOS.tamanho(puzzle.length)}</span>
          {!fim && <span className="font-ficha text-sm">{TEXTOS.tentativa(tentativaN, PARTIDA.tentativas)}</span>}
        </p>
        {puzzle.hint && <p className="m-0 text-areia">{TEXTOS.dica(puzzle.hint)}</p>}
      </div>

      <Grade length={puzzle.length} palpites={partida?.palpites ?? []} retornos={partida?.retornos ?? []} atual={atual} />
      <p className="m-0 text-center text-sm text-areia">{TEXTOS.legenda}</p>
      <p role="status" aria-live="polite" className="m-0 min-h-6 text-center text-laranja-claro">{msg}</p>

      {!fim && (
        <Teclado
          estados={estadoDasLetras(partida?.palpites ?? [], partida?.retornos ?? [])}
          desligado={parado}
          onLetra={letra}
          onApagar={apagar}
          onEnviar={() => void enviar()}
        />
      )}
      <Resultado estado={estado} />
    </div>
  );
}
