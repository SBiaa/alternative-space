import Link from 'next/link';

export default function CharacterNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-2xl font-semibold">Ficha não encontrada</h1>
      <p className="text-muted">Ela pode ter sido apagada, ou pertence a outra conta.</p>
      <Link href="/fichas" className="text-accent hover:underline">
        Voltar para Minhas fichas
      </Link>
    </div>
  );
}
