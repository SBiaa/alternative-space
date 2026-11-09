import type { Metadata } from "next";
import { Star } from "@/components/Star";
import { sistemasAtivos } from "@/config/fichas";
import { resultTheme } from "@/lib/quiz";

export const metadata: Metadata = {
  title: "Fichas",
  description: "Crie a ficha do seu personagem de RPG, passo a passo.",
};

export default function Page() {
  // Lida no build, igual aos rewrites do next.config.ts: mudou a variável, precisa de novo deploy.
  const sistemas = sistemasAtivos();
  return (
    <section className="secao !pt-16">
      <div className="miolo flex flex-col gap-10">
        <div className="relative flex max-w-[760px] flex-col gap-4">
          <span className="etiqueta text-azul">Fichas</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4.25rem)" }}>Sua ficha, sem sofrimento.</h1>
          <p className="text-lg leading-relaxed text-tinta">Escolhe o sistema e monta o personagem passo a passo. Mais sistemas chegando.</p>
          <Star className="absolute -top-4 right-0 hidden sm:block" />
        </div>
        {sistemas.length === 0 ? (
          <p className="text-lg text-tinta">Nenhum sistema disponível agora. Volta daqui a pouco.</p>
        ) : (
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7 p-0">
            {sistemas.map((s) => {
              const theme = resultTheme[s.color] ?? resultTheme.azul;
              return (
                <li key={s.slug}>
                  {/* <a> e não <Link>: sistema externo é outro app, a navegação precisa recarregar a página. */}
                  <a href={`/fichas/${s.slug}`} className={`flex h-full flex-col gap-3 rounded-2xl border-2 border-noite p-7 no-underline shadow-duro-sm ${theme.card}`}>
                    <span className={`etiqueta text-[13px] ${theme.label}`}>{s.tagline}</span>
                    <h2 className="font-titulo text-[2rem] font-bold leading-[1.05]">{s.name}</h2>
                    <p className="leading-normal">{s.text}</p>
                    <span className="mt-auto pt-2 font-titulo text-xl font-bold">Criar ficha →</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
