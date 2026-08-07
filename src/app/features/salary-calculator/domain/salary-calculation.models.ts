export type SalaryCalculationMode = 'gross-to-net' | 'net-to-gross';

export interface SalaryParameters {
  readonly schemaVersion: 1;
  readonly type: 'salary-general-regime';
  readonly country: 'AR';
  readonly effectiveFrom: string;
  readonly rates: {
    readonly retirement: number;
    readonly healthInsurance: number;
    readonly inssjp: number;
  };
  readonly contributionBase: {
    readonly minimum: number;
    readonly maximum: number;
    readonly minimumAppliedByCalculator: false;
  };
  readonly sources: readonly { readonly name: string; readonly url: string }[];
}

export interface SalaryCalculationInput {
  readonly amount: number;
  readonly otherDiscounts: number;
}

export interface SalaryCalculationResult {
  readonly mode: SalaryCalculationMode;
  readonly gross: number;
  readonly net: number;
  readonly contributionBase: number;
  readonly retirement: number;
  readonly healthInsurance: number;
  readonly inssjp: number;
  readonly mandatoryContributions: number;
  readonly otherDiscounts: number;
  readonly totalDiscounts: number;
  readonly effectiveDiscountPercentage: number;
  readonly contributionBaseWasCapped: boolean;
  readonly belowMinimumBase: boolean;
}

export type SalaryCalculationState =
  | { readonly status: 'idle' | 'invalid' | 'loading' | 'load-error' }
  | { readonly status: 'success'; readonly result: SalaryCalculationResult };
