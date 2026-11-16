'use client';

import { useState, useSyncExternalStore } from 'react';
import { gerarLinkDaAgendaAction, salvarRotinaAction } from '@/app/mesa/actions-agenda';
import { Button, cx, Field, inputClass } from '@/components/fichas/ui';
import { DIAS_SEMANA } from '@/lib/diario/calendario';
import { LIMITES, type RespostaPresenca } from '@/lib/mesa/regras';
import { ROTINA_PADRAO, textoDoLembrete, type Rotina } from '@/lib/mesa/regras-agenda';
import { Aviso, useMesa } from './MesaForms';

const noop = () => () => {};
const DURACOES = [60, 90, 120, 150, 180, 210, 240, 300, 360, 480];
const nomeDuracao = (m: number) => (m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);
const linkClass =
  'inline-flex items-center rounded-md border border-line-strong px-3 py-1.5 text-sm text-muted no-underline transition hover:border-accent/60 hover:text-ink';

// ---------------------------------------------------------------------------
// Rotina das sessões ("toda sexta às 20h")

export function RotinaForm({ campanhaId, inicial }: { campanhaId: string; inicial: Rotina | null }) {
  const [ativa, setAtiva] = useState(!!inicial);
  const [r, setR] = useState<Rotina>(inicial ?? ROTINA_PADRAO);
  const set = <K extends keyof Rotina>(k: K, v: Rotina[K]) => setR((x) => ({ ...x, [k]: v }));
  const { pending, erro, mensagem, run } = useMesa();
  const mudouRitmo = !!inicial && ativa && (inicial.dia !== r.dia || inicial.hora !== r.hora || inicial.intervalo !== r.intervalo);
  const duracoes = DURACOES.includes(r.duracaoMin) ? DURACOES : [...DURACOES, r.duracaoMin].sort((a, b) => a - b);

  return (
    <form
      className="flex flex-col gap-4"
      aria-label="Rotina das sessões"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          mudouRitmo &&
          !confirm(
            'Trocar o dia, a hora ou a frequência apaga as sessões já criadas pela rotina que ainda não aconteceram e que você não editou, e cria de novo no ritmo novo. Continuar?',
          )
        )
          return;
        run(() => salvarRotinaAction(campanhaId, { ativa, ...r }));
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
        Marcar as sessões sozinha
      </label>

      {ativa && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Dia da semana">
              <select className={inputClass} value={r.dia} onChange={(e) => set('dia', Number(e.target.value))}>
                {DIAS_SEMANA.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hora (Brasília)">
              <input type="time" required className={inputClass} value={r.hora} onChange={(e) => set('hora', e.target.value)} />
            </Field>
            <Field label="Frequência">
              <select className={inputClass} value={r.intervalo} onChange={(e) => set('intervalo', Number(e.target.value) === 2 ? 2 : 1)}>
                <option value={1}>Toda semana</option>
                <option value={2}>De 15 em 15 dias</option>
              </select>
            </Field>
            <Field label="Duração">
              <select className={inputClass} value={r.duracaoMin} onChange={(e) => set('duracaoMin', Number(e.target.value))}>
                {duracoes.map((d) => (
                  <option key={d} value={d}>
                    {nomeDuracao(d)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Local ou link" hint="Vai em todas as sessões que a rotina criar. Dá para trocar em cada uma depois.">
            <input
              className={inputClass}
              maxLength={LIMITES.local}
              placeholder="Casa da Ana / link do Discord"
              value={r.local}
              onChange={(e) => set('local', e.target.value)}
            />
          </Field>
          <p className="text-xs text-faint">
            A Mesa cria as sessões das próximas seis semanas e vai renovando sozinha. Se você apagar uma sessão, ela não volta.
          </p>
        </>
      )}

      <Aviso erro={erro} mensagem={mensagem} />
      <Button type="submit" variant="primary" className="self-start" disabled={pending || (!ativa && !inicial) || (ativa && !r.hora)}>
        {pending ? 'Salvando…' : 'Salvar rotina'}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Assinar o calendário (Google Agenda, celular)

export function AssinarAgenda({ token }: { token: string | null }) {
  // A origem (domínio) só existe no navegador; no servidor fica vazia.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => '');
  const [copiado, setCopiado] = useState(false);
  const { pending, erro, run } = useMesa();

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Assine uma vez e as sessões de todas as suas campanhas aparecem no Google Agenda ou no calendário do celular, e se atualizam sozinhas
          quando o mestre muda data, hora ou local.
        </p>
        <Button variant="primary" className="self-start" disabled={pending} onClick={() => run(() => gerarLinkDaAgendaAction())}>
          {pending ? 'Criando…' : 'Criar meu link de agenda'}
        </Button>
        <Aviso erro={erro} />
      </div>
    );
  }

  const https = `${origin}/agenda-mesa/${token}.ics`;
  const webcal = https.replace(/^https?:/, 'webcal:');
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Quem tem este link vê as datas das suas sessões, então não compartilhe. Se vazar, gere um novo: o antigo para de funcionar.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Link da agenda"
          readOnly
          value={https}
          className={cx(inputClass, 'min-w-0 flex-1 basis-64 font-mono text-xs')}
          onFocus={(e) => e.target.select()}
        />
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(https);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              /* sem permissão: o campo já fica selecionável */
            }
          }}
        >
          {copiado ? 'Copiado!' : 'Copiar link'}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={google} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Adicionar ao Google Agenda
        </a>
        <a href={webcal} className={linkClass}>
          Assinar no celular / Apple
        </a>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (confirm('Gerar um link novo? O link atual para de funcionar em todas as agendas que já o usam.')) run(() => gerarLinkDaAgendaAction());
          }}
        >
          Gerar novo link
        </Button>
      </div>
      <Aviso erro={erro} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lembrete para o grupo do WhatsApp

export function CopiarLembrete({
  campanhaId,
  sessaoId,
  campanha,
  titulo,
  iniciaEm,
  local,
  pauta,
  presencas,
}: {
  campanhaId: string;
  sessaoId: string;
  campanha: string;
  titulo: string;
  /** ISO. O texto só é montado ao clicar, para "hoje" e "amanhã" valerem na hora de mandar. */
  iniciaEm: string;
  local: string;
  pauta: string;
  presencas: { nome: string; resposta: RespostaPresenca | null }[];
}) {
  const [texto, setTexto] = useState<string>();
  const [copiado, setCopiado] = useState(false);
  const montar = () =>
    textoDoLembrete(
      {
        campanha,
        titulo,
        iniciaEm: new Date(iniciaEm),
        local,
        pauta,
        presencas,
        url: `${window.location.origin}/mesa/${campanhaId}/sessoes/${sessaoId}`,
      },
      new Date(),
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={async () => {
            const t = montar();
            setTexto(t);
            try {
              await navigator.clipboard.writeText(t);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              /* sem permissão: o texto aparece abaixo para copiar à mão */
            }
          }}
        >
          {copiado ? 'Copiado!' : 'Copiar lembrete'}
        </Button>
        <Button variant="ghost" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(montar())}`, '_blank', 'noopener,noreferrer')}>
          Abrir no WhatsApp
        </Button>
      </div>
      {texto && (
        <textarea
          readOnly
          aria-label="Texto do lembrete"
          className={cx(inputClass, 'min-h-40 resize-y text-xs leading-relaxed')}
          value={texto}
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  );
}
