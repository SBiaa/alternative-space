import Image from "next/image";
import Link from "next/link";
import { formatDate, type PostMeta } from "@/lib/blog-shared";

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col text-creme no-underline">
        <div className="relative aspect-[16/10] bg-cabine">
          <Image src={post.cover} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" unoptimized={post.cover.endsWith(".svg")} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <span className="font-ficha text-[11px] uppercase text-laranja-claro">
            {post.category} · {formatDate(post.date)}
          </span>
          <h3 className="text-[19px] font-semibold leading-[1.2]">{post.title}</h3>
          <p className="text-[15px] leading-normal text-areia">{post.excerpt}</p>
          <span className="mt-auto pt-2 font-ficha text-[11px] text-poeira">{post.readingTime} MIN DE LEITURA</span>
        </div>
      </Link>
    </article>
  );
}
