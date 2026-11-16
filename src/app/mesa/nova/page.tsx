import type { Metadata } from 'next';
import Link from 'next/link';
import { CampanhaForm } from '@/components/mesa/MesaForms';
import { Pagina } from '@/components/mesa/MesaUI';
import { Card } from '@/components/fichas/ui';

export const metadata: Metadata = { title: 'Nova campanha' };

export default function NovaCampanhaPage() {
  return (
    <Pagina largura="max-w-3xl">
      <Link href="/mesa" className="text-sm text-muted hover:text-ink">
        ← Mesa do Mestre
      </Link>
      <h1 className="mb-6 font-display text-3xl font-semibold">Nova campanha</h1>
      <Card>
        <CampanhaForm />
      </Card>
    </Pagina>
  );
}
