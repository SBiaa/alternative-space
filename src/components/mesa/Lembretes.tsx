import Link from 'next/link';
import { Card } from '@/components/fichas/ui';
import type { CorCampanha, RespostaPresenca } from '@/lib/mesa/regras';
import { quandoRelativo } from '@/lib/mesa/regras-agenda';
import { Presenca } from './MesaForms';
import { Bolinha } from './MesaUI';

export interface LembreteItem {
  id: string;
  campanhaId: string;
  campanha: string;
  cor: CorCampanha;
  titulo: string;
  iniciaEm: Date;
  local: string;
  souMestre: boolean;
  minhaResposta: RespostaPresenca | null;
}

/** Faixa de "sessão chegando": as sessões das próximas horas, com a resposta de presença à mão. */
export function Lembretes({ itens, agora }: { itens: LembreteItem[]; agora: Date }) {
  if (!itens.length) return null;
  return (
    <section aria-label="Sessões chegando" className="flex flex-col gap-3">
      {itens.map((s) => (
        <Card key={s.id} className="border-accent/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-accent">Sessão {quandoRelativo(s.iniciaEm, agora)}</p>
              <Link
                href={`/mesa/${s.campanhaId}/sessoes/${s.id}`}
                className="flex items-center gap-2 font-display text-lg font-semibold hover:underline"
              >
                <Bolinha cor={s.cor} />
                {s.campanha}
                {s.titulo && <span className="font-normal text-muted"> · {s.titulo}</span>}
              </Link>
              {s.local && <p className="text-sm text-muted">{s.local}</p>}
            </div>
            {s.souMestre ? (
              <span className="text-xs text-faint">você mestra</span>
            ) : (
              <Presenca campanhaId={s.campanhaId} sessaoId={s.id} atual={s.minhaResposta} />
            )}
          </div>
        </Card>
      ))}
    </section>
  );
}
