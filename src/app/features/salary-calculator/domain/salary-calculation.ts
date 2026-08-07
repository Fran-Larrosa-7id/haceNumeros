import {
  SalaryCalculationInput,
  SalaryCalculationResult,
  SalaryParameters,
} from './salary-calculation.models';

export function calculateNetSalary(
  input: SalaryCalculationInput,
  parameters: SalaryParameters,
): SalaryCalculationResult {
  validateInputs(input);
  return breakdown(input.amount, input.otherDiscounts, parameters, 'gross-to-net');
}

export function calculateGrossSalary(
  input: SalaryCalculationInput,
  parameters: SalaryParameters,
): SalaryCalculationResult {
  validateInputs(input);
  const rate = totalRate(parameters);
  const targetBeforeOtherDiscounts = input.amount + input.otherDiscounts;
  const maximum = parameters.contributionBase.maximum;
  const netAtMaximum = maximum * (1 - rate);
  const gross =
    targetBeforeOtherDiscounts <= netAtMaximum
      ? targetBeforeOtherDiscounts / (1 - rate)
      : targetBeforeOtherDiscounts + maximum * rate;
  return breakdown(gross, input.otherDiscounts, parameters, 'net-to-gross');
}

function breakdown(
  gross: number,
  otherDiscounts: number,
  parameters: SalaryParameters,
  mode: SalaryCalculationResult['mode'],
): SalaryCalculationResult {
  const contributionBase = Math.min(gross, parameters.contributionBase.maximum);
  const retirement = contributionBase * parameters.rates.retirement;
  const healthInsurance = contributionBase * parameters.rates.healthInsurance;
  const inssjp = contributionBase * parameters.rates.inssjp;
  const mandatoryContributions = retirement + healthInsurance + inssjp;
  const totalDiscounts = mandatoryContributions + otherDiscounts;
  const net = gross - totalDiscounts;
  if (!(net > 0) || !Number.isFinite(net))
    throw new RangeError('El sueldo neto debe ser mayor a cero.');
  return {
    mode,
    gross,
    net,
    contributionBase,
    retirement,
    healthInsurance,
    inssjp,
    mandatoryContributions,
    otherDiscounts,
    totalDiscounts,
    effectiveDiscountPercentage: (totalDiscounts / gross) * 100,
    contributionBaseWasCapped: gross > parameters.contributionBase.maximum,
    belowMinimumBase: gross < parameters.contributionBase.minimum,
  };
}

function totalRate(parameters: SalaryParameters): number {
  return parameters.rates.retirement + parameters.rates.healthInsurance + parameters.rates.inssjp;
}

function validateInputs(input: SalaryCalculationInput): void {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new RangeError('El importe debe ser mayor a cero.');
  if (!Number.isFinite(input.otherDiscounts) || input.otherDiscounts < 0)
    throw new RangeError('Los otros descuentos no pueden ser negativos.');
}
