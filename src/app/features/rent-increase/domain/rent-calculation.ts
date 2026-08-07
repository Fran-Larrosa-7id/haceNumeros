import {
  IndexedRentType,
  RentCalculationResult,
  RentIndexDataset,
  RentIndexPoint,
} from './rent-calculation.models';

export interface IndexedCalculationInput {
  readonly currentRent: number;
  readonly type: IndexedRentType;
  readonly initialPoint: RentIndexPoint;
  readonly finalPoint: RentIndexPoint;
  readonly dataset: RentIndexDataset;
}

const INDEX_LABELS: Readonly<Record<IndexedRentType, string>> = {
  icl: 'ICL',
  ipc: 'IPC',
  'casa-propia': 'Casa Propia',
};

function assertPositiveFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} debe ser un número mayor que cero.`);
  }
}

function assertNonNegativeFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} debe ser un número mayor o igual a cero.`);
  }
}

export function calculateManualIncrease(
  currentRent: number,
  percentage: number,
): RentCalculationResult {
  assertPositiveFinite(currentRent, 'El alquiler');
  assertNonNegativeFinite(percentage, 'El porcentaje');

  const coefficient = 1 + percentage / 100;
  const newRent = currentRent * coefficient;

  return {
    currentRent,
    newRent,
    monthlyDifference: newRent - currentRent,
    accumulatedPercentage: percentage,
    coefficient,
    method: 'manual',
    methodLabel: 'Porcentaje manual',
    sourceName: 'Porcentaje indicado por la persona usuaria',
    updatedAt: null,
    manualPercentage: percentage,
  };
}

export function calculateIndexedIncrease(input: IndexedCalculationInput): RentCalculationResult {
  assertPositiveFinite(input.currentRent, 'El alquiler');
  assertPositiveFinite(input.initialPoint.value, 'El valor inicial');
  assertPositiveFinite(input.finalPoint.value, 'El valor final');

  const coefficient = input.finalPoint.value / input.initialPoint.value;
  const newRent = input.currentRent * coefficient;

  return {
    currentRent: input.currentRent,
    newRent,
    monthlyDifference: newRent - input.currentRent,
    accumulatedPercentage: (coefficient - 1) * 100,
    coefficient,
    method: input.type,
    methodLabel: INDEX_LABELS[input.type],
    sourceName: input.dataset.sourceName,
    updatedAt: input.dataset.updatedAt,
    initialPoint: input.initialPoint,
    finalPoint: input.finalPoint,
  };
}

export function hasValidDateRange(startDate: string, endDate: string): boolean {
  const periodPattern = /^\d{4}-\d{2}(?:-\d{2})?$/;
  return (
    periodPattern.test(startDate) &&
    periodPattern.test(endDate) &&
    startDate.length === endDate.length &&
    startDate < endDate
  );
}

export function monthsBetween(startDate: string, endDate: string): number | null {
  if (!hasValidDateRange(startDate, endDate)) {
    return null;
  }

  const [startYear, startMonth, startDay = 1] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay = 1] = endDate.split('-').map(Number);
  const wholeMonths = (endYear - startYear) * 12 + endMonth - startMonth;
  return wholeMonths + (endDay - startDay) / 31;
}
