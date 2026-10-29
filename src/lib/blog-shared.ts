export const categories = [
  "Missão do mês",
  "Artistas",
  "Guias",
  "Opinião",
  "Cultura geek BR",
] as const;

export type Category = (typeof categories)[number];

export type PostMeta = {
  title: string;
  slug: string;
  date: string;
  category: Category;
  excerpt: string;
  cover: string;
  readingTime: number;
};

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(iso))
    .replace(".", "");
}
