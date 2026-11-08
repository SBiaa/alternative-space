import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Ph } from "@/components/Ph";
import { Star } from "@/components/Star";
import { getUser } from "@/lib/auth/server";
import { colecoes, getColecao, type Colecao, type Piece } from "@/lib/colecoes";
import { resultTheme } from "@/lib/quiz";

type Props = PageProps<"/colecoes/[slug]">;

export function generateStaticParams() {
  return Object.keys(colecoes).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getColecao((await params).slug);
  return c ? { title: `Coleção ${c.name}`, description: c.tagline } : {};
}

export default function Page({ params }: Props) {
  return (
    <section className="secao !pt-16">
      <div className="miolo flex flex-col gap-12">
        <Suspense fallback={<p className="font-titulo text-2xl font-bold text-azul">Carregando coleção…</p>}>
          <ColecaoView params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function ColecaoView({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const c = getColecao(slug);
  if (!c) notFound();
  const theme = resultTheme[c.color] ?? resultTheme.azul;

  return (
    <>
      <div className={`relative flex flex-col gap-4 rounded-2xl border-[3px] border-noite px-8 py-10 shadow-duro-lg sm:px-12 ${theme.card}`}>
        <Star className="absolute -right-5 -top-6" color={c.color === "creme" ? "#ab392f" : "#ece3be"} />
        <span className={`etiqueta text-[13px] ${theme.label}`}>Coleção · {c.status} · {c.date}</span>
        <h1 className="font-titulo font-bold leading-[0.98]" style={{ fontSize: "clamp(2.6rem, 7vw, 4.75rem)" }}>{c.name}</h1>
        <p className="font-titulo text-[1.5rem] font-semibold leading-tight">{c.tagline}</p>
        <p className="max-w-[640px] text-lg leading-relaxed">{c.text}</p>
      </div>
      <Suspense fallback={<Pieces pieces={c.pieces.slice(0, c.preview)} full={false} />}>
        <Gallery slug={slug} c={c} />
      </Suspense>
      <Link href="/colecoes" className="font-titulo text-xl font-bold text-azul">← Todas as coleções</Link>
    </>
  );
}

// Tripulantes veem tudo; o resto vê a prévia e um convite pra entrar.
async function Gallery({ slug, c }: { slug: string; c: Colecao }) {
  const full = Boolean(await getUser());
  const hidden = c.pieces.length - c.preview;
  return (
    <div className="flex flex-col gap-8">
      <Pieces pieces={full ? c.pieces : c.pieces.slice(0, c.preview)} full={full} />
      {!full && hidden > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-5 !bg-azul p-7 text-creme">
          <div className="flex max-w-[560px] flex-col gap-2">
            <span className="etiqueta text-[13px] text-laranja-claro">+{hidden} peças só pra tripulantes</span>
            <p className="font-titulo text-[1.6rem] font-semibold leading-tight">Cria sua conta e vê a coleção na íntegra.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/cadastro?next=/colecoes/${slug}`} className="btn bg-laranja text-noite">Virar tripulante</Link>
            <Link href={`/entrar?next=/colecoes/${slug}`} className="btn bg-creme-claro text-noite">Já tenho conta</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Pieces({ pieces, full }: { pieces: Piece[]; full: boolean }) {
  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 p-0">
      {pieces.map((p) => (
        <li key={p.name}>
          <article className="card flex h-full flex-col overflow-hidden bg-creme">
            <Ph image={p.image} label={`[FOTO ${p.name.toUpperCase()}]`} ratio="1/1" />
            <div className="flex flex-1 flex-col gap-1.5 px-5 pb-5 pt-4">
              <span className="font-ficha text-xs text-tinta">{p.tag && `${p.tag.toUpperCase()} · `}ARTE: {p.artist}</span>
              <h2 className="font-titulo text-[1.4rem] font-semibold">{p.name}</h2>
              {full && <p className="text-[15px] leading-normal text-tinta">{p.text}</p>}
              {full && <span className="mt-auto pt-1.5 font-titulo text-[1.4rem] font-bold text-azul">R$ {p.price}</span>}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
