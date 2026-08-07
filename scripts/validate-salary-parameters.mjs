import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSalaryParameters } from './salary-parameters.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'data-sources', 'salary', 'salary-parameters.json');
const publicPath = path.join(root, 'public', 'data', 'salary', 'parameters.json');
try {
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const published = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
  const errors = [...validateSalaryParameters(source), ...validateSalaryParameters(published)];
  if (JSON.stringify(source) !== JSON.stringify(published))
    errors.push('El JSON público no coincide con la fuente versionada. Ejecutá data:salary:build.');
  if (errors.length) throw new Error(errors.join('\n'));
  const status = `Parámetros salariales vigentes desde ${published.effectiveFrom}: base mínima $${published.contributionBase.minimum}, máxima $${published.contributionBase.maximum}.`;
  console.log(
    process.argv.includes('--status') ? status : 'Parámetros salariales versionados válidos.',
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
