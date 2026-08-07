import { describe, expect, it } from 'vitest';
import { RentIndexDataset } from './rent-calculation.models';
import {
  calculateCasaPropiaIncrease,
  calculateIndexedIncrease,
  calculateManualIncrease,
  getCasaPropiaPeriods,
  hasValidDateRange,
  MissingCasaPropiaPeriodsError,
} from './rent-calculation';

const testDataset: RentIndexDataset = {
  type: 'icl',
  frequency: 'daily',
  sourceName: 'Fixture exclusiva de test',
  sourceShortName: 'TEST',
  sourceFile: 'fixture.json',
  effectiveFrom: '2025-01-01',
  updatedAt: '2026-01-01',
  coverage: { from: '2025-01-01', to: '2026-01-01' },
  values: [],
};

const casaPropiaDataset: RentIndexDataset = {
  ...testDataset,
  type: 'casa-propia',
  frequency: 'monthly',
  calculationMode: 'compound-monthly-coefficients',
  effectiveFrom: '2026-01',
  updatedAt: '2026-04',
  coverage: { from: '2026-01', to: '2026-04' },
  values: [
    { date: '2026-01', value: 1.02, basis: 'CVS' },
    { date: '2026-02', value: 1.03, basis: 'CER' },
    { date: '2026-03', value: 1.01, basis: 'CVS' },
    { date: '2026-04', value: 1.04, basis: 'CER' },
  ],
};

describe('rent calculation', () => {
  it('calculates a manual increase', () => {
    const result = calculateManualIncrease(100_000, 10);

    expect(result.newRent).toBeCloseTo(110_000, 8);
    expect(result.monthlyDifference).toBeCloseTo(10_000, 8);
    expect(result.coefficient).toBe(1.1);
  });

  it('calculates an increase from index points', () => {
    const result = calculateIndexedIncrease({
      currentRent: 100_000,
      type: 'icl',
      initialPoint: { date: '2025-01-01', value: 100 },
      finalPoint: { date: '2026-01-01', value: 125 },
      dataset: testDataset,
    });

    expect(result.newRent).toBe(125_000);
    expect(result.coefficient).toBe(1.25);
  });

  it('preserves the full rent magnitude in the reported ICL regression', () => {
    const result = calculateIndexedIncrease({
      currentRent: 500_000,
      type: 'icl',
      initialPoint: { date: '2025-01-01', value: 10_000 },
      finalPoint: { date: '2026-01-01', value: 13_644 },
      dataset: testDataset,
    });

    expect(result.coefficient).toBeCloseTo(1.3644, 8);
    expect(result.newRent).toBeCloseTo(682_200, 8);
  });

  it('preserves the full rent magnitude in the second indexed regression', () => {
    const result = calculateIndexedIncrease({
      currentRent: 650_000,
      type: 'icl',
      initialPoint: { date: '2025-01-01', value: 10_000 },
      finalPoint: { date: '2026-01-01', value: 13_154 },
      dataset: testDataset,
    });

    expect(result.coefficient).toBeCloseTo(1.3154, 8);
    expect(result.newRent).toBeCloseTo(855_010, 8);
  });

  it('preserves the full rent magnitude in the manual regression', () => {
    const result = calculateManualIncrease(450_000, 25);

    expect(result.newRent).toBe(562_500);
    expect(result.monthlyDifference).toBe(112_500);
  });

  it('supports a zero-percent increase without invalid values', () => {
    const manual = calculateManualIncrease(100_000, 0);
    const indexed = calculateIndexedIncrease({
      currentRent: 100_000,
      type: 'icl',
      initialPoint: { date: '2025-01-01', value: 100 },
      finalPoint: { date: '2026-01-01', value: 100 },
      dataset: testDataset,
    });

    expect(manual.newRent).toBe(100_000);
    expect(indexed.newRent).toBe(100_000);
    expect(Number.isFinite(manual.coefficient)).toBe(true);
    expect(Number.isFinite(indexed.coefficient)).toBe(true);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid rent value: %s',
    (rent) => {
      expect(() => calculateManualIncrease(rent, 10)).toThrow(RangeError);
    },
  );

  it('rejects a negative manual percentage', () => {
    expect(() => calculateManualIncrease(100_000, -1)).toThrow(RangeError);
  });

  it('rejects zero index values so results cannot become Infinity', () => {
    expect(() =>
      calculateIndexedIncrease({
        currentRent: 100_000,
        type: 'icl',
        initialPoint: { date: '2025-01-01', value: 0 },
        finalPoint: { date: '2026-01-01', value: 125 },
        dataset: testDataset,
      }),
    ).toThrow(RangeError);
  });

  it('validates chronological date ranges', () => {
    expect(hasValidDateRange('2025-01-01', '2026-01-01')).toBe(true);
    expect(hasValidDateRange('2026-01-01', '2025-01-01')).toBe(false);
    expect(hasValidDateRange('', '2026-01-01')).toBe(false);
  });

  it('includes both the start and end months for Casa Propia', () => {
    expect(getCasaPropiaPeriods('2026-01', '2026-04')).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
    ]);
  });

  it('supports a single Casa Propia month', () => {
    const result = calculateCasaPropiaIncrease({
      currentRent: 100_000,
      startPeriod: '2026-02',
      endPeriod: '2026-02',
      dataset: casaPropiaDataset,
    });
    expect(result.coefficient).toBe(1.03);
    expect(result.newRent).toBe(103_000);
    expect(result.casaPropiaPeriods?.map((point) => point.date)).toEqual(['2026-02']);
  });

  it('compounds every Casa Propia coefficient without intermediate rounding', () => {
    const result = calculateCasaPropiaIncrease({
      currentRent: 123_456.78,
      startPeriod: '2026-01',
      endPeriod: '2026-03',
      dataset: casaPropiaDataset,
    });
    expect(result.coefficient).toBeCloseTo(1.02 * 1.03 * 1.01, 12);
    expect(result.newRent).toBeCloseTo(123_456.78 * 1.02 * 1.03 * 1.01, 8);
  });

  it('reports every missing Casa Propia period', () => {
    const incomplete = {
      ...casaPropiaDataset,
      values: casaPropiaDataset.values.filter((point) => point.date !== '2026-02'),
    };
    expect(() =>
      calculateCasaPropiaIncrease({
        currentRent: 100_000,
        startPeriod: '2026-01',
        endPeriod: '2026-03',
        dataset: incomplete,
      }),
    ).toThrowError(MissingCasaPropiaPeriodsError);
    try {
      calculateCasaPropiaIncrease({
        currentRent: 100_000,
        startPeriod: '2026-01',
        endPeriod: '2026-03',
        dataset: incomplete,
      });
    } catch (error) {
      expect((error as MissingCasaPropiaPeriodsError).periods).toEqual(['2026-02']);
    }
  });

  it.each([
    ['', '2026-01'],
    ['2026-00', '2026-01'],
    ['2026-02', '2026-01'],
  ])('rejects an invalid Casa Propia range %s to %s', (startPeriod, endPeriod) => {
    expect(() => getCasaPropiaPeriods(startPeriod, endPeriod)).toThrow(RangeError);
  });

  it('rejects invalid Casa Propia coefficients', () => {
    expect(() =>
      calculateCasaPropiaIncrease({
        currentRent: 100_000,
        startPeriod: '2026-01',
        endPeriod: '2026-01',
        dataset: { ...casaPropiaDataset, values: [{ date: '2026-01', value: 0 }] },
      }),
    ).toThrow(RangeError);
  });
});
