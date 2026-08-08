export type YesNoUnknown = 'yes' | 'no' | 'unknown';

export type DismissalCalculationStatus =
  'idle' | 'invalid' | 'success' | 'partial' | 'trial-period' | 'termination-fund';

export interface EmploymentTenure {
  readonly fullYears: number;
  readonly remainingMonths: number;
  readonly remainingDays: number;
  readonly totalDaysInclusive: number;
}

export interface Article245BaseCalculation {
  readonly rawBase: number;
  readonly cctCap: number | null;
  readonly floor67: number;
  readonly effectiveCap: number | null;
  readonly appliedBase: number;
  readonly capApplied: boolean;
}

export interface DismissalCalculationInput {
  readonly startDate: string;
  readonly dismissalDate: string;
  readonly article245Base: number;
  readonly currentMonthlySalary: number;
  readonly terminationFundStatus: YesNoUnknown;
  readonly trialPeriodStatus: YesNoUnknown;
  readonly noticeStatus: YesNoUnknown;
  readonly cctCap?: number | null;
}

export interface DismissalCalculationResult {
  readonly status: Extract<
    DismissalCalculationStatus,
    'success' | 'partial' | 'trial-period' | 'termination-fund'
  >;
  readonly startDate: string;
  readonly dismissalDate: string;
  readonly tenure: EmploymentTenure;
  readonly article245Units: number;
  readonly article245Base: Article245BaseCalculation;
  readonly article245Indemnity: number;
  readonly noticeMonths: number;
  readonly noticeIndemnity: number;
  readonly integrationDays: number;
  readonly monthIntegration: number;
  readonly totalIndemnity: number;
  readonly pendingNotice: boolean;
  readonly message: string;
}

export interface DismissalCalculationState {
  readonly status: DismissalCalculationStatus;
  readonly result?: DismissalCalculationResult;
}
