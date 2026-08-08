import {
  ContributionSituation,
  DeterminingParameter,
  MonotributoCalculationInput,
  MonotributoCalculationResult,
  MonotributoCategory,
  MonotributoContribution,
  MonotributoDataset,
} from './monotributo.models';

const PARAMETER_ORDER: readonly DeterminingParameter[] = [
  'income',
  'surface',
  'electricity',
  'rent',
  'unitPrice',
];

type ApplicableParameter = Readonly<{ parameter: DeterminingParameter; value: number }>;

export function calculateMonotributoEstimate(
  dataset: MonotributoDataset,
  input: MonotributoCalculationInput,
): MonotributoCalculationResult {
  assertPositive(input.annualIncome, 'Los ingresos');
  const parameters = applicableParameters(input);
  const matches = parameters.map(({ parameter, value }) => ({
    parameter,
    category: findFirstCompatibleCategory(dataset.categories, parameter, value),
  }));
  const exceededParameters = matches
    .filter((match) => match.category === null)
    .map((match) => match.parameter);
  const incomeCategory = matches.find((match) => match.parameter === 'income')?.category ?? null;

  if (exceededParameters.length > 0) {
    return {
      status: 'out-of-regime',
      category: null,
      incomeCategory,
      determiningParameter: null,
      contribution: null,
      incomeMargin: null,
      incomeUsage: null,
      exceededParameters,
    };
  }

  const highest = matches.reduce((current, match) =>
    categoryIndex(match.category as MonotributoCategory) >
    categoryIndex(current.category as MonotributoCategory)
      ? match
      : current,
  );
  const category = highest.category as MonotributoCategory;
  const status =
    input.contributionSituation === 'other'
      ? 'unsupported-contribution-situation'
      : input.mode === 'quick'
        ? 'quick-estimate'
        : 'complete-estimate';

  return {
    status,
    category,
    incomeCategory,
    determiningParameter: highest.parameter,
    contribution: calculateContribution(category, input.activity, input.contributionSituation),
    incomeMargin: category.limits.annualGrossIncome - input.annualIncome,
    incomeUsage: input.annualIncome / category.limits.annualGrossIncome,
    exceededParameters: [],
  };
}

export function findFirstCompatibleCategory(
  categories: readonly MonotributoCategory[],
  parameter: DeterminingParameter,
  value: number,
): MonotributoCategory | null {
  const limitKey: Readonly<Record<DeterminingParameter, keyof MonotributoCategory['limits']>> = {
    income: 'annualGrossIncome',
    surface: 'surfaceM2',
    electricity: 'annualElectricityKwh',
    rent: 'annualRent',
    unitPrice: 'maxUnitPriceGoods',
  };
  return categories.find((category) => value <= category.limits[limitKey[parameter]]) ?? null;
}

export function calculateContribution(
  category: MonotributoCategory,
  activity: MonotributoCalculationInput['activity'],
  situation: ContributionSituation,
): MonotributoContribution | null {
  if (situation === 'other') return null;
  const integratedTax = category.integratedTax[activity];
  if (situation === 'employee') {
    return { integratedTax, sipa: null, healthInsurance: null, total: integratedTax };
  }
  return {
    integratedTax,
    sipa: category.sipa,
    healthInsurance: category.healthInsurance,
    total: category.total[activity],
  };
}

function applicableParameters(input: MonotributoCalculationInput): readonly ApplicableParameter[] {
  const parameters: ApplicableParameter[] = [{ parameter: 'income', value: input.annualIncome }];
  if (input.mode === 'quick') return parameters;
  if (input.hasPremises) {
    if (!input.excludeSurface) parameters.push(requiredParameter('surface', input.surfaceM2));
    if (!input.excludeElectricity)
      parameters.push(requiredParameter('electricity', input.annualElectricityKwh));
    parameters.push(requiredParameter('rent', input.annualRent));
  }
  if (input.activity === 'goods')
    parameters.push(requiredParameter('unitPrice', input.maxUnitPriceGoods));
  return parameters;
}

function requiredParameter(
  parameter: DeterminingParameter,
  value: number | null | undefined,
): ApplicableParameter {
  if (value === null || value === undefined)
    throw new RangeError(`Falta el parámetro ${parameter}.`);
  if (parameter === 'rent' ? value < 0 : value <= 0)
    throw new RangeError(`El parámetro ${parameter} es inválido.`);
  return { parameter, value };
}

function categoryIndex(category: MonotributoCategory): number {
  return category.code.charCodeAt(0);
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} deben ser positivos.`);
}
