import type { Metadata } from "next";
import { TelaBarco } from "@/components/mar/TelaBarco";
import { T } from "@/lib/mar-sem-fim/textos";

export const metadata: Metadata = { title: T.barco.titulo };

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-[960px]">
        <TelaBarco />
      </div>
    </section>
  );
}
