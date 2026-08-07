import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserRoot = path.join(projectRoot, 'dist', 'haceNumeros', 'browser');

try {
  assertDirectory(browserRoot);
  validatePage('index.html', 'https://hacenumeros.com/', 'WebSite');
  validatePage(
    path.join('calculadora-aumento-alquiler', 'index.html'),
    'https://hacenumeros.com/calculadora-aumento-alquiler',
    'BreadcrumbList',
  );

  for (const file of [
    'CNAME',
    'sitemap.xml',
    'robots.txt',
    '404.html',
    path.join('assets', 'favicon.png'),
    path.join('data', 'rent-indexes', 'icl.json'),
    path.join('data', 'rent-indexes', 'ipc.json'),
    path.join('data', 'rent-indexes', 'casa-propia.json'),
    path.join('data', 'rent-indexes', 'manifest.json'),
  ]) {
    assertFile(path.join(browserRoot, file));
  }

  if (fs.readFileSync(path.join(browserRoot, 'CNAME'), 'utf8').trim() !== 'hacenumeros.com') {
    throw new Error('CNAME no contiene hacenumeros.com.');
  }

  const files = walk(browserRoot);
  const privateSource = files.find((file) => /\.(?:xls|xlsx|csv|pdf)$/i.test(file));
  if (privateSource) {
    throw new Error(
      `El artefacto expone una fuente privada: ${path.relative(browserRoot, privateSource)}.`,
    );
  }

  for (const file of files.filter((entry) => /\.(?:html|xml|txt)$/i.test(entry))) {
    const content = fs.readFileSync(file, 'utf8');
    if (/fran-larrosa-7id\.github\.io/i.test(content)) {
      throw new Error(`${path.relative(browserRoot, file)} contiene la URL github.io anterior.`);
    }
    if (/\/haceNumeros\//i.test(content)) {
      throw new Error(`${path.relative(browserRoot, file)} contiene el base path anterior.`);
    }
  }

  console.log('Artefacto estático, prerender, SEO, assets y datasets válidos.');
} catch (error) {
  console.error(`Validación de dist fallida: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}

function validatePage(relativePath, canonical, structuredType) {
  const filePath = path.join(browserRoot, relativePath);
  assertFile(filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    throw new Error(`${relativePath}: falta title.`);
  }
  const description = findTag(html, 'meta', { name: 'description' });
  if (!description?.content?.trim()) {
    throw new Error(`${relativePath}: falta meta description.`);
  }
  const robots = findTag(html, 'meta', { name: 'robots' });
  if (robots?.content !== 'index,follow') {
    throw new Error(`${relativePath}: robots debe ser index,follow.`);
  }
  const canonicalTag = findTag(html, 'link', { rel: 'canonical' });
  if (canonicalTag?.href !== canonical) {
    throw new Error(`${relativePath}: canonical incorrecto.`);
  }

  const jsonLd = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => parseAttributes(match[1]).type === 'application/ld+json')
    .map((match) => JSON.parse(match[2]));
  if (!jsonLd.some((entry) => entry?.['@type'] === structuredType)) {
    throw new Error(`${relativePath}: falta JSON-LD ${structuredType}.`);
  }
}

function findTag(html, tagName, expected) {
  for (const match of html.matchAll(new RegExp(`<${tagName}\\b([^>]*)>`, 'gi'))) {
    const attributes = parseAttributes(match[1]);
    if (Object.entries(expected).every(([key, value]) => attributes[key] === value)) {
      return attributes;
    }
  }
  return null;
}

function parseAttributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1].toLowerCase(),
      match[2] ?? match[3],
    ]),
  );
}

function assertFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`No existe ${path.relative(projectRoot, filePath)}.`);
  }
}

function assertDirectory(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`No existe ${path.relative(projectRoot, directory)}.`);
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}
