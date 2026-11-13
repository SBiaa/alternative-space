import type { Metadata } from "next";
import { CadernoTela } from "@/components/muro/CadernoTela";

export const metadata: Metadata = { title: "Caderno · Muro Livre" };

export default function Page() {
  return <CadernoTela />;
}
