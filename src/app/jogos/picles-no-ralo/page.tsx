import type { Metadata } from "next";
import { JogoPagina } from "@/components/JogoPagina";
import { PiclesNoRalo } from "@/components/PiclesNoRalo";

export const metadata: Metadata = {
  title: "Picles no Ralo",
  description: "Segura pra subir, solta pra descer: leve o Picles Rick pelo esgoto desviando de canos e ratos.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="picles-no-ralo"
      comoJogar={
        <p className="m-0">
          Um botão só: segura pra subir, solta pra descer. O esgoto vai apertando e os ratos não perdoam. Vale mouse, toque, espaço ou seta pra cima.
        </p>
      }
      extra={<p className="etiqueta text-center text-[11px] text-poeira">jogo de fã, sem ligação oficial com a série</p>}
    >
      <PiclesNoRalo />
    </JogoPagina>
  );
}
