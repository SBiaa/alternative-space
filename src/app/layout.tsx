import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Ceu } from "@/components/Ceu";
import { site } from "@/config/site";

const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} · ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, locale: "pt_BR", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased`}>
      <body className="relative flex min-h-screen flex-col overflow-x-hidden">
        <Ceu />
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-creme-claro focus:p-3 focus:text-noite">
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo" className="relative flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
