import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { parseIclRows, parseIpcCsv, validateDataset } from './rent-index-parsers.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumentsMap = parseArguments(process.argv.slice(2));
const sourceDirectory = path.join(projectRoot, 'data-sources', 'rent-indexes');
const outputDirectory = path.join(projectRoot, 'public', 'data', 'rent-indexes');
const iclPath = path.resolve(argumentsMap.icl ?? path.join(sourceDirectory, 'diar_icl.xls'));
const ipcPath = path.resolve(
  argumentsMap.ipc ?? path.join(sourceDirectory, 'serie_ipc_divisiones.csv'),
);
const acceptRevisions = argumentsMap['accept-revisions'] === true;

main();

function main() {
  assertFile(iclPath, 'ICL');
  assertFile(ipcPath, 'IPC');

  const generatedAt = new Date().toISOString();
  const iclValues = readIcl(iclPath);
  const ipcValues = readIpc(ipcPath);
  const icl = buildDataset({
    type: 'icl',
    frequency: 'daily',
    values: iclValues,
    key: 'date',
    sourcePath: iclPath,
    organization: 'Banco Central de la República Argentina',
    shortName: 'BCRA',
    datasetName: 'Índice para Contratos de Locación (ICL)',
    generatedAt,
  });
  const ipc = buildDataset({
    type: 'ipc',
    frequency: 'monthly',
    values: ipcValues,
    key: 'period',
    sourcePath: ipcPath,
    organization: 'Instituto Nacional de Estadística y Censos',
    shortName: 'INDEC',
    datasetName: 'IPC Nacional - Nivel general',
    generatedAt,
  });

  validateDataset(icl);
  validateDataset(ipc);

  const changes = {
    icl: compareWithExisting(icl, 'date'),
    ipc: compareWithExisting(ipc, 'period'),
  };
  enforceSafeUpdate(icl, changes.icl, acceptRevisions);
  enforceSafeUpdate(ipc, changes.ipc, acceptRevisions);

  const manifest = {
    schemaVersion: 1,
    generatedAt,
    datasets: {
      icl: manifestEntry(icl, 'icl.json'),
      ipc: manifestEntry(ipc, 'ipc.json'),
    },
  };

  writeAllAtomically([
    ['icl.json', `${JSON.stringify(icl)}\n`],
    ['ipc.json', `${JSON.stringify(ipc)}\n`],
    ['manifest.json', `${JSON.stringify(manifest, null, 2)}\n`],
  ]);

  printSummary(icl, changes.icl);
  printSummary(ipc, changes.ipc);
  console.log('\nDatasets generados y validados correctamente.');
}

function readIcl(filePath) {
  const workbook = XLSX.read(fs.readFileSync(filePath), { cellDates: true, raw: true });
  const candidates = workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    }),
  }));
  const sheet = candidates.find(({ rows }) =>
    rows.some(
      (row) =>
        String(row[0] ?? '')
          .trim()
          .toLowerCase() === 'fecha' &&
        String(row[1] ?? '')
          .trim()
          .toLowerCase() === 'icl001',
    ),
  );
  if (!sheet) {
    throw new Error('Ninguna hoja contiene la serie fecha / icl001.');
  }
  return parseIclRows(sheet.rows);
}

function readIpc(filePath) {
  const bytes = fs.readFileSync(filePath);
  const text = new TextDecoder('windows-1252', { fatal: true }).decode(bytes);
  return parseIpcCsv(text);
}

function buildDataset({
  type,
  frequency,
  values,
  key,
  sourcePath,
  organization,
  shortName,
  datasetName,
  generatedAt,
}) {
  return {
    schemaVersion: 1,
    type,
    frequency,
    source: {
      organization,
      shortName,
      datasetName,
      sourceFile: path.basename(sourcePath),
      sourceSha256: sha256(sourcePath),
    },
    generatedAt,
    coverage: { from: values[0][key], to: values.at(-1)[key] },
    rowCount: values.length,
    values,
  };
}

function compareWithExisting(dataset, key) {
  const filePath = path.join(outputDirectory, `${dataset.type}.json`);
  if (!fs.existsSync(filePath)) {
    return { previous: null, additions: dataset.rowCount, revisions: [] };
  }

  const previous = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateDataset(previous);
  const previousValues = new Map(previous.values.map((point) => [point[key], point.value]));
  const revisions = dataset.values
    .filter(
      (point) => previousValues.has(point[key]) && previousValues.get(point[key]) !== point.value,
    )
    .map((point) => ({
      period: point[key],
      before: previousValues.get(point[key]),
      after: point.value,
    }));
  const additions = dataset.values.filter((point) => !previousValues.has(point[key])).length;
  return { previous, additions, revisions };
}

function enforceSafeUpdate(dataset, changes, revisionsAccepted) {
  if (!changes.previous) {
    return;
  }
  const previous = changes.previous;
  if (
    dataset.coverage.from > previous.coverage.from ||
    dataset.coverage.to < previous.coverage.to ||
    dataset.rowCount < previous.rowCount
  ) {
    throw new Error(
      `${dataset.type.toUpperCase()}: la nueva fuente pierde cobertura (${previous.coverage.from}–${previous.coverage.to} → ${dataset.coverage.from}–${dataset.coverage.to}).`,
    );
  }
  if (changes.revisions.length > 0 && !revisionsAccepted) {
    const preview = changes.revisions
      .slice(0, 10)
      .map((change) => `${change.period}: ${change.before} → ${change.after}`)
      .join('\n');
    throw new Error(
      `${dataset.type.toUpperCase()}: se detectaron ${changes.revisions.length} revisiones históricas.\n${preview}\nRepetí con --accept-revisions para aceptarlas explícitamente.`,
    );
  }
}

function writeAllAtomically(entries) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const suffix = `${process.pid}-${Date.now()}`;
  const staged = entries.map(([name, content]) => {
    const finalPath = path.join(outputDirectory, name);
    const tempPath = `${finalPath}.tmp-${suffix}`;
    const backupPath = `${finalPath}.bak-${suffix}`;
    fs.writeFileSync(tempPath, content, 'utf8');
    return { finalPath, tempPath, backupPath, hadPrevious: fs.existsSync(finalPath) };
  });

  try {
    for (const file of staged) {
      if (file.hadPrevious) {
        fs.renameSync(file.finalPath, file.backupPath);
      }
    }
    for (const file of staged) {
      fs.renameSync(file.tempPath, file.finalPath);
    }
    for (const file of staged) {
      if (fs.existsSync(file.backupPath)) {
        fs.unlinkSync(file.backupPath);
      }
    }
  } catch (error) {
    for (const file of staged.reverse()) {
      if (fs.existsSync(file.finalPath)) {
        fs.unlinkSync(file.finalPath);
      }
      if (fs.existsSync(file.backupPath)) {
        fs.renameSync(file.backupPath, file.finalPath);
      }
      if (fs.existsSync(file.tempPath)) {
        fs.unlinkSync(file.tempPath);
      }
    }
    throw error;
  }
}

function manifestEntry(dataset, file) {
  return {
    file,
    frequency: dataset.frequency,
    from: dataset.coverage.from,
    to: dataset.coverage.to,
    rowCount: dataset.rowCount,
  };
}

function printSummary(dataset, changes) {
  console.log(`\n${dataset.type.toUpperCase()}\n---`);
  console.log(`Fuente: ${dataset.source.sourceFile}`);
  console.log(`Serie: ${dataset.source.datasetName}`);
  console.log(`Observaciones: ${dataset.rowCount}`);
  console.log(`Desde: ${dataset.coverage.from}`);
  console.log(`Hasta: ${dataset.coverage.to}`);
  console.log(`Nuevos registros: ${changes.additions}`);
  console.log(`Registros revisados: ${changes.revisions.length}`);
}

function parseArguments(args) {
  return Object.fromEntries(
    args.map((argument) => {
      const [rawKey, ...rawValue] = argument.replace(/^--/, '').split('=');
      return [rawKey, rawValue.length > 0 ? rawValue.join('=') : true];
    }),
  );
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`No se encontró el archivo fuente ${label}: ${filePath}`);
  }
}
