import { arr, attr, loadXml, text, type XNode } from './xml';

/**
 * Traduções pt-BR do Chummer5a (lang/pt-br_data.xml).
 * Para cada arquivo de dados guardamos:
 *  - byId:   GUID do item → nome traduzido
 *  - byName: nome original → nome traduzido (itens sem GUID, categorias, especializações...)
 */
export interface FileTranslations {
  byId: Map<string, string>;
  byName: Map<string, string>;
}

export type Translations = Map<string, FileTranslations>;

export function loadTranslations(path: string): Translations {
  const root = loadXml(path);
  const out: Translations = new Map();
  for (const section of arr(root.chummer?.chummer)) {
    const file = attr(section, 'file');
    if (!file) continue;
    const t: FileTranslations = { byId: new Map(), byName: new Map() };
    walk(section, t);
    out.set(file, t);
  }
  return out;
}

function walk(node: XNode, t: FileTranslations): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, t);
    return;
  }

  // Forma 1: <item><id/><name/><translate/></item>
  if ('translate' in node && 'name' in node) {
    const tr = text(node.translate).trim();
    const name = text(node.name).trim();
    if (tr) {
      if (node.id) t.byId.set(text(node.id).trim(), tr);
      if (name && !t.byName.has(name)) t.byName.set(name, tr);
    }
  }

  // Forma 2: <category translate="...">Nome</category>
  const inlineTr = attr(node, 'translate');
  const inlineText = text(node).trim();
  if (inlineTr && inlineText && !t.byName.has(inlineText)) t.byName.set(inlineText, inlineTr);

  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('@_') || k === '#text') continue;
    walk(v, t);
  }
}

/** Helper para buscar a tradução de um item de um arquivo. */
export function translator(all: Translations, file: string) {
  const t = all.get(file) ?? { byId: new Map(), byName: new Map() };
  return (name: string, id?: string): string | undefined => {
    return (id && t.byId.get(id)) || t.byName.get(name) || undefined;
  };
}
