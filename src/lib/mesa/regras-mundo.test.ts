import { describe, expect, it } from 'vitest';
import {
  eNova,
  filtrarPaginas,
  lerHandout,
  lerPagina,
  LIMITE_CORPO,
  LIMITE_TITULO,
  prefixoDosArquivos,
  referenciaDeNovidade,
  tipoDoArquivo,
} from './regras-mundo';

const C = '11111111-1111-4111-8111-111111111111';

describe('lerPagina', () => {
  it('aceita e limpa os campos', () => {
    expect(lerPagina({ titulo: '  Porto   Sombrio ', categoria: 'lugar', corpo: 'a\r\nb ' })).toEqual({ titulo: 'Porto Sombrio', categoria: 'lugar', corpo: 'a\nb' });
  });
  it('exige título e categoria válida', () => {
    expect(() => lerPagina({ titulo: ' ', categoria: 'lugar' })).toThrow(/título/);
    expect(() => lerPagina({ titulo: 'x', categoria: 'deus' })).toThrow(/categoria/);
  });
  it('respeita os limites', () => {
    expect(() => lerPagina({ titulo: 'x'.repeat(LIMITE_TITULO + 1), categoria: 'item' })).toThrow();
    expect(() => lerPagina({ titulo: 'x', categoria: 'item', corpo: 'y'.repeat(LIMITE_CORPO + 1) })).toThrow();
  });
});

describe('lerHandout', () => {
  it('texto precisa de conteúdo e não leva arquivo', () => {
    expect(lerHandout({ titulo: 'Carta', tipo: 'texto', texto: 'Caro amigo' }, C)).toMatchObject({ tipo: 'texto', blobPathname: null, texto: 'Caro amigo' });
    expect(() => lerHandout({ titulo: 'Carta', tipo: 'texto', texto: ' ' }, C)).toThrow(/texto/);
  });
  it('arquivo precisa estar sob o prefixo da campanha', () => {
    const ok = { titulo: 'Mapa', tipo: 'imagem', blobUrl: 'https://x.blob.vercel-storage.com/a.png', blobPathname: `${prefixoDosArquivos(C)}mapa.png` };
    expect(lerHandout(ok, C)).toMatchObject({ tipo: 'imagem', blobPathname: `mesa/${C}/mapa.png` });
    expect(() => lerHandout({ ...ok, blobPathname: 'mesa/outra/mapa.png' }, C)).toThrow(/inválido/);
    expect(() => lerHandout({ ...ok, blobPathname: `mesa/${C}/../x.png` }, C)).toThrow(/inválido/);
    expect(() => lerHandout({ ...ok, blobUrl: '' }, C)).toThrow(/inválido/);
  });
  it('rejeita tipo desconhecido', () => {
    expect(() => lerHandout({ titulo: 'x', tipo: 'video' }, C)).toThrow(/tipo/);
  });
});

describe('tipoDoArquivo', () => {
  it('só imagem e PDF', () => {
    expect(tipoDoArquivo('image/png')).toBe('imagem');
    expect(tipoDoArquivo('application/pdf')).toBe('pdf');
    expect(tipoDoArquivo('image/svg+xml')).toBeNull();
    expect(tipoDoArquivo('text/html')).toBeNull();
  });
});

describe('novidade', () => {
  const agora = new Date('2026-11-17T12:00:00Z');
  it('sem sessão feita, vale a última semana', () => {
    expect(referenciaDeNovidade(null, agora).toISOString()).toBe('2026-11-10T12:00:00.000Z');
  });
  it('depois da última sessão é nova', () => {
    const ref = referenciaDeNovidade(new Date('2026-11-14T00:00:00Z'), agora);
    expect(eNova(new Date('2026-11-15T00:00:00Z'), ref)).toBe(true);
    expect(eNova(new Date('2026-11-13T00:00:00Z'), ref)).toBe(false);
    expect(eNova(null, ref)).toBe(false);
  });
});

describe('filtrarPaginas', () => {
  const ps = [
    { titulo: 'Porto Sombrio', corpo: 'Cidade portuária', categoria: 'lugar' as const },
    { titulo: 'Guilda', corpo: 'Ladrões do porto', categoria: 'faccao' as const },
    { titulo: 'Anel', corpo: 'Joia antiga', categoria: 'item' as const },
  ];
  it('busca sem acento nem caixa, no título e no texto', () => {
    expect(filtrarPaginas(ps, 'PORTO', 'todas').map((p) => p.titulo)).toEqual(['Porto Sombrio', 'Guilda']);
    expect(filtrarPaginas(ps, 'portuaria', 'todas')).toHaveLength(1);
  });
  it('filtra por categoria', () => {
    expect(filtrarPaginas(ps, '', 'item').map((p) => p.titulo)).toEqual(['Anel']);
    expect(filtrarPaginas(ps, 'porto', 'faccao')).toHaveLength(1);
  });
});
