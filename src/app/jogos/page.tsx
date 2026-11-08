import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "@/components/Star";

export const metadata: Metadata = {
  title: "Jogos",
  description: "Joguinhos rápidos pra jogar no navegador, sem instalar nada.",
};

const jogos = [
  {
    href: "/jogos/log-pose-doido",
    tag: "One Piece · controles malucos",
    nome: "Log Pose Doido",
    texto: "Guie o navio entre redemoinhos, tempestades e reis do mar. O Log Pose muda de ideia o tempo todo.",
  },
  {
    href: "/jogos/monte-seu-pirata",
    tag: "Vestir bonequinho · vira avatar",
    nome: "Monte seu Pirata",
    texto: "Chapéu, cicatriz, arma, roupa e bichinho. Monta do seu jeito e usa como avatar do perfil.",
  },
  {
    href: "/jogos/picles-no-ralo",
    tag: "Rick and Morty · um botão",
    nome: "Picles no Ralo",
    texto: "Segura pra subir, solta pra descer. Leve o Picles Rick pelo esgoto sem virar janta de rato.",
  },
  {
    href: "/jogos/fabrica-de-ajudantes",
    tag: "Clicker · pedidos absurdos",
    nome: "Fábrica de Ajudantes",
    texto: "Crie ajudantes azuis pra cumprir pedidos absurdos. Se demorar demais, eles entram em pane e a fábrica vira caos.",
  },
  {
    href: "/jogos/fruta-misteriosa",
    tag: "Plataforma · protótipo",
    nome: "Fruta Misteriosa",
    texto: "Atravesse as ilhas até o baú sem encostar na água. Em breve: uma fruta sorteada muda tudo.",
  },
  {
    href: "/jogos/duelo-pirata",
    tag: "One Piece · luta 1x1",
    nome: "Duelo Pirata",
    texto: "Luffy, Zoro, Sanji ou Nami no convés. Contra a CPU ou contra um amigo, melhor de 3.",
  },
];

export default function Page() {
  return (
    <section className="secao !pt-16">
      <div className="miolo flex flex-col gap-10">
        <div className="relative flex max-w-[760px] flex-col gap-4">
          <span className="etiqueta text-azul">Jogos</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4.25rem)" }}>
            Só mais uma partida.
          </h1>
          <p className="text-lg leading-relaxed text-tinta">Joguinhos rápidos, direto no navegador. Mais chegando.</p>
          <Star className="absolute -top-4 right-0 hidden sm:block" />
        </div>
        <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7 p-0">
          {jogos.map((j) => (
            <li key={j.href}>
              <Link href={j.href} className="flex h-full flex-col gap-3 rounded-2xl border-2 border-noite bg-[#74b53c] p-7 text-noite no-underline shadow-duro-sm">
                <span className="etiqueta text-[13px]">{j.tag}</span>
                <h2 className="font-titulo text-[2rem] font-bold leading-[1.05]">{j.nome}</h2>
                <p className="leading-normal">{j.texto}</p>
                <span className="mt-auto pt-2 font-titulo text-xl font-bold">Jogar →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
