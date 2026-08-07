export function validateSalaryParameters(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return ['El archivo debe contener un objeto JSON.'];
  if (value.schemaVersion !== 1) errors.push('schemaVersion debe ser 1.');
  if (value.type !== 'salary-general-regime') errors.push('type inválido.');
  if (value.country !== 'AR') errors.push('country debe ser AR.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value.effectiveFrom ?? '') ||
    Number.isNaN(Date.parse(`${value.effectiveFrom}T00:00:00Z`))
  )
    errors.push('effectiveFrom debe ser una fecha ISO válida.');
  const rates = value.rates ?? {};
  for (const key of ['retirement', 'healthInsurance', 'inssjp']) {
    if (!Number.isFinite(rates[key]) || rates[key] <= 0 || rates[key] >= 1)
      errors.push(`rates.${key} debe ser una tasa válida.`);
  }
  if (
    Number.isFinite(rates.retirement) &&
    Number.isFinite(rates.healthInsurance) &&
    Number.isFinite(rates.inssjp) &&
    Math.abs(rates.retirement + rates.healthInsurance + rates.inssjp - 0.17) > 1e-12
  )
    errors.push('Las tasas nominales deben sumar 0,17.');
  const base = value.contributionBase ?? {};
  if (!Number.isFinite(base.minimum) || base.minimum <= 0)
    errors.push('La base mínima debe ser positiva.');
  if (!Number.isFinite(base.maximum) || base.maximum <= 0)
    errors.push('La base máxima debe ser positiva.');
  if (
    Number.isFinite(base.minimum) &&
    Number.isFinite(base.maximum) &&
    base.maximum <= base.minimum
  )
    errors.push('La base máxima debe superar la mínima.');
  if (base.minimumAppliedByCalculator !== false)
    errors.push('La V1 no debe aplicar automáticamente la base mínima.');
  if (!Array.isArray(value.sources) || value.sources.length < 5)
    errors.push('Deben declararse al menos cinco fuentes oficiales.');
  const urls = new Set();
  for (const [index, source] of (value.sources ?? []).entries()) {
    if (!source?.name?.trim()) errors.push(`sources[${index}].name es obligatorio.`);
    try {
      const url = new URL(source?.url);
      if (url.protocol !== 'https:') errors.push(`sources[${index}].url debe usar HTTPS.`);
      if (urls.has(url.href)) errors.push(`Fuente duplicada: ${url.href}`);
      urls.add(url.href);
    } catch {
      errors.push(`sources[${index}].url es inválida.`);
    }
  }
  return errors;
}
