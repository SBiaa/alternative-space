import Image from "next/image";
import { lerPirata } from "@/lib/pirata";
import { resultTheme } from "@/lib/quiz";
import { PirataArt } from "./PirataArt";

// Avatar salvo só é mostrado se for uma arte do site.
export const avatarSeguro = (src: unknown): string | null =>
  typeof src === "string" && /^\/quiz\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|png|jpg)$/.test(src) ? src : null;

// Arte escolhida pelo tripulante (de quiz ou o pirata montado) ou, sem arte, a inicial do nome na cor do perfil.
export function Avatar({ name, image, cor = "azul", size = 96 }: { name: string; image?: string | null; cor?: string; size?: number }) {
  const src = avatarSeguro(image);
  const pirata = lerPirata(image);
  const theme = resultTheme[cor] ?? resultTheme.azul;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-noite font-titulo font-bold ${theme.card}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {pirata ? <PirataArt p={pirata} className="absolute inset-0 size-full" /> : src ? <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" /> : (name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
