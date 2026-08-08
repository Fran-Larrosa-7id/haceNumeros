import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { validateMonotributoDataset } from './monotributo-parameters.mjs';

test('accepts the versioned monotributo dataset', async () => {
  const dataset = JSON.parse(
    await readFile(
      join(process.cwd(), 'data-sources/monotributo/monotributo-2026-08.json'),
      'utf8',
    ),
  );
  assert.deepEqual(validateMonotributoDataset(dataset), []);
  assert.equal(dataset.categories.length, 11);
  assert.equal(dataset.categories.at(-1).code, 'K');
});

test('rejects an inconsistent monotributo total', async () => {
  const dataset = JSON.parse(
    await readFile(
      join(process.cwd(), 'data-sources/monotributo/monotributo-2026-08.json'),
      'utf8',
    ),
  );
  dataset.categories[0].total.services = 1;
  assert.match(validateMonotributoDataset(dataset).join('\n'), /no coincide/);
});
