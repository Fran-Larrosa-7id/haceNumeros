import {
  RatioRentIndexType,
  RentCalculationResult,
  RentIndexDataset,
  RentIndexPoint,
} from './rent-calculation.models';

export interface IndexedCalculationInput {
  readonly currentRent: number;
  readonly type: RatioRentIndexType;
  readonly initialPoint: RentIndexPoint;
  readonly finalPoint: RentIndexPoint;
  readonly dataset: RentIndexDataset;
}

const INDEX_LABELS: Readonly<Record<RatioRentIndexType, string>> = {
  icl: 'ICL',
  ipc: 'IPC',
};

export interface CasaPropiaCalculationInput {
  readonly currentRent: number;
  readonly startPeriod: string;
  readonly endPeriod: string;
  readonly dataset: RentIndexDataset;
}

export class MissingCasaPropiaPeriodsError extends Error {
  constructor(readonly periods: readonly string[]) {
    super(`Faltan coeficientes de Casa Propia para: ${periods.join(', ')}.`);
    this.name = 'MissingCasaPropiaPeriodsError';
  }
}

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

export function getCasaPropiaPeriods(startPeriod: string, endPeriod: string): string[] {
  const pattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
  const start = pattern.exec(startPeriod);
  const end = pattern.exec(endPeriod);
  if (!start || !end) {
    throw new RangeError('Los períodos de Casa Propia deben tener formato AAAA-MM.');
  }

  const startIndex = Number(start[1]) * 12 + Number(start[2]) - 1;
  const endIndex = Number(end[1]) * 12 + Number(end[2]) - 1;
  if (endIndex < startIndex) {
    throw new RangeError('El mes final no puede ser anterior al mes inicial.');
  }

  return Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => {
    const index = startIndex + offset;
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

export function calculateCasaPropiaIncrease(
  input: CasaPropiaCalculationInput,
): RentCalculationResult {
  assertPositiveFinite(input.currentRent, 'El alquiler');
  if (input.dataset.type !== 'casa-propia') {
    throw new TypeError('Se requiere el dataset de Casa Propia.');
  }

  const periods = getCasaPropiaPeriods(input.startPeriod, input.endPeriod);
  const pointsByPeriod = new Map(input.dataset.values.map((point) => [point.date, point]));
  const missingPeriods = periods.filter((period) => !pointsByPeriod.has(period));
  if (missingPeriods.length > 0) {
    throw new MissingCasaPropiaPeriodsError(missingPeriods);
  }

  const points = periods.map((period) => pointsByPeriod.get(period)!);
  let coefficient = 1;
  for (const point of points) {
    assertPositiveFinite(point.value, `El coeficiente de ${point.date}`);
    coefficient *= point.value;
  }
  const newRent = input.currentRent * coefficient;

  return {
    currentRent: input.currentRent,
    newRent,
    monthlyDifference: newRent - input.currentRent,
    accumulatedPercentage: (coefficient - 1) * 100,
    coefficient,
    method: 'casa-propia',
    methodLabel: 'Casa Propia',
    sourceName: input.dataset.sourceName,
    updatedAt: input.dataset.updatedAt,
    casaPropiaPeriods: points,
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
