import Link from 'next/link';

export default function TeamNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-2xl font-semibold">Time não encontrado</h1>
      <p className="text-muted">Ele pode ter sido apagado, ou você não tem nenhuma ficha nele.</p>
      <Link href="/fichas/times" className="text-accent hover:underline">
        Voltar para Times
      </Link>
    </div>
  );
}
