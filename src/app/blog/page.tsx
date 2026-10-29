import type { Metadata } from "next";
import { BlogList } from "@/components/BlogList";
import { getPosts } from "@/lib/blog";
import { categories } from "@/lib/blog-shared";

export const metadata: Metadata = {
  title: "Blog",
  description: "Missões do mês, artistas, guias, opinião e cultura geek BR.",
};

export default function BlogPage() {
  return (
    <section className="secao">
      <div className="miolo flex flex-col gap-9">
        <div className="flex flex-col gap-3">
          <span className="etiqueta text-azul">Blog</span>
          <h1 className="h2 text-azul">Nada de mais do mesmo.</h1>
        </div>
        <BlogList posts={getPosts()} categories={categories} />
      </div>
    </section>
  );
}
