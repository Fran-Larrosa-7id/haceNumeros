import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMonotributoDataset } from './monotributo-parameters.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'data-sources', 'monotributo', 'monotributo-2026-08.json');
const outputDirectory = path.join(root, 'public', 'data', 'monotributo');
const applicationDatasetPath = path.join(
  root,
  'src',
  'app',
  'features',
  'monotributo',
  'data-access',
  'monotributo-dataset.ts',
);
const dataset = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const errors = validateMonotributoDataset(dataset);
if (errors.length) throw new Error(errors.join('\n'));
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
  path.join(outputDirectory, 'parameters.json'),
  `${JSON.stringify(dataset, null, 2)}\n`,
  'utf8',
);
fs.mkdirSync(path.dirname(applicationDatasetPath), { recursive: true });
fs.writeFileSync(
  applicationDatasetPath,
  `import { MonotributoDataset } from '../domain/monotributo.models';\n\nexport const MONOTRIBUTO_DATASET: MonotributoDataset = ${JSON.stringify(dataset, null, 2)};\n`,
  'utf8',
);
fs.writeFileSync(
  path.join(outputDirectory, 'manifest.json'),
  `${JSON.stringify({ schemaVersion: 1, generatedAt: dataset.reviewedAt, datasets: { monotributo: { file: 'parameters.json', effectiveFrom: dataset.effectiveFrom, categoryCount: dataset.categories.length } } }, null, 2)}\n`,
  'utf8',
);
console.log(`Parámetros de Monotributo publicados en ${path.relative(root, outputDirectory)}.`);
