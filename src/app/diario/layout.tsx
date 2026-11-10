import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Diário de Bordo 2027", template: "%s · Diário de Bordo" }, robots: { index: false } };

export default function Layout({ children }: LayoutProps<"/diario">) {
  return <div className="relative mx-auto max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:pt-9">{children}</div>;
}
