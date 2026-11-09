import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';

/** Nó XML já convertido em objeto pelo fast-xml-parser. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type XNode = any;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  // Mantém nós vazios (<hide />) como string vazia para podermos testar presença.
  allowBooleanAttributes: true,
});

export function loadXml(path: string): XNode {
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  return parser.parse(raw);
}

/** Converte "um ou vários" em array. */
export function arr<T = XNode>(x: T | T[] | undefined | null | ''): T[] {
  if (x === undefined || x === null || x === '') return [];
  return Array.isArray(x) ? x : [x];
}

/** Texto de um nó, mesmo quando ele também tem atributos. */
export function text(x: XNode): string {
  if (x === undefined || x === null) return '';
  if (typeof x === 'string') return x;
  if (typeof x === 'number' || typeof x === 'boolean') return String(x);
  if (typeof x === 'object' && '#text' in x) return String(x['#text']);
  return '';
}

/** Número a partir do texto; `fallback` quando vazio ou não numérico. */
export function num(x: XNode, fallback = 0): number {
  const t = text(x).trim();
  if (t === '') return fallback;
  const n = Number(t);
  return Number.isFinite(n) ? n : fallback;
}

/** true quando o nó existe (inclusive vazio, ex.: <onlyprioritygiven />). */
export function has(x: XNode): boolean {
  return x !== undefined && x !== null;
}

/** "True"/"False" do Chummer. */
export function bool(x: XNode, fallback = false): boolean {
  const t = text(x).trim().toLowerCase();
  if (t === 'true') return true;
  if (t === 'false') return false;
  return fallback;
}

export function attr(x: XNode, name: string): string | undefined {
  if (x && typeof x === 'object') {
    const v = x[`@_${name}`];
    return v === undefined ? undefined : String(v);
  }
  return undefined;
}

/** Id estável a partir de um nome, para itens que não têm GUID no Chummer. */
export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
