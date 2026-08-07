import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSalaryParameters } from './salary-parameters.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'data-sources', 'salary', 'salary-parameters.json');
const outputPath = path.join(root, 'public', 'data', 'salary', 'parameters.json');
const parameters = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const errors = validateSalaryParameters(parameters);
if (errors.length) throw new Error(errors.join('\n'));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(parameters, null, 2)}\n`, 'utf8');
console.log(`Parámetros salariales publicados en ${path.relative(root, outputPath)}.`);
