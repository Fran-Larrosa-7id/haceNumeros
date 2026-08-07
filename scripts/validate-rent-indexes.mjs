import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from './rent-index-parsers.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(projectRoot, 'public', 'data', 'rent-indexes');
const definitions = {
  icl: { file: 'icl.json', frequency: 'daily', key: 'date' },
  ipc: { file: 'ipc.json', frequency: 'monthly', key: 'period' },
  'casa-propia': { file: 'casa-propia.json', frequency: 'monthly', key: 'period' },
};

try {
  const datasets = Object.fromEntries(
    Object.entries(definitions).map(([type, definition]) => {
      const dataset = readJson(path.join(dataDirectory, definition.file));
      validateDatasetContract(dataset, type, definition);
      return [type, dataset];
    }),
  );
  validateManifest(readJson(path.join(dataDirectory, 'manifest.json')), datasets);

  console.log('Datasets de alquiler válidos.');
  if (process.argv.includes('--status')) {
    printStatus(datasets);
  }
} catch (error) {
  console.error(
    `Validación de datasets fallida: ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`No existe ${path.relative(projectRoot, filePath)}.`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${path.basename(filePath)} no contiene JSON válido: ${error.message}`);
  }
}

function validateDatasetContract(dataset, expectedType, definition) {
  if (dataset.type !== expectedType) {
    throw new Error(`${definition.file}: type debe ser “${expectedType}”.`);
  }
  if (dataset.frequency !== definition.frequency) {
    throw new Error(`${definition.file}: frequency debe ser “${definition.frequency}”.`);
  }
  validateDataset(dataset);
  validateSource(dataset.source, definition.file);

  if (expectedType === 'casa-propia') {
    for (const point of dataset.values) {
      if (!['CVS', 'CER'].includes(point.index)) {
        throw new Error(`${definition.file}: índice inválido en ${point.period}.`);
      }
    }
  }
}

function validateSource(source, file) {
  for (const field of ['organization', 'shortName', 'datasetName', 'sourceFile']) {
    if (typeof source?.[field] !== 'string' || source[field].trim() === '') {
      throw new Error(`${file}: falta source.${field}.`);
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(source.sourceSha256 ?? '')) {
    throw new Error(`${file}: source.sourceSha256 no es un SHA-256 válido.`);
  }
}

function validateManifest(manifest, datasets) {
  if (manifest.schemaVersion !== 1 || typeof manifest.generatedAt !== 'string') {
    throw new Error('manifest.json: cabecera inválida.');
  }
  const manifestTypes = Object.keys(manifest.datasets ?? {}).sort();
  const expectedTypes = Object.keys(definitions).sort();
  if (JSON.stringify(manifestTypes) !== JSON.stringify(expectedTypes)) {
    throw new Error('manifest.json debe contener exactamente ICL, IPC y Casa Propia.');
  }

  for (const [type, definition] of Object.entries(definitions)) {
    const entry = manifest.datasets[type];
    const dataset = datasets[type];
    const expected = {
      file: definition.file,
      frequency: dataset.frequency,
      from: dataset.coverage.from,
      to: dataset.coverage.to,
      rowCount: dataset.rowCount,
    };
    for (const [field, value] of Object.entries(expected)) {
      if (entry?.[field] !== value) {
        throw new Error(`manifest.json: ${type}.${field} no coincide con ${definition.file}.`);
      }
    }
  }
}

function printStatus(datasets) {
  console.log('\nDatasets de alquiler');
  for (const [type, dataset] of Object.entries(datasets)) {
    const label = type === 'casa-propia' ? 'Casa Propia' : type.toUpperCase();
    console.log(`\n${label}`);
    console.log(`Cobertura: ${dataset.coverage.from} → ${dataset.coverage.to}`);
    console.log(`Observaciones: ${dataset.rowCount}`);
  }
}
