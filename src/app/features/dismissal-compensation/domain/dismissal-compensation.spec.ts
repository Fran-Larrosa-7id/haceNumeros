import {
  calculateArticle245Base,
  calculateArticle245Units,
  calculateEmploymentTenure,
  calculateMonthIntegration,
  calculateNoticeMonths,
  calculateTerminationEstimate,
} from './dismissal-compensation';

describe('dismissal compensation calculation', () => {
  it('counts article 245 units with a fraction greater than three calendar months only', () => {
    expect(calculateArticle245Units('2020-01-01', '2025-03-01')).toBe(5);
    expect(calculateArticle245Units('2020-01-01', '2025-04-01')).toBe(5);
    expect(calculateArticle245Units('2020-01-01', '2025-04-02')).toBe(6);
    expect(calculateArticle245Units('2020-01-01', '2025-05-01')).toBe(6);
  });

  it('applies at least one article 245 unit when the regime applies', () => {
    expect(calculateArticle245Units('2026-01-01', '2026-01-01')).toBe(1);
  });

  it('calculates notice months from real seniority, not article 245 rounded units', () => {
    expect(calculateNoticeMonths('2020-01-01', '2025-01-01')).toBe(1);
    expect(calculateNoticeMonths('2020-01-01', '2025-01-02')).toBe(2);
  });

  it('applies CCT cap and 67 percent floor', () => {
    expect(calculateArticle245Base(2_000_000, 3_000_000).appliedBase).toBe(2_000_000);
    expect(calculateArticle245Base(2_000_000, 1_600_000).appliedBase).toBe(1_600_000);
    expect(calculateArticle245Base(2_000_000, 1_000_000).appliedBase).toBe(1_340_000);
  });

  it('calculates a complete case without month integration on the last day', () => {
    const result = calculateTerminationEstimate({
      startDate: '2022-08-31',
      dismissalDate: '2026-08-31',
      article245Base: 2_000_000,
      currentMonthlySalary: 2_000_000,
      terminationFundStatus: 'no',
      trialPeriodStatus: 'no',
      noticeStatus: 'no',
    });

    expect(result.article245Indemnity).toBe(8_000_000);
    expect(result.noticeIndemnity).toBe(2_000_000);
    expect(result.monthIntegration).toBe(0);
    expect(result.totalIndemnity).toBe(10_000_000);
  });

  it('keeps article 245 and notice seniority rules separated', () => {
    const result = calculateTerminationEstimate({
      startDate: '2020-01-30',
      dismissalDate: '2025-01-31',
      article245Base: 2_000_000,
      currentMonthlySalary: 2_000_000,
      terminationFundStatus: 'no',
      trialPeriodStatus: 'no',
      noticeStatus: 'no',
    });

    expect(result.article245Units).toBe(5);
    expect(result.article245Indemnity).toBe(10_000_000);
    expect(result.noticeMonths).toBe(2);
    expect(result.noticeIndemnity).toBe(4_000_000);
    expect(result.totalIndemnity).toBe(14_000_000);
  });

  it('estimates month integration for days after dismissal until month end', () => {
    expect(calculateMonthIntegration('2026-08-20', 1_500_000)).toEqual({
      days: 11,
      amount: 550_000,
    });
    expect(calculateMonthIntegration('2026-08-31', 1_500_000)).toEqual({ days: 0, amount: 0 });
    expect(calculateMonthIntegration('2024-02-28', 1_500_000)).toEqual({
      days: 1,
      amount: 50_000,
    });
    expect(calculateMonthIntegration('2025-02-28', 1_500_000)).toEqual({ days: 0, amount: 0 });
  });

  it('does not include article 245, notice or integration during trial period', () => {
    const result = calculateTerminationEstimate({
      startDate: '2026-03-01',
      dismissalDate: '2026-08-01',
      article245Base: 1_000_000,
      currentMonthlySalary: 1_000_000,
      terminationFundStatus: 'no',
      trialPeriodStatus: 'yes',
      noticeStatus: 'no',
    });

    expect(result.status).toBe('trial-period');
    expect(result.totalIndemnity).toBe(0);
    expect(result.message).toContain('período de prueba');
  });

  it('does not invent an article 245 amount when a termination fund may apply', () => {
    const result = calculateTerminationEstimate({
      startDate: '2020-01-01',
      dismissalDate: '2026-01-01',
      article245Base: 1_000_000,
      currentMonthlySalary: 1_000_000,
      terminationFundStatus: 'yes',
      trialPeriodStatus: 'no',
      noticeStatus: 'no',
    });

    expect(result.status).toBe('termination-fund');
    expect(result.totalIndemnity).toBe(0);
    expect(result.message).toContain('sistema de cese');
  });

  it('marks unknown notice or termination fund as partial', () => {
    expect(
      calculateTerminationEstimate({
        startDate: '2020-01-01',
        dismissalDate: '2026-01-01',
        article245Base: 1_000_000,
        currentMonthlySalary: 1_000_000,
        terminationFundStatus: 'no',
        trialPeriodStatus: 'no',
        noticeStatus: 'unknown',
      }).status,
    ).toBe('partial');

    expect(
      calculateTerminationEstimate({
        startDate: '2020-01-01',
        dismissalDate: '2026-01-01',
        article245Base: 1_000_000,
        currentMonthlySalary: 1_000_000,
        terminationFundStatus: 'unknown',
        trialPeriodStatus: 'no',
        noticeStatus: 'yes',
      }).status,
    ).toBe('partial');

    expect(
      calculateTerminationEstimate({
        startDate: '2020-01-01',
        dismissalDate: '2026-01-01',
        article245Base: 1_000_000,
        currentMonthlySalary: 1_000_000,
        terminationFundStatus: 'no',
        trialPeriodStatus: 'unknown',
        noticeStatus: 'yes',
      }).status,
    ).toBe('partial');
  });

  it('validates dates and amounts', () => {
    expect(() => calculateEmploymentTenure('2026-01-02', '2026-01-01')).toThrow();
    expect(() =>
      calculateTerminationEstimate({
        startDate: '2020-01-01',
        dismissalDate: '2026-01-01',
        article245Base: 0,
        currentMonthlySalary: 1_000_000,
        terminationFundStatus: 'no',
        trialPeriodStatus: 'no',
        noticeStatus: 'no',
      }),
    ).toThrow();
    expect(() => calculateArticle245Base(1_000_000, Number.POSITIVE_INFINITY)).toThrow();
  });
});
