import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CabecalhoRole } from "@/components/role/CabecalhoRole";
import { DuplicarPico } from "@/components/role/AcoesPico";
import { EditorCliente } from "@/components/role/EditorCliente";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/role/config";
import { acharPorId, corridaPorId } from "@/lib/role/dados";

export const metadata: Metadata = { title: `${TEXTOS.pagina.editorTitulo} · ${TEXTOS.pagina.titulo}`, robots: { index: false } };

export default function Page({ params }: PageProps<"/jogos/role-noturno/editor/[id]">) {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
        <CabecalhoRole titulo={TEXTOS.pagina.editorTitulo} descricao={TEXTOS.pagina.editorDescricao} />
        <Suspense fallback={<p className="text-areia">{TEXTOS.pagina.carregando}</p>}>
          <Editor params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/entrar?next=/jogos/role-noturno/editor/${id}`);
  const p = await acharPorId(id);
  // Pico de outra pessoa: igual a não existir.
  if (!p || p.userId !== user.id) notFound();

  if (p.status !== "draft") {
    return (
      <div className="surface-vidro flex flex-col gap-3 p-4">
        <p className="m-0">{p.status === "hidden" ? TEXTOS.pico.escondido : TEXTOS.pico.travado}</p>
        <div className="flex flex-wrap gap-2">
          <DuplicarPico id={p.id} />
          {p.slug && (
            <Link href={`/jogos/role-noturno/pico/${p.slug}`} className="botao-vidro min-h-11 content-center px-4 no-underline">
              {TEXTOS.pico.verPico}
            </Link>
          )}
        </div>
      </div>
    );
  }
  const verificada = p.verifiedRunId ? await corridaPorId(p.verifiedRunId) : null;
  return (
    <EditorCliente
      key={p.id}
      logado
      id={p.id}
      inicial={p.layout}
      titulo={p.title}
      descricao={p.description}
      hashVerificado={verificada?.finished ? verificada.layoutHash : null}
    />
  );
}
