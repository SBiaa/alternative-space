'use client';

import type { ReactNode } from 'react';
import { bindLocalStore } from '@/lib/fichas/store';
import { Wizard } from './Wizard';

/** Assistente do visitante: a ficha fica no navegador. */
export function LocalWizard({ account }: { account?: ReactNode }) {
  bindLocalStore();
  return <Wizard account={account} />;
}
