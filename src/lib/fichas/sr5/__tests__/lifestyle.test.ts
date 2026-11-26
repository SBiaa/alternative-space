import { describe, expect, it } from 'vitest';
import { createEmptyDraft, type DraftLifestyle } from '../character';
import { exportChummer } from '../chummer';
import { sr5Data } from '../data';
import {
  equalShare, lifestyleAdjust, lifestyleDetails, lifestyleMonthly, lifestyleTotal, startingNuyenRoll,
} from '../lifestyle';
import { evaluate } from '../rules';

const level = (name: string) => sr5Data.lifestyles.find((x) => x.name === name)!;
const quality = (name: string) => sr5Data.lifestyleQualities.find((x) => x.name === name)!.id;

/** O exemplo da tela do Chummer: Medium, Extra Secure, 2 colegas, paga 50%. */
const home: DraftLifestyle = {
  id: level('Medium').id, months: 6, name: 'lar', roommates: 2, splitCost: true, percentage: 50,
  qualities: [{ id: quality('Extra Secure') }], city: 'Hong Kong', district: 'Kwai Tsing',
};

describe('estilo de vida', () => {
  it('bate com o custo do Chummer: 3.600¥ por mês, 21.600¥ em 6 meses', () => {
    const monthly = lifestyleMonthly(level('Medium'), home);
    expect(monthly).toBeCloseTo(3600);
    expect(lifestyleTotal(monthly, home.months)).toBe(21600);
  });

  it('só o nível, sem extras, custa o valor de tabela', () => {
    expect(lifestyleMonthly(level('Medium'), { id: level('Medium').id, months: 1 })).toBe(5000);
  });

  it('a porcentagem só vale com a divisão ligada; sem valor, usa a parte igual', () => {
    expect(lifestyleMonthly(level('Medium'), { ...home, splitCost: false })).toBeCloseTo(7200);
    expect(equalShare(2)).toBe(33.33);
    expect(lifestyleMonthly(level('Medium'), { ...home, percentage: undefined })).toBeCloseTo(7200 * 0.3333);
  });

  it('contratos entram inteiros, depois da divisão e do metatipo', () => {
    const l = { ...home, qualities: [...home.qualities!, { id: quality('DocWagon Contract, Basic') }] };
    expect(lifestyleMonthly(level('Medium'), l, { metatypePct: 20 })).toBeCloseTo(3600 * 1.2 + 5000 / 12);
  });

  it('qualidades com percentual e valor fixo', () => {
    const l = { id: level('Low').id, months: 1, qualities: [{ id: quality('Cramped') }, { id: quality('Special Work Area') }] };
    expect(lifestyleMonthly(level('Low'), l)).toBeCloseTo(2000 * 0.9 + 1000);
  });

  it('gasta o valor calculado no orçamento de nuyen', () => {
    const draft = createEmptyDraft();
    draft.lifestyles = [home];
    expect(evaluate(draft).budgets.nuyen.spent).toBe(21600);
  });

  it('ajuste do metatipo vem da ficha', () => {
    const dwarf = sr5Data.metatypes.find((m) => m.bonus.lifestyleCostPct)!;
    expect(lifestyleAdjust({ metatypeId: dwarf.id, qualities: [] }).metatypePct).toBe(dwarf.bonus.lifestyleCostPct);
  });

  it('dinheiro inicial é o do melhor estilo de vida', () => {
    expect(startingNuyenRoll([{ id: level('Low').id, months: 1 }, home])).toEqual({ dice: 4, multiplier: 100 });
    expect(startingNuyenRoll([])).toBeNull();
  });

  it('resume colegas, divisão, qualidades e endereço', () => {
    expect(lifestyleDetails(home, (q) => q.name)).toBe('2 colegas · paga 50% · Extra Secure · Kwai Tsing, Hong Kong');
  });

  it('exporta tudo para o Chummer', () => {
    const draft = createEmptyDraft();
    draft.lifestyles = [home];
    const xml = exportChummer(draft, evaluate(draft));
    for (const part of [
      '<name>lar</name>', '<baselifestyle>Medium</baselifestyle>', '<roommates>2</roommates>', '<percentage>50</percentage>',
      '<splitcostwithroommates>True</splitcostwithroommates>', '<city>Hong Kong</city>', '<district>Kwai Tsing</district>',
      '<lifestylequalities><lifestylequality>', '<name>Extra Secure</name>', '<basemultiplier>20</basemultiplier>',
    ]) expect(xml).toContain(part);
  });
});
