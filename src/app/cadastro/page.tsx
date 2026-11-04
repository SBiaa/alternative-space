import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";

export const metadata: Metadata = { title: "Cadastro de tripulante", robots: { index: false } };

export default function Page({ searchParams }: PageProps<"/cadastro">) {
  return <AuthPage mode="cadastro" searchParams={searchParams} />;
}
