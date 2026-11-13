import Link from "next/link";
import { TEXTOS } from "@/lib/role/config";

export function CabecalhoRole({ titulo, descricao, voltar = "/jogos/role-noturno", rotuloVoltar = `← ${TEXTOS.pagina.titulo}` }: { titulo: string; descricao?: string; voltar?: string; rotuloVoltar?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Link href={voltar} className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">
        {rotuloVoltar}
      </Link>
      <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{titulo}</h1>
      {descricao && <p className="m-0 text-base text-areia">{descricao}</p>}
    </div>
  );
}
