import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function Page({ searchParams }: PageProps<"/entrar">) {
  return <AuthPage mode="entrar" searchParams={searchParams} />;
}
