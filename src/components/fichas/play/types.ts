import type { goals, ledger, missions } from '@/lib/fichas/db/schema';

export type PlayEntry = typeof ledger.$inferSelect;
export type PlayMission = typeof missions.$inferSelect;

export const MISSION_STATUS_LABEL: Record<PlayMission['status'], string> = {
  planned: 'Planejada',
  active: 'Em andamento',
  done: 'Concluída',
};

export type PlayGoal = typeof goals.$inferSelect;
