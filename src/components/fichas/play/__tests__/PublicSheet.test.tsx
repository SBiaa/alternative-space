// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '@/lib/fichas/sr5/character';
import { sr5Data } from '@/lib/fichas/sr5/data';
import { publicDraft, publicInventory } from '@/lib/fichas/sr5/share';
import { PublicSheet } from '../PublicSheet';

describe('PublicSheet', () => {
  it('mostra a ficha só leitura, sem anotações nem dicas de edição', () => {
    const d = createEmptyDraft();
    d.concept = { name: 'Nome', role: 'Decker', notes: 'SEGREDO' };
    d.metatypeId = sr5Data.metatypes[0].id;
    d.enemies = [{ key: 'e', name: 'Rival', notes: 'SEGREDO' }];
    const inventory = publicInventory([
      { kind: 'other', itemId: null, name: 'Corda', rating: null, qty: 2, equipped: false, notes: 'SEGREDO' },
    ]);
    const { container } = render(
      <PublicSheet name="Teste" draft={publicDraft(d)} inventory={inventory} physical={2} stun={0} />,
    );
    expect(screen.getByRole('heading', { name: 'Teste' })).toBeInTheDocument();
    expect(screen.getByText(/Ficha compartilhada · só leitura/)).toHaveTextContent('Decker');
    fireEvent.click(screen.getByRole('tab', { name: 'Pessoas' }));
    expect(screen.getByText('Rival')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Equipamento' }));
    expect(screen.getByText('Corda')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Veículos' }));
    expect(screen.getByText(/Nenhum veículo/)).not.toHaveTextContent('Adicione');
    expect(container.textContent).not.toContain('SEGREDO');
  });
});
