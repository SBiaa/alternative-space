/**
 * Quem pode o quê numa campanha. Regras:
 * - vê a campanha quem é o mestre ou está nela como jogador;
 * - só o mestre mexe na campanha, nas sessões, no diário e nos ganchos;
 * - notas do mestre e ganchos nunca saem para os jogadores;
 * - a ficha vinculada é vista pelo mestre e pelo dono, nunca pelos colegas,
 *   e as anotações pessoais do jogador ficam fora (ver regras.ts).
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { requireUserId } from '@/lib/fichas/server/characters';
import { InputError } from '@/lib/fichas/sr5/play';
import { papelNaCampanha, UUID, type Papel } from '../regras';
import { campanhaJogadores, campanhas } from '../schema';

export { InputError };

export class CampanhaNaoEncontrada extends Error {
  constructor() {
    super('Campanha não encontrada.');
  }
}

export const usuarioDaMesa = (next = '/mesa') => requireUserId(next);

export const novoCodigo = () => randomBytes(9).toString('base64url'); // 12 caracteres

export async function acesso(campanhaId: string) {
  if (!UUID.test(campanhaId)) throw new CampanhaNaoEncontrada();
  const userId = await usuarioDaMesa(`/mesa/${campanhaId}`);
  const [campanha] = await db().select().from(campanhas).where(eq(campanhas.id, campanhaId));
  if (!campanha) throw new CampanhaNaoEncontrada();
  const jogadores = await db()
    .select({ userId: campanhaJogadores.userId })
    .from(campanhaJogadores)
    .where(eq(campanhaJogadores.campanhaId, campanhaId));
  const papel = papelNaCampanha(userId, campanha.mestreId, jogadores.map((j) => j.userId));
  if (!papel) throw new CampanhaNaoEncontrada();
  return { userId, campanha, papel: papel as Papel };
}

export async function acessoDeMestre(campanhaId: string, acao = 'fazer isso') {
  const a = await acesso(campanhaId);
  if (a.papel !== 'mestre') throw new InputError(`Só o mestre pode ${acao}.`);
  return a;
}
