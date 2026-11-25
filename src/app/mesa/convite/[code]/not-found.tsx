import Link from 'next/link';

export default function ConviteNaoEncontrado() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-2xl font-semibold">Convite inválido</h1>
      <p className="text-muted">O mestre pode ter gerado um link novo. Peça o link atualizado.</p>
      <Link href="/mesa" className="text-accent hover:underline">
        Ir para a Mesa do Mestre
      </Link>
    </div>
  );
}
