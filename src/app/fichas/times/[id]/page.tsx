import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FichasNav } from '@/components/fichas/FichasNav';
import {
  AddCharacterForm,
  InviteLink,
  OwnerControls,
  RemoveMemberButton,
} from '@/components/fichas/teams/TeamForms';
import { Card } from '@/components/fichas/ui';
import { cx } from '@/lib/fichas/cx';
import { CORE_ROLES, ROLE_LABEL, ROLE_RULE, type RoleKey } from '@/lib/fichas/sr5/team';
import { NotFoundError } from '@/lib/fichas/server/characters';
import { getTeam, type TeamMemberView } from '@/lib/fichas/server/teams';

export const metadata: Metadata = { title: 'Time' };

export default function TeamPage({ params }: PageProps<'/fichas/times/[id]'>) {
  return (
    <div className="flex flex-1 flex-col">
      <FichasNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />}>
          <Team params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Team({ params }: { params: PageProps<'/fichas/times/[id]'>['params'] }) {
  const { id } = await params;
  let team;
  try {
    team = await getTeam(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const roles: RoleKey[] = [...CORE_ROLES, 'adept'];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/fichas/times" className="text-sm text-muted hover:text-ink">
          ← Times
        </Link>
        <h1 className="font-display text-3xl font-semibold">{team.name}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Fichas do time" className="flex flex-col gap-4">
          {team.members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
              Ninguém no time ainda. Mande o link de convite para os companheiros.
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {team.members.map((m) => (
                <MemberCard key={m.characterId} teamId={team.id} member={m} canRemove={team.isOwner || m.mine} />
              ))}
            </ul>
          )}
          {team.available.length > 0 && (
            <Card title="Adicionar outra ficha sua">
              <AddCharacterForm teamId={team.id} characters={team.available} />
            </Card>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <Card title="Composição">
            {team.composition.missing.length > 0 && (
              <p className="mb-3 text-sm">
                <span className="text-warn">Falta:</span>{' '}
                {team.composition.missing.map((r) => ROLE_LABEL[r]).join(', ')}
              </p>
            )}
            <ul className="flex flex-col gap-1.5 text-sm">
              {roles.map((r) => {
                const who = team.composition.covered[r];
                return (
                  <li key={r} className="flex items-start justify-between gap-2" title={ROLE_RULE[r]}>
                    <span className={cx(who.length ? 'text-ink' : 'text-faint')}>{ROLE_LABEL[r]}</span>
                    <span className={cx('text-right', who.length ? 'text-muted' : 'text-faint')}>
                      {who.length ? who.join(', ') : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
            {team.composition.alerts.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {team.composition.alerts.map((a) => (
                  <li key={a} className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">
                    {a}
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-4 text-xs text-faint">
              <summary className="cursor-pointer">Como o app decide os papéis?</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {roles.map((r) => (
                  <li key={r}>
                    <strong className="text-muted">{ROLE_LABEL[r]}:</strong> {ROLE_RULE[r]}
                  </li>
                ))}
              </ul>
            </details>
          </Card>

          <Card title="Convite">
            <InviteLink teamId={team.id} code={team.inviteCode} isOwner={team.isOwner} />
          </Card>

          {team.isOwner && (
            <Card title="Dono do time">
              <OwnerControls teamId={team.id} name={team.name} />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function MemberCard({ teamId, member: m, canRemove }: { teamId: string; member: TeamMemberView; canRemove: boolean }) {
  const lowEssence = m.essence < 2;
  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/fichas/times/${teamId}/fichas/${m.characterId}`} className="font-display text-xl font-semibold hover:text-accent">
            {m.name}
          </Link>
          <p className="text-sm text-muted">
            {[m.role, m.metatype].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-faint">
            {m.mine ? 'Sua ficha' : `Jogador: ${m.player}`}
            {m.status === 'draft' && ' · em criação'}
          </p>
        </div>
        <span className={cx('shrink-0 font-mono text-sm', lowEssence ? 'text-warn' : 'text-muted')} title="Essência">
          Ess {m.essence.toFixed(2).replace('.', ',')}
        </span>
      </div>

      {m.roles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {m.roles.map((r) => (
            <span key={r} className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
              {ROLE_LABEL[r]}
            </span>
          ))}
        </div>
      )}

      {m.condition && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Físico" value={`${m.condition.physical}/${m.condition.physicalMax}`} warn={m.condition.physical > 0} />
          <Stat label="Atordoam." value={`${m.condition.stun}/${m.condition.stunMax}`} warn={m.condition.stun > 0} />
          <Stat label="Karma" value={String(m.karma ?? 0)} />
        </div>
      )}

      {m.goals.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs uppercase tracking-wider text-faint">Metas</h3>
          <ul className="mt-1 flex flex-col gap-0.5 text-sm">
            {m.goals.slice(0, 3).map((g, i) => (
              <li key={i} className="truncate">
                {g.title}
                {g.summary !== g.title && <span className="text-muted"> · {g.summary}</span>}
              </li>
            ))}
            {m.goals.length > 3 && <li className="text-xs text-faint">e mais {m.goals.length - 3}</li>}
          </ul>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <Link href={`/fichas/times/${teamId}/fichas/${m.characterId}`} className="text-sm text-accent hover:underline">
          Ver ficha
        </Link>
        {canRemove && <RemoveMemberButton teamId={teamId} characterId={m.characterId} name={m.name} mine={m.mine} />}
      </div>
    </li>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-1.5">
      <div className="text-faint">{label}</div>
      <div className={cx('font-mono text-sm', warn ? 'text-warn' : 'text-ink')}>{value}</div>
    </div>
  );
}
