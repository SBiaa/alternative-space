import Link from "next/link";

// Troca entre as duas metades do "Jogar": quizzes e fliperama.
export function JogarAbas({ atual }: { atual: "quiz" | "fliperama" }) {
  const abas = [
    { id: "quiz", label: "Quizzes", href: "/quiz" },
    { id: "fliperama", label: "Fliperama", href: "/jogos" },
  ] as const;
  return (
    <nav aria-label="Escolha o que jogar" className="grid grid-cols-2 rounded-lg border border-creme/18 bg-creme/8 p-1 text-[15px] font-medium sm:min-w-[280px]">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          aria-current={atual === a.id ? "page" : undefined}
          className={`rounded-md px-4.5 py-2.75 text-center no-underline ${atual === a.id ? "bg-creme font-semibold text-noite" : "text-areia hover:text-creme"}`}
        >
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
