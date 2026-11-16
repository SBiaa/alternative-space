/**
 * Ajudantes das server actions da Mesa. Ficam fora dos arquivos 'use server' porque esses só podem
 * exportar funções assíncronas que viram endpoints.
 */
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { CampanhaNaoEncontrada, InputError } from '@/lib/mesa/server/acesso';

export type MesaResultado = { ok: true; mensagem?: string } | { ok: false; erro: string };

const esperado = (e: unknown) => e instanceof InputError || e instanceof CampanhaNaoEncontrada;

/** Roda a ação, atualiza a tela e devolve o resultado. Erros de validação voltam como mensagem. */
export async function run(fn: () => Promise<unknown>, mensagem?: (r: unknown) => string): Promise<MesaResultado> {
  try {
    const r = await fn();
    refresh();
    return { ok: true, mensagem: mensagem?.(r) };
  } catch (e) {
    if (esperado(e)) return { ok: false, erro: (e as Error).message };
    console.error('Falha na Mesa do Mestre', e);
    return { ok: false, erro: 'Não deu para salvar agora. Tente de novo.' };
  }
}

/** Roda e, se der certo, vai para `destino(resultado)`. Erros de validação voltam como mensagem. */
export async function eIr<T>(fn: () => Promise<T>, destino: (r: T) => string): Promise<MesaResultado> {
  let r: T;
  try {
    r = await fn();
  } catch (e) {
    if (esperado(e)) return { ok: false, erro: (e as Error).message };
    throw e;
  }
  redirect(destino(r));
}
