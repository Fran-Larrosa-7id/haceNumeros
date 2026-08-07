import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserRoot = path.join(projectRoot, 'dist', 'haceNumeros', 'browser');
const siteOrigin = 'https://hacenumeros.com';
const indexableUrls = [
  `${siteOrigin}/`,
  `${siteOrigin}/calculadora-aumento-alquiler`,
  `${siteOrigin}/calculadora-sueldo-bruto-neto`,
  `${siteOrigin}/calculadora-aguinaldo`,
];

try {
  assertDirectory(browserRoot);
  const home = validatePage('index.html', indexableUrls[0], 'WebSite', /calculadoras?/i);
  const calculator = validatePage(
    path.join('calculadora-aumento-alquiler', 'index.html'),
    indexableUrls[1],
    'BreadcrumbList',
    /alquiler/i,
  );
  const salaryCalculator = validatePage(
    path.join('calculadora-sueldo-bruto-neto', 'index.html'),
    indexableUrls[2],
    'BreadcrumbList',
    /sueldo/i,
  );
  const sacCalculator = validatePage(
    path.join('calculadora-aguinaldo', 'index.html'),
    indexableUrls[3],
    'BreadcrumbList',
    /aguinaldo/i,
  );

  for (const file of [
    'CNAME',
    'sitemap.xml',
    'robots.txt',
    '404.html',
    path.join('assets', 'favicon.png'),
    path.join('assets', 'Sol_de_Mayo_Bandera_Argentina.png'),
    path.join('data', 'rent-indexes', 'icl.json'),
    path.join('data', 'rent-indexes', 'ipc.json'),
    path.join('data', 'rent-indexes', 'casa-propia.json'),
    path.join('data', 'rent-indexes', 'manifest.json'),
    path.join('data', 'salary', 'parameters.json'),
  ]) {
    assertFile(path.join(browserRoot, file));
  }

  if (fs.readFileSync(path.join(browserRoot, 'CNAME'), 'utf8').trim() !== 'hacenumeros.com') {
    throw new Error('CNAME no contiene hacenumeros.com.');
  }

  validateSitemap();
  validateRobots();
  validateNotFound();
  validateInternalNavigation(home.html, calculator.html, salaryCalculator.html, sacCalculator.html);
  if (
    new Set([home.title, calculator.title, salaryCalculator.title, sacCalculator.title]).size !==
      4 ||
    new Set([
      home.description,
      calculator.description,
      salaryCalculator.description,
      sacCalculator.description,
    ]).size !== 4
  ) {
    throw new Error('Home y calculadora deben tener titles y descriptions únicos.');
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
    if (/<meta\b[^>]*\bname=["']keywords["']/i.test(content)) {
      throw new Error(`${path.relative(browserRoot, file)} contiene meta keywords.`);
    }
    if (/\b(?:seo-keywords|hidden-keywords|keyword-list|data-keywords)\b/i.test(content)) {
      throw new Error(`${path.relative(browserRoot, file)} contiene una lista SEO oculta.`);
    }
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

function validatePage(relativePath, canonical, structuredType, expectedConcept) {
  const filePath = path.join(browserRoot, relativePath);
  assertFile(filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const title = /<title>([^<]+)<\/title>/i.exec(html)?.[1]?.trim();
  if (!title) {
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
  const favicon = findTag(html, 'link', { rel: 'icon' });
  if (favicon?.href !== 'assets/favicon.png') {
    throw new Error(`${relativePath}: referencia de favicon incorrecta.`);
  }

  for (const property of ['og:title', 'og:description', 'og:url', 'og:type']) {
    const tag = findTag(html, 'meta', { property });
    if (!tag?.content?.trim()) {
      throw new Error(`${relativePath}: falta ${property}.`);
    }
  }
  if (findTag(html, 'meta', { property: 'og:url' })?.content !== canonical) {
    throw new Error(`${relativePath}: og:url no coincide con canonical.`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description']) {
    if (!findTag(html, 'meta', { name })?.content?.trim()) {
      throw new Error(`${relativePath}: falta ${name}.`);
    }
  }
  if ((html.match(/<h1\b/gi) ?? []).length !== 1) {
    throw new Error(`${relativePath}: debe contener exactamente un H1.`);
  }
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, ' ');
  if (!expectedConcept.test(title) || !expectedConcept.test(h1 ?? '')) {
    throw new Error(`${relativePath}: title y H1 no expresan la intención principal.`);
  }
  if (findTag(html, 'meta', { name: 'keywords' })) {
    throw new Error(`${relativePath}: no debe incluir meta keywords.`);
  }

  const jsonLd = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => parseAttributes(match[1]).type === 'application/ld+json')
    .map((match) => JSON.parse(match[2]));
  if (jsonLd.length !== 1 || jsonLd[0]?.['@type'] !== structuredType) {
    throw new Error(`${relativePath}: debe contener únicamente JSON-LD ${structuredType}.`);
  }

  return { html, title, description: description.content };
}

function validateSitemap() {
  const sitemap = fs.readFileSync(path.join(browserRoot, 'sitemap.xml'), 'utf8');
  const simpleSitemapPattern =
    /^<\?xml\s+version="1\.0"\s+encoding="UTF-8"\?>\s*<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">(?:\s*<url>\s*<loc>https:\/\/hacenumeros\.com\/[^<]*<\/loc>\s*<\/url>)+\s*<\/urlset>\s*$/;
  if (!simpleSitemapPattern.test(sitemap)) {
    throw new Error('sitemap.xml no cumple la estructura XML simple esperada.');
  }

  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (JSON.stringify(urls) !== JSON.stringify(indexableUrls)) {
    throw new Error('sitemap.xml no contiene exactamente las URLs indexables actuales.');
  }
}

function validateRobots() {
  const directives = fs
    .readFileSync(path.join(browserRoot, 'robots.txt'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const expected = ['User-agent: *', 'Allow: /', `Sitemap: ${siteOrigin}/sitemap.xml`];
  if (JSON.stringify(directives) !== JSON.stringify(expected)) {
    throw new Error('robots.txt debe permitir el sitio y declarar únicamente el sitemap canónico.');
  }
}

function validateNotFound() {
  const relativePath = '404.html';
  const html = fs.readFileSync(path.join(browserRoot, relativePath), 'utf8');
  const robots = findTag(html, 'meta', { name: 'robots' })?.content ?? '';
  if (
    !robots
      .split(',')
      .map((value) => value.trim())
      .includes('noindex')
  ) {
    throw new Error('404.html debe declarar noindex.');
  }
  if (findTag(html, 'link', { rel: 'canonical' })) {
    throw new Error('404.html no debe declarar canonical.');
  }
  if (findTag(html, 'meta', { 'http-equiv': 'refresh' })) {
    throw new Error('404.html no debe redirigir automáticamente.');
  }
  if (!findTag(html, 'a', { href: '/' })) {
    throw new Error('404.html debe ofrecer un enlace para volver al inicio.');
  }
}

function validateInternalNavigation(homeHtml, calculatorHtml, salaryHtml, sacHtml) {
  if (!findTag(homeHtml, 'a', { href: '/calculadora-aumento-alquiler' })) {
    throw new Error('La home no enlaza internamente a la calculadora publicada.');
  }
  if (!findTag(homeHtml, 'a', { href: '/calculadora-sueldo-bruto-neto' })) {
    throw new Error('La home no enlaza internamente a la calculadora salarial.');
  }
  if (!findTag(homeHtml, 'a', { href: '/calculadora-aguinaldo' })) {
    throw new Error('La home no enlaza internamente a la calculadora de aguinaldo.');
  }
  if (!findTag(calculatorHtml, 'a', { href: '/' })) {
    throw new Error('La calculadora no ofrece navegación interna hacia la home.');
  }
  if (!findTag(calculatorHtml, 'section', { id: 'metodologia' })) {
    throw new Error('La sección enlazada de metodología no existe en la calculadora.');
  }
  if (
    !findTag(salaryHtml, 'a', { href: '/' }) ||
    !findTag(salaryHtml, 'a', { href: '/calculadora-aumento-alquiler' })
  ) {
    throw new Error('La calculadora salarial no contiene la navegaciÃ³n interna esperada.');
  }
  if (!findTag(salaryHtml, 'section', { id: 'metodologia' })) {
    throw new Error('La calculadora salarial no contiene su metodologÃ­a.');
  }
  if (
    !findTag(sacHtml, 'a', { href: '/' }) ||
    !findTag(sacHtml, 'a', { href: '/calculadora-sueldo-bruto-neto' }) ||
    !findTag(sacHtml, 'a', { href: '/calculadora-aumento-alquiler' })
  ) {
    throw new Error('La calculadora de aguinaldo no contiene la navegación interna esperada.');
  }
  if (!findTag(sacHtml, 'section', { id: 'metodologia' })) {
    throw new Error('La calculadora de aguinaldo no contiene su metodología.');
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
