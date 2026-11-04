import type { NextConfig } from "next";

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
