import type { Metadata } from "next";
import { CabecalhoRole } from "@/components/role/CabecalhoRole";
import { Suspense } from "react";
import { EditorCliente } from "@/components/role/EditorCliente";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/role/config";

export const metadata: Metadata = {
  title: `${TEXTOS.pagina.editorTitulo} · ${TEXTOS.pagina.titulo}`,
  description: TEXTOS.pagina.editorDescricao,
};

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
        <CabecalhoRole titulo={TEXTOS.pagina.editorTitulo} descricao={TEXTOS.pagina.editorDescricao} />
        <Suspense fallback={<p className="text-areia">{TEXTOS.pagina.carregando}</p>}>
          <Editor />
        </Suspense>
      </div>
    </section>
  );
}

async function Editor() {
  const user = await getUser();
  return <EditorCliente logado={Boolean(user)} id={null} inicial={null} />;
}
