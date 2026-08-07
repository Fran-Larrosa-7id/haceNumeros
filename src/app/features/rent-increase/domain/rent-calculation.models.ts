export type RentIndexType = 'icl' | 'ipc' | 'casa-propia' | 'manual';

export type IndexedRentType = Exclude<RentIndexType, 'manual'>;

export type AdjustmentFrequency = 'quarterly' | 'four-monthly' | 'semiannual' | 'annual';

export interface RentIndexPoint {
  readonly date: string;
  readonly value: number;
}

export interface RentIndexDataset {
  readonly type: IndexedRentType;
  readonly sourceName: string;
  readonly sourceUrl?: string;
  readonly effectiveFrom: string;
  readonly updatedAt: string;
  readonly values: readonly RentIndexPoint[];
}

export interface RentFormValue {
  readonly currentRent: number;
  readonly indexType: RentIndexType;
  readonly lastAdjustmentDate: string;
  readonly nextAdjustmentDate: string;
  readonly frequency: AdjustmentFrequency;
  readonly manualPercentage: number | null;
}

export interface RentCalculationResult {
  readonly currentRent: number;
  readonly newRent: number;
  readonly monthlyDifference: number;
  readonly accumulatedPercentage: number;
  readonly coefficient: number;
  readonly method: RentIndexType;
  readonly methodLabel: string;
  readonly sourceName: string;
  readonly updatedAt: string | null;
  readonly initialPoint?: RentIndexPoint;
  readonly finalPoint?: RentIndexPoint;
  readonly manualPercentage?: number;
}

export type CalculationState =
  | { readonly status: 'idle' }
  | { readonly status: 'invalid' }
  | {
      readonly status: 'unavailable';
      readonly indexType: IndexedRentType;
      readonly indexLabel: string;
      readonly startDate: string;
      readonly endDate: string;
      readonly message: string;
    }
  | { readonly status: 'success'; readonly result: RentCalculationResult };
