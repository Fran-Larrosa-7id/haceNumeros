import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';
import {
  parseCasaPropiaText,
  parseIclRows,
  parseIpcCsv,
  validateDataset,
} from './rent-index-parsers.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

test('ICL: extrae, ordena y valida filas controladas', () => {
  const values = parseIclRows([
    ['nota', null],
    ['fecha', 'icl001'],
    ['cd_serie', 7988],
    ['01/07/2020', 1],
    ['02/07/2020', 1.01],
  ]);
  assert.deepEqual(values, [
    { date: '2020-07-01', value: 1 },
    { date: '2020-07-02', value: 1.01 },
  ]);
});

test('ICL: rechaza duplicados, fechas inválidas y valores no positivos', () => {
  const base = [
    ['fecha', 'icl001'],
    ['cd_serie', 7988],
  ];
  assert.throws(() => parseIclRows([...base, ['31/02/2020', 1]]));
  assert.throws(() => parseIclRows([...base, ['01/07/2020', 'no-numérico']]));
  assert.throws(() => parseIclRows([...base, ['01/07/2020', 0]]));
  assert.throws(() => parseIclRows([...base, ['01/07/2020', 1], ['01/07/2020', 1.01]]));
});

const ipcHeader = 'Codigo;Descripcion;Clasificador;Periodo;Indice_IPC;v_m_IPC;v_i_a_IPC;Region';

test('IPC: selecciona únicamente Nivel general / Nacional', () => {
  const values = parseIpcCsv(
    [
      ipcHeader,
      '0;NIVEL GENERAL;Nivel general y divisiones COICOP;201612;100;NA;NA;GBA',
      '01;Alimentos;Nivel general y divisiones COICOP;201612;120;NA;NA;Nacional',
      '0;NIVEL GENERAL;Nivel general y divisiones COICOP;201612;100;NA;NA;Nacional',
      '0;NIVEL GENERAL;Nivel general y divisiones COICOP;201701;101,5;1,5;NA;Nacional',
    ].join('\n'),
  );
  assert.deepEqual(values, [
    { period: '2016-12', value: 100 },
    { period: '2017-01', value: 101.5 },
  ]);
});

test('IPC: rechaza duplicados, períodos inválidos y valores inválidos', () => {
  const row = (period, value) =>
    `0;NIVEL GENERAL;Nivel general y divisiones COICOP;${period};${value};NA;NA;Nacional`;
  assert.throws(() => parseIpcCsv([ipcHeader, row('201613', '100')].join('\n')));
  assert.throws(() => parseIpcCsv([ipcHeader, row('201612', 'NA')].join('\n')));
  assert.throws(() => parseIpcCsv([ipcHeader, row('201612', '0')].join('\n')));
  assert.throws(() =>
    parseIpcCsv([ipcHeader, row('201612', '100'), row('201612', '101')].join('\n')),
  );
});

const casaPropiaText = (...rows) =>
  [
    'Coeficiente de actualización de los Créditos Casa Propia',
    'Mes Coeficiente Indice Fórmula',
    ...rows,
  ].join('\n');

test('Casa Propia: normaliza abreviaciones, nombres completos y separadores decimales', () => {
  const values = parseCasaPropiaText(
    casaPropiaText(
      'ene-26 1,0244 CVS Casa Propia',
      'febrero 2026 1.0233 CVS Casa Propia',
      'mar-26 1,0229 CER Casa Propia',
    ),
  );
  assert.deepEqual(values, [
    { period: '2026-01', value: 1.0244, index: 'CVS' },
    { period: '2026-02', value: 1.0233, index: 'CVS' },
    { period: '2026-03', value: 1.0229, index: 'CER' },
  ]);
});

test('Casa Propia: ordena la extracción por período antes de validarla', () => {
  const values = parseCasaPropiaText(
    casaPropiaText(
      'mar-26 1,0229 CER Casa Propia',
      'feb-26 1,0233 CVS Casa Propia',
      'abr-26 1,0227 CER Casa Propia',
    ),
  );
  assert.deepEqual(
    values.map((point) => point.period),
    ['2026-02', '2026-03', '2026-04'],
  );
});

test('Casa Propia: rechaza duplicados, valores no positivos y filas incompletas', () => {
  assert.throws(() =>
    parseCasaPropiaText(
      casaPropiaText('ene-26 1,0244 CVS Casa Propia', 'ene-26 1,0245 CVS Casa Propia'),
    ),
  );
  assert.throws(() => parseCasaPropiaText(casaPropiaText('ene-26 0 CVS Casa Propia')));
  assert.throws(() => parseCasaPropiaText(casaPropiaText('ene-26 -1,02 CVS Casa Propia')));
  assert.throws(() => parseCasaPropiaText(casaPropiaText('foo-26 1,02 CVS Casa Propia')));
  assert.throws(() => parseCasaPropiaText(casaPropiaText('ene-26 1,0244')));
  assert.throws(() => parseCasaPropiaText('documento sin tabla relevante'));
});

for (const type of ['icl', 'ipc', 'casa-propia']) {
  test(`dataset real generado de ${type} cumple el contrato`, () => {
    const filePath = path.join(projectRoot, 'public', 'data', 'rent-indexes', `${type}.json`);
    assert.equal(fs.existsSync(filePath), true, `Falta generar ${filePath}`);
    const dataset = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    validateDataset(dataset);
    assert.equal(dataset.type, type);
    assert.equal(dataset.frequency, type === 'icl' ? 'daily' : 'monthly');
  });
}

test('PDF real Casa Propia conserva cobertura, unicidad, orden y proveniencia', async () => {
  const filePath = path.join(
    projectRoot,
    'data-sources',
    'rent-indexes',
    'coeficientes-casa-propia-ago-sep-2026.pdf',
  );
  const bytes = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: bytes });
  let values;
  try {
    const result = await parser.getText();
    assert.equal(result.total, 2);
    values = parseCasaPropiaText(result.text);
  } finally {
    await parser.destroy();
  }

  assert.equal(values.length, 43);
  assert.equal(values[0].period, '2023-03');
  assert.equal(values.at(-1).period, '2026-09');
  assert.equal(new Set(values.map((point) => point.period)).size, values.length);
  assert.equal(values.every((point) => Number.isFinite(point.value) && point.value > 0), true);
  assert.equal(
    crypto.createHash('sha256').update(bytes).digest('hex'),
    'fc8a3065e7204d96aebc603bf55f04c3d121d5127b8d4ac8b8259e238bd5daf4',
  );
});
