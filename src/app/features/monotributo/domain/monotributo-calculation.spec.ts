import { parseArgentineMoney } from '../../../shared/ui/money-input/money-input';
import { MONOTRIBUTO_DATASET } from '../data-access/monotributo-dataset';
import { calculateMonotributoEstimate } from './monotributo-calculation';

describe('Monotributo calculation', () => {
  const estimate = (overrides = {}) =>
    calculateMonotributoEstimate(MONOTRIBUTO_DATASET, {
      mode: 'quick',
      activity: 'services',
      annualIncome: 8_500_000,
      contributionSituation: 'independent-only',
      ...overrides,
    });

  it.each([
    ['12.009.410,45', 12_009_410.45],
    ['17.595.182,74', 17_595_182.74],
    ['126.610.838,75', 126_610_838.75],
    ['716.840,77', 716_840.77],
  ])('uses the shared Argentine parser for %s', (raw, expected) =>
    expect(parseArgentineMoney(raw)).toBe(expected),
  );

  it('keeps 8.500.000 services in category A and uses the official total', () => {
    const result = estimate();
    expect(result.category?.code).toBe('A');
    expect(result.contribution?.total).toBe(49_527.18);
  });

  it.each([
    [12_009_410.45, 'A'],
    [12_009_410.46, 'B'],
    [17_595_182.74, 'B'],
    [17_595_182.75, 'C'],
    [126_610_838.75, 'K'],
  ])('assigns category %s at the income boundary', (annualIncome, category) =>
    expect(estimate({ annualIncome }).category?.code).toBe(category),
  );

  it('marks income above category K as out of regime', () =>
    expect(estimate({ annualIncome: 126_610_838.76 }).status).toBe('out-of-regime'));

  it('uses the highest applicable category and exposes the determinant', () => {
    const result = estimate({
      mode: 'full',
      annualIncome: 10_000_000,
      hasPremises: true,
      surfaceM2: 60,
      annualElectricityKwh: 5_000,
      annualRent: 0,
    });
    expect(result.category?.code).toBe('C');
    expect(result.determiningParameter).toBe('surface');
  });

  it('handles physical parameter boundaries and goods unit price', () => {
    expect(
      estimate({
        mode: 'full',
        hasPremises: true,
        surfaceM2: 30,
        annualElectricityKwh: 6_700,
        annualRent: 0,
      }).category?.code,
    ).toBe('C');
    expect(
      estimate({
        mode: 'full',
        hasPremises: true,
        surfaceM2: 1,
        annualElectricityKwh: 6_700.01,
        annualRent: 0,
      }).category?.code,
    ).toBe('D');
    expect(
      estimate({
        mode: 'full',
        hasPremises: true,
        surfaceM2: 30.01,
        annualElectricityKwh: 1,
        annualRent: 0,
      }).category?.code,
    ).toBe('B');
    expect(
      estimate({
        mode: 'full',
        hasPremises: true,
        surfaceM2: 200,
        annualElectricityKwh: 1,
        annualRent: 0,
      }).category?.code,
    ).toBe('G');
    expect(
      estimate({
        mode: 'full',
        hasPremises: true,
        surfaceM2: 200.01,
        annualElectricityKwh: 1,
        annualRent: 0,
      }).status,
    ).toBe('out-of-regime');
    expect(
      estimate({
        mode: 'full',
        hasPremises: true,
        surfaceM2: 1,
        annualElectricityKwh: 1,
        annualRent: 3_816_944.41,
      }).category?.code,
    ).toBe('C');
    expect(
      estimate({
        mode: 'full',
        hasPremises: true,
        surfaceM2: 1,
        annualElectricityKwh: 1,
        annualRent: 3_816_944.42,
      }).category?.code,
    ).toBe('E');
    expect(
      estimate({ activity: 'goods', mode: 'full', maxUnitPriceGoods: 716_840.77 }).category?.code,
    ).toBe('A');
    expect(
      estimate({ activity: 'goods', mode: 'full', maxUnitPriceGoods: 716_840.78 }).status,
    ).toBe('out-of-regime');
  });

  it('calculates official contributions for independent workers and employees', () => {
    expect(estimate({ annualIncome: 24_000_000 }).contribution?.total).toBe(66_020.12);
    expect(estimate({ activity: 'goods', annualIncome: 24_000_000 }).contribution?.total).toBe(
      64_530.58,
    );
    expect(estimate({ annualIncome: 80_000_000 }).contribution?.total).toBe(522_706.68);
    const employee = estimate({ annualIncome: 80_000_000, contributionSituation: 'employee' });
    expect(employee.contribution).toEqual({
      integratedTax: 409_623.31,
      sipa: null,
      healthInsurance: null,
      total: 409_623.31,
    });
  });
});
