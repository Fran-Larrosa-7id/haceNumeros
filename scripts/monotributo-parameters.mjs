const CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

export function validateMonotributoDataset(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return ['El dataset debe contener un objeto JSON.'];
  if (value.schemaVersion !== 1) errors.push('schemaVersion debe ser 1.');
  for (const field of ['effectiveFrom', 'reviewedAt']) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value[field] ?? '') ||
      Number.isNaN(Date.parse(`${value[field]}T00:00:00Z`))
    ) {
      errors.push(`${field} debe ser una fecha ISO válida.`);
    }
  }
  try {
    const url = new URL(value.sourceUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'www.arca.gob.ar')
      errors.push('sourceUrl debe ser una URL HTTPS oficial de ARCA.');
  } catch {
    errors.push('sourceUrl debe ser una URL válida.');
  }
  if (!Array.isArray(value.categories) || value.categories.length !== CODES.length) {
    errors.push('Deben existir exactamente las 11 categorías A a K.');
    return errors;
  }
  value.categories.forEach((category, index) => {
    if (category?.code !== CODES[index])
      errors.push(`La categoría ${index + 1} debe ser ${CODES[index]}.`);
    for (const field of [
      'annualGrossIncome',
      'surfaceM2',
      'annualElectricityKwh',
      'annualRent',
      'maxUnitPriceGoods',
    ]) {
      if (!Number.isFinite(category?.limits?.[field]) || category.limits[field] <= 0)
        errors.push(`${category?.code ?? index}: limits.${field} debe ser positivo.`);
    }
    for (const field of ['services', 'goods']) {
      if (!Number.isFinite(category?.integratedTax?.[field]) || category.integratedTax[field] < 0)
        errors.push(`${category?.code ?? index}: integratedTax.${field} inválido.`);
      if (!Number.isFinite(category?.total?.[field]) || category.total[field] < 0)
        errors.push(`${category?.code ?? index}: total.${field} inválido.`);
      const expected =
        category?.integratedTax?.[field] + category?.sipa + category?.healthInsurance;
      if (Number.isFinite(expected) && Math.abs(expected - category?.total?.[field]) > 0.005)
        errors.push(`${category?.code ?? index}: total.${field} no coincide con sus componentes.`);
    }
    for (const field of ['sipa', 'healthInsurance']) {
      if (!Number.isFinite(category?.[field]) || category[field] < 0)
        errors.push(`${category?.code ?? index}: ${field} inválido.`);
    }
  });
  for (const field of ['annualGrossIncome', 'surfaceM2', 'annualElectricityKwh', 'annualRent']) {
    for (let index = 1; index < value.categories.length; index += 1) {
      if (value.categories[index].limits[field] < value.categories[index - 1].limits[field])
        errors.push(`limits.${field} debe mantener orden creciente.`);
    }
  }
  return errors;
}
