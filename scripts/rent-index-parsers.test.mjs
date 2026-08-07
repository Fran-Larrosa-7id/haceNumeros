import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseIclRows, parseIpcCsv, validateDataset } from './rent-index-parsers.mjs';

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

for (const type of ['icl', 'ipc']) {
  test(`dataset real generado de ${type} cumple el contrato`, () => {
    const filePath = path.join(projectRoot, 'public', 'data', 'rent-indexes', `${type}.json`);
    assert.equal(fs.existsSync(filePath), true, `Falta generar ${filePath}`);
    const dataset = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    validateDataset(dataset);
    assert.equal(dataset.type, type);
    assert.equal(dataset.frequency, type === 'icl' ? 'daily' : 'monthly');
  });
}
