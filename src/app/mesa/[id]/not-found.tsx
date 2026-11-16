import Link from 'next/link';

export default function CampanhaNaoEncontrada() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-2xl font-semibold">Campanha não encontrada</h1>
      <p className="text-muted">Ela pode ter sido apagada, ou você não está nessa mesa.</p>
      <Link href="/mesa" className="text-accent hover:underline">
        Voltar para a Mesa do Mestre
      </Link>
    </div>
  );
}
