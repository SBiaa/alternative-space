import type { ComponentProps } from "react";

// Estilo dos textos em MDX do Skate Universe (manobras e jornal), sobre o fundo escuro.
export const componentesMdx = {
  h2: (p: ComponentProps<"h2">) => <h2 className="mt-4 font-titulo text-2xl font-semibold text-creme sm:text-3xl" {...p} />,
  h3: (p: ComponentProps<"h3">) => <h3 className="font-titulo text-xl font-semibold text-laranja-claro" {...p} />,
  p: (p: ComponentProps<"p">) => <p className="m-0" {...p} />,
  a: (p: ComponentProps<"a">) => <a className="font-semibold text-laranja-claro underline" {...p} />,
  ul: (p: ComponentProps<"ul">) => <ul className="m-0 list-disc space-y-1.5 pl-6" {...p} />,
  ol: (p: ComponentProps<"ol">) => <ol className="m-0 list-decimal space-y-1.5 pl-6" {...p} />,
  strong: (p: ComponentProps<"strong">) => <strong className="font-semibold text-creme" {...p} />,
  blockquote: (p: ComponentProps<"blockquote">) => (
    <blockquote className="m-0 rounded-r-lg border-l-4 border-laranja bg-[rgb(236_227_190/0.06)] px-5 py-3" {...p} />
  ),
};
