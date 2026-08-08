import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('production domain and crawler assets are coherent', async () => {
  const [cname, robots, sitemap, index, notFound] = await Promise.all([
    read('public/CNAME'),
    read('public/robots.txt'),
    read('public/sitemap.xml'),
    read('src/index.html'),
    read('public/404.html'),
  ]);

  assert.equal(cname.trim(), 'hacenumeros.com');
  assert.match(robots, /^User-agent: \*\r?\nAllow: \/$/m);
  assert.match(robots, /Sitemap: https:\/\/hacenumeros\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots, /^Disallow:/m);
  assert.deepEqual(sitemap.match(/<loc>[^<]+<\/loc>/g), [
    '<loc>https://hacenumeros.com/</loc>',
    '<loc>https://hacenumeros.com/calculadora-aumento-alquiler</loc>',
    '<loc>https://hacenumeros.com/calculadora-sueldo-bruto-neto</loc>',
    '<loc>https://hacenumeros.com/calculadora-aguinaldo</loc>',
    '<loc>https://hacenumeros.com/calculadora-indemnizacion-despido</loc>',
  ]);
  assert.match(index, /<html lang="es">/);
  assert.match(index, /<base href="\/"\s*\/>/);
  assert.doesNotMatch(index, /\/haceNumeros\//);
  assert.match(notFound, /<meta name="robots" content="noindex,follow"\s*\/>/);
  assert.doesNotMatch(notFound, /rel="canonical"/);
  assert.doesNotMatch(sitemap, /404|data\/rent-indexes|github\.io|\/haceNumeros\//i);
});

test('public assets do not expose source spreadsheets', async () => {
  const files = await listFiles(join(root, 'public'));
  assert.equal(
    files.some((file) => /\.(?:csv|xls|xlsx)$/i.test(file)),
    false,
  );
  assert.equal(
    files.some((file) => file.endsWith('favicon.svg')),
    true,
  );
  assert.equal(
    files.some((file) => file.endsWith('404.html')),
    true,
  );
});

test('application sources contain no legacy public domain or empty links', async () => {
  const files = (await listFiles(join(root, 'src'))).filter((file) => /\.(?:html|ts)$/.test(file));
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');

  assert.doesNotMatch(source, /github\.io/i);
  assert.doesNotMatch(source, /href=["']#["']/i);
});

async function read(relativePath) {
  return readFile(join(root, relativePath), 'utf8');
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nestedFiles.flat();
}
