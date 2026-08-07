import {
  calculateFullSac,
  calculateSac,
  findBestMonthlyRemuneration,
  getSemesterBounds,
} from './sac-calculation';

describe('aguinaldo domain', () => {
  it('calculates 50 % for a complete semester', () => {
    expect(calculateFullSac(2_000_000)).toBe(1_000_000);
  });

  it('keeps cents without premature rounding', () => {
    expect(calculateFullSac(1_234_567.89)).toBeCloseTo(617_283.945, 8);
  });

  it('finds the greatest monthly remuneration and its month', () => {
    expect(
      findBestMonthlyRemuneration([
        { month: 1, remuneration: 1_000_000 },
        { month: 2, remuneration: 1_100_000 },
        { month: 3, remuneration: 1_050_000 },
        { month: 4, remuneration: 1_300_000 },
        { month: 5, remuneration: 1_250_000 },
        { month: 6, remuneration: 1_200_000 },
      ]),
    ).toEqual({ remuneration: 1_300_000, month: 4 });
  });

  it('resolves a tie deterministically in favor of the earliest month', () => {
    expect(
      findBestMonthlyRemuneration([
        { month: 1, remuneration: 2_000_000 },
        { month: 2, remuneration: 2_000_000 },
      ]).month,
    ).toBe(1);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid remuneration %s',
    (value) => expect(() => calculateFullSac(value)).toThrow(),
  );

  it('rejects missing, zero and invalid monthly remunerations', () => {
    expect(() => findBestMonthlyRemuneration([{ month: 1, remuneration: null }])).toThrow();
    expect(() => findBestMonthlyRemuneration([{ month: 1, remuneration: 0 }])).toThrow();
    expect(() => findBestMonthlyRemuneration([{ month: 13, remuneration: 1 }])).toThrow();
  });

  it('matches the complete calculation when dates cover the full semester', () => {
    const result = calculateSac({
      remuneration: 1_200_000,
      year: 2026,
      semester: 'first',
      workPeriodMode: 'proportional',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
    });
    expect(result.proportion).toBe(1);
    expect(result.estimatedSac).toBe(600_000);
    expect(result.daysCounted).toBe(181);
  });

  it('calculates a single inclusive day', () => {
    const result = calculateSac({
      remuneration: 1_200_000,
      year: 2026,
      semester: 'second',
      workPeriodMode: 'proportional',
      startDate: '2026-07-01',
      endDate: '2026-07-01',
    });
    expect(result.daysCounted).toBe(1);
    expect(result.semesterDays).toBe(184);
    expect(result.estimatedSac).toBeCloseTo(600_000 / 184, 8);
  });

  it('counts leap-year February in the first semester', () => {
    expect(getSemesterBounds(2024, 'first').days).toBe(182);
  });

  it('validates semester boundaries and date order', () => {
    const base = {
      remuneration: 1_000_000,
      year: 2026,
      semester: 'first' as const,
      workPeriodMode: 'proportional' as const,
    };
    expect(() =>
      calculateSac({ ...base, startDate: '2025-12-31', endDate: '2026-01-01' }),
    ).toThrow();
    expect(() =>
      calculateSac({ ...base, startDate: '2026-06-30', endDate: '2026-07-01' }),
    ).toThrow();
    expect(() =>
      calculateSac({ ...base, startDate: '2026-03-02', endDate: '2026-03-01' }),
    ).toThrow();
  });
});
