// Tema "Mesa de Madeira": só utilitários Tailwind sobre os tokens que já existem (lareira-*, creme). Raios 4/6/8, sem rotação.
// Luz de lâmpada: um brilho quente no alto da mesa, sobre a madeira escura.
export const MESA =
  "relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9 bg-lareira-madeira text-creme " +
  "bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgb(242_193_78/0.28),transparent_70%),linear-gradient(180deg,#3d2619_0%,#2b1a12_55%,#241610_100%)]";

// Contêiner de leitura. Mobile primeiro; 390px já cabe.
export const COLUNA = "mx-auto flex w-full max-w-[720px] flex-col gap-5";

// Cartão de papel de ficha (texto da cena e fichas): creme com texto escuro, o foco vira azul (regra global de .surface-creme).
export const PAPEL = "surface-creme p-4 sm:p-6";

export const ETIQUETA = "etiqueta text-[11px] text-lareira-brasa sm:text-xs";
export const LINK_VOLTAR = "etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs min-h-11 inline-flex items-center";
