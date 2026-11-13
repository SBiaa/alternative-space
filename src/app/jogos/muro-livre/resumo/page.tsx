import type { Metadata } from "next";
import { ResumoTela } from "@/components/muro/ResumoTela";

export const metadata: Metadata = { title: "Resumo · Muro Livre" };

export default function Page() {
  return <ResumoTela />;
}
