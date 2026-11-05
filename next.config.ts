import type { NextConfig } from "next";
import { sistemasFicha, origemDoSistema } from "./src/config/fichas";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Resultados do primeiro quiz antes de existir mais de um quiz.
  async redirects() {
    return [
      { source: "/quiz/:resultado(noite|laboratorio|mesa|porao)", destination: "/quiz/personagem-alternativo/:resultado", permanent: true },
    ];
  },
  // Cada sistema de ficha é outro app, servido em /fichas/<slug> (ver src/config/fichas.ts).
  async rewrites() {
    return sistemasFicha.flatMap((s) => {
      const origem = origemDoSistema(s);
      if (!origem) return [];
      const base = `/fichas/${s.slug}`;
      return [
        { source: base, destination: `${origem}${base}` },
        { source: `${base}/:path+`, destination: `${origem}${base}/:path+` },
      ];
    });
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
