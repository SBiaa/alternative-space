import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Diário de Bordo 2027", template: "%s · Diário de Bordo" }, robots: { index: false } };

export default function Layout({ children }: LayoutProps<"/diario">) {
  return (
    <div className="diario min-h-[70vh] px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto max-w-[1100px]">{children}</div>
    </div>
  );
}
