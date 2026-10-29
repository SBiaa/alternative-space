"use client";

import { useState } from "react";
import { PostCard } from "./PostCard";
import type { PostMeta } from "@/lib/blog-shared";

export function BlogList({ posts, categories }: { posts: PostMeta[]; categories: readonly string[] }) {
  const [active, setActive] = useState<string>("Todos");
  const shown = active === "Todos" ? posts : posts.filter((p) => p.category === active);

  return (
    <div className="flex flex-col gap-9">
      <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2.5 font-ficha text-[13px]">
        {["Todos", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={active === c}
            onClick={() => setActive(c)}
            className={`cursor-pointer rounded-full border-2 border-noite px-4 py-2.5 ${active === c ? "bg-azul text-creme" : "bg-creme-claro text-noite"}`}
          >
            {c}
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-7">
          {shown.map((p) => <PostCard key={p.slug} post={p} />)}
        </div>
      ) : (
        <p className="text-lg">Ainda não tem post nessa categoria. Volta logo.</p>
      )}
    </div>
  );
}
