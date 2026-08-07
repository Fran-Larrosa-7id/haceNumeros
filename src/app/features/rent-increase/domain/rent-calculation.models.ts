export type RentIndexType = 'icl' | 'ipc' | 'casa-propia' | 'manual';

export type IndexedRentType = Exclude<RentIndexType, 'manual'>;
export type RatioRentIndexType = Extract<IndexedRentType, 'icl' | 'ipc'>;

export type RentIndexFrequency = 'daily' | 'monthly';

export type AdjustmentFrequency = 'quarterly' | 'four-monthly' | 'semiannual' | 'annual';

export interface RentIndexPoint {
  readonly date: string;
  readonly value: number;
  readonly basis?: 'CVS' | 'CER';
}

export interface RentIndexDataset {
  readonly type: IndexedRentType;
  readonly frequency: RentIndexFrequency;
  readonly calculationMode?: 'compound-monthly-coefficients';
  readonly sourceName: string;
  readonly sourceShortName: string;
  readonly sourceFile: string;
  readonly sourceUrl?: string;
  readonly effectiveFrom: string;
  readonly updatedAt: string;
  readonly coverage: {
    readonly from: string;
    readonly to: string;
  };
  readonly values: readonly RentIndexPoint[];
}

export interface RentIndexManifestEntry {
  readonly file: string;
  readonly frequency: RentIndexFrequency;
  readonly from: string;
  readonly to: string;
  readonly rowCount: number;
}

export interface RentIndexManifest {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly datasets: {
    readonly icl: RentIndexManifestEntry;
    readonly ipc: RentIndexManifestEntry;
    readonly 'casa-propia': RentIndexManifestEntry;
  };
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
  readonly casaPropiaPeriods?: readonly RentIndexPoint[];
}

export type CalculationState =
  | { readonly status: 'idle' }
  | { readonly status: 'invalid' }
  | {
      readonly status: 'loading';
      readonly indexType: IndexedRentType;
      readonly indexLabel: string;
    }
  | {
      readonly status: 'load-error';
      readonly indexType: IndexedRentType;
      readonly indexLabel: string;
      readonly message: string;
    }
  | {
      readonly status: 'unavailable';
      readonly indexType: IndexedRentType;
      readonly indexLabel: string;
      readonly startDate: string;
      readonly endDate: string;
      readonly message: string;
      readonly missingPeriods?: readonly string[];
    }
  | { readonly status: 'success'; readonly result: RentCalculationResult };
