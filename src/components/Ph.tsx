import Image from "next/image";

export function Ph({ image, label, ratio = "4/3" }: { image: string | null; label: string; ratio?: string }) {
  return (
    <div className="relative flex items-center justify-center bg-cabine font-ficha text-[10px] text-poeira" style={{ aspectRatio: ratio }}>
      {image ? <Image src={image} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" /> : label}
    </div>
  );
}
