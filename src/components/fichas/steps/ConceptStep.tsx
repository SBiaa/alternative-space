'use client';

import { updateDraft } from '@/lib/fichas/store';
import type { PriorityCategory, PriorityLetter, TalentKey } from '@/lib/fichas/sr5/types';
import type { StepProps } from '../wizard/Wizard';
import { Button, Card, cx, Field, inputClass, StepIntro } from '../ui';

interface Archetype {
  role: string;
  text: string;
  priorities: Record<PriorityCategory, PriorityLetter>;
  talent: TalentKey;
}

/** Ideias de ponto de partida. As prioridades são só uma sugestão. */
const ARCHETYPES: Archetype[] = [
  {
    role: 'Samurai de rua',
    text: 'Combatente profissional, cheio de implantes. Resolve na bala.',
    priorities: { attributes: 'A', resources: 'B', skills: 'C', metatype: 'D', talent: 'E' },
    talent: 'mundane',
  },
  {
    role: 'Mago',
    text: 'Lança magias e invoca espíritos. Versátil e poderoso, mas frágil.',
    priorities: { talent: 'A', attributes: 'B', skills: 'C', metatype: 'D', resources: 'E' },
    talent: 'magician',
  },
  {
    role: 'Adepto',
    text: 'Guerreiro místico: a magia melhora o próprio corpo.',
    priorities: { attributes: 'A', talent: 'B', skills: 'C', metatype: 'D', resources: 'E' },
    talent: 'adept',
  },
  {
    role: 'Decker',
    text: 'Hacker com equipamento caro. Invade sistemas e abre portas pela Matriz.',
    priorities: { resources: 'A', skills: 'B', attributes: 'C', metatype: 'D', talent: 'E' },
    talent: 'mundane',
  },
  {
    role: 'Tecnomante',
    text: 'Hacker sem computador: a mente conversa direto com a Matriz.',
    priorities: { talent: 'A', skills: 'B', attributes: 'C', metatype: 'D', resources: 'E' },
    talent: 'technomancer',
  },
  {
    role: 'Rosto',
    text: 'Negociador e manipulador. Consegue o trabalho, o preço e a informação.',
    priorities: { skills: 'A', attributes: 'B', resources: 'C', metatype: 'D', talent: 'E' },
    talent: 'mundane',
  },
  {
    role: 'Rigger',
    text: 'Piloto e operador de drones. Dirige a fuga e vigia de longe.',
    priorities: { resources: 'A', skills: 'B', attributes: 'C', metatype: 'D', talent: 'E' },
    talent: 'mundane',
  },
  {
    role: 'Infiltrador',
    text: 'Entra sem ser visto: fechaduras, disfarces e silêncio.',
    priorities: { skills: 'A', attributes: 'B', resources: 'C', metatype: 'D', talent: 'E' },
    talent: 'mundane',
  },
];

export function ConceptStep({ draft }: StepProps) {
  const c = draft.concept;
  const set = (patch: Partial<typeof c>) => updateDraft((d) => Object.assign(d.concept, patch));

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title="Quem é o seu personagem?">
        Antes dos números, pense na ideia: o que ele faz no grupo, de onde veio, por que corre nas sombras.
        Nada aqui é obrigatório, mas ajuda nas escolhas seguintes.
      </StepIntro>

      <Card title="Identidade">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <input className={inputClass} value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Mariana Kowalski" />
          </Field>
          <Field label="Codinome nas ruas" hint="Runners raramente usam o nome verdadeiro.">
            <input className={inputClass} value={c.alias ?? ''} onChange={(e) => set({ alias: e.target.value })} placeholder="Ex.: Agulha" />
          </Field>
        </div>
      </Card>

      <Card title="Papel no grupo">
        <p className="mb-4 text-sm text-muted">
          Escolha um ponto de partida. Se quiser, aplique a sugestão de prioridades; dá para mudar tudo depois.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ARCHETYPES.map((a) => {
            const selected = c.role === a.role;
            return (
              <div
                key={a.role}
                className={cx(
                  'flex flex-col rounded-xl border p-3.5 transition',
                  selected ? 'border-accent bg-accent/[0.07]' : 'border-line bg-surface-2 hover:border-line-strong',
                )}
              >
                <button type="button" className="text-left" aria-pressed={selected} onClick={() => set({ role: selected ? undefined : a.role })}>
                  <div className="font-display font-semibold">{a.role}</div>
                  <div className="mt-1 text-sm text-muted">{a.text}</div>
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-faint">
                    {(['metatype', 'talent', 'attributes', 'skills', 'resources'] as const)
                      .map((k) => a.priorities[k]).join(' ')}
                  </span>
                  <Button
                    className="ml-auto !px-2 !py-1 text-xs"
                    onClick={() =>
                      updateDraft((d) => {
                        d.concept.role = a.role;
                        d.priorities = { ...a.priorities };
                        d.talent = a.talent;
                      })
                    }
                  >
                    Usar prioridades
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 max-w-sm">
          <Field label="Ou descreva com suas palavras">
            <input className={inputClass} value={c.role ?? ''} onChange={(e) => set({ role: e.target.value })} placeholder="Ex.: Médico de rua" />
          </Field>
        </div>
        <p className="mt-3 text-xs text-faint">
          A ordem das letras acima é: Metatipo, Magia/Ressonância, Atributos, Perícias, Recursos.
        </p>
      </Card>

      <Card title="Notas">
        <textarea
          className={cx(inputClass, 'min-h-28')}
          value={c.notes ?? ''}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="História, aparência, objetivos, medos…"
        />
      </Card>
    </div>
  );
}
