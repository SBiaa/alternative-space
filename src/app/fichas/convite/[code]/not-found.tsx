import Link from 'next/link';

export default function InviteNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-2xl font-semibold">Convite inválido</h1>
      <p className="text-muted">Esse link não vale mais. Peça um link novo para quem montou o time.</p>
      <Link href="/fichas/times" className="text-accent hover:underline">
        Ver meus times
      </Link>
    </div>
  );
}
