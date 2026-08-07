import { calculateGrossSalary, calculateNetSalary } from './salary-calculation';
import { SalaryParameters } from './salary-calculation.models';

const julyParameters: SalaryParameters = {
  schemaVersion: 1,
  type: 'salary-general-regime',
  country: 'AR',
  effectiveFrom: '2026-07-01',
  rates: { retirement: 0.11, healthInsurance: 0.03, inssjp: 0.03 },
  contributionBase: { minimum: 138757.9, maximum: 4509567.41, minimumAppliedByCalculator: false },
  sources: [],
};

describe('salary calculation domain', () => {
  it('calculates gross to net below the cap', () =>
    expect(
      calculateNetSalary({ amount: 2_000_000, otherDiscounts: 0 }, julyParameters).net,
    ).toBeCloseTo(1_660_000, 8));
  it('subtracts fixed other discounts', () =>
    expect(
      calculateNetSalary({ amount: 2_000_000, otherDiscounts: 100_000 }, julyParameters).net,
    ).toBeCloseTo(1_560_000, 8));
  it('uses the exact cap without premature rounding', () => {
    const result = calculateNetSalary(
      { amount: julyParameters.contributionBase.maximum, otherDiscounts: 0 },
      julyParameters,
    );
    expect(result.mandatoryContributions).toBeCloseTo(766626.4597, 4);
    expect(result.net).toBeCloseTo(3742940.9503, 4);
    expect(result.contributionBaseWasCapped).toBe(false);
  });
  it('handles a cent below and above the cap', () => {
    const maximum = julyParameters.contributionBase.maximum;
    expect(
      calculateNetSalary({ amount: maximum - 0.01, otherDiscounts: 0 }, julyParameters)
        .contributionBase,
    ).toBeCloseTo(maximum - 0.01, 8);
    const above = calculateNetSalary({ amount: maximum + 0.01, otherDiscounts: 0 }, julyParameters);
    expect(above.contributionBase).toBe(maximum);
    expect(above.contributionBaseWasCapped).toBe(true);
  });
  it('caps contributions for a five-million gross salary', () =>
    expect(
      calculateNetSalary({ amount: 5_000_000, otherDiscounts: 0 }, julyParameters).net,
    ).toBeCloseTo(4_233_373.54, 2));
  it('inverts below the cap', () =>
    expect(
      calculateGrossSalary({ amount: 1_660_000, otherDiscounts: 0 }, julyParameters).gross,
    ).toBeCloseTo(2_000_000, 8));
  it('inverts below the cap with other discounts', () =>
    expect(
      calculateGrossSalary({ amount: 1_560_000, otherDiscounts: 100_000 }, julyParameters).gross,
    ).toBeCloseTo(2_000_000, 8));
  it('inverts above the cap', () =>
    expect(
      calculateGrossSalary({ amount: 4_233_373.5403, otherDiscounts: 0 }, julyParameters).gross,
    ).toBeCloseTo(5_000_000, 2));
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid amount %s', (amount) =>
    expect(() => calculateNetSalary({ amount, otherDiscounts: 0 }, julyParameters)).toThrow(),
  );
  it('rejects negative and non-finite other discounts', () => {
    expect(() => calculateNetSalary({ amount: 1, otherDiscounts: -1 }, julyParameters)).toThrow();
    expect(() =>
      calculateGrossSalary({ amount: 1, otherDiscounts: Number.NaN }, julyParameters),
    ).toThrow();
  });
  it('does not round components before obtaining the total', () => {
    const result = calculateNetSalary({ amount: 123456.78, otherDiscounts: 0.03 }, julyParameters);
    expect(result.net).toBeCloseTo(102469.0974, 8);
    expect(result.mandatoryContributions).toBeCloseTo(20987.6526, 8);
  });
});
