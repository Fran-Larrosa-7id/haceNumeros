export type MonotributoActivity = 'services' | 'goods';
export type EvaluationMode = 'quick' | 'full';
export type ContributionSituation = 'independent-only' | 'employee' | 'other';
export type CategoryCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';
export type DeterminingParameter = 'income' | 'surface' | 'electricity' | 'rent' | 'unitPrice';
export type MonotributoCalculationStatus =
  | 'idle'
  | 'invalid'
  | 'quick-estimate'
  | 'complete-estimate'
  | 'out-of-regime'
  | 'unsupported-contribution-situation';

export interface MonotributoCategory {
  readonly code: CategoryCode;
  readonly limits: {
    readonly annualGrossIncome: number;
    readonly surfaceM2: number;
    readonly annualElectricityKwh: number;
    readonly annualRent: number;
    readonly maxUnitPriceGoods: number;
  };
  readonly integratedTax: Readonly<Record<MonotributoActivity, number>>;
  readonly sipa: number;
  readonly healthInsurance: number;
  readonly total: Readonly<Record<MonotributoActivity, number>>;
}

export interface MonotributoDataset {
  readonly schemaVersion: number;
  readonly effectiveFrom: string;
  readonly reviewedAt: string;
  readonly sourceUrl: string;
  readonly categories: readonly MonotributoCategory[];
}

export interface MonotributoCalculationInput {
  readonly mode: EvaluationMode;
  readonly activity: MonotributoActivity;
  readonly annualIncome: number;
  readonly contributionSituation: ContributionSituation;
  readonly hasPremises?: boolean;
  readonly surfaceM2?: number | null;
  readonly annualElectricityKwh?: number | null;
  readonly annualRent?: number | null;
  readonly excludeSurface?: boolean;
  readonly excludeElectricity?: boolean;
  readonly maxUnitPriceGoods?: number | null;
}

export interface MonotributoContribution {
  readonly integratedTax: number;
  readonly sipa: number | null;
  readonly healthInsurance: number | null;
  readonly total: number | null;
}

export interface MonotributoCalculationResult {
  readonly status: Exclude<MonotributoCalculationStatus, 'idle' | 'invalid'>;
  readonly category: MonotributoCategory | null;
  readonly incomeCategory: MonotributoCategory | null;
  readonly determiningParameter: DeterminingParameter | null;
  readonly contribution: MonotributoContribution | null;
  readonly incomeMargin: number | null;
  readonly incomeUsage: number | null;
  readonly exceededParameters: readonly DeterminingParameter[];
}

export interface MonotributoCalculationState {
  readonly status: MonotributoCalculationStatus;
  readonly result?: MonotributoCalculationResult;
}
