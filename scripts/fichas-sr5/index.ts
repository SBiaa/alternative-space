/**
 * Converte os XMLs do Chummer5a em JSON tipado (content/fichas/sr5/*.json).
 *
 * Uso:
 *   npm run fichas:sr5:data                       # só o livro básico (SR5)
 *   npm run fichas:sr5:data -- --books SR5,RF     # inclui outros livros pelo código
 *   npm run fichas:sr5:data -- --ref caminho/para/chummer5a/Chummer
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DataMeta } from '../../src/lib/fichas/sr5/types';
import * as c from './convert';
import { loadTranslations } from './i18n';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const root = resolve(__dirname, '../..');
const chummerDir = resolve(root, arg('ref') ?? 'ref/chummer5a/Chummer');
const dataDir = join(chummerDir, 'data');
const outDir = join(root, 'content/fichas/sr5');
const books = (arg('books') ?? 'SR5').split(',').map((b) => b.trim()).filter(Boolean);

if (!existsSync(dataDir)) {
  console.error(`Pasta de dados do Chummer não encontrada: ${dataDir}`);
  console.error('Clone o repositório: git clone --depth 1 https://github.com/chummer5a/chummer5a.git ref/chummer5a');
  process.exit(1);
}

const ctx: c.Ctx = {
  dataDir,
  books: new Set(books),
  tr: loadTranslations(join(chummerDir, 'lang/pt-br_data.xml')),
};

const qIds = c.qualityIdIndex(ctx);
const mIds = c.metatypeIdIndex(ctx);
const qualities = c.convertQualities(ctx, qIds, mIds);
const metatypes = c.convertMetatypes(ctx, qIds);
const skills = c.convertSkills(ctx);
const priorities = c.convertPriorities(ctx, metatypes, qualities, skills);

const outputs: Record<string, unknown> = {
  books: c.convertBooks(ctx),
  settings: c.convertSettings(ctx),
  priorities,
  metatypes,
  qualities,
  skills,
  contacts: c.convertContacts(ctx),
  traditions: c.convertTraditions(ctx),
  streams: c.convertStreams(ctx),
  spells: c.convertSpells(ctx),
  powers: c.convertPowers(ctx),
  complexforms: c.convertComplexForms(ctx),
  mentors: c.convertMentors(ctx),
  lifestyles: c.convertLifestyles(ctx),
  weapons: c.convertWeapons(ctx),
  armor: c.convertArmor(ctx),
  gear: c.convertGear(ctx),
  cyberware: c.convertCyberware(ctx),
  bioware: c.convertBioware(ctx),
};

let commit = 'desconhecido';
try {
  commit = execSync('git rev-parse HEAD', { cwd: chummerDir }).toString().trim();
} catch {
  /* clone sem git */
}

const counts: Record<string, number> = {};
for (const [name, value] of Object.entries(outputs)) {
  counts[name] = Array.isArray(value)
    ? value.length
    : name === 'skills'
      ? skills.skills.length
      : 1;
}

const meta: DataMeta = { chummerCommit: commit, books, counts };

mkdirSync(outDir, { recursive: true });
for (const [name, value] of Object.entries({ ...outputs, meta })) {
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

console.log(`Livros: ${books.join(', ')} · Chummer ${commit.slice(0, 7)}`);
console.table(counts);
