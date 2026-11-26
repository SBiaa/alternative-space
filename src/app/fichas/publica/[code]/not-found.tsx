import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">Esse link não vale mais</h1>
      <p className="max-w-md text-sm text-muted">
        A ficha não está mais compartilhada ou o link foi trocado. Peça um link novo para quem te enviou.
      </p>
      <Link href="/fichas" className="text-sm text-accent hover:underline">Ir para as fichas</Link>
    </main>
  );
}
