/**
 * Conexão com o banco. Só pode ser importado no servidor.
 * Usa o driver HTTP do Neon: sem pool de conexões, bom para funções da Vercel.
 *
 * A conexão só é criada no primeiro uso: assim o build (que carrega os módulos)
 * funciona sem DATABASE_URL, como no CI.
 */
import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida. Rode `vercel env pull` para baixar as variáveis.');
  return drizzle(neon(url), { schema });
}

let instance: ReturnType<typeof connect> | undefined;

export function db() {
  instance ??= connect();
  return instance;
}
