import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMonotributoDataset } from './monotributo-parameters.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'data-sources', 'monotributo', 'monotributo-2026-08.json');
const publicDirectory = path.join(root, 'public', 'data', 'monotributo');
try {
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const published = JSON.parse(
    fs.readFileSync(path.join(publicDirectory, 'parameters.json'), 'utf8'),
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(publicDirectory, 'manifest.json'), 'utf8'));
  const errors = [...validateMonotributoDataset(source), ...validateMonotributoDataset(published)];
  if (JSON.stringify(source) !== JSON.stringify(published))
    errors.push(
      'El JSON público no coincide con la fuente versionada. Ejecutá data:monotributo:build.',
    );
  if (
    manifest?.schemaVersion !== 1 ||
    manifest?.datasets?.monotributo?.file !== 'parameters.json' ||
    manifest.datasets.monotributo.effectiveFrom !== published.effectiveFrom ||
    manifest.datasets.monotributo.categoryCount !== published.categories.length
  )
    errors.push('manifest.json de Monotributo no coincide con el dataset.');
  if (errors.length) throw new Error(errors.join('\n'));
  const maximum = published.categories.at(-1);
  const status = `Monotributo vigente desde ${published.effectiveFrom}; revisado ${published.reviewedAt}; categoría máxima ${maximum.code}; tope de ingresos $${maximum.limits.annualGrossIncome}; precio unitario máximo $${maximum.limits.maxUnitPriceGoods}.`;
  console.log(
    process.argv.includes('--status') ? status : 'Parámetros de Monotributo versionados válidos.',
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
