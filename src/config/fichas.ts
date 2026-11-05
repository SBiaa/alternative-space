// Sistemas de ficha de personagem. Cada um é um app Next separado, mostrado aqui em /fichas/<slug>
// por rewrite (next.config.ts). O app do sistema precisa ter `basePath: "/fichas/<slug>"`.
//
// Pra adicionar um sistema: crie a entrada aqui e ponha a URL do deploy dele na variável `env`.
// Sem a variável, o sistema some da lista e a rota não existe (em dev, usa `devUrl`).
export type SistemaFicha = {
  slug: string;
  name: string;
  tagline: string;
  text: string;
  color: "azul" | "noite" | "laranja" | "estrela" | "creme";
  env: string;
  devUrl: string;
};

export const sistemasFicha: SistemaFicha[] = [
  {
    slug: "shadowrun",
    name: "Shadowrun 5ª edição",
    tagline: "Cyberpunk, magia e corridas nas sombras.",
    text: "Criador guiado pelo sistema de prioridades, passo a passo e pensado pra quem nunca jogou.",
    color: "noite",
    env: "FICHAS_SHADOWRUN_URL",
    devUrl: "http://localhost:3001",
  },
];

// Origem do app do sistema (sem barra no fim), ou null se não estiver configurado.
export function origemDoSistema(s: SistemaFicha, env: NodeJS.ProcessEnv = process.env): string | null {
  const url = env[s.env] || (env.NODE_ENV === "development" ? s.devUrl : "");
  return url ? url.replace(/\/+$/, "") : null;
}

export const sistemasAtivos = (env: NodeJS.ProcessEnv = process.env) =>
  sistemasFicha.filter((s) => origemDoSistema(s, env));
