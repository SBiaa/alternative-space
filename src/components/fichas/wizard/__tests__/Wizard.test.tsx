// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from '@/lib/fichas/sr5/__tests__/fixtures/ficha-valida.json';
import { replaceDraft, resetDraft, setStep } from '@/lib/fichas/store';
import { normalizeDraft } from '@/lib/fichas/store';
import { Wizard } from '../Wizard';

const STEP = { concept: 0, priorities: 1, attributes: 3, review: 9 };

function renderAt(step: number) {
  setStep(step);
  const user = userEvent.setup();
  render(<Wizard />);
  return user;
}

const cell = (area: string, letter: string) =>
  screen.getByRole('button', { name: `${area}: prioridade ${letter}` });

const nextButton = () => screen.getByRole('button', { name: /^Avançar:/ });

beforeEach(() => {
  resetDraft();
  vi.restoreAllMocks();
});

describe('navegação', () => {
  it('começa no Conceito e avança para Prioridades', async () => {
    const user = renderAt(STEP.concept);
    expect(screen.getByRole('heading', { name: 'Quem é o seu personagem?' })).toBeInTheDocument();
    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: 'Prioridades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Voltar' })).toBeEnabled();
  });

  it('não deixa avançar com erros no passo', () => {
    renderAt(STEP.priorities);
    expect(nextButton()).toBeDisabled();
    expect(screen.getByText(/Corrija os \d+ erros acima para avançar/)).toBeInTheDocument();
  });

  it('passos à frente ficam bloqueados enquanto há erros antes', () => {
    renderAt(STEP.priorities);
    const locked = screen.getAllByTitle('Resolva os erros dos passos anteriores primeiro');
    expect(locked).toHaveLength(8); // do Metatipo até a Revisão
    for (const b of locked) expect(b).toBeDisabled();
    expect(within(screen.getByTitle('Conceito')).getByText('✓')).toBeInTheDocument();
  });
});

describe('Conceito', () => {
  it('o nome digitado aparece no resumo e fica salvo', async () => {
    const user = renderAt(STEP.concept);
    await user.type(screen.getByPlaceholderText('Ex.: Mariana Kowalski'), 'Mariana');
    expect(JSON.parse(localStorage.getItem('fixer:sr5:draft')!).draft.concept.name).toBe('Mariana');
  });

  it('"Usar prioridades" do arquétipo preenche a tabela', async () => {
    const user = renderAt(STEP.concept);
    const [samuraiButton] = screen.getAllByRole('button', { name: 'Usar prioridades' });
    await user.click(samuraiButton);
    await user.click(nextButton());
    expect(cell('Atributos', 'A')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Recursos', 'B')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Metatipo', 'D')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Prioridades', () => {
  it('clicar marca a célula', async () => {
    const user = renderAt(STEP.priorities);
    await user.click(cell('Perícias', 'A'));
    expect(cell('Perícias', 'A')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Prioridade A')).toBeInTheDocument();
  });

  it('usar uma letra já ocupada troca as duas áreas', async () => {
    const user = renderAt(STEP.priorities);
    await user.click(cell('Perícias', 'A'));
    await user.click(cell('Atributos', 'B'));
    await user.click(cell('Atributos', 'A'));
    expect(cell('Atributos', 'A')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Perícias', 'B')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Perícias', 'A')).toHaveAttribute('aria-pressed', 'false');
  });

  it('com as cinco letras escolhidas, libera o avanço', async () => {
    const user = renderAt(STEP.priorities);
    for (const [area, l] of [['Metatipo', 'D'], ['Magia/Ressonância', 'E'], ['Atributos', 'A'], ['Perícias', 'B'], ['Recursos', 'C']]) {
      await user.click(cell(area, l));
    }
    expect(nextButton()).toBeEnabled();
  });
});

describe('Atributos', () => {
  beforeEach(() => {
    const d = normalizeDraft(fixture.draft);
    d.attributes.BOD.points = 0;
    replaceDraft(d);
  });

  it('o botão + gasta um ponto e sobe o valor', async () => {
    const user = renderAt(STEP.attributes);
    const input = screen.getByRole('spinbutton', { name: 'pontos em Corpo' });
    expect(input).toHaveValue(0);
    await user.click(screen.getByRole('button', { name: 'Aumentar pontos em Corpo' }));
    expect(input).toHaveValue(1);
  });

  it('o botão − fica desativado no zero', () => {
    renderAt(STEP.attributes);
    expect(screen.getByRole('button', { name: 'Diminuir pontos em Corpo' })).toBeDisabled();
  });
});

describe('Revisão', () => {
  beforeEach(() => replaceDraft(normalizeDraft(fixture.draft)));

  it('ficha válida mostra "tudo certo" e a ficha com o codinome', () => {
    renderAt(STEP.review);
    expect(screen.getByText('Tudo certo com as regras. Confira a ficha abaixo e exporte.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agulha' })).toBeInTheDocument();
  });

  it('importar arquivo inválido mostra o erro', async () => {
    const user = renderAt(STEP.review);
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    await user.upload(input, new File(['não é json'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByText(/Arquivo inválido/)).toBeInTheDocument();
  });

  it('importar ficha válida pede confirmação e substitui', async () => {
    resetDraft();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = renderAt(STEP.review);
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    await user.upload(input, new File([JSON.stringify(fixture)], 'agulha.json', { type: 'application/json' }));
    expect(confirm).toHaveBeenCalled();
    // replaceDraft volta para o primeiro passo
    expect(await screen.findByDisplayValue('Agulha')).toBeInTheDocument();
  });

  it('cancelar a confirmação mantém a ficha atual', async () => {
    resetDraft();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = renderAt(STEP.review);
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    await user.upload(input, new File([JSON.stringify(fixture)], 'agulha.json', { type: 'application/json' }));
    expect(screen.getByRole('heading', { name: 'Sem nome' })).toBeInTheDocument();
  });
});
