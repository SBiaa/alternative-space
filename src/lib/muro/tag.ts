// A tag do tripulante vem do Caderno de Letra. Esse caderno ainda não existe neste repositório, então a leitura fica
// atrás de uma interface só: quando existir a tabela `tags` (por user_id), é só trocar o corpo de getUserTag.
// Formato esperado: { viewBox: [largura, altura], paths: ["M... (SVG path d)", ...] }. Segue as regras de LGPD do Caderno de Letra.

import { MURO } from "./config";
import type { Tag } from "./tipos";

export const TAG_PADRAO: Tag = { viewBox: [...MURO.tagPadrao.viewBox], paths: [...MURO.tagPadrao.paths] };

/** Tag salva do usuário, ou null se ele ainda não criou uma. */
export async function getUserTag(userId: string): Promise<Tag | null> {
  void userId;
  return null;
}
