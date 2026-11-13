"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { publicarPico, salvarRascunho, verificarRascunho } from "@/app/actions/role";
import { PICOS, PISTA, TEXTOS } from "@/lib/role/config";
import type { Pista } from "@/lib/role/pista";
import { hashDaPista } from "@/lib/role/pontuacao";
import { lerRascunhoLocal, limparRascunhoLocal, pistaInicial as pistaPadrao, RoleEditor } from "./RoleEditor";

type Props = {
  logado: boolean;
  id: string | null;
  inicial: Pista | null;
  titulo?: string;
  descricao?: string;
  hashVerificado?: string | null;
};

// Editor ligado à conta: rascunho salvo sozinho, prova de que a pista é possível e publicação.
export default function EditorConta({ logado, id: idInicial, inicial, titulo: t0 = "", descricao: d0 = "", hashVerificado = null }: Props) {
  const router = useRouter();
  const [id, setId] = useState(idInicial);
  const [titulo, setTitulo] = useState(t0);
  const [descricao, setDescricao] = useState(d0);
  const [estado, setEstado] = useState<string | null>(null);
  const [hashServidor, setHashServidor] = useState(hashVerificado);
  const [publicando, setPublicando] = useState(false);
  const [erroPublicar, setErroPublicar] = useState<string | null>(null);

  // Com conta e sem id: começa pelo rascunho do navegador, se houver (migração depois do cadastro).
  const [local] = useState(() => (logado && !idInicial ? lerRascunhoLocal() : null));
  const [pistaInicial] = useState(() => inicial ?? local ?? (logado ? pistaPadrao() : lerRascunhoLocal() ?? pistaPadrao()));
  // Só cria rascunho na conta quando algo mudou (ou quando há rascunho do navegador pra migrar).
  const inicialJson = useRef(local ? "" : JSON.stringify(pistaInicial));
  const criando = useRef(false);
  const textos = useRef({ titulo, descricao });
  useEffect(() => {
    textos.current = { titulo, descricao };
  }, [titulo, descricao]);
  const ultima = useRef<Pista | null>(null);

  const salvar = useCallback(
    async (p: Pista) => {
      ultima.current = p;
      if (!logado) return;
      if (!id && (criando.current || JSON.stringify(p) === inicialJson.current)) return;
      setEstado(TEXTOS.pico.salvando);
      if (!id) criando.current = true;
      const r = await salvarRascunho(id, p, textos.current.titulo, textos.current.descricao);
      if (!r.ok) {
        criando.current = false;
        return setEstado(r.erro);
      }
      if (!id) {
        if (local) limparRascunhoLocal();
        setId(r.id);
        setEstado(local ? TEXTOS.pico.rascunhoMigrado : TEXTOS.pico.salvo);
        // Troca a URL sem remontar o editor (mantém desfazer/refazer).
        window.history.replaceState(null, "", `/jogos/role-noturno/editor/${r.id}`);
      } else setEstado(TEXTOS.pico.salvo);
    },
    [id, logado, local],
  );

  const aoVerificar = useCallback(
    async (p: Pista, fim: { corrida: unknown }, hash: string) => {
      if (!logado || !id) return;
      // Garante que o servidor tem exatamente esta pista antes de gravar a prova.
      const s = await salvarRascunho(id, p, textos.current.titulo, textos.current.descricao);
      if (!s.ok) return setEstado(s.erro);
      const r = await verificarRascunho(id, p, fim.corrida);
      if (r.ok) setHashServidor(hash);
      else setEstado(r.erro);
    },
    [id, logado],
  );

  const publicar = async () => {
    if (!id) return;
    setPublicando(true);
    setErroPublicar(null);
    if (ultima.current) await salvarRascunho(id, ultima.current, titulo, descricao);
    const r = await publicarPico(id, titulo, descricao);
    setPublicando(false);
    if (!r.ok) return setErroPublicar(r.erro);
    router.push(`/jogos/role-noturno/pico/${r.slug}`);
  };

  return (
    <RoleEditor
      inicial={pistaInicial}
      salvarLocal={!logado}
      aoMudar={salvar}
      autosaveMs={logado ? PICOS.autosaveMs : 600}
      aoVerificar={aoVerificar}
      rodape={({ pista, verificada }) => {
        void verificada;
        const pronta = logado && Boolean(id) && hashServidor === hashDaPista(pista);
        if (!logado) {
          return (
            <div className="surface-vidro flex flex-wrap items-center gap-3 p-4">
              <p className="m-0 text-sm text-areia">{TEXTOS.editor.rascunhoLocal}</p>
              <Link href="/cadastro?next=/jogos/role-noturno/editor" className="botao-laranja min-h-11 content-center px-4 no-underline">
                {TEXTOS.editor.semConta}
              </Link>
            </div>
          );
        }
        return (
          <form
            className="surface-vidro flex flex-col gap-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              publicar();
            }}
          >
            <p className="m-0 font-ficha text-xs text-areia" aria-live="polite">
              {estado ?? " "}
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span>{TEXTOS.pico.nome}</span>
              <input
                className="min-h-11 rounded-md border border-line-strong bg-transparent px-3"
                maxLength={PISTA.tituloMax}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={() => ultima.current && salvar(ultima.current)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{TEXTOS.pico.descricao}</span>
              <textarea
                className="min-h-20 rounded-md border border-line-strong bg-transparent px-3 py-2"
                maxLength={PISTA.descricaoMax}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onBlur={() => ultima.current && salvar(ultima.current)}
              />
            </label>
            {!pronta && <p className="m-0 text-sm text-areia">{TEXTOS.pico.precisaTerminar}</p>}
            {erroPublicar && (
              <p role="alert" className="m-0 text-sm text-laranja-claro">
                {erroPublicar}
              </p>
            )}
            <div>
              <button type="submit" className="botao-laranja min-h-11 px-5" disabled={!pronta || publicando}>
                {publicando ? TEXTOS.pico.publicando : TEXTOS.pico.publicar}
              </button>
            </div>
          </form>
        );
      }}
    />
  );
}
