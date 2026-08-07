export type SacSemester = 'first' | 'second';
export type SacInputMode = 'manual-best' | 'monthly-values';
export type SacWorkPeriodMode = 'full-semester' | 'proportional';

export interface SacMonthValue {
  readonly month: number;
  readonly remuneration: number | null;
}

export interface SacBestRemuneration {
  readonly remuneration: number;
  readonly month?: number;
}

export interface SacSemesterBounds {
  readonly startDate: string;
  readonly endDate: string;
  readonly days: number;
}

export interface SacCalculationInput extends SacBestRemuneration {
  readonly year: number;
  readonly semester: SacSemester;
  readonly workPeriodMode: SacWorkPeriodMode;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface SacCalculationResult {
  readonly year: number;
  readonly semester: SacSemester;
  readonly bestRemuneration: number;
  readonly bestMonth?: number;
  readonly fullSac: number;
  readonly estimatedSac: number;
  readonly proportional: boolean;
  readonly proportion?: number;
  readonly daysCounted?: number;
  readonly semesterDays?: number;
  readonly startDate?: string;
  readonly endDate?: string;
}

export type SacCalculationState =
  | { readonly status: 'idle' | 'invalid' }
  | { readonly status: 'success'; readonly result: SacCalculationResult };
