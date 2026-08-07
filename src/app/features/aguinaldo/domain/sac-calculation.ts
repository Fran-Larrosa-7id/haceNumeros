import { SAC_MONTH_NAMES, SAC_RATE } from './sac.constants';
import {
  SacBestRemuneration,
  SacCalculationInput,
  SacCalculationResult,
  SacMonthValue,
  SacSemester,
  SacSemesterBounds,
} from './sac.models';

const DAY_IN_MILLISECONDS = 86_400_000;

export function calculateFullSac(bestRemuneration: number): number {
  assertPositiveFinite(bestRemuneration, 'La mejor remuneración');
  return bestRemuneration * SAC_RATE;
}

export function findBestMonthlyRemuneration(
  monthlyValues: readonly SacMonthValue[],
): SacBestRemuneration {
  let best: SacBestRemuneration | null = null;
  for (const value of monthlyValues) {
    if (!Number.isInteger(value.month) || value.month < 1 || value.month > 12) {
      throw new RangeError('El mes informado es inválido.');
    }
    if (value.remuneration === null) continue;
    assertPositiveFinite(value.remuneration, `La remuneración de ${monthName(value.month)}`);
    if (!best || value.remuneration > best.remuneration) {
      best = { remuneration: value.remuneration, month: value.month };
    }
  }
  if (!best) throw new RangeError('Ingresá al menos una remuneración mensual positiva.');
  return best;
}

export function getSemesterBounds(year: number, semester: SacSemester): SacSemesterBounds {
  assertYear(year);
  const startMonth = semester === 'first' ? 1 : 7;
  const endMonth = semester === 'first' ? 6 : 12;
  const startDate = `${year}-${pad(startMonth)}-01`;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  const endDate = `${year}-${pad(endMonth)}-${pad(lastDay)}`;
  return { startDate, endDate, days: daysInclusive(startDate, endDate) };
}

export function calculateSac(input: SacCalculationInput): SacCalculationResult {
  const fullSac = calculateFullSac(input.remuneration);
  const bounds = getSemesterBounds(input.year, input.semester);
  if (input.workPeriodMode === 'full-semester') {
    return {
      year: input.year,
      semester: input.semester,
      bestRemuneration: input.remuneration,
      bestMonth: input.month,
      fullSac,
      estimatedSac: fullSac,
      proportional: false,
    };
  }

  const startDate = requireDate(input.startDate, 'La fecha de inicio');
  const endDate = requireDate(input.endDate, 'La fecha de fin');
  if (startDate < bounds.startDate || endDate > bounds.endDate) {
    throw new RangeError('Las fechas deben estar dentro del semestre seleccionado.');
  }
  if (startDate > endDate)
    throw new RangeError('La fecha de inicio no puede ser posterior al fin.');
  const daysCounted = daysInclusive(startDate, endDate);
  const proportion = daysCounted / bounds.days;
  return {
    year: input.year,
    semester: input.semester,
    bestRemuneration: input.remuneration,
    bestMonth: input.month,
    fullSac,
    estimatedSac: fullSac * proportion,
    proportional: true,
    proportion,
    daysCounted,
    semesterDays: bounds.days,
    startDate,
    endDate,
  };
}

export function monthName(month: number): string {
  return SAC_MONTH_NAMES[month - 1] ?? 'Mes desconocido';
}

function daysInclusive(startDate: string, endDate: string): number {
  return Math.floor((parseIsoDate(endDate) - parseIsoDate(startDate)) / DAY_IN_MILLISECONDS) + 1;
}

function requireDate(value: string | undefined, label: string): string {
  if (!value) throw new RangeError(`${label} es obligatoria.`);
  parseIsoDate(value);
  return value;
}

function parseIsoDate(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('La fecha debe tener formato ISO.');
  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError('La fecha es inválida.');
  }
  return timestamp;
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} debe ser positiva.`);
}

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    throw new RangeError('El año es inválido.');
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
