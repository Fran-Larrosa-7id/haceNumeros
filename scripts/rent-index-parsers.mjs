const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_PERIOD = /^\d{4}-\d{2}$/;

export function parseDelimited(text, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error('El CSV termina dentro de un campo entre comillas.');
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}

export function parseIclRows(rows) {
  const headerIndex = rows.findIndex(
    (row) => normalizeText(row[0]) === 'fecha' && normalizeText(row[1]) === 'icl001',
  );
  if (headerIndex < 0) {
    throw new Error('No se encontraron las columnas fecha / icl001 en el libro ICL.');
  }

  const values = [];
  for (const [offset, row] of rows.slice(headerIndex + 1).entries()) {
    const sourceRow = headerIndex + offset + 2;
    const rawDate = row[0];
    const rawValue = row[1];

    if (normalizeText(rawDate) === 'cd_serie') {
      continue;
    }
    if (isBlank(rawDate) && isBlank(rawValue)) {
      continue;
    }

    const date = parseIclDate(rawDate);
    const value = parsePositiveNumber(rawValue, `ICL fila ${sourceRow}`);
    values.push({ date, value });
  }

  validatePoints(values, 'date', ISO_DATE, 'ICL');
  return values;
}

export function parseIpcCsv(text) {
  const rows = parseDelimited(text);
  if (rows.length < 2) {
    throw new Error('El CSV de IPC no contiene observaciones.');
  }

  const headers = rows[0].map((header) => header.trim());
  const required = ['Codigo', 'Descripcion', 'Clasificador', 'Periodo', 'Indice_IPC', 'Region'];
  for (const name of required) {
    if (!headers.includes(name)) {
      throw new Error(`Falta la columna requerida ${name} en el CSV de IPC.`);
    }
  }

  const column = Object.fromEntries(headers.map((header, index) => [header, index]));
  const selected = rows
    .slice(1)
    .filter(
      (row) =>
        normalizeText(row[column.Codigo]) === '0' &&
        normalizeText(row[column.Descripcion]).toUpperCase() === 'NIVEL GENERAL' &&
        normalizeText(row[column.Region]).toUpperCase() === 'NACIONAL',
    );

  if (selected.length === 0) {
    throw new Error('No se encontró la serie IPC Nivel general / Nacional.');
  }

  const values = selected.map((row, offset) => ({
    period: parseIpcPeriod(row[column.Periodo], offset + 2),
    value: parsePositiveNumber(row[column.Indice_IPC], `IPC fila ${offset + 2}`),
  }));

  validatePoints(values, 'period', ISO_PERIOD, 'IPC');
  return values;
}

const CASA_PROPIA_MONTHS = new Map([
  ['ene', 1],
  ['enero', 1],
  ['feb', 2],
  ['febrero', 2],
  ['mar', 3],
  ['marzo', 3],
  ['abr', 4],
  ['abril', 4],
  ['may', 5],
  ['mayo', 5],
  ['jun', 6],
  ['junio', 6],
  ['jul', 7],
  ['julio', 7],
  ['ago', 8],
  ['agosto', 8],
  ['sep', 9],
  ['sept', 9],
  ['septiembre', 9],
  ['oct', 10],
  ['octubre', 10],
  ['nov', 11],
  ['noviembre', 11],
  ['dic', 12],
  ['diciembre', 12],
]);

export function parseCasaPropiaText(text) {
  const normalizedText = String(text).replace(/\u00a0/g, ' ');
  const normalizedLower = normalizedText.toLocaleLowerCase('es');
  const requiredLabels = [
    'coeficiente de actualización de los créditos casa propia',
    'mes',
    'coeficiente',
    'indice',
    'fórmula',
  ];
  for (const label of requiredLabels) {
    if (!normalizedLower.includes(label)) {
      throw new Error(`Casa Propia: no se encontró la etiqueta requerida “${label}”.`);
    }
  }

  const values = [];
  for (const [offset, rawLine] of normalizedText.split(/\r?\n/).entries()) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    const row = parseCasaPropiaLine(line, offset + 1);
    if (row) {
      values.push(row);
      continue;
    }
    if (/^(?:Casa Propia\s+)?[a-záéíóú]{3,10}(?:-|\s+)\d{2,4}\b/i.test(line)) {
      throw new Error(`Casa Propia: fila incompleta o inválida en la línea ${offset + 1}: ${line}`);
    }
  }

  const formulaMarkers = normalizedText.match(/Casa Propia/gi)?.length ?? 0;
  if (formulaMarkers < values.length) {
    throw new Error('Casa Propia: la columna Fórmula no identifica todas las observaciones.');
  }

  values.sort((left, right) => left.period.localeCompare(right.period));
  validatePoints(values, 'period', ISO_PERIOD, 'CASA PROPIA');
  return values;
}

export function validateDataset(dataset) {
  if (dataset.schemaVersion !== 1) {
    throw new Error(`Versión de esquema no soportada para ${dataset.type}.`);
  }
  if (!['icl', 'ipc', 'casa-propia'].includes(dataset.type)) {
    throw new Error('Tipo de dataset inválido.');
  }
  const key = dataset.type === 'icl' ? 'date' : 'period';
  const pattern = dataset.type === 'icl' ? ISO_DATE : ISO_PERIOD;
  validatePoints(dataset.values, key, pattern, dataset.type.toUpperCase());

  if (dataset.rowCount !== dataset.values.length) {
    throw new Error(`rowCount no coincide con values.length para ${dataset.type}.`);
  }
  if (
    dataset.coverage.from !== dataset.values[0][key] ||
    dataset.coverage.to !== dataset.values.at(-1)[key]
  ) {
    throw new Error(`La cobertura no coincide con las observaciones de ${dataset.type}.`);
  }
  if (!dataset.source?.sourceFile || !dataset.source?.sourceSha256) {
    throw new Error(`Falta proveniencia en el dataset ${dataset.type}.`);
  }
  if (
    dataset.type === 'casa-propia' &&
    dataset.calculationMode !== 'compound-monthly-coefficients'
  ) {
    throw new Error('Casa Propia: calculationMode inválido o ausente.');
  }
}

function parseCasaPropiaLine(line, sourceLine) {
  const match = /^(?:Casa Propia\s+)?([a-záéíóú]{3,10})(?:-|\s+)(\d{2}|\d{4})\s+([^\s]+)\s+(CVS|CER)(?:\s+Casa Propia)?$/i.exec(
    line,
  );
  if (!match) {
    return null;
  }

  const monthName = match[1].toLocaleLowerCase('es');
  const month = CASA_PROPIA_MONTHS.get(monthName);
  if (!month) {
    throw new Error(`Casa Propia: mes inválido en la línea ${sourceLine}: ${match[1]}`);
  }
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  if (!Number.isInteger(year) || year < 2000 || year > 2099) {
    throw new Error(`Casa Propia: año inválido en la línea ${sourceLine}: ${match[2]}`);
  }

  return {
    period: `${year}-${String(month).padStart(2, '0')}`,
    value: parsePositiveNumber(match[3], `Casa Propia línea ${sourceLine}`),
    index: match[4].toUpperCase(),
  };
}

function parseIclDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return formatIsoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalizeText(value));
  if (!match) {
    throw new Error(`Fecha ICL inválida: ${String(value)}`);
  }
  return formatIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
}

function parseIpcPeriod(value, row) {
  const normalized = normalizeText(value);
  const match = /^(\d{4})(\d{2})$/.exec(normalized);
  if (!match) {
    throw new Error(`Período IPC inválido en fila ${row}: ${normalized}`);
  }
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Mes IPC inválido en fila ${row}: ${normalized}`);
  }
  return `${match[1]}-${match[2]}`;
}

function formatIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Fecha ICL inexistente: ${day}/${month}/${year}`);
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parsePositiveNumber(value, context) {
  const normalized =
    typeof value === 'number' ? value : Number(normalizeText(value).replace(',', '.'));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`Valor inválido en ${context}: ${String(value)}`);
  }
  return normalized;
}

function validatePoints(values, key, pattern, label) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`El dataset ${label} está vacío.`);
  }

  const seen = new Set();
  let previous = '';
  for (const [index, point] of values.entries()) {
    const period = point[key];
    if (typeof period !== 'string' || !pattern.test(period)) {
      throw new Error(`${label}: fecha o período inválido en la observación ${index + 1}.`);
    }
    if (!Number.isFinite(point.value) || point.value <= 0) {
      throw new Error(`${label}: valor inválido en ${period}.`);
    }
    if (seen.has(period)) {
      throw new Error(`${label}: fecha o período duplicado: ${period}.`);
    }
    if (previous && period <= previous) {
      throw new Error(`${label}: las observaciones no están ordenadas en ${period}.`);
    }
    seen.add(period);
    previous = period;
  }
}

function normalizeText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}
