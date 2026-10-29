import Image from "next/image";
import Link from "next/link";
import { formatDate, type PostMeta } from "@/lib/blog-shared";

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col text-noite no-underline">
        <div className="relative aspect-[16/10] border-b-2 border-noite bg-creme-escuro">
          <Image src={post.cover} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" unoptimized={post.cover.endsWith(".svg")} />
        </div>
        <div className="flex flex-1 flex-col gap-2.5 px-[22px] pb-6 pt-5">
          <span className="font-ficha text-xs uppercase tracking-wider text-estrela">
            {post.category} · {formatDate(post.date)}
          </span>
          <h3 className="font-titulo text-[1.6rem] font-semibold leading-[1.1]">{post.title}</h3>
          <p className="text-base leading-normal text-tinta">{post.excerpt}</p>
          <span className="mt-auto font-ficha text-xs text-neutro">{post.readingTime} MIN DE LEITURA</span>
        </div>
      </Link>
    </article>
  );
}
