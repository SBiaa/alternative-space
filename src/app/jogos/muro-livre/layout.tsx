import { Caveat, Permanent_Marker } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { carregarMuro } from "@/app/actions/muro";
import { MuroProvider } from "@/components/muro/useMuro";
import { MuroShell } from "@/components/muro/MuroShell";
import { TEXTOS } from "@/lib/muro/conteudo";

// Letras do caderno: só carregam nas telas do Muro Livre.
const marcador = Permanent_Marker({ variable: "--font-permanent-marker", subsets: ["latin"], weight: "400" });
const caneta = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "700"] });

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`${marcador.variable} ${caneta.variable}`}>
      <Suspense fallback={<p className="muro-tema px-4 py-10">{TEXTOS.procurando}</p>}>
        <Dados>{children}</Dados>
      </Suspense>
    </div>
  );
}

async function Dados({ children }: { children: ReactNode }) {
  const inicial = await carregarMuro();
  return (
    <MuroProvider inicial={inicial}>
      <MuroShell>{children}</MuroShell>
    </MuroProvider>
  );
}
