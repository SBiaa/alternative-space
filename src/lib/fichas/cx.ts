/** Junta classes CSS, ignorando valores falsos. Serve no servidor e no navegador. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
