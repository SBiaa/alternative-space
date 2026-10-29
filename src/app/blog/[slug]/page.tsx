import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPost, getPosts } from "@/lib/blog";
import { formatDate } from "@/lib/blog-shared";
import { site } from "@/config/site";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const { title, excerpt, cover, date } = post.meta;
  return {
    title,
    description: excerpt,
    openGraph: { title, description: excerpt, type: "article", publishedTime: date, images: [{ url: cover }], url: `${site.url}/blog/${slug}` },
  };
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const { title, category, date, readingTime, cover } = post.meta;

  return (
    <article className="px-6 py-16">
      <div className="mx-auto flex max-w-[760px] flex-col gap-6">
        <Link href="/blog" className="font-titulo text-lg font-bold text-azul">← Voltar pro blog</Link>
        <span className="font-ficha text-xs uppercase tracking-wider text-estrela">
          {category} · {formatDate(date)} · {readingTime} min de leitura
        </span>
        <h1 className="font-titulo font-bold leading-[1.02] text-azul" style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)" }}>{title}</h1>
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border-2 border-noite shadow-duro">
          <Image src={cover} alt="" fill priority sizes="760px" className="object-cover" unoptimized={cover.endsWith(".svg")} />
        </div>
        <div className="flex flex-col gap-5 text-[1.1rem] leading-relaxed text-tinta">
          <MDXRemote
            source={post.content}
            components={{
              h2: (p) => <h2 className="mt-4 font-titulo text-3xl font-bold text-azul" {...p} />,
              h3: (p) => <h3 className="font-titulo text-2xl font-semibold text-azul" {...p} />,
              a: (p) => <a className="font-bold text-azul underline" {...p} />,
              ul: (p) => <ul className="list-disc space-y-1 pl-6" {...p} />,
              ol: (p) => <ol className="list-decimal space-y-1 pl-6" {...p} />,
              blockquote: (p) => <blockquote className="rounded-r-xl border-l-4 border-laranja bg-creme-claro px-5 py-3" {...p} />,
            }}
          />
        </div>
      </div>
    </article>
  );
}
