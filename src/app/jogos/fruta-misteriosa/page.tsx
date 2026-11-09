import type { Metadata } from "next";
import { FrutaMisteriosa } from "@/components/FrutaMisteriosa";
import { JogoPagina } from "@/components/JogoPagina";

export const metadata: Metadata = {
  title: "Fruta Misteriosa",
  description: "Plataforma no meio do mar: atravesse as ilhas até o baú sem encostar na água.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="fruta-misteriosa"
      comoJogar={
        <p className="m-0">
          Atravesse as ilhas até o baú. Encostou na água, afundou e recomeça. No computador: setas ou A/D pra andar, espaço, W ou Z pra pular,
          X, K ou Shift pro poder.
        </p>
      }
    >
      <FrutaMisteriosa />
    </JogoPagina>
  );
}
