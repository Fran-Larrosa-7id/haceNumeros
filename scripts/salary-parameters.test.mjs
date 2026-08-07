import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSalaryParameters } from './salary-parameters.mjs';

const valid = {
  schemaVersion: 1,
  type: 'salary-general-regime',
  country: 'AR',
  effectiveFrom: '2026-08-01',
  rates: { retirement: 0.11, healthInsurance: 0.03, inssjp: 0.03 },
  contributionBase: { minimum: 141380.42, maximum: 4594798.23, minimumAppliedByCalculator: false },
  sources: Array.from({ length: 5 }, (_, index) => ({
    name: `Fuente ${index}`,
    url: `https://example.com/${index}`,
  })),
};
test('accepts the versioned salary contract', () =>
  assert.deepEqual(validateSalaryParameters(valid), []));
test('rejects invalid rates, bases and duplicate sources', () => {
  const invalid = structuredClone(valid);
  invalid.rates.retirement = Number.NaN;
  invalid.contributionBase.maximum = 1;
  invalid.sources[1].url = invalid.sources[0].url;
  assert.ok(validateSalaryParameters(invalid).length >= 3);
});
