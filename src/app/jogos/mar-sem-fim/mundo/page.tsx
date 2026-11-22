import type { Metadata } from "next";
import { Mundo } from "@/components/mar/Mundo";
import { T } from "@/lib/mar-sem-fim/textos";

export const metadata: Metadata = { title: T.mundo.titulo };

export default function Page() {
  return <Mundo />;
}
