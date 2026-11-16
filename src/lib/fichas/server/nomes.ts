import 'server-only';
import { getTableName, sql, type Column, type SQL } from 'drizzle-orm';

/**
 * Nome de um tripulante para outras pessoas: o @apelido do perfil, senão o nome da conta. Nunca o e-mail.
 * Os usuários ficam no schema do Neon Auth; o apelido, em perfis (db/perfis.sql).
 * `userId` é a coluna com o id do usuário. Ela vai sempre com o nome da tabela: numa consulta de uma tabela só
 * o Drizzle escreve só "user_id", e dentro da subconsulta isso viraria o user_id de perfis.
 */
export function nomeDoTripulante(userId: Column): SQL<string> {
  const col = sql`${sql.identifier(getTableName(userId.table))}.${sql.identifier(userId.name)}`;
  return sql<string>`coalesce(
    (select '@' || p.apelido from perfis p where p.user_id = ${col} and p.apelido is not null),
    (select nullif(trim(u.name), '') from neon_auth."user" u where u.id::text = ${col}),
    'Tripulante'
  )`;
}
