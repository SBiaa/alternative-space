// Sistemas de ficha de personagem, em /fichas/<slug>. Dois jeitos:
// - interno: a página mora aqui mesmo, em src/app/fichas/<slug>. Sempre aparece.
// - externo: outro app Next, mostrado por rewrite (next.config.ts), com `basePath: "/fichas/<slug>"`.
//   Ponha a URL do deploy na variável `env`. Sem ela, some da lista e a rota não existe (em dev, usa `devUrl`).
export type SistemaFicha = {
  slug: string;
  name: string;
  tagline: string;
  text: string;
  color: "azul" | "noite" | "laranja" | "estrela" | "creme";
} & ({ interno: true } | { interno?: false; env: string; devUrl: string });

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
  {
    slug: "pathfinder",
    name: "Pathfinder 2ª edição",
    tagline: "Fantasia heroica, masmorras e escolhas que importam.",
    text: "Monte seu herói por ancestralidade, antecedente e classe, com os boosts de atributo calculados pra você.",
    color: "laranja",
    interno: true,
  },
];

// Origem do app do sistema (sem barra no fim), ou null se não estiver configurado.
export function origemDoSistema(s: SistemaFicha, env: NodeJS.ProcessEnv = process.env): string | null {
  if (s.interno) return null;
  const url = env[s.env] || (env.NODE_ENV === "development" ? s.devUrl : "");
  return url ? url.replace(/\/+$/, "") : null;
}

export const sistemasAtivos = (env: NodeJS.ProcessEnv = process.env) =>
  sistemasFicha.filter((s) => s.interno || origemDoSistema(s, env));
