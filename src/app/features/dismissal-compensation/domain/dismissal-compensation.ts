import {
  Article245BaseCalculation,
  DismissalCalculationInput,
  DismissalCalculationResult,
  EmploymentTenure,
} from './dismissal-compensation.models';

const DAY_IN_MILLISECONDS = 86_400_000;
const ARTICLE_245_FRACTION_MONTHS = 3;
const ARTICLE_245_FLOOR_PERCENTAGE = 0.67;

export function calculateEmploymentTenure(
  startDateValue: string,
  dismissalDateValue: string,
): EmploymentTenure {
  const startDate = parseIsoDate(startDateValue, 'La fecha de ingreso');
  const dismissalDate = parseIsoDate(dismissalDateValue, 'La fecha de despido');
  if (startDate.timestamp > dismissalDate.timestamp) {
    throw new RangeError('La fecha de ingreso no puede ser posterior al despido.');
  }

  let fullYears = dismissalDate.year - startDate.year;
  if (
    dismissalDate.month < startDate.month ||
    (dismissalDate.month === startDate.month && dismissalDate.day < startDate.day)
  ) {
    fullYears -= 1;
  }

  const anniversary = addCalendarYears(startDate, fullYears);
  let remainingMonths =
    (dismissalDate.year - anniversary.year) * 12 + dismissalDate.month - anniversary.month;
  if (dismissalDate.day < anniversary.day) remainingMonths -= 1;
  const monthAnchor = addCalendarMonths(anniversary, remainingMonths);
  const remainingDays = daysBetween(monthAnchor.iso, dismissalDateValue);

  return {
    fullYears,
    remainingMonths,
    remainingDays,
    totalDaysInclusive: daysBetween(startDateValue, dismissalDateValue) + 1,
  };
}

export function calculateArticle245Units(
  startDateValue: string,
  dismissalDateValue: string,
): number {
  const tenure = calculateEmploymentTenure(startDateValue, dismissalDateValue);
  const hasFractionGreaterThanThreeMonths =
    tenure.remainingMonths > ARTICLE_245_FRACTION_MONTHS ||
    (tenure.remainingMonths === ARTICLE_245_FRACTION_MONTHS && tenure.remainingDays > 0);
  return Math.max(1, tenure.fullYears + (hasFractionGreaterThanThreeMonths ? 1 : 0));
}

export function calculateArticle245Base(
  rawBase: number,
  cctCap?: number | null,
): Article245BaseCalculation {
  assertPositiveFinite(rawBase, 'La remuneración base del art. 245');
  if (cctCap !== null && cctCap !== undefined) assertPositiveFinite(cctCap, 'El tope de convenio');

  const floor67 = rawBase * ARTICLE_245_FLOOR_PERCENTAGE;
  const effectiveCap = cctCap === null || cctCap === undefined ? null : Math.max(cctCap, floor67);
  const appliedBase = effectiveCap === null ? rawBase : Math.min(rawBase, effectiveCap);

  return {
    rawBase,
    cctCap: cctCap ?? null,
    floor67,
    effectiveCap,
    appliedBase,
    capApplied: effectiveCap !== null && appliedBase < rawBase,
  };
}

export function calculateArticle245Indemnity(appliedBase: number, units: number): number {
  assertPositiveFinite(appliedBase, 'La base aplicada');
  if (!Number.isInteger(units) || units < 1)
    throw new RangeError('Las unidades deben ser positivas.');
  return appliedBase * units;
}

export function calculateNoticeMonths(startDateValue: string, dismissalDateValue: string): number {
  const comparisonDate = addCalendarYears(parseIsoDate(startDateValue, 'La fecha de ingreso'), 5);
  const dismissalDate = parseIsoDate(dismissalDateValue, 'La fecha de despido');
  return dismissalDate.timestamp > comparisonDate.timestamp ? 2 : 1;
}

export function calculateNoticeIndemnity(
  currentMonthlySalary: number,
  noticeMonths: number,
): number {
  assertPositiveFinite(currentMonthlySalary, 'La remuneración mensual actual');
  if (!Number.isInteger(noticeMonths) || noticeMonths < 0) {
    throw new RangeError('Los meses de preaviso son inválidos.');
  }
  return currentMonthlySalary * noticeMonths;
}

export function calculateMonthIntegration(
  dismissalDateValue: string,
  currentMonthlySalary: number,
): { readonly days: number; readonly amount: number } {
  assertPositiveFinite(currentMonthlySalary, 'La remuneración mensual actual');
  const dismissalDate = parseIsoDate(dismissalDateValue, 'La fecha de despido');
  const lastDay = new Date(Date.UTC(dismissalDate.year, dismissalDate.month, 0)).getUTCDate();
  const days = Math.max(0, lastDay - dismissalDate.day);
  return { days, amount: (currentMonthlySalary / 30) * days };
}

export function calculateTerminationEstimate(
  input: DismissalCalculationInput,
): DismissalCalculationResult {
  const tenure = calculateEmploymentTenure(input.startDate, input.dismissalDate);
  assertPositiveFinite(input.article245Base, 'La remuneración base del art. 245');
  assertPositiveFinite(input.currentMonthlySalary, 'La remuneración mensual actual');
  if (input.cctCap !== null && input.cctCap !== undefined) {
    assertPositiveFinite(input.cctCap, 'El tope de convenio');
  }

  const emptyBase = calculateArticle245Base(input.article245Base, input.cctCap);
  const common = {
    startDate: input.startDate,
    dismissalDate: input.dismissalDate,
    tenure,
    article245Base: emptyBase,
  };

  if (input.trialPeriodStatus === 'yes') {
    return {
      ...common,
      status: 'trial-period',
      article245Units: 0,
      article245Indemnity: 0,
      noticeMonths: 0,
      noticeIndemnity: 0,
      integrationDays: 0,
      monthIntegration: 0,
      totalIndemnity: 0,
      pendingNotice: false,
      message:
        'Durante el período de prueba no se incluyen art. 245, preaviso ni integración del mes en esta estimación.',
    };
  }

  if (input.terminationFundStatus === 'yes') {
    return {
      ...common,
      status: 'termination-fund',
      article245Units: 0,
      article245Indemnity: 0,
      noticeMonths: 0,
      noticeIndemnity: 0,
      integrationDays: 0,
      monthIntegration: 0,
      totalIndemnity: 0,
      pendingNotice: false,
      message:
        'El régimen del artículo 245 puede haber sido sustituido por el sistema de cese de tu convenio.',
    };
  }

  const article245Units = calculateArticle245Units(input.startDate, input.dismissalDate);
  const article245Indemnity = calculateArticle245Indemnity(emptyBase.appliedBase, article245Units);
  const noticeMonths = calculateNoticeMonths(input.startDate, input.dismissalDate);
  const pendingNotice = input.noticeStatus === 'unknown';
  const noticeIndemnity =
    input.noticeStatus === 'no'
      ? calculateNoticeIndemnity(input.currentMonthlySalary, noticeMonths)
      : 0;
  const integration =
    input.noticeStatus === 'no'
      ? calculateMonthIntegration(input.dismissalDate, input.currentMonthlySalary)
      : { days: 0, amount: 0 };

  return {
    ...common,
    status:
      pendingNotice ||
      input.terminationFundStatus === 'unknown' ||
      input.trialPeriodStatus === 'unknown'
        ? 'partial'
        : 'success',
    article245Units,
    article245Indemnity,
    noticeMonths,
    noticeIndemnity,
    integrationDays: integration.days,
    monthIntegration: integration.amount,
    totalIndemnity: article245Indemnity + noticeIndemnity + integration.amount,
    pendingNotice,
    message:
      input.terminationFundStatus === 'unknown'
        ? 'Total parcial calculado bajo el escenario general, sin fondo de cese confirmado.'
        : input.trialPeriodStatus === 'unknown'
          ? 'Total parcial calculado bajo el escenario general, sin período de prueba confirmado.'
          : pendingNotice
            ? 'Total parcial: falta confirmar si el preaviso fue otorgado correctamente.'
            : 'Total indemnizatorio estimado bajo el régimen general de la LCT.',
  };
}

function parseIsoDate(
  value: string,
  label: string,
): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly timestamp: number;
  readonly iso: string;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`${label} debe tener formato ISO.`);
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
    throw new RangeError(`${label} es inválida.`);
  }
  return { year, month, day, timestamp, iso: value };
}

function addCalendarYears(
  date: ReturnType<typeof parseIsoDate>,
  years: number,
): ReturnType<typeof parseIsoDate> {
  return addCalendarMonths(date, years * 12);
}

function addCalendarMonths(
  date: ReturnType<typeof parseIsoDate>,
  months: number,
): ReturnType<typeof parseIsoDate> {
  const targetMonthIndex = date.month - 1 + months;
  const targetYear = date.year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(date.day, lastDay);
  return parseIsoDate(
    `${targetYear}-${pad(targetMonth + 1)}-${pad(targetDay)}`,
    'La fecha calculada',
  );
}

function daysBetween(startDateValue: string, endDateValue: string): number {
  const startDate = parseIsoDate(startDateValue, 'La fecha de inicio');
  const endDate = parseIsoDate(endDateValue, 'La fecha de fin');
  return Math.floor((endDate.timestamp - startDate.timestamp) / DAY_IN_MILLISECONDS);
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} debe ser positiva.`);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
