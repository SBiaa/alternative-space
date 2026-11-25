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

const props = { draft, result, inventory: [], physical: 0, stun: 0 };

async function openSkills() {
  const user = userEvent.setup();
  const view = render(<Consulta {...props} />);
  await user.click(screen.getByRole('tab', { name: 'Perícias' }));
  return { user, ...view };
}
const rollBtn = () => screen.getAllByRole('button', { name: /^Rolar [^c]*$/ })[0];
const poolOf = () => Number.parseInt(within(rollBtn().closest('li')!).getByText(/^\d+$/).textContent ?? '', 10);

describe('Consulta', () => {
  it('mostra a reserva de dados de cada perícia: atributo + nível', async () => {
    await openSkills();
    expect(poolOf()).toBeGreaterThan(0);
  });

  it('ferimentos reduzem a reserva', async () => {
    const { rerender } = await openSkills();
    const healthy = poolOf();
    rerender(<Consulta {...props} physical={6} />);
    expect(poolOf()).toBeLessThan(healthy);
  });

  it('rolar mostra os acertos', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const { user } = await openSkills();
    await user.click(rollBtn());
    expect(screen.getAllByText(/acerto/).length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('mostra limites, defesa e resistência a dano no topo', () => {
    render(<Consulta {...props} />);
    const a = result.attributes;
    const limites = within(screen.getByLabelText('Limites'));
    expect(limites.getByText('Limite físico').nextSibling).toHaveTextContent(String(result.derived.limits.physical));
    expect(screen.getByText('Defesa').nextSibling).toHaveTextContent(String(a.REA.value + a.INT.value));
    expect(screen.getByText('Resist. dano')).toBeInTheDocument();
  });

  it('cada grupo mostra só o seu conteúdo', async () => {
    const d = {
      ...draft,
      knowledge: [{ key: 'k1', name: 'Seattle Gangs', category: 'Street' as const, points: 3, karma: 0 }],
      contacts: [{ key: 'c1', name: 'Dona Lia', connection: 4, loyalty: 2 }],
    };
    const user = userEvent.setup();
    render(<Consulta {...props} draft={d} result={evaluate(d)} />);
    expect(screen.queryByText('Dona Lia')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Pessoas' }));
    const card = screen.getByText('Dona Lia').closest('li')!;
    expect(within(card).getByText('Conexão').nextSibling).toHaveTextContent('4');
    expect(within(card).getByText('Lealdade').nextSibling).toHaveTextContent('2');
    expect(screen.queryByText('Seattle Gangs')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Perícias' }));
    expect(screen.getByText('Seattle Gangs')).toBeInTheDocument();
  });

  it('a busca procura em todos os grupos e esconde seções vazias', async () => {
    const user = userEvent.setup();
    render(<Consulta {...props} />);
    await user.type(screen.getByRole('searchbox'), 'zzzzzz');
    expect(screen.queryAllByRole('button', { name: /^Rolar / })).toHaveLength(0);
    expect(within(document.body).queryByText('Perícias', { selector: 'summary span' })).toBeNull();
  });
});
