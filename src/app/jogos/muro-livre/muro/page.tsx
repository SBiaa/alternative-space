import type { Metadata } from "next";
import { MurosLista } from "@/components/muro/MurosLista";

export const metadata: Metadata = { title: "Muros · Muro Livre" };

export default function Page() {
  return <MurosLista />;
}
