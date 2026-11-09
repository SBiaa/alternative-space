import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP sem nonce (ver node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md):
// nonce obrigaria todas as páginas a serem dinâmicas. Mesmo assim, só carrega coisa do próprio site,
// e nenhum outro site consegue embutir as páginas num iframe (frame-ancestors).
// Os jogos (Phaser) montam texturas e sons em blob:/data:, por isso img/media/connect aceitam esses dois.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' blob: data:${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]),
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Em dev, deixa abrir o site pelo celular na mesma rede Wi-Fi (http://<IP do computador>:porta).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
