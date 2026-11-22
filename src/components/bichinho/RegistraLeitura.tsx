"use client";

import { useEffect } from "react";
import { registrarLeitura } from "@/app/actions/bichinho";

// Avisa o servidor que o post foi aberto. A página do blog continua estática; quem confere o login é a ação.
export function RegistraLeitura({ slug }: { slug: string }) {
  useEffect(() => {
    const t = setTimeout(() => void registrarLeitura({ slug }), 8000);
    return () => clearTimeout(t);
  }, [slug]);
  return null;
}
