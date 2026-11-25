// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import fixture from '@/lib/fichas/sr5/__tests__/fixtures/ficha-valida.json';
import { parseImport } from '@/lib/fichas/sr5/io';
import { sr5Data } from '@/lib/fichas/sr5/data';
import { evaluate } from '@/lib/fichas/sr5/rules';
import { Consulta } from '../Consulta';

const draft = parseImport(JSON.stringify(fixture));
// A ficha de exemplo não tem perícias soltas: damos pistolas 4.
draft.skills = [{ id: sr5Data.skills.skills.find((s) => s.name === 'Pistols')!.id, points: 4, karma: 0 }];
const result = evaluate(draft);

describe('Consulta', () => {
  it('mostra a reserva de dados de cada perícia: atributo + nível', () => {
    render(<Consulta draft={draft} result={result} inventory={[]} physical={0} stun={0} />);
    const skillId = Object.entries(result.skillRatings).find(([, r]) => r > 0)![0];
    const btn = screen.getAllByRole('button', { name: /^Rolar / })[0];
    expect(btn).toBeInTheDocument();
    expect(result.skillRatings[skillId]).toBeGreaterThan(0);
    expect(Number.parseInt(btn.textContent ?? '', 10)).toBeGreaterThan(0);
  });

  it('ferimentos reduzem a reserva', () => {
    const { rerender } = render(<Consulta draft={draft} result={result} inventory={[]} physical={0} stun={0} />);
    const pool = () => Number.parseInt(screen.getAllByRole('button', { name: /^Rolar / })[0].textContent ?? '', 10);
    const healthy = pool();
    rerender(<Consulta draft={draft} result={result} inventory={[]} physical={6} stun={0} />);
    expect(pool()).toBeLessThan(healthy);
  });

  it('rolar mostra os acertos', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const user = userEvent.setup();
    render(<Consulta draft={draft} result={result} inventory={[]} physical={0} stun={0} />);
    await user.click(screen.getAllByRole('button', { name: /^Rolar / })[0]);
    expect(screen.getAllByText(/acerto/).length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('a busca filtra e esconde seções vazias', async () => {
    const user = userEvent.setup();
    render(<Consulta draft={draft} result={result} inventory={[]} physical={0} stun={0} />);
    await user.type(screen.getByRole('searchbox'), 'zzzzzz');
    expect(screen.queryAllByRole('button', { name: /^Rolar / })).toHaveLength(0);
    expect(within(document.body).queryByText('Perícias')).toBeNull();
  });
});
