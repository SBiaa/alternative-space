import type { Metadata } from "next";
import { FormNovo } from "@/components/mar/FormNovo";
import { T } from "@/lib/mar-sem-fim/textos";

export const metadata: Metadata = { title: T.novo.titulo };

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-[860px]">
        <FormNovo />
      </div>
    </section>
  );
}
