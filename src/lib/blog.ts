import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import type { PostMeta } from "./blog-shared";

const dir = path.join(process.cwd(), "content", "blog");

function files() {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")) : [];
}

export function getPosts(): PostMeta[] {
  return files()
    .map((f) => matter(fs.readFileSync(path.join(dir, f), "utf8")).data as PostMeta)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPost(slug: string) {
  const f = files().find((n) => {
    const { data } = matter(fs.readFileSync(path.join(dir, n), "utf8"));
    return data.slug === slug;
  });
  if (!f) return null;
  const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
  return { meta: data as PostMeta, content };
}
