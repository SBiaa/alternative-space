'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** O que muda no assistente quando a ficha é da conta (e não do navegador). */
export interface WizardExtras {
  /** Botões extras na Revisão (ex.: "Finalizar criação"). */
  reviewActions?: ReactNode;
  /** Onde a ficha fica salva, para o texto de ajuda da Revisão. */
  savedIn: 'browser' | 'account';
}

const Ctx = createContext<WizardExtras>({ savedIn: 'browser' });

export const WizardExtrasProvider = Ctx.Provider;

export function useWizardExtras(): WizardExtras {
  return useContext(Ctx);
}
