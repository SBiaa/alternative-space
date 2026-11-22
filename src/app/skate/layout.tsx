import { Suspense } from "react";
import { NavSkate } from "@/components/skate/NavSkate";

export default function SkateLayout({ children }: LayoutProps<"/skate">) {
  return (
    <>
      {/* usePathname() numa rota dinâmica (ex.: /skate/picos/[id]) precisa de Suspense, senão o build falha. */}
      <Suspense fallback={<div className="h-12 border-b line-sutil" aria-hidden />}>
        <NavSkate />
      </Suspense>
      {children}
    </>
  );
}
