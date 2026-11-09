import Link from "next/link";
import { getUser } from "@/lib/auth/server";
import { acharJogo, type Jogo } from "@/lib/jogos";
import { posicaoDe, topDe, type Linha } from "@/lib/ranking";

// Top 10 do jogo, com a sua posição embaixo se você estiver fora dele.
export async function RankingJogo({ slug, compacto }: { slug: string; compacto?: boolean }) {
  const jogo = acharJogo(slug);
  const [top, user] = await Promise.all([topDe(slug, compacto ? 5 : 10), getUser()]);
  const voce = user && !top.some((l) => l.userId === user.id) ? await posicaoDe(user.id, slug) : null;

  return (
    <section aria-label={`Ranking de ${jogo.nome}`} className="card flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="etiqueta text-[10px] text-laranja-claro">Ranking</span>
        {!compacto && (
          <Link href="/jogos/ranking" className="text-[13px] text-areia hover:text-creme">
            todos os jogos
          </Link>
        )}
      </div>
      {top.length === 0 ? (
        <p className="m-0 text-sm text-areia">Ninguém no ranking ainda. A primeira partida com conta já te põe no topo.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {top.map((l) => (
            <Item key={l.userId} linha={l} jogo={jogo} sua={l.userId === user?.id} />
          ))}
          {voce && (
            <>
              <li aria-hidden="true" className="py-0.5 text-center text-xs text-poeira">⋯</li>
              <Item linha={voce} jogo={jogo} sua />
            </>
          )}
        </ol>
      )}
      {!user && (
        <p className="m-0 text-[13px] text-poeira">
          <Link href={`/entrar?next=/jogos/${slug}`} className="text-areia underline hover:text-creme">Entra na sua conta</Link> pra aparecer aqui.
        </p>
      )}
    </section>
  );
}

const medalha = ["#f2c14e", "#c9ced6", "#d08a4a"];

function Item({ linha, jogo, sua }: { linha: Linha; jogo: Jogo; sua: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm ${sua ? "bg-creme/12 font-semibold" : ""}`}>
      <span
        className="w-6 shrink-0 text-center font-ficha text-xs"
        style={{ color: medalha[linha.posicao - 1] ?? "var(--color-poeira)" }}
      >
        {linha.posicao}º
      </span>
      <span className="min-w-0 flex-1 truncate text-creme">
        {linha.nome}
        {sua && <span className="ml-1.5 text-xs font-normal text-laranja-claro">você</span>}
      </span>
      <span className="shrink-0 text-areia tabular-nums">{jogo.recorde!.formato(linha.valor)}</span>
    </li>
  );
}

export function RankingCarregando() {
  return (
    <div className="card flex flex-col gap-2.5 px-4 py-3.5" aria-busy="true">
      <span className="etiqueta text-[10px] text-laranja-claro">Ranking</span>
      <p className="m-0 text-sm text-poeira">Carregando ranking…</p>
    </div>
  );
}
