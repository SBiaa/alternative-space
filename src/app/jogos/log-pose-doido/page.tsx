import type { Metadata } from "next";
import { JogoPagina } from "@/components/JogoPagina";
import { LogPoseDoido } from "@/components/LogPoseDoido";

export const metadata: Metadata = {
  title: "Log Pose Doido",
  description: "Guie o navio entre redemoinhos, tempestades e reis do mar, com um Log Pose que muda de ideia o tempo todo.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="log-pose-doido"
      comoJogar={
        <p className="m-0">
          Desvie dos redemoinhos, dos raios e dos reis do mar. O Log Pose gira sozinho e as setas giram junto: quando ele tremer, se prepara.
          No computador, setas ou WASD; no celular, segure o dedo na tela pra remar naquela direção. São 3 cascos de vida e cada moeda vale 10 pontos.
        </p>
      }
    >
      <LogPoseDoido />
    </JogoPagina>
  );
}
