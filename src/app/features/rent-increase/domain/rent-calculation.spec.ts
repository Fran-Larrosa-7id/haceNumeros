import { describe, expect, it } from 'vitest';
import { RentIndexDataset } from './rent-calculation.models';
import {
  calculateIndexedIncrease,
  calculateManualIncrease,
  hasValidDateRange,
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
});
