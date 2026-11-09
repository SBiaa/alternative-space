/**
 * Export e import da ficha em JSON.
 * Fica fora do componente para dar para testar sem navegador.
 */
import { normalizeDraft } from './character';
import type { CharacterDraft } from './character';

export const EXPORT_APP = 'fixer-sr5';
export const EXPORT_FORMAT = 1;

export interface ExportFile {
  app: typeof EXPORT_APP;
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  draft: CharacterDraft;
}

export function exportJson(draft: CharacterDraft, now = new Date()): string {
  const file: ExportFile = { app: EXPORT_APP, format: EXPORT_FORMAT, exportedAt: now.toISOString(), draft };
  return JSON.stringify(file, null, 2);
}

/** Nome de arquivo a partir do codinome ou nome, sem acentos nem espaços. */
export function exportFilename(draft: CharacterDraft): string {
  const name = draft.concept.alias || draft.concept.name || 'personagem';
  const slug = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'personagem'}.json`;
}

export const INVALID_FILE = 'Arquivo inválido: não parece uma ficha exportada por este app.';

/**
 * Lê um JSON exportado (ou só a ficha, sem o envelope).
 * Lança Error com mensagem pronta para mostrar ao usuário.
 */
export function parseImport(text: string): CharacterDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(INVALID_FILE);
  }
  const raw = parsed && typeof parsed === 'object' && 'draft' in parsed ? (parsed as { draft: unknown }).draft : parsed;
  if (!raw || typeof raw !== 'object') throw new Error(INVALID_FILE);
  try {
    return normalizeDraft(raw);
  } catch (e) {
    throw new Error(e instanceof Error && e.message.includes('Versão') ? e.message : INVALID_FILE);
  }
}
