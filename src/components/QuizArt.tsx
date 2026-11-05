import Image from "next/image";

// Arte de um resultado ou personagem. null = espaço reservado pra arte da comunidade; undefined = sem arte.
export function QuizArt({ image, alt, sizes, className = "" }: { image: string | null | undefined; alt: string; sizes: string; className?: string }) {
  if (image === undefined) return null;
  return (
    <div className={`relative aspect-square overflow-hidden rounded-xl border-2 border-noite bg-creme-escuro ${className}`}>
      {image ? (
        <Image src={image} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 p-4 text-center text-azul">
          <span className="font-ficha text-xs tracking-widest">ARTE EM BREVE</span>
          <span className="text-sm leading-snug text-tinta">Feita por artistas da comunidade</span>
        </div>
      )}
    </div>
  );
}
