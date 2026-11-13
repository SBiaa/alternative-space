import type { Metadata } from "next";
import { EncontroTela } from "@/components/muro/EncontroTela";

export const metadata: Metadata = { title: "Encontro de grafite · Muro Livre" };

export default function Page() {
  return <EncontroTela />;
}
